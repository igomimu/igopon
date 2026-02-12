import { CELL_SIZE, COLS, GRID_MARGIN, ROWS } from '../../game/constants';
import { t } from '../../i18n';
import { buildPrivacyPolicyHtml } from './privacy-policy';

const BOARD_CANVAS_WIDTH = (COLS - 1) * CELL_SIZE + GRID_MARGIN * 2;
const BOARD_CANVAS_HEIGHT = (ROWS - 1) * CELL_SIZE + GRID_MARGIN * 2;

export interface LeaderboardElements {
  dailyList: HTMLOListElement;
  weeklyList: HTMLOListElement;
  monthlyList: HTMLOListElement;
  dateLabel: HTMLParagraphElement;
  dailyEmpty: HTMLParagraphElement;
  weeklyEmpty: HTMLParagraphElement;
  monthlyEmpty: HTMLParagraphElement;
}

export interface MobileControls {
  left: HTMLButtonElement;
  right: HTMLButtonElement;
  rotate: HTMLButtonElement;
  hardDrop: HTMLButtonElement;
}

export interface StatElements {
  headerScore: HTMLSpanElement; // New
  score: HTMLSpanElement;
  level: HTMLSpanElement;
  chain: HTMLSpanElement;
  blackCaptures: HTMLSpanElement;
  whiteCaptures: HTMLSpanElement;
  pieces: HTMLSpanElement;
}

export interface OverlayElements {
  root: HTMLDivElement;
  title: HTMLHeadingElement;
  detail: HTMLParagraphElement;
  finalScore: HTMLSpanElement;
  bestScore: HTMLSpanElement;
  restartBtn: HTMLButtonElement;
}

export interface TutorialElements {
  root: HTMLElement;
  title: HTMLElement;
  step1: HTMLElement;
  step2: HTMLElement;
  step3: HTMLElement;
  nextBtn: HTMLButtonElement;
  skipBtn: HTMLButtonElement;
}

export interface FeedbackElements {
  root: HTMLDivElement;
  textarea: HTMLTextAreaElement;
  submitBtn: HTMLButtonElement;
  closeBtn: HTMLButtonElement;
  quickSubmitBtn: HTMLButtonElement;
  commentToggleBtn: HTMLButtonElement;
  commentSection: HTMLDivElement;
  difficultyOptions: NodeListOf<HTMLInputElement>;
  funOptions: NodeListOf<HTMLInputElement>;
}

export interface PrivacyElements {
  root: HTMLElement;
  closeBtn: HTMLButtonElement;
}

export interface MenuElements {
  root: HTMLElement;
  openBtn: HTMLButtonElement;
  resumeBtn: HTMLButtonElement;
  restartBtn: HTMLButtonElement;
  bgmToggleBtn: HTMLButtonElement;
  feedbackBtn: HTMLButtonElement;
  closeBtn: HTMLButtonElement;
}



export interface AppShellRefs {
  board: HTMLCanvasElement;
  boardPanel: HTMLElement;
  nextDesktop: HTMLCanvasElement;
  nextMobile: HTMLCanvasElement;
  startBtnDesktop: HTMLButtonElement;

  feedbackBtn: HTMLButtonElement;
  installBtn: HTMLButtonElement;
  bgmToggleBtn: HTMLButtonElement;
  statusMessage: HTMLDivElement;
  playerNameInput: HTMLInputElement;
  leaderboard: LeaderboardElements;
  mobileControls: MobileControls;
  stats: StatElements;
  overlay: OverlayElements;

  feedback: FeedbackElements;
  privacy: PrivacyElements;
  menu: MenuElements;

  tutorial: TutorialElements;
  bgmAudio: HTMLAudioElement;
  mobileControlsRoot: HTMLElement;
}

