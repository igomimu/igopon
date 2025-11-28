import { CELL_SIZE, COLS, GRID_MARGIN, ROWS } from '../../game/constants';

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
  score: HTMLSpanElement;
  level: HTMLSpanElement;
  chain: HTMLSpanElement;
  blackCaptures: HTMLSpanElement;
  whiteCaptures: HTMLSpanElement;
  pieces: HTMLSpanElement;
  headerScore: HTMLDivElement;
  headerScoreValue: HTMLSpanElement;
}

export interface OverlayElements {
  root: HTMLDivElement;
  title: HTMLHeadingElement;
  detail: HTMLParagraphElement;
  finalScore: HTMLSpanElement;
  bestScore: HTMLSpanElement;
  restartBtn: HTMLButtonElement;
}

export interface AppShellRefs {
  board: HTMLCanvasElement;
  boardPanel: HTMLElement;
  nextDesktop: HTMLCanvasElement;
  nextMobile: HTMLCanvasElement;
  startBtn: HTMLButtonElement;
  headerStartBtn: HTMLButtonElement;
  installBtn: HTMLButtonElement;
  bgmToggleBtn: HTMLButtonElement;
  bgmStatus: HTMLParagraphElement;
  statusMessage: HTMLDivElement;
  playerNameInput: HTMLInputElement;
  leaderboard: LeaderboardElements;
  mobileControls: MobileControls;
  stats: StatElements;
  overlay: OverlayElements;
  bgmAudio: HTMLAudioElement;
  mobileControlsRoot: HTMLElement;
}

const template = `
  <header class="app-header">
    <div class="header-title">
      <h1>いごぽん</h1>
      <button id="headerStartBtn" type="button" class="header-start-btn">GO!</button>
    </div>
    <div class="header-actions">
      <button id="bgmToggleBtn" type="button" class="header-bgm-btn toggle-button" aria-pressed="true">
        BGM オン
      </button>
      <button id="installBtn" type="button" class="header-install-btn hidden" aria-label="アプリをインストール">
        インストール
      </button>
      <div id="headerScore" class="header-score" aria-live="polite" aria-atomic="true">
        <span class="header-score-label">スコア</span>
        <span id="inGameScoreValue" class="header-score-value">0</span>
      </div>
    </div>
  </header>
  </header>
  <div class="app-body">
    <aside class="ad-slot left">
      <!-- Ad Space Left -->
      <div class="ad-placeholder">広告スペース</div>
    </aside>
    <main class="layout">
      <section class="board-panel">
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
      </section>
      <section class="mobile-controls" aria-label="タッチ操作">
        <div class="mobile-grid">
          <button id="mobileHardDropBtn" type="button" class="mobile-btn" aria-label="ハードドロップ">&#x21D3;</button>
          <button id="mobileLeftBtn" type="button" class="mobile-btn" aria-label="左に移動">&#x2190;</button>
          <button id="mobileRightBtn" type="button" class="mobile-btn" aria-label="右に移動">&#x2192;</button>
          <button id="mobileRotateBtn" type="button" class="mobile-btn" aria-label="回転">&#x21BB;</button>
        </div>
      </section>
      <aside class="sidebar">
        <section class="next-panel">
          <h2>次のグループ</h2>
          <canvas id="nextPiece" width="150" height="150" aria-label="次のピースプレビュー"></canvas>
        </section>
        <section class="player-panel">
          <h2>プレイヤー</h2>
          <label for="playerNameInput" class="player-name-label">名前</label>
          <input type="text" id="playerNameInput" maxlength="20" placeholder="プレイヤー名" autocomplete="name">
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
        <section class="stats-panel">
          <h2>ステータス</h2>
          <ul class="stat-list">
            <li>スコア: <span id="scoreValue">0</span></li>
            <li>レベル: <span id="levelValue">1</span></li>
            <li>チェイン: <span id="chainValue">0</span></li>
            <li>黒の捕獲数: <span id="blackCaptureValue">0</span></li>
            <li>白の捕獲数: <span id="whiteCaptureValue">0</span></li>
            <li>配置したピース: <span id="piecesValue">0</span></li>
          </ul>
        </section>
        <section class="control-panel">
          <button id="startBtn" type="button">スタート</button>
          <div class="audio-controls">
            <p id="bgmStatus" class="bgm-status">操作後にBGMを有効化できます。</p>
          </div>
          <div id="statusMessage" class="status-message" aria-live="polite"></div>
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
          <p>黒石は攻め、白石は守り。5行連続で捕獲するとレベルが上がり、落下速度が速くなります。</p>
          <p class="app-version">v${__APP_VERSION__}</p>
        </section>
      </aside>
    </main>
    <aside class="ad-slot right">
      <!-- Ad Space Right -->
      <div class="ad-placeholder">広告スペース</div>
    </aside>
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
    score: requireElement(target, '#scoreValue'),
    level: requireElement(target, '#levelValue'),
    chain: requireElement(target, '#chainValue'),
    blackCaptures: requireElement(target, '#blackCaptureValue'),
    whiteCaptures: requireElement(target, '#whiteCaptureValue'),
    pieces: requireElement(target, '#piecesValue'),
    headerScore: requireElement(target, '#headerScore'),
    headerScoreValue: requireElement(target, '#inGameScoreValue')
  };

  const overlay: OverlayElements = {
    root: requireElement(target, '#overlay'),
    title: requireElement(target, '#overlayTitle'),
    detail: requireElement(target, '#overlayDetail'),
    finalScore: requireElement(target, '#finalScore'),
    bestScore: requireElement(target, '#bestScore'),
    restartBtn: requireElement(target, '#restartBtn')
  };

  const mobileControls: MobileControls = {
    hardDrop: requireElement(target, '#mobileHardDropBtn'),
    left: requireElement(target, '#mobileLeftBtn'),
    right: requireElement(target, '#mobileRightBtn'),
    rotate: requireElement(target, '#mobileRotateBtn')
  };

  return {
    board: requireElement(target, '#board'),
    boardPanel,
    nextDesktop: requireElement(target, '#nextPiece'),
    nextMobile: requireElement(target, '#nextPieceMobile'),
    startBtn: requireElement(target, '#startBtn'),
    headerStartBtn: requireElement(target, '#headerStartBtn'),
    installBtn: requireElement(target, '#installBtn'),
    bgmToggleBtn: requireElement(target, '#bgmToggleBtn'),
    bgmStatus: requireElement(target, '#bgmStatus'),
    statusMessage: requireElement(target, '#statusMessage'),
    playerNameInput: requireElement(target, '#playerNameInput'),
    leaderboard,
    mobileControls,
    stats,
    overlay,
    bgmAudio: requireElement(target, '#bgmAudio'),
    mobileControlsRoot: requireElement(target, '.mobile-controls')
  };
}
