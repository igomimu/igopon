import { BgmController } from '../audio/bgm';
import type { GameSessionState } from '../game/state/session';
import { SessionState, loadHighScore, saveHighScore } from '../game/state/session';
import { AppShellRefs, mountAppShell } from './components/app-shell';

const DAILY_PLACEHOLDER_COUNT = 5;
const WEEKLY_PLACEHOLDER_COUNT = 1;
const MONTHLY_PLACEHOLDER_COUNT = 1;

export class AppController {
  #shell: AppShellRefs;
  #session = new SessionState();
  #bgm: BgmController;
  #highScore = loadHighScore();
  #statusTimer: number | null = null;

  constructor(root: HTMLElement) {
    this.#shell = mountAppShell(root);
    this.#bgm = new BgmController(this.#shell.bgmAudio);

    this.#session.subscribe(state => {
      this.#renderStats(state);
      this.#renderOverlay(state);
      this.#updatePrimaryAction(state);
      this.#updateBgmUI();
    });

    this.#wireEvents();
    this.#initializeLeaderboards();
    this.#updateBgmUI();
    this.#setStatus('囲碁ポン2 へようこそ。GO! で対局開始。');
  }

  #wireEvents(): void {
    const handlePrimaryAction = () => {
      const { active, paused } = this.#session.snapshot;
      if (!active) {
        this.#startGame();
      } else if (paused) {
        this.#resumeGame();
      } else {
        this.#pauseGame();
      }
    };

    this.#shell.headerStartBtn.addEventListener('click', handlePrimaryAction);
    this.#shell.startBtn.addEventListener('click', handlePrimaryAction);
    this.#shell.overlay.restartBtn.addEventListener('click', () => this.#startGame());

    this.#shell.bgmToggleBtn.addEventListener('click', () => {
      const enabled = this.#bgm.togglePreference();
      if (enabled) {
        void this.#bgm.unlockViaGesture();
      }
      this.#updateBgmUI();
    });

    const mobileActions: Array<[HTMLElement, () => void]> = [
      [this.#shell.mobileControls.left, () => this.#applyDemoAction('left')],
      [this.#shell.mobileControls.right, () => this.#applyDemoAction('right')],
      [this.#shell.mobileControls.rotate, () => this.#applyDemoAction('rotate')],
      [this.#shell.mobileControls.hardDrop, () => this.#applyDemoAction('hardDrop')]
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
      const { active, paused } = this.#session.snapshot;
      if (!active) {
        return;
      }
      if (paused) {
        this.#resumeGame();
      } else {
        this.#pauseGame();
      }
      return;
    }

    if (!this.#session.snapshot.active) {
      return;
    }

    switch (event.code) {
      case 'ArrowLeft':
        event.preventDefault();
        this.#applyDemoAction('left');
        break;
      case 'ArrowRight':
        event.preventDefault();
        this.#applyDemoAction('right');
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.#applyDemoAction('rotate');
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.#applyDemoAction('softDrop');
        break;
      case 'Space':
        event.preventDefault();
        this.#applyDemoAction('hardDrop');
        break;
      default:
        break;
    }
  };

  #handleVisibilityChange = (): void => {
    if (document.hidden && this.#session.snapshot.active && !this.#session.snapshot.paused) {
      this.#pauseGame('タブが非表示になったため一時停止しました。');
    }
    this.#bgm.setPaused(this.#session.snapshot.paused || document.hidden);
    this.#updateBgmUI();
  };

  #startGame(): void {
    this.#session.startNewGame();
    this.#bgm.setRole('game');
    this.#bgm.setPaused(false);
    void this.#bgm.unlockViaGesture();
    this.#setStatus('新しい対局開始。囲んで捕獲しよう。');
  }

  #pauseGame(reason = '一時停止中。GO! で再開。'): void {
    if (!this.#session.snapshot.active || this.#session.snapshot.paused) {
      return;
    }
    this.#session.togglePause();
    this.#bgm.setPaused(true);
    this.#setStatus(reason);
  }

  #resumeGame(): void {
    if (!this.#session.snapshot.active || !this.#session.snapshot.paused) {
      return;
    }
    this.#session.togglePause();
    this.#bgm.setPaused(false);
    this.#setStatus('再開します。');
  }

  #applyDemoAction(action: 'left' | 'right' | 'rotate' | 'hardDrop' | 'softDrop'): void {
    if (!this.#session.snapshot.active || this.#session.snapshot.paused) {
      return;
    }
    const scoreBoost = action === 'hardDrop' ? 320 : action === 'softDrop' ? 60 : 40;
    this.#session.adjustScore(scoreBoost);
    if (action === 'hardDrop' || action === 'softDrop') {
      this.#session.recordCapture('black', 1);
    }
    this.#maybeTriggerDemoClear();
    const actionLabel = this.#describeAction(action);
    this.#setStatus(`${actionLabel}（デモ）`, 1500);
  }

  #maybeTriggerDemoClear(): void {
    const { piecesPlaced, score } = this.#session.snapshot;
    if (piecesPlaced >= 10 || score >= 4000) {
      this.#finishGame('デモ盤面が埋まりました');
    }
  }

  #finishGame(reason: string): void {
    this.#session.endGame(reason);
    const { score } = this.#session.snapshot;
    if (score > this.#highScore) {
      this.#highScore = score;
      saveHighScore(score);
    }
    this.#bgm.setRole('lobby');
    this.#bgm.setPaused(false);
    this.#updateBgmUI();
    this.#setStatus(reason, 3000);
  }

  #describeAction(action: string): string {
    switch (action) {
      case 'left':
        return '左に移動';
      case 'right':
        return '右に移動';
      case 'rotate':
        return '回転';
      case 'hardDrop':
        return 'ハードドロップ';
      case 'softDrop':
        return 'ソフトドロップ';
      default:
        return '操作';
    }
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
    this.#shell.overlay.detail.textContent = summary
      ? new Date(summary.timestamp).toLocaleString('ja-JP')
      : 'GO! を押してゲームを開始してください。';
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