function buildTemplate(): string {
  return `
  <header class="app-header">
    <div class="header-title">
      <h1>${t('app.title')}</h1>
      <div class="header-score" aria-label="${t('header.scoreLabel')}">
        <span class="header-score-label">SCORE</span>
        <span id="headerScoreValue" class="header-score-value">0</span>
      </div>
    </div>

    <div class="header-actions">
      <button id="menuBtn" type="button" class="header-menu-btn" aria-label="${t('header.menuLabel')}">
        <svg class="menu-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="6" y="4" width="4" height="16" rx="1"></rect>
          <rect x="14" y="4" width="4" height="16" rx="1"></rect>
        </svg>
      </button>

      <button id="installBtn" type="button" class="header-install-btn hidden" aria-label="${t('header.installLabel')}">
        ${t('header.installText')}
      </button>
    </div>
  </header>
  <div class="app-body">

    <main class="layout">
      <section class="primary-stats-panel">
          <div class="primary-stat-item stat-item-score">
            <span class="stat-label">SCORE</span>
            <span id="scoreValue" class="stat-value-large">0</span>
          </div>
          <div class="primary-stat-item stat-item-level">
            <span class="stat-label">LEVEL</span>
            <span id="levelValue" class="stat-value-large">1</span>
          </div>
          <ul class="stat-list hidden-stats" style="display:none;">
             <li>${t('stats.chain')} <span id="chainValue">0</span></li>
             <li>${t('stats.blackCaptures')} <span id="blackCaptureValue">0</span></li>
             <li>${t('stats.whiteCaptures')} <span id="whiteCaptureValue">0</span></li>
             <li>${t('stats.piecesPlaced')} <span id="piecesValue">0</span></li>
          </ul>
        </section>
        <section class="next-panel large-preview">
          <h2>${t('next.title')}</h2>
          <div class="next-piece-container">
             <canvas id="nextPiece" width="75" height="75" aria-label="${t('next.previewLabel')}"></canvas>
          </div>
        </section>
        <section class="control-panel">
          <div class="sub-controls">
             <button id="startBtnDesktop" type="button" class="primary-action-btn sidebar-start-btn">${t('button.start')}</button>
             <button id="feedbackBtn" type="button" class="secondary">${t('button.feedback')}</button>
          </div>
          <div class="audio-controls">
          </div>
          <div id="statusMessage" class="status-message" aria-live="polite"></div>
        </section>

      <section class="board-panel">
        <canvas
          id="board"
          width="${BOARD_CANVAS_WIDTH}"
          height="${BOARD_CANVAS_HEIGHT}"
          aria-label="${t('board.label')}"
        ></canvas>
        <div class="board-next-mobile" aria-hidden="true">
          <span class="board-next-mobile-label">${t('next.title')}</span>
          <canvas id="nextPieceMobile" width="75" height="75" role="img" aria-label="${t('next.previewMobileLabel')}"></canvas>
        </div>
        <div id="overlay" class="overlay hidden" role="status" aria-live="polite">
          <h2 id="overlayTitle">${t('overlay.standby')}</h2>
          <div class="overlay-score">
            <span class="overlay-label">${t('overlay.thisScore')}</span>
            <span id="finalScore" class="overlay-value">0</span>
          </div>
          <div class="overlay-score secondary">
            <span class="overlay-label">${t('overlay.bestScore')}</span>
            <span id="bestScore" class="overlay-value">0</span>
          </div>
          <p id="overlayDetail" class="overlay-detail">${t('overlay.instruction')}</p>
          <button id="restartBtn" type="button">${t('button.go')}</button>
        </div>
        <div id="tutorialOverlay" class="overlay hidden" role="dialog" aria-modal="true" aria-label="${t('tutorial.label')}">
          <h2 id="tutorialTitle">${t('tutorial.title')}</h2>
          <div class="tutorial-content">
            <div id="tutorialStep1" class="tutorial-step">
              <div class="tutorial-icon">↔️</div>
              <p>${t('tutorial.step1')}</p>
            </div>
            <div id="tutorialStep2" class="tutorial-step hidden">
              <div class="tutorial-icon">🔄</div>
              <p>${t('tutorial.step2')}</p>
            </div>
            <div id="tutorialStep3" class="tutorial-step hidden">
              <div class="tutorial-icon">⚪⚫⚪</div>
              <p>${t('tutorial.step3')}</p>
            </div>
          </div>
          <button id="tutorialNextBtn" type="button">${t('button.next')}</button>
          <button id="tutorialSkipBtn" type="button" class="text-button">${t('button.skip')}</button>
        </div>
        <div id="feedbackModal" class="overlay hidden" role="dialog" aria-modal="true" aria-label="${t('feedback.title')}">
          <h2>${t('feedback.title')}</h2>

          <div class="feedback-section">
            <p class="feedback-label">${t('feedback.difficultyQuestion')}</p>
            <div class="rating-group" id="difficultyRating">
              <label><input type="radio" name="difficulty" value="easy"><span>${t('feedback.easy')}</span></label>
              <label><input type="radio" name="difficulty" value="normal" checked><span>${t('feedback.normal')}</span></label>
              <label><input type="radio" name="difficulty" value="hard"><span>${t('feedback.hard')}</span></label>
            </div>
          </div>

          <div class="feedback-section">
            <p class="feedback-label">${t('feedback.funQuestion')}</p>
            <div class="rating-group" id="funRating">
              <label><input type="radio" name="fun" value="not_fun"><span>${t('feedback.notFun')}</span></label>
              <label><input type="radio" name="fun" value="normal" checked><span>${t('feedback.normal')}</span></label>
              <label><input type="radio" name="fun" value="awesome"><span>${t('feedback.awesome')}</span></label>
            </div>
          </div>

          <div class="feedback-actions main-actions">
            <button id="quickSubmitBtn" type="button">${t('button.sendAsIs')}</button>
            <button id="commentToggleBtn" type="button" class="secondary">${t('button.addComment')}</button>
          </div>

          <div id="feedbackCommentSection" class="feedback-comment-section hidden">
            <textarea id="feedbackText" class="feedback-textarea" placeholder="${t('feedback.placeholder')}" rows="3"></textarea>
            <div class="feedback-actions">
              <button id="feedbackSubmitBtn" type="button">${t('button.send')}</button>
            </div>
          </div>

          <button id="feedbackCloseBtn" type="button" class="close-icon" aria-label="${t('button.close')}">×</button>
        </div>

        <div class="mobile-controls">
          <div class="mobile-grid">
            <button id="mobileLeftBtn" class="mobile-btn" aria-label="${t('mobile.left')}">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 12H5"></path>
                <path d="M12 19l-7-7 7-7"></path>
              </svg>
            </button>
            <button id="mobileRightBtn" class="mobile-btn" aria-label="${t('mobile.right')}">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 12h14"></path>
                <path d="M12 5l7 7-7 7"></path>
              </svg>
            </button>
            <button id="mobileRotateBtn" class="mobile-btn" aria-label="${t('mobile.rotate')}">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21.5 2v6h-6"></path>
                <path d="M21.34 15.57a10 10 0 1 1-.57-8.38L21.5 8"></path>
              </svg>
            </button>
            <button id="mobileHardDropBtn" class="mobile-btn" aria-label="${t('mobile.hardDrop')}">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 3v14"></path>
                <path d="M19 10l-7 7-7-7"></path>
                <line x1="5" y1="21" x2="19" y2="21"></line>
              </svg>
            </button>
          </div>
        </div>
    </section>

    ${buildPrivacyPolicyHtml()}

    <div id="gameMenuModal" class="overlay hidden" role="dialog" aria-modal="true" aria-label="${t('menu.label')}">
      <h2>${t('menu.title')}</h2>
      <div class="menu-list">
        <button id="menuResumeBtn" type="button" class="menu-btn primary">${t('menu.resume')}</button>
        <button id="menuRestartBtn" type="button" class="menu-btn danger">${t('menu.restart')}</button>
        <button id="menuBgmToggleBtn" type="button" class="menu-btn toggle" aria-pressed="true">${t('menu.bgmOn')}</button>
        <button id="menuFeedbackBtn" type="button" class="menu-btn secondary">${t('button.feedback')}</button>
        <button id="menuCloseBtn" type="button" class="menu-btn close">${t('button.close')}</button>
      </div>
    </div>

        <section class="player-panel">
          <div class="player-input-row">
            <svg class="player-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <input type="text" id="playerNameInput" maxlength="20" placeholder="${t('player.placeholder')}" autocomplete="name" aria-label="${t('player.placeholder')}">
          </div>
        </section>
        <section class="help-panel">
          <h2>${t('help.title')}</h2>
          <p>${t('help.description')}</p>
          <ul>
            <li>&#x2190; / &#x2192;: ${t('help.moveLeftRight')}</li>
            <li>&#x2191;: ${t('help.rotate')}</li>
            <li>Space: ${t('help.hardDrop')}</li>
            <li>P: ${t('help.pauseResume')}</li>
          </ul>
          <p>${t('help.levelUp')}</p>
          <p class="app-version">
            v\${__APP_VERSION__} /
            <button id="privacyOpenBtn" type="button" class="text-link-btn" style="background:none; border:none; padding:0; color:inherit; text-decoration:underline; cursor:pointer; font-size:inherit;">
              ${t('help.policy')}
            </button>
          </p>
        </section>
        <section class="leaderboard-panel" aria-live="polite">
          <h2>${t('leaderboard.title')}</h2>
          <div class="leaderboard-group">
            <h3>${t('leaderboard.daily')}</h3>
            <p id="leaderboardDate" class="leaderboard-date"></p>
            <p id="leaderboardEmpty" class="leaderboard-empty">${t('leaderboard.empty')}</p>
            <ol id="dailyLeaderboard" class="leaderboard-list"></ol>
          </div>
          <div class="leaderboard-group">
            <h3>${t('leaderboard.weekly')}</h3>
            <p id="weeklyLeaderboardEmpty" class="leaderboard-empty">${t('leaderboard.empty')}</p>
            <ol id="weeklyLeaderboard" class="leaderboard-list"></ol>
          </div>
          <div class="leaderboard-group">
            <h3>${t('leaderboard.monthly')}</h3>
            <p id="monthlyLeaderboardEmpty" class="leaderboard-empty">${t('leaderboard.empty')}</p>
            <ol id="monthlyLeaderboard" class="leaderboard-list"></ol>
          </div>
        </section>
    </main>

  </div>
  <audio id="bgmAudio" class="sr-only" preload="auto" loop></audio>
`;
}

