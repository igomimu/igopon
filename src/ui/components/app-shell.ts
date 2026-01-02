import { CELL_SIZE, COLS, GRID_MARGIN, ROWS } from '../../game/constants';
import { PRIVACY_POLICY_HTML } from './privacy-policy';

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
  startBtnMobile: HTMLButtonElement;

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

const template = `
  <header class="app-header">
    <div class="header-title">
      <h1>いごぽん</h1>
      <div class="header-score" aria-label="現在のスコア">
        <span class="header-score-label">SCORE</span>
        <span id="headerScoreValue" class="header-score-value">0</span>
      </div>
    </div>

    <div class="header-actions">
      <button id="menuBtn" type="button" class="header-menu-btn" aria-label="メニュー">
        <svg class="menu-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>

      <button id="installBtn" type="button" class="header-install-btn hidden" aria-label="アプリをインストール">
        インストール
      </button>
    </div>
  </header>
  <div class="app-body">

    <main class="layout">
      <aside class="info-column left">
        <section class="primary-stats-panel">
          <div class="primary-stat-item">
            <span class="stat-label">SCORE</span>
            <span id="scoreValue" class="stat-value-large">0</span>
          </div>
          <div class="primary-stat-item">
            <span class="stat-label">LEVEL</span>
            <span id="levelValue" class="stat-value-large">1</span>
          </div>
          <!-- Hidden secondary stats for internal logic updates, or move them to a detail view if needed. 
               For now, keeping them in DOM but hidden or smaller if user didn't ask to remove them completely.
               Actually, the user listed "Current Score / Level" as "Always Visible". 
               "Chain", "Captures" might be less important but "Captures" is part of the game rules (5 lines to level up).
               I will keep them in a "sub-stats" list below or just keep them in the DOM for now.
               Let's keep the existing IDs so logic doesn't break.
          -->
          <ul class="stat-list hidden-stats" style="display:none;">
             <li>チェイン: <span id="chainValue">0</span></li>
             <li>黒の捕獲数: <span id="blackCaptureValue">0</span></li>
             <li>白の捕獲数: <span id="whiteCaptureValue">0</span></li>
             <li>配置したピース: <span id="piecesValue">0</span></li>
          </ul>
        </section>
        <section class="next-panel large-preview">
          <h2>次のグループ</h2>
          <div class="next-piece-container">
             <canvas id="nextPiece" width="75" height="75" aria-label="次のピースプレビュー"></canvas>
          </div>
        </section>
        <section class="control-panel">
          <div class="sub-controls">
             <button id="startBtnDesktop" type="button" class="primary-action-btn sidebar-start-btn">スタート</button>
             <button id="feedbackBtn" type="button" class="secondary">フィードバック</button>
          </div>
          <div class="audio-controls">
          </div>
          <div id="statusMessage" class="status-message" aria-live="polite"></div>
        </section>
      </aside>

      <section class="board-panel">
        <div class="board-header-controls mobile-only">
           <button id="startBtnMobile" type="button" class="primary-action-btn board-start-btn">スタート</button>
        </div>
        <canvas
          id="board"
          width="${BOARD_CANVAS_WIDTH}"
          height="${BOARD_CANVAS_HEIGHT}"
          aria-label="プレイフィールド"
        ></canvas>
        <div class="board-next-mobile" aria-hidden="true">
          <span class="board-next-mobile-label">次のグループ</span>
          <canvas id="nextPieceMobile" width="75" height="75" role="img" aria-label="次のピースプレビュー（モバイル）"></canvas>
        </div>
        <div id="overlay" class="overlay hidden" role="status" aria-live="polite">
          <h2 id="overlayTitle">スタンバイ中</h2>
          <div class="overlay-score">
            <span class="overlay-label">今回のハイスコア</span>
            <span id="finalScore" class="overlay-value">0</span>
          </div>
          <div class="overlay-score secondary">
            <span class="overlay-label">自己最高スコア</span>
            <span id="bestScore" class="overlay-value">0</span>
          </div>
          <p id="overlayDetail" class="overlay-detail">GO! を押してゲームを開始してください。</p>
          <button id="restartBtn" type="button">GO!</button>
        </div>
        <div id="tutorialOverlay" class="overlay hidden" role="dialog" aria-modal="true" aria-label="チュートリアル">
          <h2 id="tutorialTitle">遊び方</h2>
          <div class="tutorial-content">
            <div id="tutorialStep1" class="tutorial-step">
              <div class="tutorial-icon">↔️</div>
              <p>左右キーで移動</p>
            </div>
            <div id="tutorialStep2" class="tutorial-step hidden">
              <div class="tutorial-icon">🔄</div>
              <p>上キーで回転</p>
            </div>
            <div id="tutorialStep3" class="tutorial-step hidden">
              <div class="tutorial-icon">⚪⚫⚪</div>
              <p>囲んで捕獲！</p>
            </div>
          </div>
          <button id="tutorialNextBtn" type="button">次へ</button>
          <button id="tutorialSkipBtn" type="button" class="text-button">スキップ</button>
        </div>
        <div id="feedbackModal" class="overlay hidden" role="dialog" aria-modal="true" aria-label="フィードバック">
          <h2>フィードバック</h2>
          
          <div class="feedback-section">
            <p class="feedback-label">難易度はどうでしたか？</p>
            <div class="rating-group" id="difficultyRating">
              <label><input type="radio" name="difficulty" value="簡単"><span>簡単</span></label>
              <label><input type="radio" name="difficulty" value="普通" checked><span>普通</span></label>
              <label><input type="radio" name="difficulty" value="難しい"><span>難しい</span></label>
            </div>
          </div>

          <div class="feedback-section">
            <p class="feedback-label">面白かったですか？</p>
            <div class="rating-group" id="funRating">
              <label><input type="radio" name="fun" value="いまいち"><span>いまいち</span></label>
              <label><input type="radio" name="fun" value="普通" checked><span>普通</span></label>
              <label><input type="radio" name="fun" value="最高!"><span>最高!</span></label>
            </div>
          </div>

          <div class="feedback-actions main-actions">
            <button id="quickSubmitBtn" type="button">そのまま送る</button>
            <button id="commentToggleBtn" type="button" class="secondary">ひと言コメント</button>
          </div>

          <div id="feedbackCommentSection" class="feedback-comment-section hidden">
            <textarea id="feedbackText" class="feedback-textarea" placeholder="ご意見・ご感想をお聞かせください..." rows="3"></textarea>
            <div class="feedback-actions">
              <button id="feedbackSubmitBtn" type="button">送信</button>
            </div>
          </div>

          <button id="feedbackCloseBtn" type="button" class="close-icon" aria-label="閉じる">×</button>
        </div>

        <div class="mobile-controls">
          <div class="mobile-grid">
            <button id="mobileLeftBtn" class="mobile-btn" aria-label="左移動">←</button>
            <button id="mobileRightBtn" class="mobile-btn" aria-label="右移動">→</button>
            <button id="mobileRotateBtn" class="mobile-btn" aria-label="回転">↻</button>
            <button id="mobileHardDropBtn" class="mobile-btn" aria-label="ハードドロップ">⇩</button>
          </div>
        </div>
    </section>
    
    ${PRIVACY_POLICY_HTML}

    <div id="gameMenuModal" class="overlay hidden" role="dialog" aria-modal="true" aria-label="ゲームメニュー">
      <h2>メニュー</h2>
      <div class="menu-list">
        <button id="menuResumeBtn" type="button" class="menu-btn primary">ゲームに戻る</button>
        <button id="menuRestartBtn" type="button" class="menu-btn danger">最初からやり直す</button>
        <button id="menuBgmToggleBtn" type="button" class="menu-btn toggle" aria-pressed="true">BGM オン</button>
        <button id="menuFeedbackBtn" type="button" class="menu-btn secondary">フィードバック</button>
        <button id="menuCloseBtn" type="button" class="menu-btn close">閉じる</button>
      </div>
    </div>

      <aside class="info-column right">
        <section class="player-panel">
          <h2>プレイヤー</h2>
          <label for="playerNameInput" class="player-name-label">名前</label>
          <input type="text" id="playerNameInput" maxlength="20" placeholder="プレイヤー名" autocomplete="name">
        </section>
        <section class="help-panel">
          <h2>遊び方</h2>
          <p>石を落として連結させ、囲んだ石を捕獲すると得点が入ります。</p>
          <ul>
            <li>&#x2190; / &#x2192;: 左右に移動</li>
            <li>&#x2191;: 回転</li>
            <li>&#x2193;: ソフトドロップ</li>
            <li>スペース: ハードドロップ</li>
            <li>P: 一時停止 / 再開</li>
          </ul>
          <p>5行連続で捕獲するとレベルが上がり、落下速度が速くなります。</p>
          <p class="app-version">
            v${__APP_VERSION__} / 
            <button id="privacyOpenBtn" type="button" class="text-link-btn" style="background:none; border:none; padding:0; color:inherit; text-decoration:underline; cursor:pointer; font-size:inherit;">
              規約・ポリシー
            </button>
          </p>
        </section>
        <section class="leaderboard-panel" aria-live="polite">
          <h2>ランキング</h2>
          <div class="leaderboard-group">
            <h3>本日のベストスコア</h3>
            <p id="leaderboardDate" class="leaderboard-date"></p>
            <p id="leaderboardEmpty" class="leaderboard-empty">まだスコアがありません。</p>
            <ol id="dailyLeaderboard" class="leaderboard-list"></ol>
          </div>
          <div class="leaderboard-group">
            <h3>今週のベストスコア</h3>
            <p id="weeklyLeaderboardEmpty" class="leaderboard-empty">まだスコアがありません。</p>
            <ol id="weeklyLeaderboard" class="leaderboard-list"></ol>
          </div>
          <div class="leaderboard-group">
            <h3>今月のベストスコア</h3>
            <p id="monthlyLeaderboardEmpty" class="leaderboard-empty">まだスコアがありません。</p>
            <ol id="monthlyLeaderboard" class="leaderboard-list"></ol>
          </div>
        </section>
      </aside>
    </main>

  </div>
  <audio id="bgmAudio" class="sr-only" preload="auto" loop></audio>
`;

function requireElement<T extends HTMLElement>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Missing element: ${selector}`);
  }
  return element;
}

export function mountAppShell(target: HTMLElement): AppShellRefs {
  target.innerHTML = template;

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
    startBtnMobile: requireElement(target, '#startBtnMobile'),
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
