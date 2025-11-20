import { BgmController } from '../audio/bgm';
import { CELL_SIZE, COLS, GRID_MARGIN, ROWS } from '../game/constants';
import { GameEngine } from '../game/engine';
import type { CaptureState, GameSessionState, LastResultSummary } from '../game/state/session';
import { SessionState, loadHighScore, saveHighScore } from '../game/state/session';
import { AppShellRefs, mountAppShell } from './components/app-shell';

const DAILY_PLACEHOLDER_COUNT = 5;
const WEEKLY_PLACEHOLDER_COUNT = 1;
const MONTHLY_PLACEHOLDER_COUNT = 1;
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
    this.#setStatus('いごぽん2 へようこそ。GO! で対局開始。');
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

    document.addEventListener('keydown', this.#handleKeydown);
    document.addEventListener('visibilitychange', this.#handleVisibilityChange);
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
    const panelRect = panel.getBoundingClientRect();
    const panelStyles = window.getComputedStyle(panel);
    const toNumber = (value: string | null | undefined) => Number.parseFloat(value ?? '') || 0;
    const paddingLeft = toNumber(panelStyles.paddingLeft);
    const paddingRight = toNumber(panelStyles.paddingRight);
    const innerWidth = Math.max(0, panel.clientWidth - paddingLeft - paddingRight);

    const mobileRoot = this.#shell.mobileControlsRoot;
    const mobileStyles = window.getComputedStyle(mobileRoot);
    const mobileVisible = mobileStyles.display !== 'none';
    const mobileHeight = mobileVisible ? mobileRoot.getBoundingClientRect().height : 0;
    const reservedBottom = mobileVisible ? 40 : 64;

    const panelPaddingTop = toNumber(panelStyles.paddingTop);
    const panelPaddingBottom = toNumber(panelStyles.paddingBottom);
    const panelTopOffset = Math.max(0, panelRect.top) + panelPaddingTop;
    const innerHeight = Math.max(
      0,
      window.innerHeight - panelTopOffset - mobileHeight - reservedBottom - panelPaddingBottom
    );

    const widthScale = innerWidth > 0 ? innerWidth / BOARD_PIXEL_WIDTH : 1;
    const heightScale = innerHeight > 0 ? innerHeight / BOARD_PIXEL_HEIGHT : 1;
    const rawScale = Math.min(1, widthScale, heightScale);
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

  #initializeLeaderboards(): void {
    this.#shell.leaderboard.dateLabel.textContent = this.#formatDate(new Date());
    this.#renderLeaderboardPlaceholders(
      this.#shell.leaderboard.dailyList,
      DAILY_PLACEHOLDER_COUNT,
      this.#shell.leaderboard.dailyEmpty
    );
    this.#renderLeaderboardPlaceholders(
      this.#shell.leaderboard.weeklyList,
      WEEKLY_PLACEHOLDER_COUNT,
      this.#shell.leaderboard.weeklyEmpty
    );
    this.#renderLeaderboardPlaceholders(
      this.#shell.leaderboard.monthlyList,
      MONTHLY_PLACEHOLDER_COUNT,
      this.#shell.leaderboard.monthlyEmpty
    );
  }

  #renderLeaderboardPlaceholders(target: HTMLOListElement, count: number, empty?: HTMLElement): void {
    target.innerHTML = '';
    empty?.classList.add('hidden');
    for (let index = 0; index < count; index += 1) {
      const item = document.createElement('li');
      item.classList.add('placeholder');
      const rank = document.createElement('span');
      rank.className = 'rank';
      rank.textContent = String(index + 1);
      const name = document.createElement('span');
      name.className = 'name';
      name.textContent = '—';
      const score = document.createElement('span');
      score.className = 'score';
      score.textContent = '—';
      item.append(rank, name, score);
      target.appendChild(item);
    }
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
