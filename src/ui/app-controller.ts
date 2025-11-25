import { BgmController } from '../audio/bgm';
import { CELL_SIZE, COLS, GRID_MARGIN, ROWS } from '../game/constants';
import { GameEngine } from '../game/engine';
import type { CaptureState, GameSessionState, LastResultSummary } from '../game/state/session';
import { SessionState, loadHighScore, saveHighScore } from '../game/state/session';
import {
  DAILY_DISPLAY_LIMIT,
  LeaderboardEntry,
  MONTHLY_DISPLAY_LIMIT,
  WEEKLY_DISPLAY_LIMIT,
  fetchRollingEntries,
  sanitizePlayerName,
  submitScore
} from '../game/leaderboard';
import { AppShellRefs, mountAppShell } from './components/app-shell';

const BOARD_PIXEL_WIDTH = (COLS - 1) * CELL_SIZE + GRID_MARGIN * 2;
const BOARD_PIXEL_HEIGHT = (ROWS - 1) * CELL_SIZE + GRID_MARGIN * 2;


export class AppController {
  #shell: AppShellRefs;
  #session = new SessionState();
  #bgm: BgmController;
  #engine: GameEngine;
  #highScore = loadHighScore();
  #statusTimer: number | null = null;
  #lastResultExtras: { chain: number; captures: CaptureState } | null = null;
  #boardResizeObserver: ResizeObserver | null = null;
  #pendingScaleFrame: number | null = null;
  #bgmUnlockHandlerAttached = false;