function requireElement<T extends HTMLElement>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Missing element: ${selector}`);
  }
  return element;
}

export function mountAppShell(target: HTMLElement): AppShellRefs {
  target.innerHTML = buildTemplate();

  const boardPanel = requireElement<HTMLElement>(target, '.board-panel');
  const leaderboard: LeaderboardElements = {
    dailyList: requireElement(target, '#dailyLeaderboard'),
    weeklyList: requireElement(target, '#weeklyLeaderboard'),
    monthlyList: requireElement(target, '#monthlyLeaderboard'),
    dateLabel: requireElement(target, '#leaderboardDate'),
    dailyEmpty: requireElement(target, '#leaderboardEmpty'),
    weeklyEmpty: requireElement(target, '#weeklyLeaderboardEmpty'),
    monthlyEmpty: requireElement(target, '#monthlyLeaderboardEmpty')
  };

  const stats: StatElements = {
    headerScore: requireElement(target, '#headerScoreValue'),
    score: requireElement(target, '#scoreValue'),
    level: requireElement(target, '#levelValue'),
    chain: requireElement(target, '#chainValue'),
    blackCaptures: requireElement(target, '#blackCaptureValue'),
    whiteCaptures: requireElement(target, '#whiteCaptureValue'),
    pieces: requireElement(target, '#piecesValue')
  };

  const overlay: OverlayElements = {
    root: requireElement(target, '#overlay'),
    title: requireElement(target, '#overlayTitle'),
    detail: requireElement(target, '#overlayDetail'),
    finalScore: requireElement(target, '#finalScore'),
    bestScore: requireElement(target, '#bestScore'),
    restartBtn: requireElement(target, '#restartBtn')
  };

  const tutorial = {
    root: requireElement(target, '#tutorialOverlay'),
    title: requireElement(target, '#tutorialTitle'),
    step1: requireElement(target, '#tutorialStep1'),
    step2: requireElement(target, '#tutorialStep2'),
    step3: requireElement(target, '#tutorialStep3'),
    nextBtn: requireElement<HTMLButtonElement>(target, '#tutorialNextBtn'),
    skipBtn: requireElement<HTMLButtonElement>(target, '#tutorialSkipBtn')
  };

  const feedback: FeedbackElements = {
    root: requireElement(target, '#feedbackModal'),
    textarea: requireElement(target, '#feedbackText'),
    submitBtn: requireElement(target, '#feedbackSubmitBtn'),
    closeBtn: requireElement(target, '#feedbackCloseBtn'),
    quickSubmitBtn: requireElement(target, '#quickSubmitBtn'),
    commentToggleBtn: requireElement(target, '#commentToggleBtn'),
    commentSection: requireElement(target, '#feedbackCommentSection'),
    difficultyOptions: target.querySelectorAll('input[name="difficulty"]'),
    funOptions: target.querySelectorAll('input[name="fun"]')
  };

  const privacy: PrivacyElements = {
    root: requireElement(target, '#privacyPolicyModal'),
    closeBtn: requireElement(target, '#privacyCloseBtn')
  };



  const mobileControls: MobileControls = {
    hardDrop: requireElement(target, '#mobileHardDropBtn'),
    left: requireElement(target, '#mobileLeftBtn'),
    right: requireElement(target, '#mobileRightBtn'),
    rotate: requireElement(target, '#mobileRotateBtn')
  };

  const menu: MenuElements = {
    root: requireElement(target, '#gameMenuModal'),
    openBtn: requireElement(target, '#menuBtn'),
    resumeBtn: requireElement(target, '#menuResumeBtn'),
    restartBtn: requireElement(target, '#menuRestartBtn'),
    bgmToggleBtn: requireElement(target, '#menuBgmToggleBtn'),
    feedbackBtn: requireElement(target, '#menuFeedbackBtn'),
    closeBtn: requireElement(target, '#menuCloseBtn')
  };

  return {
    board: requireElement(target, '#board'),
    boardPanel,
    nextDesktop: requireElement(target, '#nextPiece'),
    nextMobile: requireElement(target, '#nextPieceMobile'),
    startBtnDesktop: requireElement(target, '#startBtnDesktop'),
    feedbackBtn: requireElement(target, '#feedbackBtn'), // Keep desktop feedback btn ref
    installBtn: requireElement(target, '#installBtn'),
    bgmToggleBtn: menu.bgmToggleBtn, // Alias to the one in menu for compatibility
    statusMessage: requireElement(target, '#statusMessage'),
    playerNameInput: requireElement(target, '#playerNameInput'),
    leaderboard,
    mobileControls,
    stats,
    overlay,
    feedback,
    privacy,
    menu,

    bgmAudio: requireElement(target, '#bgmAudio'),
    mobileControlsRoot: requireElement(target, '.mobile-controls'),
    tutorial
  };
}
