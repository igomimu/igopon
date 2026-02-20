import { BgmController } from '../audio/bgm';
import { SeController } from '../audio/se';
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
} from '../api/leaderboard';
import { submitFeedback } from '../api/feedback';
import { sendEvent } from '../api/analytics';
import { AppShellRefs, mountAppShell } from './components/app-shell';
import { logger } from '../utils/logger';
import { t, formatDate, formatNumber, setLocale, getLocale } from '../i18n';

const BOARD_PIXEL_WIDTH = (COLS - 1) * CELL_SIZE + GRID_MARGIN * 2;
const BOARD_PIXEL_HEIGHT = (ROWS - 1) * CELL_SIZE + GRID_MARGIN * 2;


export class AppController {
  #shell: AppShellRefs;
  #session = new SessionState();
  #bgm: BgmController;
  #se: SeController;
  #engine: GameEngine;
  #highScore = loadHighScore();
  #statusTimer: number | null = null;
  #lastResultExtras: { chain: number; captures: CaptureState } | null = null;
  #boardResizeObserver: ResizeObserver | null = null;
  #pendingScaleFrame: number | null = null;
  #bgmUnlockHandlerAttached = false;
  #deferredInstallPrompt: any = null;
  #tutorialStep = 0;


  constructor(root: HTMLElement) {
    this.#shell = mountAppShell(root);
    this.#bgm = new BgmController(this.#shell.bgmAudio);
    this.#se = new SeController();
    this.#engine = new GameEngine({
      boardCanvas: this.#shell.board,
      nextDesktopCanvas: this.#shell.nextDesktop,
      nextMobileCanvas: this.#shell.nextMobile,
      onStateChange: state => this.#handleStateChange(state),
      onStatus: (message, duration) => this.#setStatus(message, duration),
      onGameOver: summary => this.#handleGameOver(summary),
      onPlayStone: () => this.#se.playStone(),
      onCapture: (count) => this.#se.playCapture(count)
    });

    this.#session.subscribe(state => {
      this.#renderStats(state);
      this.#renderOverlay(state);
      this.#updatePrimaryAction(state);
    });

    this.#wireEvents();
    this.#initializeLeaderboards();
    this.#updateBgmUI();
    setLocale(getLocale());
    this.#setStatus(t('status.welcome'));
    this.#setupBoardScaling();
    this.#setupInitialBgmUnlock();
    this.#loadPlayerName();
    this.#setupInstallPrompt();
    this.#checkTutorial();

    // VibeLogger: アプリ初期化完了
    logger.info('app_initialize', 'App initialized', {
      context: {
        version: '0.2.17',
        highScore: this.#highScore,
        environment: { userAgent: navigator.userAgent }
      },
      human_note: 'AppController初期化時のログ'
    });
  }

  #handleStateChange(state: GameSessionState): void {
    if (state.active) {
      this.#lastResultExtras = null;
    }
    this.#session.replace(state);
    this.#syncBgmWithState(state);
    this.#updateLayoutState(state);
  }

  #handleGameOver(summary: LastResultSummary & { captures: CaptureState; chain: number }): void {
    sendEvent('game_over', {
      score: summary.finalScore,
      level: this.#session.snapshot.level,
      chain: summary.chain
    });

    // VibeLogger: ゲームオーバー
    logger.info('game_over', 'Game over', {
      context: {
        game: {
          finalScore: summary.finalScore,
          level: this.#session.snapshot.level,
          chain: summary.chain,
          reason: summary.reason
        },
        captures: summary.captures,
        isHighScore: summary.finalScore > this.#highScore
      },
      human_note: 'Game over details'
    });

    if (summary.finalScore > this.#highScore) {
      this.#highScore = summary.finalScore;
      saveHighScore(this.#highScore);
    }
    this.#lastResultExtras = { chain: summary.chain, captures: summary.captures };
    this.#bgm.setRole('lobby');
    this.#bgm.setPaused(false);
    this.#updateBgmUI();

    // Submit score
    const name = sanitizePlayerName(this.#shell.playerNameInput.value) || t('player.default');
    submitScore(name, summary.finalScore)
      .then(() => {
        logger.info('score_submit_success', 'Score submitted', {
          context: { player: name, score: summary.finalScore }
        });
        this.#setStatus(t('status.scoreSubmitted'), 3000);
        return this.#refreshLeaderboards();
      })
      .catch((error) => {
        logger.error('score_submit_failed', 'Score submission failed', {
          context: { player: name, score: summary.finalScore, error: String(error) },
          ai_todo: 'Investigate network error cause'
        });
        this.#setStatus(t('status.scoreSubmitFailed'), 3000);
      });

    // Auto-popup feedback for the first time
    try {
      const hasPrompted = localStorage.getItem('igopon_feedback_prompted');
      if (!hasPrompted) {
        setTimeout(() => {
          this.#resetFeedbackForm();
          this.#shell.feedback.root.classList.remove('hidden');
          localStorage.setItem('igopon_feedback_prompted', 'true');
        }, 1500); // Wait a bit for the user to see the game over screen
      }
    } catch (e) {
      console.warn('Failed to access localStorage for feedback prompt:', e);
    }
  }

  #updateLayoutState(state: GameSessionState): void {
    const rightColumn = document.querySelector('.info-column.right');
    if (rightColumn) {
      if (state.active) {
        rightColumn.classList.add('collapsed');
        document.body.classList.add('game-active');
      } else {
        rightColumn.classList.remove('collapsed');
        document.body.classList.remove('game-active');
      }
    }
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
        // VibeLogger: ゲーム開始
        logger.info('game_start', 'Game started', {
          context: {
            player: sanitizePlayerName(this.#shell.playerNameInput.value) || t('player.default'),
            highScore: this.#highScore
          }
        });
        this.#engine.start();
      } else if (paused) {
        this.#engine.resume();
      } else {
        this.#engine.pause();
      }
    };

    this.#shell.startBtnDesktop.addEventListener('click', handlePrimaryAction);
    this.#shell.overlay.restartBtn.addEventListener('click', () => {
      sendEvent('game_start', { retry: true });
      this.#engine.start();
    });


    this.#shell.menu.openBtn.addEventListener('click', () => {
      this.#openMenu();
    });

    this.#shell.menu.closeBtn.addEventListener('click', () => {
      this.#closeMenu();
    });

    this.#shell.menu.resumeBtn.addEventListener('click', () => {
      this.#closeMenu();
    });

    this.#shell.menu.restartBtn.addEventListener('click', () => {
      this.#closeMenu();
      sendEvent('game_start', { retry: true });
      this.#engine.start();
    });

    this.#shell.menu.feedbackBtn.addEventListener('click', () => {
      this.#closeMenu();
      this.#shell.feedbackBtn.click();
    });

    // Reusing the existing toggle Logic but via the menu button ref (aliased in shell)
    this.#shell.bgmToggleBtn.addEventListener('click', () => {
      const enabled = this.#bgm.togglePreference();
      if (enabled) {
        void this.#bgm.unlockViaGesture();
      }
      this.#updateBgmUI();
    });

    // Privacy Policy Handlers
    const togglePrivacy = (show: boolean) => {
      this.#shell.privacy.root.classList.toggle('hidden', !show);
      if (show) {
        sendEvent('privacy_policy_view');
        // Pause game if active
        if (this.#session.snapshot.active && !this.#session.snapshot.paused) {
          this.#engine.pause();
        }
      }
    };

    document.getElementById('privacyOpenBtn')?.addEventListener('click', () => togglePrivacy(true));
    this.#shell.privacy.closeBtn.addEventListener('click', () => togglePrivacy(false));



    const mobileActions: Array<[HTMLElement, () => void]> = [
      [this.#shell.mobileControls.left, () => this.#engine.moveLeft()],
      [this.#shell.mobileControls.right, () => this.#engine.moveRight()],
      [this.#shell.mobileControls.rotate, () => this.#engine.rotate()],
      [this.#shell.mobileControls.hardDrop, () => this.#engine.hardDrop()]
    ];
    mobileActions.forEach(([element, handler]) => element.addEventListener('click', handler));

    this.#shell.playerNameInput.addEventListener('change', () => {
      const name = this.#shell.playerNameInput.value.trim();
      this.#savePlayerName(name);
      this.#setStatus(t('status.playerReady', { name: name || t('player.default') }), 2000);
    });

    // Feedback button handlers
    const feedbackHandler = (e: Event) => {
      const target = e.target as HTMLElement;
      const feedback = target.dataset.feedback;
      if (feedback) {
        // Placeholder: could send to server or store locally
      }
    };
    this.#shell.overlay.root.querySelector('#feedbackEasy')?.addEventListener('click', feedbackHandler);
    this.#shell.overlay.root.querySelector('#feedbackHard')?.addEventListener('click', feedbackHandler);
    this.#shell.overlay.root.querySelector('#feedbackBoring')?.addEventListener('click', feedbackHandler);

    document.addEventListener('keydown', this.#handleKeydown);
    document.addEventListener('visibilitychange', this.#handleVisibilityChange);
    window.addEventListener('appinstalled', () => {
      this.#setStatus(t('status.appInstalled'), 5000);
      this.#shell.installBtn.classList.add('hidden');
      this.#deferredInstallPrompt = null;
    });

    // Feedback UI Handlers
    this.#shell.feedbackBtn.addEventListener('click', () => {
      if (this.#session.snapshot.active && !this.#session.snapshot.paused) {
        this.#engine.pause();
      }
      sendEvent('feedback_open');
      this.#resetFeedbackForm();
      this.#shell.feedback.root.classList.remove('hidden');
    });

    this.#shell.feedback.closeBtn.addEventListener('click', () => {
      this.#shell.feedback.root.classList.add('hidden');
    });



    this.#shell.feedback.commentToggleBtn.addEventListener('click', () => {
      this.#shell.feedback.commentSection.classList.remove('hidden');
      this.#shell.feedback.textarea.focus();
      this.#shell.feedback.commentToggleBtn.classList.add('hidden');
    });

    this.#shell.feedback.quickSubmitBtn.addEventListener('click', () => {
      this.#submitFeedback(false);
    });

    this.#shell.feedback.submitBtn.addEventListener('click', () => {
      this.#submitFeedback(true);
    });

    // Language switcher handlers (only when game is not active)
    const switchLang = (locale: 'ja' | 'en') => {
      if (this.#session.snapshot.active) return;
      setLocale(locale);
      location.reload();
    };
    this.#shell.menu.langJaBtn.addEventListener('click', () => switchLang('ja'));
    this.#shell.menu.langEnBtn.addEventListener('click', () => switchLang('en'));

    // Tutorial Handlers
    this.#shell.tutorial.nextBtn.addEventListener('click', () => {
      this.#advanceTutorial();
    });
    this.#shell.tutorial.skipBtn.addEventListener('click', () => {
      this.#finishTutorial();
    });
  }

  #checkTutorial(): void {
    try {
      const seen = localStorage.getItem('igopon_tutorial_seen');
      if (!seen) {
        this.#startTutorial();
      }
    } catch (e) {
      console.warn('Failed to access localStorage for tutorial:', e);
    }
  }

  #startTutorial(): void {
    sendEvent('tutorial_start');
    this.#tutorialStep = 1;
    this.#shell.tutorial.root.classList.remove('hidden');
    this.#updateTutorialUI();
  }

  #advanceTutorial(): void {
    this.#tutorialStep += 1;
    if (this.#tutorialStep > 3) {
      this.#finishTutorial();
      return;
    }
    this.#updateTutorialUI();
  }

  #updateTutorialUI(): void {
    const { step1, step2, step3, nextBtn } = this.#shell.tutorial;
    step1.classList.toggle('hidden', this.#tutorialStep !== 1);
    step2.classList.toggle('hidden', this.#tutorialStep !== 2);
    step3.classList.toggle('hidden', this.#tutorialStep !== 3);

    if (this.#tutorialStep === 3) {
      nextBtn.textContent = t('button.begin');
    } else {
      nextBtn.textContent = t('button.next');
    }
  }

  #finishTutorial(): void {
    sendEvent('tutorial_complete');
    this.#shell.tutorial.root.classList.add('hidden');
    try {
      localStorage.setItem('igopon_tutorial_seen', 'true');
    } catch (e) {
      // ignore
    }
    this.#setStatus(t('status.tutorialComplete'), 4000);
  }

  #resetFeedbackForm(): void {
    this.#shell.feedback.textarea.value = '';
    this.#shell.feedback.commentSection.classList.add('hidden');
    this.#shell.feedback.commentToggleBtn.classList.remove('hidden');

    // Reset radios to default
    const setRadio = (options: NodeListOf<HTMLInputElement>, value: string) => {
      options.forEach(opt => {
        opt.checked = opt.value === value;
      });
    };
    setRadio(this.#shell.feedback.difficultyOptions, 'normal');
    setRadio(this.#shell.feedback.funOptions, 'normal');
  }

  async #submitFeedback(withComment: boolean): Promise<void> {
    const getRadioValue = (options: NodeListOf<HTMLInputElement>) => {
      return Array.from(options).find(opt => opt.checked)?.value || '';
    };

    const difficulty = getRadioValue(this.#shell.feedback.difficultyOptions);
    const fun = getRadioValue(this.#shell.feedback.funOptions);
    const comment = withComment ? this.#shell.feedback.textarea.value.trim() : '';

    if (!difficulty || !fun) {
      this.#setStatus(t('status.selectRating'), 3000);
      return;
    }

    try {
      await submitFeedback({ difficulty, fun, comment });
      logger.info('feedback_submit_success', 'Feedback submitted', {
        context: { difficulty, fun, hasComment: comment.length > 0 }
      });
      this.#shell.feedback.root.classList.add('hidden');
      this.#setStatus(t('status.feedbackThanks'), 4000);
    } catch (e) {
      logger.error('feedback_submit_failed', 'Feedback submission failed', {
        context: { error: String(e) },
        ai_todo: 'Check feedback submission API error'
      });
      console.error('Failed to submit feedback', e);
      this.#setStatus(t('status.submitFailed'), 4000);
    }
  }

  #loadPlayerName(): void {
    try {
      const name = localStorage.getItem('igopon_player_name');
      if (name) {
        this.#shell.playerNameInput.value = name;
      }
    } catch (e) {
      console.warn('Failed to load player name:', e);
    }
  }

  #savePlayerName(name: string): void {
    try {
      if (name) {
        localStorage.setItem('igopon_player_name', name);
      } else {
        localStorage.removeItem('igopon_player_name');
      }
    } catch (e) {
      console.warn('Failed to save player name:', e);
    }
  }

  #setupInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.#deferredInstallPrompt = e;

      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isMobile) {
        this.#shell.installBtn.classList.remove('hidden');
      }
    });

    this.#shell.installBtn.addEventListener('click', async () => {
      if (!this.#deferredInstallPrompt) {
        return;
      }
      this.#deferredInstallPrompt.prompt();
      await this.#deferredInstallPrompt.userChoice;

      this.#deferredInstallPrompt = null;
      this.#shell.installBtn.classList.add('hidden');
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
      this.#engine.pause(t('status.tabHidden'));
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
      this.#se.unlock();
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
    this.#shell.stats.score.textContent = formatNumber(state.score);
    this.#shell.stats.headerScore.textContent = formatNumber(state.score);
    this.#shell.stats.pieces.textContent = formatNumber(state.piecesPlaced);
  }

  #renderOverlay(state: GameSessionState): void {
    if (state.active) {
      this.#shell.overlay.root.classList.add('hidden');
      return;
    }
    this.#shell.overlay.root.classList.remove('hidden');
    const summary = state.lastResult;
    const finalScore = summary?.finalScore ?? 0;
    this.#shell.overlay.title.textContent = summary?.reason ?? t('overlay.standby');
    let detail = t('overlay.instruction');
    if (summary) {
      if (this.#lastResultExtras) {
        const timestamp = new Date(summary.timestamp).toLocaleString(getLocale() === 'ja' ? 'ja-JP' : 'en-US');
        detail = `${timestamp} / ${t('overlay.chain')} ${this.#lastResultExtras.chain} / ${t('overlay.captureB')}${this.#lastResultExtras.captures.black} ${t('overlay.captureW')}${this.#lastResultExtras.captures.white}`;
      } else {
        detail = new Date(summary.timestamp).toLocaleString(getLocale() === 'ja' ? 'ja-JP' : 'en-US');
      }
    }
    this.#shell.overlay.detail.textContent = detail;
    this.#shell.overlay.finalScore.textContent = formatNumber(finalScore);
    this.#shell.overlay.bestScore.textContent = formatNumber(this.#highScore);
  }

  #updatePrimaryAction(state: GameSessionState): void {
    this.#shell.startBtnDesktop.textContent = state.active ? t('button.restart') : t('button.start');
  }

  #updateBgmUI(): void {
    const enabled = this.#bgm.preference;
    // Update both the toggle button text/state
    this.#shell.bgmToggleBtn.textContent = enabled ? t('menu.bgmOn') : t('menu.bgmOff');
    this.#shell.bgmToggleBtn.setAttribute('aria-pressed', String(enabled));
  }

  async #initializeLeaderboards(): Promise<void> {
    this.#shell.leaderboard.dateLabel.textContent = formatDate(new Date());
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
      name.textContent = entry.name || t('player.anonymous');

      const score = document.createElement('span');
      score.className = 'score';
      score.textContent = formatNumber(Number(entry.score));

      item.append(rank, name, score);
      target.appendChild(item);
    });
  }

  // Date formatting delegated to i18n/index.ts formatDate()

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

  #openMenu(): void {
    const { active, paused } = this.#session.snapshot;

    // Toggle button visibility based on state
    this.#shell.menu.resumeBtn.classList.toggle('hidden', !active);
    this.#shell.menu.restartBtn.classList.toggle('hidden', !active);

    this.#shell.menu.root.classList.remove('hidden');

    // Auto-pause if active
    if (active && !paused) {
      this.#engine.pause(t('status.menuOpen'));
    }
  }

  #closeMenu(): void {
    this.#shell.menu.root.classList.add('hidden');

    // Auto-resume if active
    const { active, paused } = this.#session.snapshot;
    if (active && paused) {
      this.#engine.resume();
    }
  }
}