  constructor(root: HTMLElement) {
    this.#shell = mountAppShell(root);
    this.#bgm = new BgmController(this.#shell.bgmAudio);
    this.#engine = new GameEngine({
      boardCanvas: this.#shell.board,
      nextDesktopCanvas: this.#shell.nextDesktop,
      nextMobileCanvas: this.#shell.nextMobile,
      onStateChange: state => this.#handleStateChange(state),
      onStatus: (message, duration) => this.#setStatus(message, duration),
      onGameOver: summary => this.#handleGameOver(summary)
    });

    this.#session.subscribe(state => {
      this.#renderStats(state);
      this.#renderOverlay(state);
      this.#updatePrimaryAction(state);
    });

    this.#wireEvents();
    this.#initializeLeaderboards();
    this.#updateBgmUI();
    this.#setStatus('いごぽん へようこそ。GO! で対局開始。');
    this.#setupBoardScaling();
    this.#setupInitialBgmUnlock();
  }

  #handleStateChange(state: GameSessionState): void {
    if (state.active) {
      this.#lastResultExtras = null;
    }
    this.#session.replace(state);
    this.#syncBgmWithState(state);
  }

  #handleGameOver(summary: LastResultSummary & { captures: CaptureState; chain: number }): void {
    if (summary.finalScore > this.#highScore) {
      this.#highScore = summary.finalScore;
      saveHighScore(this.#highScore);
    }
    this.#lastResultExtras = { chain: summary.chain, captures: summary.captures };
    this.#bgm.setRole('lobby');
    this.#bgm.setPaused(false);
    this.#updateBgmUI();

    // Submit score
    const name = sanitizePlayerName(this.#shell.playerNameInput.value) || 'プレイヤー';
    submitScore(name, summary.finalScore)
      .then(() => {
        this.#setStatus('スコアを送信しました。', 3000);
        return this.#refreshLeaderboards();
      })
      .catch(() => {
        this.#setStatus('スコア送信に失敗しました。', 3000);
      });
  }

  #syncBgmWithState(state: GameSessionState): void {
    if (!state.active) {
      this.#bgm.setRole('lobby');
      this.#bgm.setPaused(false);
      this.#updateBgmUI();
      return;
    }
    const role = state.danger ? 'danger' : 'game';
    this.#bgm.setRole(role);
    this.#bgm.setPaused(state.paused || document.hidden);
    if (!state.paused) {
      void this.#bgm.unlockViaGesture();
    }
    this.#updateBgmUI();
  }

  #wireEvents(): void {
    const handlePrimaryAction = () => {
      const { active, paused } = this.#session.snapshot;
      if (!active) {
        this.#engine.start();
      } else if (paused) {
        this.#engine.resume();
      } else {
        this.#engine.pause();
      }
    };

    this.#shell.headerStartBtn.addEventListener('click', handlePrimaryAction);
    this.#shell.startBtn.addEventListener('click', handlePrimaryAction);
    this.#shell.overlay.restartBtn.addEventListener('click', () => this.#engine.start());

    this.#shell.bgmToggleBtn.addEventListener('click', () => {
      const enabled = this.#bgm.togglePreference();
      if (enabled) {
        void this.#bgm.unlockViaGesture();
      }
      this.#updateBgmUI();
    });

    const mobileActions: Array<[HTMLElement, () => void]> = [
      [this.#shell.mobileControls.left, () => this.#engine.moveLeft()],
      [this.#shell.mobileControls.right, () => this.#engine.moveRight()],
      [this.#shell.mobileControls.rotate, () => this.#engine.rotate()],
      [this.#shell.mobileControls.hardDrop, () => this.#engine.hardDrop()]
    ];
    mobileActions.forEach(([element, handler]) => element.addEventListener('click', handler));

    this.#shell.playerNameInput.addEventListener('change', () => {
      const name = this.#shell.playerNameInput.value.trim();
      this.#setStatus(`${name || 'プレイヤー'} さん、準備OKです。`, 2000);
    });

    // Feedback button handlers
    const feedbackHandler = (e: Event) => {
      const target = e.target as HTMLElement;
      const feedback = target.dataset.feedback;
      if (feedback) {
        console.log('User feedback after game:', feedback);
        // Placeholder: could send to server or store locally
      }
    };
    this.#shell.overlay.root.querySelector('#feedbackEasy')?.addEventListener('click', feedbackHandler);
    this.#shell.overlay.root.querySelector('#feedbackHard')?.addEventListener('click', feedbackHandler);
    this.#shell.overlay.root.querySelector('#feedbackBoring')?.addEventListener('click', feedbackHandler);

    document.addEventListener('keydown', this.#handleKeydown);
    document.addEventListener('visibilitychange', this.#handleVisibilityChange);
    window.addEventListener('appinstalled', () => {
      this.#setStatus('アプリがインストールされました！ホーム画面をご確認ください。', 5000);
    });
  }

  #handleKeydown = (event: KeyboardEvent): void => {
    if (event.code === 'KeyP') {
      event.preventDefault();
      if (!this.#session.snapshot.active) {
        return;
      }
      this.#engine.togglePause();
      return;
    }

    switch (event.code) {
      case 'ArrowLeft':
        event.preventDefault();
        this.#engine.moveLeft();
        break;
      case 'ArrowRight':
        event.preventDefault();
        this.#engine.moveRight();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.#engine.rotate();
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.#engine.softDrop();
        break;
      case 'Space':
        event.preventDefault();
        this.#engine.hardDrop();
        break;
      default:
        break;
    }
  };

  #handleVisibilityChange = (): void => {
    if (document.hidden && this.#session.snapshot.active && !this.#session.snapshot.paused) {
      this.#engine.pause('タブが非表示になったため一時停止しました。');
    }
    this.#syncBgmWithState(this.#session.snapshot);
  };

  #setupBoardScaling(): void {
    if (typeof window === 'undefined') {
      return;
    }
    const scheduleScale = () => {
      if (this.#pendingScaleFrame !== null) {
        cancelAnimationFrame(this.#pendingScaleFrame);
      }
      this.#pendingScaleFrame = window.requestAnimationFrame(() => {
        this.#pendingScaleFrame = null;
        this.#applyBoardScale();
      });
    };

    if (typeof ResizeObserver !== 'undefined') {
      this.#boardResizeObserver = new ResizeObserver(() => scheduleScale());
      this.#boardResizeObserver.observe(this.#shell.boardPanel);
    }
    window.addEventListener('resize', scheduleScale);
    window.addEventListener('scroll', scheduleScale, { passive: true });
    scheduleScale();
  }

  #setupInitialBgmUnlock(): void {
    if (this.#bgmUnlockHandlerAttached || typeof document === 'undefined') {
      return;
    }
    const unlock = () => {
      document.removeEventListener('pointerdown', unlock, true);
      document.removeEventListener('keydown', unlock, true);
      this.#bgmUnlockHandlerAttached = false;
      void this.#bgm.unlockViaGesture();
      this.#bgm.setPaused(false);
      this.#updateBgmUI();
    };
    this.#bgmUnlockHandlerAttached = true;
    document.addEventListener('pointerdown', unlock, true);
    document.addEventListener('keydown', unlock, true);
  }

  #applyBoardScale(): void {
    const scale = this.#computeBoardScale();
    this.#engine.setDisplayScale(scale);
  }

  #computeBoardScale(): number {
    if (typeof window === 'undefined') {
      return 1;
    }
    const panel = this.#shell.boardPanel;
    const panelStyles = window.getComputedStyle(panel);
    const toNumber = (value: string | null | undefined) => Number.parseFloat(value ?? '') || 0;
    const paddingLeft = toNumber(panelStyles.paddingLeft);
    const paddingRight = toNumber(panelStyles.paddingRight);
    const innerWidth = Math.max(0, panel.clientWidth - paddingLeft - paddingRight);

    const widthScale = innerWidth > 0 ? innerWidth / BOARD_PIXEL_WIDTH : 1;

    // Calculate height scale based on 65vh limit (matching CSS)
    const availableHeight = window.innerHeight * 0.75;
    const heightScale = availableHeight > 0 ? availableHeight / BOARD_PIXEL_HEIGHT : 1;

    // Use the smaller scale to ensure it fits in both dimensions while maintaining aspect ratio
    const rawScale = Math.min(widthScale, heightScale);
    return Number.isFinite(rawScale) && rawScale > 0 ? rawScale : 1;
  }

  #renderStats(state: GameSessionState): void {
    const format = (value: number) => value.toLocaleString('ja-JP');
    this.#shell.stats.score.textContent = format(state.score);
    this.#shell.stats.headerScoreValue.textContent = format(state.score);
    this.#shell.stats.level.textContent = String(state.level);
    this.#shell.stats.chain.textContent = String(state.chain);
    this.#shell.stats.blackCaptures.textContent = format(state.captures.black);
    this.#shell.stats.whiteCaptures.textContent = format(state.captures.white);
    this.#shell.stats.pieces.textContent = format(state.piecesPlaced);
    this.#shell.stats.headerScore.classList.toggle('inactive', !state.active);
  }

  #renderOverlay(state: GameSessionState): void {
    if (state.active) {
      this.#shell.overlay.root.classList.add('hidden');
      return;
    }
    this.#shell.overlay.root.classList.remove('hidden');
    const summary = state.lastResult;
    const finalScore = summary?.finalScore ?? 0;
    this.#shell.overlay.title.textContent = summary?.reason ?? 'スタンバイ中';
    let detail = 'GO! を押してゲームを開始してください。';
    if (summary) {
      if (this.#lastResultExtras) {
        const timestamp = new Date(summary.timestamp).toLocaleString('ja-JP');
        detail = `${timestamp} / チェイン ${this.#lastResultExtras.chain} / 捕獲 B:${this.#lastResultExtras.captures.black} W:${this.#lastResultExtras.captures.white}`;
      } else {
        detail = new Date(summary.timestamp).toLocaleString('ja-JP');
      }
    }
    this.#shell.overlay.detail.textContent = detail;
    this.#shell.overlay.finalScore.textContent = finalScore.toLocaleString('ja-JP');
    this.#shell.overlay.bestScore.textContent = this.#highScore.toLocaleString('ja-JP');
  }

  #updatePrimaryAction(state: GameSessionState): void {
    const label = !state.active ? 'GO!' : state.paused ? '再開' : '一時停止';
    this.#shell.headerStartBtn.textContent = label;
    this.#shell.startBtn.textContent = state.active ? 'リスタート' : 'スタート';
  }

  #updateBgmUI(): void {
    const enabled = this.#bgm.preference;
    this.#shell.bgmToggleBtn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    this.#shell.bgmToggleBtn.textContent = enabled ? 'BGM オン' : 'BGM オフ';
    const status = this.#bgm.getStatusMessage({
      paused: this.#session.snapshot.paused,
      hidden: document.hidden
    });
    this.#shell.bgmStatus.textContent = status;
  }

  async #initializeLeaderboards(): Promise<void> {
    this.#shell.leaderboard.dateLabel.textContent = this.#formatDate(new Date());
    await this.#refreshLeaderboards();
  }

  async #refreshLeaderboards(): Promise<void> {
    const [daily, weekly, monthly] = await Promise.all([
      fetchRollingEntries(1, 10),
      fetchRollingEntries(7, 10),
      fetchRollingEntries(30, 15)
    ]);

    this.#renderLeaderboardList(
      this.#shell.leaderboard.dailyList,
      daily,
      DAILY_DISPLAY_LIMIT,
      this.#shell.leaderboard.dailyEmpty
    );
    this.#renderLeaderboardList(
      this.#shell.leaderboard.weeklyList,
      weekly,
      WEEKLY_DISPLAY_LIMIT,
      this.#shell.leaderboard.weeklyEmpty
    );
    this.#renderLeaderboardList(
      this.#shell.leaderboard.monthlyList,
      monthly,
      MONTHLY_DISPLAY_LIMIT,
      this.#shell.leaderboard.monthlyEmpty
    );
  }

  #renderLeaderboardList(
    target: HTMLOListElement,
    entries: LeaderboardEntry[],
    limit: number,
    empty?: HTMLElement
  ): void {
    target.innerHTML = '';
    if (entries.length === 0) {
      empty?.classList.remove('hidden');
      return;
    }
    empty?.classList.add('hidden');

    entries.slice(0, limit).forEach((entry, index) => {
      const item = document.createElement('li');
      const rank = document.createElement('span');
      rank.className = 'rank';
      rank.textContent = String(index + 1);

      const name = document.createElement('span');
      name.className = 'name';
      name.textContent = entry.name || '名無し';

      const score = document.createElement('span');
      score.className = 'score';
      score.textContent = Number(entry.score).toLocaleString('ja-JP');

      item.append(rank, name, score);
      target.appendChild(item);
    });
  }

  #formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}年${month}月${day}日`;
  }

  #setStatus(message: string, duration = 3500): void {
    this.#shell.statusMessage.textContent = message;
    if (this.#statusTimer !== null) {
      window.clearTimeout(this.#statusTimer);
    }
    if (duration > 0) {
      this.#statusTimer = window.setTimeout(() => {
        this.#shell.statusMessage.textContent = '';
        this.#statusTimer = null;
      }, duration);
    }
  }
}
