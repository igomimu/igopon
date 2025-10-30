const ROWS = 20;
const COLS = 10;
const CELL_SIZE = 30;
const BASE_DROP_INTERVAL = 900;
const DIRECTIONS = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1]
];

const CELL_EMPTY = 0;
const CELL_BLACK = 1;
const CELL_WHITE = 2;
const CELL_BLOCK_BLACK = 3;
const CELL_BLOCK_WHITE = 4;
const CELL_EYE_BLACK = 5;
const CELL_EYE_WHITE = 6;

const MIN_PIECES_BEFORE_EYE_FRAME = 14;
const EYE_FRAME_DROP_CHANCE = 0.12;
const EYE_FRAME_COOLDOWN_PIECES = 6;
const EYE_FRAME_CLEAR_THRESHOLD = 20;

const EYE_FRAME_CENTER_OFFSET = { row: 0, col: 0 };
const EYE_FRAME_RING_OFFSETS = [
    { row: -1, col: -1 },
    { row: 0, col: -1 },
    { row: 1, col: -1 },
    { row: -1, col: 0 },
    { row: 1, col: 0 },
    { row: -1, col: 1 },
    { row: 0, col: 1 },
    { row: 1, col: 1 }
];

let specialPieceQueue = [];
let activeEyeFrames = [];

function clonePiece(piece) {
    if (!piece) {
        return null;
    }
    return {
        ...piece,
        cells: piece.cells.map(cell => ({ ...cell })),
        position: piece.position ? { ...piece.position } : { row: 0, col: 0 }
    };
}

function createEyeFramePiecePrototype(stoneColor) {
    const eyeBoardValue = stoneColor === CELL_BLACK ? CELL_EYE_BLACK : CELL_EYE_WHITE;
    const cells = [
        {
            row: 1,
            col: 1,
            color: stoneColor,
            boardValue: CELL_EMPTY,
            drawValue: null,
            lockOnPlace: true,
            isEyeCenter: true
        }
    ];
    EYE_FRAME_RING_OFFSETS.forEach(offset => {
        cells.push({
            row: 1 + offset.row,
            col: 1 + offset.col,
            color: stoneColor,
            boardValue: stoneColor,
            lockOnPlace: true
        });
    });
    return {
        name: 'EyeFrame',
        cells,
        width: 3,
        height: 3,
        rotation: 0,
        position: {
            row: -2,
            col: Math.floor((COLS - 3) / 2)
        },
        isEyeFrame: true,
        stoneColor
    };
}

function pullNextPiecePrototype() {
    if (specialPieceQueue.length > 0) {
        return clonePiece(specialPieceQueue.shift());
    }
    return instantiatePiece(randomTemplate());
}

function enqueueEyeFramePiece(stoneColor, prioritizeNext = false) {
    const prototype = createEyeFramePiecePrototype(stoneColor);
    if (!currentPiece && !prioritizeNext) {
        specialPieceQueue.unshift(prototype);
        return;
    }
    if (prioritizeNext || !nextPiece) {
        if (nextPiece) {
            specialPieceQueue.unshift(clonePiece(nextPiece));
        }
        nextPiece = prototype;
        updatePreview();
    } else if (!nextPiece.isEyeFrame) {
        specialPieceQueue.unshift(prototype);
    } else {
        specialPieceQueue.push(prototype);
    }
}

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('nextPiece');
const nextCtx = nextCanvas.getContext('2d');

const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayDetail = document.getElementById('overlayDetail');
const finalScoreValue = document.getElementById('finalScore');
const bestScoreValue = document.getElementById('bestScore');
const restartBtn = document.getElementById('restartBtn');

const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const statusMessageEl = document.getElementById('statusMessage');

const scoreValue = document.getElementById('scoreValue');
const levelValue = document.getElementById('levelValue');
const chainValue = document.getElementById('chainValue');
const blackCaptureValue = document.getElementById('blackCaptureValue');
const whiteCaptureValue = document.getElementById('whiteCaptureValue');
const piecesValue = document.getElementById('piecesValue');
const inGameScoreValue = document.getElementById('inGameScoreValue');
const mobileLeftBtn = document.getElementById('mobileLeftBtn');
const mobileRightBtn = document.getElementById('mobileRightBtn');
const mobileRotateBtn = document.getElementById('mobileRotateBtn');
const mobileSoftDropBtn = document.getElementById('mobileSoftDropBtn');
const mobileHardDropBtn = document.getElementById('mobileHardDropBtn');
const mobilePauseBtn = document.getElementById('mobilePauseBtn');
const headerStartBtn = document.getElementById('headerStartBtn');
const headerScore = document.getElementById('headerScore');
const playerNameInput = document.getElementById('playerNameInput');
const dailyLeaderboardList = document.getElementById('dailyLeaderboard');
const leaderboardEmpty = document.getElementById('leaderboardEmpty');
const leaderboardDateLabel = document.getElementById('leaderboardDate');
const weeklyLeaderboardList = document.getElementById('weeklyLeaderboard');
const weeklyLeaderboardEmpty = document.getElementById('weeklyLeaderboardEmpty');
const monthlyLeaderboardList = document.getElementById('monthlyLeaderboard');
const monthlyLeaderboardEmpty = document.getElementById('monthlyLeaderboardEmpty');
const bgmToggleBtn = document.getElementById('bgmToggleBtn');
const bgmStatusLabel = document.getElementById('bgmStatus');

const PAUSE_ICON = '\u23F8';
const RESUME_ICON = '\u25B6';
const SUPPORTS_POINTER = window.PointerEvent !== undefined;

const GRID_MARGIN = CELL_SIZE / 2;
const CAPTURE_PARTICLE_FACTOR = 10;
const PARTICLE_GRAVITY = 320;
const PARTICLE_FRICTION = 0.86;
const CAPTURE_FLASH_LIFE = 220;
const CAPTURE_EFFECT_CONFIG = {
    1: {
        sparkColors: ['#8ec5ff', '#cfe9ff', '#ffffff'],
        ringColor: 'rgba(142, 197, 255, 0.85)'
    },
    2: {
        sparkColors: ['#ffd166', '#ffba5a', '#fff3c4'],
        ringColor: 'rgba(255, 210, 102, 0.9)'
    }
};

const CAPTURE_COLOR_ANIM_DURATION = 400;
const CAPTURE_LINE_ANIM_DURATION = 500;
const CAPTURE_HIGHLIGHT_DURATION = CAPTURE_LINE_ANIM_DURATION;
const captureHighlights = new Map();
const captureLineEffects = new Map();
let captureGroupSequence = 0;
let captureResolutionInProgress = false;
const POINTER_CLICK_SUPPRESS_MS = 320;
let lastPointerDownTime = 0;
const CAPTURE_LINE_COLORS = {
    1: { stroke: 'rgba(58, 137, 255, 0.88)', shadow: 'rgba(152, 206, 255, 0.95)' },
    2: { stroke: 'rgba(255, 176, 66, 0.92)', shadow: 'rgba(255, 220, 160, 0.95)' }
};

const SCORE_POPUP_DURATION = 1100;
const SCORE_POPUP_RISE_DISTANCE = CELL_SIZE * 1.9;
const SCORE_POPUP_FADE_START = 0.65;
const SCORE_POPUP_FILL = 'rgba(255, 248, 224, 0.96)';
const SCORE_POPUP_STROKE = 'rgba(56, 42, 24, 0.68)';
const SCORE_POPUP_SHADOW = 'rgba(0, 0, 0, 0.3)';

const SWIPE_THRESHOLD = CELL_SIZE;
const effects = [];
const HIGH_SCORE_KEY = 'goDropHighScore';
const PLAYER_NAME_KEY = 'goDropPlayerName';
const API_BASE = 'https://script.google.com/macros/s/AKfycby6x7sGLKNAbc9ZXhlLniKHiblTQkAkmrsd13IiCim7cRDFyI3zuZC6LlOdUp2VoRLB/exec';
const DAILY_DISPLAY_LIMIT = 5;
const WEEKLY_DISPLAY_LIMIT = 1;
const MONTHLY_DISPLAY_LIMIT = 1;
const DAILY_FETCH_LIMIT = Math.max(DAILY_DISPLAY_LIMIT, 10);
const WEEKLY_FETCH_LIMIT = Math.max(WEEKLY_DISPLAY_LIMIT * 5, 10);
const MONTHLY_FETCH_LIMIT = Math.max(MONTHLY_DISPLAY_LIMIT * 5, 15);
const DEFAULT_FETCH_LIMIT = 10;
const LEADERBOARD_TIMEOUT_MS = 6000;

const bgmAudio = document.getElementById('bgmAudio');
const BGM_PREF_KEY = 'igoponBgmEnabled';
const BGM_ACTIVE_VOLUME = 0.6;
const BGM_PAUSE_VOLUME = 0.25;
const BGM_ROLES = {
    LOBBY: 'lobby',
    GAME: 'game',
    DANGER: 'game-danger'
};
const BGM_PRESETS = {
    [BGM_ROLES.LOBBY]: {
        src: 'assets/igopon-lobby.mp3',
        label: 'ロビーBGM'
    },
    [BGM_ROLES.GAME]: {
        src: 'assets/igopon-game.mp3',
        label: 'ゲームBGM'
    },
    [BGM_ROLES.DANGER]: {
        src: 'assets/igopon-game2.mp3',
        label: 'ゲームBGM（危険）'
    }
};
const CONTROL_KEY_CODES = new Set([
    'ArrowLeft',
    'ArrowRight',
    'ArrowDown',
    'ArrowUp',
    'Space',
    'Enter'
]);

let bgmPreference = true;
let bgmUnlocked = false;
let bgmAutoplayUnlockHandler = null;
let activeBgmRole = BGM_ROLES.LOBBY;

try {
    const storedPreference = localStorage.getItem(BGM_PREF_KEY);
    if (storedPreference === '0' || storedPreference === 'false') {
        bgmPreference = false;
    }
} catch (error) {
    bgmPreference = true;
}

function getConfiguredBgm(role) {
    return BGM_PRESETS[role] || BGM_PRESETS[BGM_ROLES.LOBBY];
}

function currentBgmLabel() {
    const preset = getConfiguredBgm(activeBgmRole);
    return preset ? preset.label : '';
}

function updateBgmStatusText() {
    if (!bgmStatusLabel) {
        return;
    }
    if (!bgmAudio) {
        bgmStatusLabel.textContent = '音源が見つかりません。';
        return;
    }
    const label = currentBgmLabel();
    const labelSuffix = label ? ` (${label})` : '';
    if (!bgmPreference) {
        bgmStatusLabel.textContent = `BGMはオフになっています。${labelSuffix}`.trim();
        return;
    }
    if (bgmAudio.paused) {
        const resumeText = bgmUnlocked
            ? 'スタートするとBGMが再開します。'
            : '操作後にBGMを有効化できます。';
        bgmStatusLabel.textContent = `${resumeText}${labelSuffix}`;
        return;
    }
    const quiet = paused || document.hidden;
    bgmStatusLabel.textContent = quiet
        ? `BGM再生中 (静音モード)${labelSuffix}`
        : `BGM再生中${labelSuffix}`;
}

function updateBgmToggleUI() {
    if (!bgmToggleBtn) {
        return;
    }
    bgmToggleBtn.setAttribute('aria-pressed', bgmPreference ? 'true' : 'false');
    bgmToggleBtn.textContent = bgmPreference ? 'BGM オン' : 'BGM オフ';
    updateBgmStatusText();
}

function syncBgmVolume() {
    if (!bgmAudio || bgmAudio.paused) {
        return;
    }
    const quiet = paused || document.hidden;
    bgmAudio.volume = quiet ? BGM_PAUSE_VOLUME : BGM_ACTIVE_VOLUME;
    updateBgmStatusText();
}

function attemptPlayBgm() {
    if (!bgmAudio || !bgmPreference) {
        return;
    }
    bgmAudio.defaultPlaybackRate = 1;
    bgmAudio.playbackRate = 1;
    bgmAudio.volume = paused || document.hidden ? BGM_PAUSE_VOLUME : BGM_ACTIVE_VOLUME;
    const playPromise = bgmAudio.play();
    if (playPromise && typeof playPromise.then === 'function') {
        playPromise.then(() => {
            bgmUnlocked = true;
            updateBgmStatusText();
        }).catch(() => {
            updateBgmStatusText();
        });
    } else {
        bgmUnlocked = true;
        updateBgmStatusText();
    }
}

function stopBgmPlayback(resetPosition = false) {
    if (!bgmAudio) {
        return;
    }
    if (!bgmAudio.paused) {
        bgmAudio.pause();
    }
    if (resetPosition) {
        bgmAudio.currentTime = 0;
    }
    updateBgmStatusText();
}

function loadFixedBgm(role, options = {}) {
    if (!bgmAudio) {
        return;
    }
    const preset = getConfiguredBgm(role);
    if (!preset) {
        return;
    }
    const autoplay = options.autoplay ?? true;
    const currentRole = bgmAudio.dataset.activeBgmRole;
    const currentSrc = bgmAudio.getAttribute('src');
    const needsReload = currentRole !== role || currentSrc !== preset.src;

    if (needsReload) {
        stopBgmPlayback(true);
        bgmAudio.src = preset.src;
        bgmAudio.dataset.activeBgmRole = role;
        bgmAudio.defaultPlaybackRate = 1;
        bgmAudio.playbackRate = 1;
        if ('preservesPitch' in bgmAudio) {
            bgmAudio.preservesPitch = true;
        }
        if ('mozPreservesPitch' in bgmAudio) {
            bgmAudio.mozPreservesPitch = true;
        }
        if ('webkitPreservesPitch' in bgmAudio) {
            bgmAudio.webkitPreservesPitch = true;
        }
        bgmUnlocked = false;
        bgmAudio.load();
        const restartPlayback = () => {
            bgmAudio.removeEventListener('canplay', restartPlayback);
            if (bgmPreference) {
                attemptPlayBgm();
                syncBgmVolume();
            }
        };
        bgmAudio.addEventListener('canplay', restartPlayback, { once: true });
    }

    if (autoplay && bgmPreference) {
        attemptPlayBgm();
        syncBgmVolume();
    } else {
        updateBgmStatusText();
    }

    ensureBgmAutoplayUnlockArm();
}

function switchBgmRole(role, options = {}) {
    if (!BGM_PRESETS[role]) {
        return;
    }
    activeBgmRole = role;
    loadFixedBgm(role, options);
}

function ensureBgmAutoplayUnlockArm() {
    if (!bgmAudio) {
        return;
    }
    const needsHandler = !bgmAutoplayUnlockHandler;
    if (!needsHandler) {
        return;
    }
    const handler = () => {
        if (!bgmPreference) {
            return;
        }
        if (bgmUnlocked) {
            cleanup();
            return;
        }
        attemptPlayBgm();
        if (bgmUnlocked) {
            cleanup();
        }
    };
    function cleanup() {
        if (!bgmAutoplayUnlockHandler) {
            return;
        }
        document.removeEventListener('pointerdown', handler);
        document.removeEventListener('keydown', handler);
        bgmAutoplayUnlockHandler = null;
    }
    bgmAutoplayUnlockHandler = handler;
    document.addEventListener('pointerdown', handler, { passive: true });
    document.addEventListener('keydown', handler);
}

const DANGER_FILL_RATIO = 0.7;
const DANGER_FILL_THRESHOLD = Math.ceil(ROWS * COLS * DANGER_FILL_RATIO);
const DANGER_HIGH_ROW_CUTOFF = 8;

function countOccupiedCells(includeCurrentPiece = true) {
    let occupied = 0;
    for (let row = 0; row < ROWS; row += 1) {
        for (let col = 0; col < COLS; col += 1) {
            if (board[row][col] !== CELL_EMPTY) {
                occupied += 1;
            }
        }
    }
    if (includeCurrentPiece && currentPiece) {
        currentPiece.cells.forEach(cell => {
            const row = currentPiece.position.row + cell.row;
            const col = currentPiece.position.col + cell.col;
            if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
                if (board[row][col] === CELL_EMPTY) {
                    occupied += 1;
                }
            }
        });
    }
    return occupied;
}

function isDangerZoneTriggered() {
    const lockedCellsCount = countOccupiedCells(false);
    const totalCells = countOccupiedCells(true);
    if (totalCells >= DANGER_FILL_THRESHOLD) {
        return true;
    }

    for (let row = 0; row < DANGER_HIGH_ROW_CUTOFF; row += 1) {
        for (let col = 0; col < COLS; col += 1) {
            if (board[row][col] !== CELL_EMPTY) {
                return true;
            }
        }
    }

    return false;
}

function updateGameBgmForDanger() {
    if (!gameActive) {
        return;
    }
    const dangerActive = isDangerZoneTriggered();
    const targetRole = dangerActive ? BGM_ROLES.DANGER : BGM_ROLES.GAME;
    if (activeBgmRole !== targetRole) {
        switchBgmRole(targetRole, { autoplay: true });
    } else {
        updateBgmStatusText();
    }
}

function setBgmPreference(enabled) {
    bgmPreference = enabled;
    try {
        localStorage.setItem(BGM_PREF_KEY, enabled ? '1' : '0');
    } catch (error) {
        // ignore persistence errors
    }
    if (!enabled) {
        stopBgmPlayback(true);
    } else {
        loadFixedBgm(activeBgmRole, { autoplay: true });
    }
    updateBgmToggleUI();
}

function startBgmIfEnabled() {
    if (!bgmPreference) {
        updateBgmStatusText();
        return;
    }
    loadFixedBgm(activeBgmRole, { autoplay: true });
}

function initializeAudioControls() {
    if (bgmAudio) {
        bgmAudio.volume = BGM_ACTIVE_VOLUME;
        bgmAudio.addEventListener('playing', updateBgmStatusText);
        bgmAudio.addEventListener('pause', updateBgmStatusText);
        loadFixedBgm(activeBgmRole, { autoplay: false });
    }
    if (bgmToggleBtn) {
        bgmToggleBtn.addEventListener('click', event => {
            event.preventDefault();
            setBgmPreference(!bgmPreference);
        });
    }
    updateBgmToggleUI();
    updateBgmStatusText();
    ensureBgmAutoplayUnlockArm();
}

function configureCanvasResolution(canvasElement, context, targetWidth, targetHeight) {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(targetWidth);
    const height = Math.round(targetHeight);
    if (canvasElement.width !== Math.round(width * ratio) || canvasElement.height !== Math.round(height * ratio)) {
        canvasElement.width = Math.round(width * ratio);
        canvasElement.height = Math.round(height * ratio);
    }
    canvasElement.style.width = `${width}px`;
    canvasElement.style.height = `${height}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
}

const board = Array.from({ length: ROWS }, () => Array(COLS).fill(CELL_EMPTY));
const lockedCells = Array.from({ length: ROWS }, () => Array(COLS).fill(false));

function shuffleArray(array) {
    for (let index = array.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        const temp = array[index];
        array[index] = array[swapIndex];
        array[swapIndex] = temp;
    }
}

const BASE_BOARD_WIDTH = canvas.width;
const BASE_BOARD_HEIGHT = canvas.height;
const BASE_PREVIEW_WIDTH = nextCanvas.width;
const BASE_PREVIEW_HEIGHT = nextCanvas.height;
const BOARD_PIXEL_WIDTH = BASE_BOARD_WIDTH;
const BOARD_PIXEL_HEIGHT = BASE_BOARD_HEIGHT;
const PREVIEW_RESPONSIVE_QUERY = '(max-width: 900px)';
const previewMediaQuery = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(PREVIEW_RESPONSIVE_QUERY)
    : null;
let previewWidth = BASE_PREVIEW_WIDTH;
let previewHeight = BASE_PREVIEW_HEIGHT;

function resolvePreviewTargetSize() {
    const fallbackIsMobile = typeof window !== 'undefined' ? window.innerWidth <= 900 : false;
    const isMobile = previewMediaQuery ? previewMediaQuery.matches : fallbackIsMobile;
    const scale = isMobile ? 0.5 : 1;
    return {
        width: Math.max(1, Math.round(BASE_PREVIEW_WIDTH * scale)),
        height: Math.max(1, Math.round(BASE_PREVIEW_HEIGHT * scale))
    };
}

function applyPreviewCanvasSize({ redraw = true } = {}) {
    const { width, height } = resolvePreviewTargetSize();
    previewWidth = width;
    previewHeight = height;
    configureCanvasResolution(nextCanvas, nextCtx, width, height);
    if (redraw) {
        updatePreview();
    }
}

function loadHighScore() {
    try {
        const stored = localStorage.getItem(HIGH_SCORE_KEY);
        const value = stored ? parseInt(stored, 10) : 0;
        return Number.isNaN(value) ? 0 : value;
    } catch (error) {
        return 0;
    }
}

function saveHighScore(value) {
    try {
        localStorage.setItem(HIGH_SCORE_KEY, String(value));
    } catch (error) {
        // ignore storage failures
    }
}
function sanitizePlayerName(value) {

    if (value === null || value === undefined) {

        return '';

    }

    const text = String(value);

    return text

        .replace(/[\r\n\t]/g, ' ')

        .replace(/\s{2,}/g, ' ')

        .replace(/[<>]/g, '')

        .trim()

        .slice(0, 20);

}



function loadPlayerName() {
    try {
        const stored = localStorage.getItem(PLAYER_NAME_KEY);
        return sanitizePlayerName(stored);
    } catch (error) {
        return '';
    }
}

function savePlayerName(name) {
    try {
        localStorage.setItem(PLAYER_NAME_KEY, sanitizePlayerName(name));
    } catch (error) {
        // ignore storage issues
    }
}

function getTodayKey() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getDateKeyWithOffset(daysBack) {
    const target = new Date();
    target.setDate(target.getDate() - daysBack);
    const year = target.getFullYear();
    const month = String(target.getMonth() + 1).padStart(2, '0');
    const day = String(target.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatLeaderboardDate(key) {
    if (!key) {
        return '';
    }
    const [year, month, day] = key.split('-');
    const monthNum = parseInt(month, 10) || 0;
    const dayNum = parseInt(day, 10) || 0;
    return `${year}年${monthNum}月${dayNum}日`;
}

function showLeaderboardMessage(element, message) {
    if (!element) {
        return;
    }
    element.textContent = message;
    element.classList.remove('hidden');
}

function hideLeaderboardMessage(element) {
    if (!element) {
        return;
    }
    element.classList.add('hidden');
}


function getActivePlayerName() {
    const current = playerNameInput ? sanitizePlayerName(playerNameInput.value) : playerName;
    const resolved = current || playerName || 'プレイヤー';
    return resolved;
}

function buildLeaderboardUrl(params = {}) {
    const query = new URLSearchParams();
    if (params.date) {
        query.set('date', params.date);
    }
    if (params.range) {
        query.set('range', params.range);
    }
    const effectiveLimit = Number.isFinite(params.limit) && params.limit > 0 ? params.limit : DEFAULT_FETCH_LIMIT;
    query.set('limit', String(effectiveLimit));
    return `${API_BASE}?${query.toString()}`;
}

async function fetchLeaderboardEntries(params) {
    const useAbort = typeof AbortController !== 'undefined';
    const controller = useAbort ? new AbortController() : null;
    const timeoutId = useAbort ? setTimeout(() => controller.abort(), LEADERBOARD_TIMEOUT_MS) : null;

    try {
        const response = await fetch(buildLeaderboardUrl(params), {
            method: 'GET',
            mode: 'cors',
            cache: 'no-store',
            signal: controller ? controller.signal : undefined
        });

        if (!response.ok) {
            throw new Error(`Leaderboard request failed: ${response.status}`);
        }

        const payload = await response.json();
        return Array.isArray(payload.entries) ? payload.entries : [];
    } finally {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
        }
    }
}

async function fetchRollingEntries(days, perDayLimit) {
    const aggregate = [];
    const limit = Number.isFinite(perDayLimit) && perDayLimit > 0 ? perDayLimit : DEFAULT_FETCH_LIMIT;
    for (let offset = 0; offset < days; offset += 1) {
        const dateKey = getDateKeyWithOffset(offset);
        try {
            const entries = await fetchLeaderboardEntries({ date: dateKey, limit });
            entries.forEach(entry => {
                aggregate.push({ ...entry });
            });
        } catch (error) {
            console.warn('Failed to load leaderboard for', dateKey, error);
        }
    }
    aggregate.sort((a, b) => {
        const scoreA = Number.isFinite(a.score) ? Number(a.score) : parseFloat(a.score) || 0;
        const scoreB = Number.isFinite(b.score) ? Number(b.score) : parseFloat(b.score) || 0;
        return scoreB - scoreA;
    });
    return aggregate;
}

function mergeLeaderboardEntries(primaryEntries, secondaryEntries) {
    const combined = [];
    const seen = new Set();
    const append = (entry) => {
        if (!entry) {
            return;
        }
        const rawName = entry.name ?? entry.playerName ?? entry.player ?? entry.displayName ?? entry.nickname ?? '';
        const key = [
            rawName,
            entry.score,
            entry.timestamp,
            entry.created_at,
            entry.date_key
        ].map(value => (value === undefined || value === null) ? '' : String(value)).join('::');
        if (seen.has(key)) {
            return;
        }
        seen.add(key);
        combined.push(entry);
    };

    (primaryEntries || []).forEach(append);
    (secondaryEntries || []).forEach(append);
    combined.sort((a, b) => {
        const scoreA = Number.isFinite(a.score) ? Number(a.score) : parseFloat(a.score) || 0;
        const scoreB = Number.isFinite(b.score) ? Number(b.score) : parseFloat(b.score) || 0;
        if (scoreA === scoreB) {
            const timeA = Date.parse(a.timestamp || a.created_at || 0) || 0;
            const timeB = Date.parse(b.timestamp || b.created_at || 0) || 0;
            return timeA - timeB;
        }
        return scoreB - scoreA;
    });
    return combined;
}

async function loadLeaderboardGroup({ params, fetchLimit, displayLimit, fallbackDays, listElement, emptyElement }) {
    if (!listElement) {
        return;
    }

    showLeaderboardMessage(emptyElement, '読み込み中…');

    const effectiveDisplayLimit = Number.isFinite(displayLimit) && displayLimit > 0 ? displayLimit : DAILY_DISPLAY_LIMIT;
    const effectiveFetchLimit = Number.isFinite(fetchLimit) && fetchLimit > 0 ? fetchLimit : DEFAULT_FETCH_LIMIT;

    try {
        let primaryEntries = [];
        try {
            primaryEntries = await fetchLeaderboardEntries({ ...params, limit: effectiveFetchLimit });
        } catch (primaryError) {
            console.warn('Failed to load leaderboard primary entries', primaryError);
        }

        let entries = primaryEntries;
        if (fallbackDays && (!entries || entries.length < effectiveDisplayLimit)) {
            try {
                const fallbackEntries = await fetchRollingEntries(
                    fallbackDays,
                    Math.max(effectiveFetchLimit, effectiveDisplayLimit * 5)
                );
                entries = mergeLeaderboardEntries(primaryEntries, fallbackEntries);
            } catch (fallbackError) {
                console.warn('Failed to load fallback leaderboard entries', fallbackError);
            }
        }

        renderLeaderboard(entries || [], listElement, emptyElement, effectiveDisplayLimit);
    } catch (error) {
        console.error('Failed to load leaderboard', error);
        listElement.innerHTML = '';
        showLeaderboardMessage(emptyElement, 'ランキングを読み込めませんでした。');
    }
}

async function refreshLeaderboard() {
    const todayKey = getTodayKey();
    if (leaderboardDateLabel) {
        leaderboardDateLabel.textContent = formatLeaderboardDate(todayKey);
    }

    const tasks = [];
    if (dailyLeaderboardList) {
        tasks.push(loadLeaderboardGroup({
            params: { date: todayKey },
            fetchLimit: DAILY_FETCH_LIMIT,
            displayLimit: DAILY_DISPLAY_LIMIT,
            listElement: dailyLeaderboardList,
            emptyElement: leaderboardEmpty
        }));
    }
    if (weeklyLeaderboardList) {
        tasks.push(loadLeaderboardGroup({
            params: { range: 'week' },
            fetchLimit: WEEKLY_FETCH_LIMIT,
            displayLimit: WEEKLY_DISPLAY_LIMIT,
            fallbackDays: 7,
            listElement: weeklyLeaderboardList,
            emptyElement: weeklyLeaderboardEmpty
        }));
    }
    if (monthlyLeaderboardList) {
        tasks.push(loadLeaderboardGroup({
            params: { range: 'month' },
            fetchLimit: MONTHLY_FETCH_LIMIT,
            displayLimit: MONTHLY_DISPLAY_LIMIT,
            fallbackDays: 30,
            listElement: monthlyLeaderboardList,
            emptyElement: monthlyLeaderboardEmpty
        }));
    }

    if (tasks.length === 0) {
        return;
    }

    await Promise.all(tasks);
}

function renderLeaderboard(entries, listElement, emptyElement, displayLimit) {
    if (!listElement) {
        return;
    }
    const effectiveLimit = Number.isFinite(displayLimit) && displayLimit > 0 ? displayLimit : DAILY_DISPLAY_LIMIT;
    listElement.innerHTML = '';
    const sourceEntries = Array.isArray(entries) ? entries : [];
    const normalizedEntries = normalizeLeaderboardEntries(sourceEntries, effectiveLimit);
    if (!normalizedEntries || normalizedEntries.length === 0) {
        showLeaderboardMessage(emptyElement, 'まだスコアがありません。');
    } else {
        hideLeaderboardMessage(emptyElement);
    }

    for (let index = 0; index < effectiveLimit; index += 1) {
        const entry = normalizedEntries[index];
        const item = document.createElement('li');
        const rank = document.createElement('span');
        rank.className = 'rank';
        rank.textContent = String(index + 1);

        const name = document.createElement('span');
        name.className = 'name';
        const score = document.createElement('span');
        score.className = 'score';
        if (entry) {
            name.textContent = entry.safeName;
            score.textContent = entry.scoreValue.toLocaleString('ja-JP');
        } else {
            item.classList.add('placeholder');
            name.textContent = '—';
            score.textContent = '—';
        }

        item.append(rank, name, score);
        listElement.appendChild(item);
    }
}

function normalizeLeaderboardEntries(entries, limit) {
    const buckets = entries.reduce((acc, entry) => {
        const scoreValue = Number.isFinite(entry.score) ? Number(entry.score) : parseFloat(entry.score) || 0;
        const bucket = acc.get(scoreValue) || [];
        bucket.push(entry);
        acc.set(scoreValue, bucket);
        return acc;
    }, new Map());

    const normalized = [];
    const quotients = new Map();

    Array.from(buckets.keys())
        .sort((a, b) => b - a)
        .forEach(scoreValue => {
            const bucket = buckets.get(scoreValue) || [];
            if (bucket.length === 0) {
                return;
            }
            bucket.sort((a, b) => {
                const timeA = Date.parse(a.timestamp || a.created_at || 0) || 0;
                const timeB = Date.parse(b.timestamp || b.created_at || 0) || 0;
                return timeA - timeB;
            });

            bucket.forEach(entry => {
                const rawName = entry.name ?? entry.playerName ?? entry.player ?? entry.displayName ?? entry.nickname ?? '';
                const safeName = sanitizePlayerName(rawName) || 'プレイヤー';

                const appearance = quotients.get(scoreValue) || 0;
                const decoratedName = appearance === 0 ? safeName : `${safeName} (${appearance + 1})`;
                quotients.set(scoreValue, appearance + 1);

                normalized.push({ safeName: decoratedName, scoreValue });
            });
        });

    const effectiveLimit = Number.isFinite(limit) && limit > 0 ? limit : DAILY_DISPLAY_LIMIT;
    return normalized.slice(0, effectiveLimit);
}

function submitScore(finalScore) {
    if (!Number.isFinite(finalScore) || finalScore <= 0) {
        refreshLeaderboard();
        return;
    }

    const activeName = getActivePlayerName();
    const payload = {
        name: activeName,
        playerName: activeName,
        score: Math.floor(finalScore),
        origin: location.hostname
    };

    playerName = activeName;
    savePlayerName(activeName);
    if (playerNameInput) {
        playerNameInput.value = playerName;
    }

    const useAbort = typeof AbortController !== 'undefined';
    const controller = useAbort ? new AbortController() : null;
    const timeoutId = useAbort ? setTimeout(() => controller.abort(), LEADERBOARD_TIMEOUT_MS) : null;

    fetch(API_BASE, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-store',
        body: JSON.stringify(payload),
        signal: controller ? controller.signal : undefined
    })
        .catch(error => {
            console.error('Failed to submit score', error);
            setStatusMessage('スコア送信に失敗しました。通信状況を確認してください。');
        })
        .finally(() => {
            if (timeoutId !== null) {
                clearTimeout(timeoutId);
            }
            refreshLeaderboard();
        });
}
let highScore = loadHighScore();
if (bestScoreValue) {
    bestScoreValue.textContent = highScore.toLocaleString('en-US');
}

let playerName = loadPlayerName() || 'プレイヤー';
if (playerNameInput) {
    const applyAndPersist = (persist) => {
        playerName = sanitizePlayerName(playerNameInput.value) || 'プレイヤー';
        playerNameInput.value = playerName;
        if (persist) {
            savePlayerName(playerName);
        }
    };
    playerNameInput.value = playerName;
    playerNameInput.addEventListener('input', () => {
        playerName = sanitizePlayerName(playerNameInput.value) || playerName;
    });
    playerNameInput.addEventListener('change', () => applyAndPersist(true));
    playerNameInput.addEventListener('blur', () => applyAndPersist(true));
}
refreshLeaderboard();


configureCanvasResolution(canvas, ctx, BASE_BOARD_WIDTH, BASE_BOARD_HEIGHT);
applyPreviewCanvasSize();

window.addEventListener('resize', () => {
    configureCanvasResolution(canvas, ctx, BASE_BOARD_WIDTH, BASE_BOARD_HEIGHT);
    applyPreviewCanvasSize();
});

if (previewMediaQuery) {
    const handlePreviewMediaChange = () => applyPreviewCanvasSize();
    if (typeof previewMediaQuery.addEventListener === 'function') {
        previewMediaQuery.addEventListener('change', handlePreviewMediaChange);
    } else if (typeof previewMediaQuery.addListener === 'function') {
        previewMediaQuery.addListener(handlePreviewMediaChange);
    }
}

if (SUPPORTS_POINTER) {
    canvas.addEventListener('pointerdown', event => {
        if (event.button !== undefined && event.button !== 0) {
            return;
        }
        if (event.pointerType === 'touch') {
            event.preventDefault();
        }
        if (typeof canvas.setPointerCapture === 'function') {
            try {
                canvas.setPointerCapture(event.pointerId);
            } catch (error) {
                // ignore pointer capture errors
            }
        }
        handleSwipeStart(event.clientX);
    });
    canvas.addEventListener('pointermove', event => {
        if (!swipeActive) {
            return;
        }
        if (event.pointerType === 'touch') {
            event.preventDefault();
        }
        handleSwipeMove(event.clientX);
    });
    ['pointercancel', 'pointerleave', 'lostpointercapture'].forEach(type => {
        canvas.addEventListener(type, event => {
            if (typeof canvas.releasePointerCapture === 'function' && event.pointerId !== undefined) {
                try {
                    canvas.releasePointerCapture(event.pointerId);
                } catch (error) {
                    // ignore pointer release errors
                }
            }
            handleSwipeEnd();
        });
    });
} else {
    canvas.addEventListener('touchstart', event => {
        if (event.touches.length === 0) {
            return;
        }
        event.preventDefault();
        handleSwipeStart(event.touches[0].clientX);
    }, { passive: false });
    canvas.addEventListener('touchmove', event => {
        if (!swipeActive || event.touches.length === 0) {
            return;
        }
        event.preventDefault();
        handleSwipeMove(event.touches[0].clientX);
    }, { passive: false });
    ['touchend', 'touchcancel'].forEach(type => {
        canvas.addEventListener(type, () => {
            handleSwipeEnd();
        });
    });
    canvas.addEventListener('mousedown', event => {
        if (event.button !== 0) {
            return;
        }
        handleSwipeStart(event.clientX);
    });
    canvas.addEventListener('mousemove', event => {
        if (!swipeActive) {
            return;
        }
        handleSwipeMove(event.clientX);
    });
    ['mouseup', 'mouseleave', 'blur'].forEach(type => {
        canvas.addEventListener(type, () => {
            handleSwipeEnd();
        });
    });
}


let currentPiece = null;
let nextPiece = null;
let score = 0;
let level = 1;
let chain = 0;
let piecesPlaced = 0;
let eyeFrameCooldown = 0;
let eyeFrameFirstDropPending = true;
let captures = { black: 0, white: 0 };
let dropInterval = BASE_DROP_INTERVAL;
let dropAccumulator = 0;
let lastFrameTime = null;
let gameActive = false;
let paused = false;
let statusTimeoutId = null;

const PIECE_TEMPLATES = [
    {
        name: 'TigerMouth',
        cells: [
            { row: 0, col: 1, color: 1 },
            { row: 1, col: 0, color: 1 },
            { row: 1, col: 1, color: 2 },
            { row: 1, col: 2, color: 1 }
        ]
    },
    {
        name: 'TigerMouthWhite',
        cells: [
            { row: 0, col: 1, color: 2 },
            { row: 1, col: 0, color: 2 },
            { row: 1, col: 1, color: 1 },
            { row: 1, col: 2, color: 2 }
        ]
    },
    {
        name: 'BambooJoint',
        cells: [
            { row: 0, col: 0, color: 1 },
            { row: 1, col: 0, color: 2 },
            { row: 2, col: 0, color: 1 },
            { row: 3, col: 0, color: 2 }
        ]
    },
    {
        name: 'BambooJointWhite',
        cells: [
            { row: 0, col: 0, color: 2 },
            { row: 1, col: 0, color: 1 },
            { row: 2, col: 0, color: 2 },
            { row: 3, col: 0, color: 1 }
        ]
    },
    {
        name: 'Hane',
        cells: [
            { row: 0, col: 0, color: 2 },
            { row: 0, col: 1, color: 1 },
            { row: 1, col: 1, color: 1 },
            { row: 1, col: 2, color: 2 }
        ]
    },
    {
        name: 'HaneWhite',
        cells: [
            { row: 0, col: 0, color: 1 },
            { row: 0, col: 1, color: 2 },
            { row: 1, col: 1, color: 2 },
            { row: 1, col: 2, color: 1 }
        ]
    },
    {
        name: 'Clamp',
        cells: [
            { row: 0, col: 0, color: 2 },
            { row: 1, col: 0, color: 2 },
            { row: 1, col: 1, color: 1 },
            { row: 1, col: 2, color: 1 }
        ]
    },
    {
        name: 'ClampBlack',
        cells: [
            { row: 0, col: 0, color: 1 },
            { row: 1, col: 0, color: 1 },
            { row: 1, col: 1, color: 2 },
            { row: 1, col: 2, color: 2 }
        ]
    },
    {
        name: 'Seki',
        cells: [
            { row: 0, col: 0, color: 1 },
            { row: 0, col: 1, color: 2 },
            { row: 1, col: 0, color: 2 },
            { row: 1, col: 1, color: 1 }
        ]
    },
    {
        name: 'SekiAlt',
        cells: [
            { row: 0, col: 0, color: 2 },
            { row: 0, col: 1, color: 1 },
            { row: 1, col: 0, color: 1 },
            { row: 1, col: 1, color: 2 }
        ]
    }
];

function instantiatePiece(template) {
    const maxRow = Math.max(...template.cells.map(cell => cell.row));
    const maxCol = Math.max(...template.cells.map(cell => cell.col));
    return {
        name: template.name,
        cells: template.cells.map(cell => ({ ...cell })),
        width: maxCol + 1,
        height: maxRow + 1,
        rotation: 0,
        position: {
            row: -2,
            col: Math.floor((COLS - (maxCol + 1)) / 2)
        }
    };
}

function randomTemplate() {
    const index = Math.floor(Math.random() * PIECE_TEMPLATES.length);
    return PIECE_TEMPLATES[index];
}

function isLockedCell(row, col) {
    return lockedCells[row][col];
}

function clearBoard() {
    for (let row = 0; row < ROWS; row += 1) {
        for (let col = 0; col < COLS; col += 1) {
            board[row][col] = CELL_EMPTY;
            lockedCells[row][col] = false;
        }
    }
}

function startGame() {
    clearBoard();
    effects.length = 0;
    captureHighlights.clear();
    captureLineEffects.clear();
    captureResolutionInProgress = false;
    score = 0;
    level = 1;
    chain = 0;
    piecesPlaced = 0;
    eyeFrameCooldown = 0;
    eyeFrameFirstDropPending = true;
    captures = { black: 0, white: 0 };
    dropInterval = BASE_DROP_INTERVAL;
    dropAccumulator = 0;
    lastFrameTime = null;
    gameActive = true;
    paused = false;
    currentPiece = null;
    specialPieceQueue.length = 0;
    activeEyeFrames.length = 0;
    nextPiece = pullNextPiecePrototype();
    overlay.classList.add('hidden');
    pauseBtn.disabled = false;
    pauseBtn.textContent = 'ポーズ';
    startBtn.textContent = 'リスタート';
    if (headerStartBtn) {
        headerStartBtn.textContent = 'リスタート';
    }
    setHeaderScoreActive(true);
    setStatusMessage('新しい対局開始。囲んで捕獲しよう。');
    updateStats();
    updatePreview();
    switchBgmRole(BGM_ROLES.GAME);
    startBgmIfEnabled();
    if (!spawnNewPiece()) {
        refreshMobileControls();
        syncBgmVolume();
        updateBgmStatusText();
        return;
    }
    updateGameBgmForDanger();
    refreshMobileControls();
    syncBgmVolume();
    updateBgmStatusText();
}

function endGame(reason) {
    if (!gameActive) {
        return;
    }
    gameActive = false;
    paused = false;
    pauseBtn.disabled = true;
    pauseBtn.textContent = 'ポーズ';
    overlayTitle.textContent = reason;
    const formattedScore = score.toLocaleString('en-US');
    overlayDetail.textContent = `Score: ${formattedScore} | Chains: ${chain} | Captures B:${captures.black} W:${captures.white}`;
    if (finalScoreValue) {
        finalScoreValue.textContent = formattedScore;
    }
    if (score > highScore) {
        highScore = score;
        saveHighScore(highScore);
    }
    if (bestScoreValue) {
        bestScoreValue.textContent = highScore.toLocaleString('en-US');
    }
    submitScore(score);
    captureHighlights.clear();
    captureLineEffects.clear();
    overlay.classList.remove('hidden');
    startBtn.textContent = 'スタート';
    if (headerStartBtn) {
        headerStartBtn.textContent = 'GO!';
    }
    setHeaderScoreActive(false);
    setStatusMessage('ゲーム終了。');
    switchBgmRole(BGM_ROLES.LOBBY);
    startBgmIfEnabled();
    refreshMobileControls();
    syncBgmVolume();
    updateBgmStatusText();
}

function spawnNewPiece() {
    if (!nextPiece) {
        nextPiece = pullNextPiecePrototype();
    }

    const spawned = clonePiece(nextPiece);
    spawned.position = {
        row: -2,
        col: Math.floor((COLS - spawned.width) / 2)
    };
    spawned.rotation = 0;
    currentPiece = spawned;
    dropAccumulator = 0;

    nextPiece = pullNextPiecePrototype();
    updatePreview();

    if (!isValidPosition(currentPiece, 0, 0)) {
        currentPiece = null;
        endGame('盤面が埋まりました');
        return false;
    }

    return true;
}

function isValidPosition(piece, offsetRow, offsetCol) {
    return piece.cells.every(cell => {
        const targetRow = piece.position.row + cell.row + offsetRow;
        const targetCol = piece.position.col + cell.col + offsetCol;

        if (targetCol < 0 || targetCol >= COLS) {
            return false;
        }
        if (targetRow >= ROWS) {
            return false;
        }
        if (targetRow < 0) {
            return true;
        }
        return board[targetRow][targetCol] === CELL_EMPTY;
    });
}

function movePiece(deltaCol) {
    if (!currentPiece) {
        return;
    }
    if (isValidPosition(currentPiece, 0, deltaCol)) {
        currentPiece.position.col += deltaCol;
    }
}

function stepDown() {
    if (!currentPiece) {
        return;
    }
    if (isValidPosition(currentPiece, 1, 0)) {
        currentPiece.position.row += 1;
    } else {
        lockPiece();
    }
}

function hardDrop() {
    if (!currentPiece) {
        return;
    }
    while (isValidPosition(currentPiece, 1, 0)) {
        currentPiece.position.row += 1;
    }
    lockPiece();
}


function lockPiece() {
    if (!currentPiece || captureResolutionInProgress) {
        return;
    }

    const placedPiece = currentPiece;
    let overflow = false;
    const placedEyeFrame = placedPiece.isEyeFrame === true;
    let eyeFrameCenterGlobal = null;

    placedPiece.cells.forEach(cell => {
        const row = placedPiece.position.row + cell.row;
        const col = placedPiece.position.col + cell.col;
        if (row < 0) {
            overflow = true;
            return;
        }
        const boardValue = cell.boardValue !== undefined ? cell.boardValue : cell.color;
        board[row][col] = boardValue;
        lockedCells[row][col] = cell.lockOnPlace === true;
        if (placedEyeFrame && cell.isEyeCenter) {
            eyeFrameCenterGlobal = { row, col };
        }
    });

    if (overflow) {
        endGame('盤面が埋まりました');
        return;
    }

    if (placedEyeFrame && eyeFrameCenterGlobal) {
        activeEyeFrames.push({
            centerRow: eyeFrameCenterGlobal.row,
            centerCol: eyeFrameCenterGlobal.col,
            capturesLeft: EYE_FRAME_CLEAR_THRESHOLD
        });
    }

    currentPiece = null;
    applyGravity();

    captureResolutionInProgress = true;
    settleBoardWithHighlights(result => {
        const { totalRemoved, captureTotals, removedStones } = result;

        if (totalRemoved > 0) {
            chain += 1;
            const chainMultiplier = 1 + (chain - 1) * 0.5;
            const pointsEarned = Math.floor(totalRemoved * 60 * chainMultiplier);
            score += pointsEarned;
            captures.black += captureTotals.black;
            captures.white += captureTotals.white;
            spawnCaptureEffects(removedStones);
            spawnScorePopup(pointsEarned, removedStones);
            setStatusMessage(`${totalRemoved}個捕獲。チェインx${chain}！`);
        } else {
            chain = 0;
            setStatusMessage('石を配置。捕獲なし。');
        }

        piecesPlaced += 1;
        if (piecesPlaced % 5 === 0) {
            level += 1;
            dropInterval = Math.max(220, BASE_DROP_INTERVAL - (level - 1) * 80);
            setStatusMessage(`レベル${level}。落下間隔 ${(dropInterval / 1000).toFixed(2)}秒。`);
        }

        maybeScheduleEyeFramePiece();

        let clearedEyeFrame = false;
        if (totalRemoved > 0 && activeEyeFrames.length > 0) {
            const framesToRemove = [];
            activeEyeFrames.forEach(frame => {
                frame.capturesLeft -= totalRemoved;
                if (frame.capturesLeft <= 0) {
                    framesToRemove.push(frame);
                }
            });
            if (framesToRemove.length > 0) {
                const framesSnapshot = framesToRemove.map(frame => ({
                    centerRow: frame.centerRow,
                    centerCol: frame.centerCol
                }));
                activeEyeFrames = activeEyeFrames.filter(frame => frame.capturesLeft > 0);
                setTimeout(() => {
                    framesSnapshot.forEach(frame => {
                        clearEyeFrameAt(frame.centerRow, frame.centerCol);
                    });
                    applyGravity();
                    resolveEyeFrameConflicts();
                }, 0);
                clearedEyeFrame = true;
            }
        }

        updateStats();
        if (placedEyeFrame) {
            chain = 0;
            setStatusMessage('色付き眼フレームを設置しました。');
        } else if (clearedEyeFrame) {
            setStatusMessage('眼フレームが崩壊しました。');
        }
        captureResolutionInProgress = false;

        if (!gameActive) {
            refreshMobileControls();
            return;
        }

        updateGameBgmForDanger();

        if (!spawnNewPiece()) {
            refreshMobileControls();
            return;
        }
        updateGameBgmForDanger();
        refreshMobileControls();
    });
}

function settleBoardWithHighlights(onComplete) {
    const totals = {
        totalRemoved: 0,
        captureTotals: { black: 0, white: 0 },
        removedStones: []
    };

    function processLoop() {
        const result = resolveCapturesOnce();
        if (result.groups.length === 0) {
            onComplete(totals);
            return;
        }

        totals.totalRemoved += result.totalRemoved;
        totals.captureTotals.black += result.captureTotals.black;
        totals.captureTotals.white += result.captureTotals.white;
        totals.removedStones.push(...result.removedStones);

        stageCaptureHighlight(result.groups);

        setTimeout(() => {
            clearCaptureHighlights(result.groups);
            result.groups.forEach(group => {
                group.captured.forEach(cell => {
                    if (!lockedCells[cell.row][cell.col]) {
                        board[cell.row][cell.col] = CELL_EMPTY;
                    }
                });
            });
            applyGravity();
            processLoop();
        }, CAPTURE_HIGHLIGHT_DURATION);
    }

    processLoop();
}

function isEyeCell(value) {
    return value === CELL_EYE_BLACK || value === CELL_EYE_WHITE;
}

function eyeMatchesColor(eyeValue, stoneColor) {
    return (eyeValue === CELL_EYE_BLACK && stoneColor === CELL_BLACK) ||
        (eyeValue === CELL_EYE_WHITE && stoneColor === CELL_WHITE);
}

function isObstacleCell(value) {
    return isEyeCell(value);
}

function resolveCapturesOnce() {
    const visited = new Set();
    const captureTotals = { black: 0, white: 0 };
    const removedStones = [];
    const groups = [];
    let removed = 0;

    for (let row = 0; row < ROWS; row += 1) {
        for (let col = 0; col < COLS; col += 1) {
            const stone = board[row][col];
            if (stone === CELL_EMPTY || isObstacleCell(stone)) {
                continue;
            }
            const key = row + ',' + col;
            if (visited.has(key)) {
                continue;
            }

            const result = evaluateGroup(row, col, stone, visited);
            const stones = result.stones;
            const liberties = result.liberties;
            const hasEyeSupport = result.hasEyeSupport;
            if (liberties === 0 && !hasEyeSupport) {
                const capturingColor = stone === CELL_BLACK ? CELL_WHITE : CELL_BLACK;
                const capturedGroup = stones.map(cell => ({ ...cell }));
                groups.push({
                    captured: capturedGroup,
                    capturing: collectCapturingStones(capturedGroup, capturingColor),
                    capturedColor: stone,
                    capturingColor
                });
                capturedGroup.forEach(capturedCell => {
                    removedStones.push({ ...capturedCell, color: stone });
                });
                removed += capturedGroup.length;
                if (stone === CELL_BLACK) {
                    captureTotals.white += capturedGroup.length;
                } else {
                    captureTotals.black += capturedGroup.length;
                }
            }
        }
    }

    return {
        groups,
        totalRemoved: removed,
        captureTotals,
        removedStones
    };
}

function collectCapturingStones(capturedStones, capturingColor) {
    const unique = new Set();
    const result = [];
    capturedStones.forEach(({ row, col }) => {
        DIRECTIONS.forEach(([dRow, dCol]) => {
            const targetRow = row + dRow;
            const targetCol = col + dCol;
            if (targetRow < 0 || targetRow >= ROWS || targetCol < 0 || targetCol >= COLS) {
                return;
            }
            if (board[targetRow][targetCol] !== capturingColor) {
                return;
            }
            const key = `${targetRow},${targetCol}`;
            if (unique.has(key)) {
                return;
            }
            unique.add(key);
            result.push({ row: targetRow, col: targetCol, color: capturingColor });
        });
    });
    return result;
}

function stageCaptureHighlight(groups) {
    const startedAt = performance.now();
    groups.forEach(group => {
        const groupId = ++captureGroupSequence;
        group.groupId = groupId;
        group.startedAt = startedAt;
        group.captured.forEach(cell => {
            captureHighlights.set(`${cell.row},${cell.col}`, {
                type: 'captured',
                startTime: startedAt,
                duration: CAPTURE_HIGHLIGHT_DURATION,
                groupId
            });
        });
        group.capturing.forEach(cell => {
            captureHighlights.set(`${cell.row},${cell.col}`, {
                type: 'capturing',
                startTime: startedAt,
                duration: CAPTURE_HIGHLIGHT_DURATION,
                groupId,
                capturingColor: group.capturingColor
            });
        });
        stageCaptureLineEffect(group);
    });
}

function stageCaptureLineEffect(group) {
    if (!group || !Array.isArray(group.capturing) || group.capturing.length < 2) {
        return;
    }

    const points = [];
    const seen = new Set();
    group.capturing.forEach(cell => {
        const { x, y } = boardToCanvasPosition(cell.row, cell.col);
        const key = `${x.toFixed(2)},${y.toFixed(2)}`;
        if (seen.has(key)) {
            return;
        }
        seen.add(key);
        points.push({ x, y });
    });

    if (points.length < 2) {
        return;
    }

    const centroid = points.reduce((acc, point) => {
        acc.x += point.x;
        acc.y += point.y;
        return acc;
    }, { x: 0, y: 0 });
    centroid.x /= points.length;
    centroid.y /= points.length;

    const sorted = points.slice().sort((a, b) => {
        const angleA = Math.atan2(a.y - centroid.y, a.x - centroid.x);
        const angleB = Math.atan2(b.y - centroid.y, b.x - centroid.x);
        return angleA - angleB;
    });

    if (sorted.length < 2) {
        return;
    }

    const segments = [];
    let totalLength = 0;
    for (let index = 0; index < sorted.length; index += 1) {
        const from = sorted[index];
        const to = sorted[(index + 1) % sorted.length];
        const length = Math.hypot(to.x - from.x, to.y - from.y);
        if (length === 0) {
            continue;
        }
        segments.push({ from, to, length });
        totalLength += length;
    }

    if (segments.length === 0 || totalLength === 0) {
        return;
    }

    const colorConfig = CAPTURE_LINE_COLORS[group.capturingColor] || CAPTURE_LINE_COLORS[1];

    captureLineEffects.set(group.groupId, {
        groupId: group.groupId,
        startTime: group.startedAt,
        duration: CAPTURE_LINE_ANIM_DURATION,
        segments,
        totalLength,
        strokeStyle: colorConfig.stroke,
        shadowColor: colorConfig.shadow,
        lineWidth: CELL_SIZE * 0.18
    });
}

function clearCaptureHighlights(groups) {
    groups.forEach(group => {
        if (group.groupId) {
            captureLineEffects.delete(group.groupId);
        }
        group.captured.forEach(cell => {
            captureHighlights.delete(`${cell.row},${cell.col}`);
        });
        group.capturing.forEach(cell => {
            captureHighlights.delete(`${cell.row},${cell.col}`);
        });
    });
}

function boardToCanvasPosition(row, col) {
    return {
        x: GRID_MARGIN + col * CELL_SIZE,
        y: GRID_MARGIN + row * CELL_SIZE
    };
}

function spawnCaptureEffects(removedStones) {
    if (!removedStones || removedStones.length === 0) {
        return;
    }
    const grouped = removedStones.reduce((accumulator, stone) => {
        const key = stone.color;
        if (!accumulator[key]) {
            accumulator[key] = [];
        }
        accumulator[key].push(stone);
        return accumulator;
    }, {});

    Object.entries(grouped).forEach(([colorKey, stones]) => {
        const colorConfig = CAPTURE_EFFECT_CONFIG[colorKey] || CAPTURE_EFFECT_CONFIG[2];
        let centerX = 0;
        let centerY = 0;
        stones.forEach(stone => {
            const { x, y } = boardToCanvasPosition(stone.row, stone.col);
            centerX += x;
            centerY += y;
            const particleCount = CAPTURE_PARTICLE_FACTOR + Math.floor(Math.random() * (CAPTURE_PARTICLE_FACTOR - 2));
            for (let index = 0; index < particleCount; index += 1) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 80 + Math.random() * 180;
                effects.push({
                    type: 'spark',
                    x,
                    y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 0,
                    maxLife: 740 + Math.random() * 260,
                    size: 3.6 + Math.random() * 4.8,
                    color: colorConfig.sparkColors[index % colorConfig.sparkColors.length],
                    opacity: 0.95,
                    gravity: PARTICLE_GRAVITY
                });
            }
        });
        centerX /= stones.length;
        centerY /= stones.length;
        effects.push({
            type: 'ring',
            x: centerX,
            y: centerY,
            life: 0,
            maxLife: 820,
            startRadius: CELL_SIZE * 0.75,
            endRadius: CELL_SIZE * (3.4 + Math.min(stones.length, 12) * 0.22),
            lineWidth: 6.5,
            color: colorConfig.ringColor,
            opacity: 0.92
        });
        effects.push({
            type: 'flash',
            x: centerX,
            y: centerY,
            life: 0,
            maxLife: CAPTURE_FLASH_LIFE,
            color: 'rgba(255, 255, 255, 0.7)'
        });
    });
}

function spawnScorePopup(points, removedStones) {
    if (!points || points <= 0) {
        return;
    }
    if (!removedStones || removedStones.length === 0) {
        return;
    }

    let sumX = 0;
    let minY = Infinity;
    removedStones.forEach(stone => {
        const { x, y } = boardToCanvasPosition(stone.row, stone.col);
        sumX += x;
        if (y < minY) {
            minY = y;
        }
    });

    const centerX = sumX / removedStones.length;
    const safeTop = GRID_MARGIN - CELL_SIZE * 0.4;
    const startY = Math.max(safeTop, minY - CELL_SIZE * 0.9);
    const text = `+${points.toLocaleString('en-US')}`;

    effects.push({
        type: 'scorePopup',
        x: centerX,
        startY,
        rise: SCORE_POPUP_RISE_DISTANCE,
        life: 0,
        maxLife: SCORE_POPUP_DURATION,
        text,
        fill: SCORE_POPUP_FILL,
        stroke: SCORE_POPUP_STROKE,
        shadow: SCORE_POPUP_SHADOW
    });
}
function spawnEyePulseEffect(centerRow, centerCol, stoneColor) {



    const position = boardToCanvasPosition(centerRow, centerCol);



    const isBlack = stoneColor === CELL_BLACK;



    const eyeValue = isBlack ? CELL_EYE_BLACK : CELL_EYE_WHITE;



    const glowColor = isBlack ? 'rgba(120, 200, 255, 0.9)' : 'rgba(255, 215, 140, 0.9)';



    const particleColor = isBlack ? 'rgba(150, 220, 255, 0.9)' : 'rgba(255, 235, 180, 0.9)';



    const particles = Array.from({ length: 12 }, () => ({



        baseAngle: Math.random() * Math.PI * 2,



        radialSpeed: CELL_SIZE * (0.35 + Math.random() * 0.6),



        spin: (Math.random() * 0.6 + 0.3) * (Math.random() < 0.5 ? -1 : 1),



        size: CELL_SIZE * (0.12 + Math.random() * 0.05),



        baseAlpha: 0.5 + Math.random() * 0.4



    }));



    effects.push({



        type: 'eyePulse',



        x: position.x,



        y: position.y,



        radius: CELL_SIZE * 0.42,



        life: 0,



        maxLife: 500,



        eyeValue,



        glowColor,



        particleColor,



        rotationBase: Math.random() * Math.PI * 2,



        particles



    });



}








function updateEffects(delta) {
    if (effects.length === 0) {
        return;
    }
    const deltaSeconds = delta / 1000;
    const friction = Math.pow(PARTICLE_FRICTION, delta / 16.67);

    for (let index = effects.length - 1; index >= 0; index -= 1) {
        const effect = effects[index];
        effect.life += delta;
        const progress = effect.life / effect.maxLife;

        if (effect.type === 'spark') {
            effect.x += effect.vx * deltaSeconds;
            effect.y += effect.vy * deltaSeconds;
            effect.vy += effect.gravity * deltaSeconds;
            effect.vx *= friction;
            effect.vy *= friction;
        }

        if (progress >= 1) {
            effects.splice(index, 1);
        }
    }
}

function drawEffects() {
    if (effects.length === 0) {
        return;
    }
    ctx.save();
    effects.forEach(effect => {
        const progress = Math.min(effect.life / effect.maxLife, 1);
        if (effect.type === 'spark') {
            const alpha = effect.opacity * (1 - progress);
            if (alpha <= 0) {
                return;
            }
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = alpha;
            const radius = Math.max(effect.size * (1 - progress * 0.55), 0.9);
            const radial = ctx.createRadialGradient(effect.x, effect.y, radius * 0.2, effect.x, effect.y, radius);
            radial.addColorStop(0, effect.color);
            radial.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = radial;
            ctx.beginPath();
            ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
            ctx.fill();
        } else if (effect.type === 'ring') {
            const eased = Math.pow(progress, 0.42);
            const radius = effect.startRadius + (effect.endRadius - effect.startRadius) * eased;
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = effect.opacity * (1 - progress);
            ctx.lineWidth = Math.max(effect.lineWidth * (1 - progress * 0.6), 1.2);
            ctx.strokeStyle = effect.color;
            ctx.beginPath();
            ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
            ctx.stroke();
        } else if (effect.type === 'flash') {
            const alpha = (1 - progress) * 0.8;
            if (alpha <= 0) {
                return;
            }
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = alpha;
            const radius = CELL_SIZE * (2.6 + progress * 1.1);
            ctx.fillStyle = effect.color;
            ctx.beginPath();
            ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
            ctx.fill();
        } else if (effect.type === 'scorePopup') {
            const eased = 1 - Math.pow(1 - progress, 2);
            const rise = effect.rise != null ? effect.rise : SCORE_POPUP_RISE_DISTANCE;
            const currentY = effect.startY - rise * eased;
            let alpha = 1;
            if (progress > SCORE_POPUP_FADE_START) {
                const fadeProgress = (progress - SCORE_POPUP_FADE_START) / (1 - SCORE_POPUP_FADE_START);
                alpha = Math.max(0, 1 - fadeProgress);
            }
            const fontSize = Math.max(22, Math.round(CELL_SIZE * 0.86) + 4);
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = alpha;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = `700 ${fontSize}px "Segoe UI", "Hiragino Sans", sans-serif`;
            ctx.lineJoin = 'round';
            ctx.lineWidth = Math.max(fontSize * 0.12, 2.4);
            ctx.strokeStyle = effect.stroke || SCORE_POPUP_STROKE;
            ctx.fillStyle = effect.fill || SCORE_POPUP_FILL;
            ctx.shadowColor = effect.shadow || SCORE_POPUP_SHADOW;
            ctx.shadowBlur = 8;
            ctx.strokeText(effect.text, effect.x, currentY);
            ctx.fillText(effect.text, effect.x, currentY);
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';
        } else if (effect.type === 'eyePulse') {

            const totalProgress = Math.min(effect.life / effect.maxLife, 1);

            const earlyProgress = Math.min(effect.life / 200, 1);

            const lateProgress = effect.life > 200 ? Math.min((effect.life - 200) / 300, 1) : 0;



            const easeOut = 1 - Math.pow(1 - earlyProgress, 3);

            const pulseScale = 1 + 0.18 * easeOut;

            const coreAlpha = effect.life < 200 ? 1 : Math.max(1 - lateProgress * 1.3, 0);



            ctx.save();

            drawEyeStone(ctx, effect.x, effect.y, effect.radius * pulseScale, effect.eyeValue, coreAlpha);



            if (effect.life < 200) {

                ctx.globalCompositeOperation = 'screen';

                ctx.globalAlpha = (1 - earlyProgress) * 0.65;

                const arcRadius = effect.radius * (1.1 + easeOut * 0.4);

                const arcStart = effect.rotationBase + easeOut * Math.PI * 2;

                ctx.lineWidth = effect.radius * 0.18;

                ctx.strokeStyle = effect.glowColor;

                ctx.beginPath();

                ctx.arc(effect.x, effect.y, arcRadius, arcStart, arcStart + Math.PI * 0.85);

                ctx.stroke();

            } else {

                ctx.globalCompositeOperation = 'lighter';

                ctx.globalAlpha = Math.max(0.35 * (1 - lateProgress), 0);

                const haloRadius = effect.radius * (1.2 + lateProgress * 0.6);

                ctx.fillStyle = effect.glowColor;

                ctx.beginPath();

                ctx.arc(effect.x, effect.y, haloRadius, 0, Math.PI * 2);

                ctx.fill();

            }

            ctx.restore();



            if (effect.life > 200) {

                effect.particles.forEach(part => {

                    const t = Math.min((effect.life - 200) / 300, 1);

                    const distance = effect.radius * 0.35 + part.radialSpeed * t;

                    const angle = part.baseAngle + part.spin * t * Math.PI * 2;

                    const px = effect.x + Math.cos(angle) * distance;

                    const py = effect.y + Math.sin(angle) * distance;

                    const particleAlpha = Math.max(part.baseAlpha * (1 - t * 1.1), 0);

                    if (particleAlpha <= 0) {

                        return;

                    }

                    const size = part.size * Math.max(1 - t * 0.9, 0.2);

                    ctx.save();

                    ctx.globalCompositeOperation = 'lighter';

                    ctx.globalAlpha = particleAlpha;

                    ctx.fillStyle = effect.particleColor;

                    ctx.beginPath();

                    ctx.arc(px, py, size, 0, Math.PI * 2);

                    ctx.fill();

                    ctx.restore();

                });

            }

        }
    });
    ctx.restore();
}

function evaluateGroup(row, col, color, visited) {
    const queue = [[row, col]];
    const stones = [];
    const libertySet = new Set();
    let hasEyeSupport = false;
    visited.add(row + ',' + col);

    while (queue.length > 0) {
        const current = queue.shift();
        const currentRow = current[0];
        const currentCol = current[1];
        stones.push({ row: currentRow, col: currentCol });

        DIRECTIONS.forEach(direction => {
            const dRow = direction[0];
            const dCol = direction[1];
            const nextRow = currentRow + dRow;
            const nextCol = currentCol + dCol;

            if (nextRow < 0 || nextRow >= ROWS || nextCol < 0 || nextCol >= COLS) {
                return;
            }

            const space = board[nextRow][nextCol];
            if (space === CELL_EMPTY) {
                libertySet.add(nextRow + ',' + nextCol);
            } else if (isEyeCell(space)) {
                if (eyeMatchesColor(space, color)) {
                    hasEyeSupport = true;
                }
            } else if (space === color) {
                const key = nextRow + ',' + nextCol;
                if (!visited.has(key)) {
                    visited.add(key);
                    queue.push([nextRow, nextCol]);
                }
            }
        });
    }

    return {
        stones,
        liberties: libertySet.size,
        hasEyeSupport
    };
}

function applyGravity() {
    for (let col = 0; col < COLS; col += 1) {
        const newColumn = new Array(ROWS).fill(CELL_EMPTY);
        const newLocked = new Array(ROWS).fill(false);

        for (let row = ROWS - 1; row >= 0; row -= 1) {
            if (lockedCells[row][col]) {
                newColumn[row] = board[row][col];
                newLocked[row] = true;
            }
        }

        let writeRow = ROWS - 1;
        for (let row = ROWS - 1; row >= 0; row -= 1) {
            if (lockedCells[row][col] || board[row][col] === CELL_EMPTY) {
                continue;
            }
            while (writeRow >= 0 && newLocked[writeRow]) {
                writeRow -= 1;
            }
            if (writeRow < 0) {
                break;
            }
            newColumn[writeRow] = board[row][col];
            newLocked[writeRow] = false;
            writeRow -= 1;
        }

        for (let row = 0; row < ROWS; row += 1) {
            board[row][col] = newColumn[row];
            lockedCells[row][col] = newLocked[row];
        }
    }
}


function clearEyeFrameAt(centerRow, centerCol) {



    let stoneColor = null;



    const centerValue = board[centerRow] ? board[centerRow][centerCol] : CELL_EMPTY;



    if (centerValue === CELL_EYE_BLACK) {



        stoneColor = CELL_BLACK;



    } else if (centerValue === CELL_EYE_WHITE) {



        stoneColor = CELL_WHITE;



    } else {



        for (let index = 0; index < EYE_FRAME_RING_OFFSETS.length; index += 1) {



            const offset = EYE_FRAME_RING_OFFSETS[index];



            const row = centerRow + offset.row;



            const col = centerCol + offset.col;



            if (row < 0 || row >= ROWS || col < 0 || col >= COLS) {



                continue;



            }



            const value = board[row][col];



            if (value === CELL_BLACK || value === CELL_WHITE) {



                stoneColor = value;



                break;



            }



        }



    }



    if (stoneColor === CELL_BLACK || stoneColor === CELL_WHITE) {



        spawnEyePulseEffect(centerRow, centerCol, stoneColor);



    }



    const offsets = [{ row: 0, col: 0 }].concat(EYE_FRAME_RING_OFFSETS);



    offsets.forEach(offset => {



        const targetRow = centerRow + offset.row;



        const targetCol = centerCol + offset.col;



        if (targetRow < 0 || targetRow >= ROWS || targetCol < 0 || targetCol >= COLS) {



            return;



        }



        board[targetRow][targetCol] = CELL_EMPTY;



        lockedCells[targetRow][targetCol] = false;



    });



}





function maybeScheduleEyeFramePiece() {
    if (!gameActive) {
        return false;
    }
    if (piecesPlaced < MIN_PIECES_BEFORE_EYE_FRAME) {
        return false;
    }
    if (nextPiece && nextPiece.isEyeFrame) {
        return false;
    }
    for (let index = 0; index < specialPieceQueue.length; index += 1) {
        if (specialPieceQueue[index].isEyeFrame) {
            return false;
        }
    }

    if (eyeFrameFirstDropPending) {
        const color = Math.random() < 0.5 ? CELL_BLACK : CELL_WHITE;
        enqueueEyeFramePiece(color, true);
        eyeFrameFirstDropPending = false;
        eyeFrameCooldown = EYE_FRAME_COOLDOWN_PIECES;
        return true;
    }

    if (eyeFrameCooldown > 0) {
        eyeFrameCooldown -= 1;
        return false;
    }

    if (Math.random() > EYE_FRAME_DROP_CHANCE) {
        return false;
    }

    const color = Math.random() < 0.5 ? CELL_BLACK : CELL_WHITE;
    enqueueEyeFramePiece(color, false);
    eyeFrameCooldown = EYE_FRAME_COOLDOWN_PIECES;
    return true;
}

function updateStats() {
    scoreValue.textContent = score.toLocaleString('en-US');
    if (inGameScoreValue) {
        inGameScoreValue.textContent = score.toLocaleString('en-US');
    }
    levelValue.textContent = level;
    chainValue.textContent = chain;
    blackCaptureValue.textContent = captures.black;
    whiteCaptureValue.textContent = captures.white;
    piecesValue.textContent = piecesPlaced;
}

function setStatusMessage(text) {
    if (statusTimeoutId) {
        clearTimeout(statusTimeoutId);
        statusTimeoutId = null;
    }
    statusMessageEl.textContent = text;
    if (text) {
        statusTimeoutId = setTimeout(() => {
            statusMessageEl.textContent = '';
            statusTimeoutId = null;
        }, 2600);
    }
}

function setHeaderScoreActive(active) {
    if (!headerScore) {
        return;
    }
    headerScore.classList.toggle('inactive', !active);
}

function refreshMobileControls() {
    const controls = [
        mobileLeftBtn,
        mobileRightBtn,
        mobileRotateBtn,
        mobileSoftDropBtn,
        mobileHardDropBtn,
        mobilePauseBtn
    ];
    if (controls.every(btn => !btn)) {
        return;
    }
    const active = gameActive && !paused;
    controls.forEach(btn => {
        if (!btn) {
            return;
        }
        if (btn === mobilePauseBtn) {
            btn.disabled = !gameActive;
        } else {
            btn.disabled = !active;
        }
    });
    if (mobilePauseBtn) {
        mobilePauseBtn.textContent = paused ? RESUME_ICON : PAUSE_ICON;
    }
}

function runIfPlayable(fn) {
    return () => {
        if (!gameActive || paused || !currentPiece) {
            return;
        }
        fn();
    };
}

let swipeActive = false;
let swipeReferenceX = 0;

function handleSwipeStart(clientX) {
    if (!gameActive || paused || !currentPiece) {
        return;
    }
    swipeActive = true;
    swipeReferenceX = clientX;
}

function handleSwipeMove(clientX) {
    if (!swipeActive || !gameActive || paused || !currentPiece) {
        return;
    }
    const delta = clientX - swipeReferenceX;
    if (delta >= SWIPE_THRESHOLD) {
        movePiece(1);
        swipeReferenceX = clientX;
    } else if (delta <= -SWIPE_THRESHOLD) {
        movePiece(-1);
        swipeReferenceX = clientX;
    }
}

function handleSwipeEnd() {
    swipeActive = false;
    swipeReferenceX = 0;
}

function bindHoldButton(button, action, options = {}) {
    if (!button) {
        return;
    }
    const repeat = options.repeat !== false;
    const repeatDelay = options.repeatDelay != null ? options.repeatDelay : 140;
    let intervalId = null;
    let capturedPointerId = null;
    let suppressClick = false;

    const stopRunner = (resetClick = false) => {
        if (intervalId !== null) {
            clearInterval(intervalId);
            intervalId = null;
        }
        if (capturedPointerId !== null && typeof button.releasePointerCapture === 'function') {
            try {
                if (typeof button.hasPointerCapture === 'function') {
                    if (button.hasPointerCapture(capturedPointerId)) {
                        button.releasePointerCapture(capturedPointerId);
                    }
                } else {
                    button.releasePointerCapture(capturedPointerId);
                }
            } catch (error) {
                // ignore pointer release errors
            }
            capturedPointerId = null;
        }
        if (resetClick) {
            suppressClick = false;
        }
    };

    const startRunner = event => {
        if (button.disabled) {
            suppressClick = false;
            return;
        }
        if (event && typeof event.preventDefault === 'function') {
            event.preventDefault();
        }
        suppressClick = true;
        action();
        if (repeat) {
            if (intervalId !== null) {
                clearInterval(intervalId);
            }
            intervalId = setInterval(() => {
                if (!gameActive || paused || !currentPiece || button.disabled) {
                    stopRunner(true);
                    return;
                }
                action();
            }, repeatDelay);
        }
    };

    if (SUPPORTS_POINTER) {
        button.addEventListener('pointerdown', event => {
            if (button.disabled) {
                return;
            }
            lastPointerDownTime = performance.now();
            if (typeof button.setPointerCapture === 'function') {
                try {
                    button.setPointerCapture(event.pointerId);
                    capturedPointerId = event.pointerId;
                } catch (error) {
                    capturedPointerId = null;
                }
            }
            startRunner(event);
        }, { passive: false });
        button.addEventListener('pointerup', () => {
            stopRunner(false);
        });
        ['pointercancel', 'pointerleave', 'lostpointercapture'].forEach(type => {
            button.addEventListener(type, () => {
                stopRunner(true);
            });
        });
    } else {
        button.addEventListener('touchstart', event => {
            if (button.disabled) {
                return;
            }
            lastPointerDownTime = performance.now();
            startRunner(event);
        }, { passive: false });
        button.addEventListener('touchend', () => {
            stopRunner(false);
        });
        button.addEventListener('touchcancel', () => {
            stopRunner(true);
        });
        button.addEventListener('mousedown', event => {
            if (button.disabled) {
                return;
            }
            const now = performance.now();
            if (now - lastPointerDownTime <= POINTER_CLICK_SUPPRESS_MS) {
                return;
            }
            lastPointerDownTime = now;
            startRunner(event);
        });
        ['mouseup', 'mouseleave', 'blur'].forEach(type => {
            button.addEventListener(type, () => {
                stopRunner(true);
            });
        });
    }

    button.addEventListener('click', event => {
        const now = performance.now();
        const recentlyPointer = now - lastPointerDownTime <= POINTER_CLICK_SUPPRESS_MS;
        if (suppressClick || recentlyPointer) {
            suppressClick = false;
            event.preventDefault();
            return;
        }
        if (button.disabled) {
            event.preventDefault();
            return;
        }
        action();
    });
}

function initializeMobileControls() {
    bindHoldButton(mobileLeftBtn, runIfPlayable(() => movePiece(-1)), { repeat: false });
    bindHoldButton(mobileRightBtn, runIfPlayable(() => movePiece(1)), { repeat: false });
    bindHoldButton(mobileSoftDropBtn, runIfPlayable(() => {
        stepDown();
        dropAccumulator = 0;
    }), { repeatDelay: 110 });
    bindHoldButton(mobileRotateBtn, runIfPlayable(() => rotateCurrentPiece(1)), { repeat: false });
    bindHoldButton(mobileHardDropBtn, runIfPlayable(() => hardDrop()), { repeat: false });

    if (mobilePauseBtn) {
        const handlePauseClick = event => {
            event.preventDefault();
            if (!gameActive || mobilePauseBtn.disabled) {
                return;
            }
            togglePause();
        };

        if (SUPPORTS_POINTER) {
            mobilePauseBtn.addEventListener('pointerdown', event => {
                if (mobilePauseBtn.disabled) {
                    return;
                }
                event.preventDefault();
            }, { passive: false });
        } else {
            mobilePauseBtn.addEventListener('touchstart', event => {
                if (mobilePauseBtn.disabled) {
                    return;
                }
                event.preventDefault();
            }, { passive: false });
            mobilePauseBtn.addEventListener('mousedown', event => {
                if (mobilePauseBtn.disabled) {
                    return;
                }
                event.preventDefault();
            });
        }

        mobilePauseBtn.addEventListener('click', handlePauseClick);
    }
}
function updatePreview() {
    nextCtx.clearRect(0, 0, previewWidth, previewHeight);

    const gradient = nextCtx.createLinearGradient(0, 0, 0, previewHeight);
    gradient.addColorStop(0, 'rgba(252, 242, 210, 0.95)');
    gradient.addColorStop(1, 'rgba(216, 183, 135, 0.9)');
    nextCtx.fillStyle = gradient;
    nextCtx.fillRect(0, 0, previewWidth, previewHeight);

    nextCtx.strokeStyle = 'rgba(60, 40, 20, 0.2)';
    nextCtx.strokeRect(0.5, 0.5, Math.max(previewWidth - 1, 0), Math.max(previewHeight - 1, 0));

    if (!nextPiece) {
        return;
    }

    const width = nextPiece.width;
    const height = nextPiece.height;
    const insetWidth = Math.max(12, Math.round(previewWidth * (40 / BASE_PREVIEW_WIDTH)));
    const insetHeight = Math.max(12, Math.round(previewHeight * (40 / BASE_PREVIEW_HEIGHT)));
    const usableWidth = Math.max(previewWidth - insetWidth, 0);
    const usableHeight = Math.max(previewHeight - insetHeight, 0);
    const cellSize = Math.min(usableWidth / width, usableHeight / height);
    const offsetX = (previewWidth - width * cellSize) / 2;
    const offsetY = (previewHeight - height * cellSize) / 2;

    nextPiece.cells.forEach(cell => {
        const cx = offsetX + cell.col * cellSize + cellSize / 2;
        const cy = offsetY + cell.row * cellSize + cellSize / 2;
        const value = cell.drawValue !== undefined ? cell.drawValue : (cell.boardValue !== undefined ? cell.boardValue : cell.color);
        if (value === null || value === undefined || value === CELL_EMPTY) {
            return;
        }
        if (value === CELL_EYE_BLACK || value === CELL_EYE_WHITE) {
            drawEyeStone(nextCtx, cx, cy, cellSize * 0.42, value, 1);
        } else if (value === CELL_BLOCK_BLACK || value === CELL_BLOCK_WHITE) {
            const baseColor = value === CELL_BLOCK_BLACK ? CELL_BLACK : CELL_WHITE;
            drawStone(nextCtx, cx, cy, cellSize * 0.42, baseColor, 1);
        } else {
            drawStone(nextCtx, cx, cy, cellSize * 0.42, value, 1);
        }
    });
}

function draw() {
    drawBoardBackground();
    drawGridLines();
    drawPlacedStones();
    if (currentPiece) {
        drawGhost(currentPiece);
        drawPiece(currentPiece);
    }
    drawCaptureLineEffects();
    drawEffects();
}

function drawBoardBackground() {
    const gradient = ctx.createLinearGradient(0, 0, BOARD_PIXEL_WIDTH, BOARD_PIXEL_HEIGHT);
    gradient.addColorStop(0, 'rgba(253, 244, 214, 0.95)');
    gradient.addColorStop(1, 'rgba(214, 176, 128, 0.92)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, BOARD_PIXEL_WIDTH, BOARD_PIXEL_HEIGHT);
}

function drawCaptureLineEffects() {
    if (captureLineEffects.size === 0) {
        return;
    }

    const now = performance.now();
    const finished = [];

    captureLineEffects.forEach((effect, groupId) => {
        const elapsed = now - effect.startTime;
        const progress = Math.min(elapsed / effect.duration, 1);
        if (progress <= 0) {
            return;
        }

        const easedProgress = progress < 1 ? progress * progress * (3 - 2 * progress) : 1;
        const totalToDraw = effect.totalLength * easedProgress;

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = effect.strokeStyle;
        ctx.lineWidth = effect.lineWidth * (0.85 + 0.35 * (1 - progress));
        ctx.shadowColor = effect.shadowColor;
        ctx.shadowBlur = effect.lineWidth * 1.4;
        ctx.globalAlpha = 0.9;

        ctx.beginPath();
        let remaining = totalToDraw;
        let started = false;
        for (const segment of effect.segments) {
            if (!started) {
                ctx.moveTo(segment.from.x, segment.from.y);
                started = true;
            }
            if (remaining >= segment.length) {
                ctx.lineTo(segment.to.x, segment.to.y);
                remaining -= segment.length;
            } else {
                const t = segment.length === 0 ? 0 : remaining / segment.length;
                const partialX = segment.from.x + (segment.to.x - segment.from.x) * t;
                const partialY = segment.from.y + (segment.to.y - segment.from.y) * t;
                ctx.lineTo(partialX, partialY);
                break;
            }
        }
        ctx.stroke();
        ctx.restore();

        if (progress >= 1) {
            finished.push(groupId);
        }
    });

    finished.forEach(groupId => {
        captureLineEffects.delete(groupId);
    });
}

function drawGridLines() {
    ctx.strokeStyle = 'rgba(60, 40, 20, 0.35)';
    ctx.lineWidth = 1;

    const gridWidth = (COLS - 1) * CELL_SIZE;
    const gridHeight = (ROWS - 1) * CELL_SIZE;

    for (let row = 0; row < ROWS; row += 1) {
        const y = GRID_MARGIN + row * CELL_SIZE + 0.5;
        ctx.beginPath();
        ctx.moveTo(GRID_MARGIN + 0.5, y);
        ctx.lineTo(GRID_MARGIN + gridWidth - 0.5, y);
        ctx.stroke();
    }

    for (let col = 0; col < COLS; col += 1) {
        const x = GRID_MARGIN + col * CELL_SIZE + 0.5;
        ctx.beginPath();
        ctx.moveTo(x, GRID_MARGIN + 0.5);
        ctx.lineTo(x, GRID_MARGIN + gridHeight - 0.5);
        ctx.stroke();
    }

    ctx.strokeRect(GRID_MARGIN + 0.5, GRID_MARGIN + 0.5, gridWidth - 1, gridHeight - 1);
}

function drawPlacedStones() {
    for (let row = 0; row < ROWS; row += 1) {
        for (let col = 0; col < COLS; col += 1) {
            const stone = board[row][col];
            if (stone === 0) {
                continue;
            }
            drawStoneOnBoard(row, col, stone, 1);
        }
    }
}

function drawPiece(piece) {
    piece.cells.forEach(cell => {
        const row = piece.position.row + cell.row;
        const col = piece.position.col + cell.col;
        if (row < 0) {
            return;
        }
        const value = cell.drawValue !== undefined ? cell.drawValue : (cell.boardValue !== undefined ? cell.boardValue : cell.color);
        if (value === null || value === undefined || value === CELL_EMPTY) {
            return;
        }
        drawStoneOnBoard(row, col, value, 1);
    });
}

function drawGhost(piece) {
    const ghostRow = getGhostRow(piece);
    piece.cells.forEach(cell => {
        const row = ghostRow + cell.row;
        const col = piece.position.col + cell.col;
        if (row < 0) {
            return;
        }
        const ghostValue = cell.drawValue !== undefined ? cell.drawValue : (cell.boardValue !== undefined ? cell.boardValue : cell.color);
        if (ghostValue === null || ghostValue === undefined || ghostValue === CELL_EMPTY) {
            return;
        }
        drawStoneOnBoard(row, col, ghostValue, 0.25);
    });
}

function drawStoneOnBoard(row, col, value, alpha) {
    if (value === null || value === undefined || value === CELL_EMPTY) {
        return;
    }
    const cx = GRID_MARGIN + col * CELL_SIZE;
    const cy = GRID_MARGIN + row * CELL_SIZE;

    if (value === CELL_BLOCK_BLACK || value === CELL_BLOCK_WHITE) {
        const baseColor = value === CELL_BLOCK_BLACK ? CELL_BLACK : CELL_WHITE;
        drawStone(ctx, cx, cy, CELL_SIZE * 0.42, baseColor, alpha);
        return;
    }
    if (value === CELL_EYE_BLACK || value === CELL_EYE_WHITE) {
        drawEyeStone(ctx, cx, cy, CELL_SIZE * 0.42, value, alpha);
        return;
    }

    const highlight = captureHighlights.get(`${row},${col}`);
    if (highlight) {
        drawHighlightedStone(ctx, cx, cy, CELL_SIZE * 0.42, value, highlight);
        return;
    }
    drawStone(ctx, cx, cy, CELL_SIZE * 0.42, value, alpha);
}

function drawHighlightedStone(context, cx, cy, radius, baseColor, highlight) {
    const now = performance.now();
    const elapsed = now - (highlight.startTime || 0);
    const colorProgress = Math.min(elapsed / CAPTURE_COLOR_ANIM_DURATION, 1);
    const glowProgress = Math.min(elapsed / CAPTURE_LINE_ANIM_DURATION, 1);

    drawStone(context, cx, cy, radius, baseColor, 1);

    context.save();
    const gradient = context.createRadialGradient(
        cx - radius * 0.35,
        cy - radius * 0.35,
        radius * 0.15,
        cx,
        cy,
        radius
    );
    if (highlight.type === 'captured') {
        gradient.addColorStop(0, '#ffe8c2');
        gradient.addColorStop(1, '#ff824d');
    } else {
        gradient.addColorStop(0, '#c9f0ff');
        gradient.addColorStop(1, '#3ec5ff');
    }
    const alpha = highlight.type === 'captured' ? colorProgress : Math.max(glowProgress * 0.9, 0.3);
    context.globalCompositeOperation = 'lighter';
    context.globalAlpha = alpha;
    context.fillStyle = gradient;
    context.shadowColor = highlight.type === 'captured' ? 'rgba(255, 150, 60, 0.8)' : 'rgba(90, 200, 255, 0.75)';
    context.shadowBlur = radius * (1.2 + glowProgress * 0.6);
    context.beginPath();
    context.arc(cx, cy, radius, 0, Math.PI * 2);
    context.fill();
    context.restore();

    if (highlight.type === 'captured' && colorProgress < 1) {
        context.save();
        context.globalCompositeOperation = 'source-atop';
        context.globalAlpha = colorProgress * 0.5;
        context.fillStyle = 'rgba(255, 180, 120, 0.8)';
        context.beginPath();
        context.arc(cx, cy, radius, 0, Math.PI * 2);
        context.fill();
        context.restore();
    }
}

function drawStone(context, cx, cy, radius, color, alpha = 1) {
    context.save();
    context.globalAlpha = alpha;
    const gradient = context.createRadialGradient(
        cx - radius * 0.35,
        cy - radius * 0.35,
        radius * 0.3,
        cx,
        cy,
        radius
    );

    if (color === 1) {
        gradient.addColorStop(0, '#4f4f4f');
        gradient.addColorStop(1, '#101010');
    } else {
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(1, '#cfcfcf');
    }

    context.fillStyle = gradient;
    context.beginPath();
    context.arc(cx, cy, radius, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = 'rgba(0, 0, 0, 0.22)';
    context.lineWidth = radius * 0.12;
    context.stroke();
    context.restore();
}

function drawObstacleBlock(context, cx, cy, value, alpha) {
    const blockSize = CELL_SIZE * 0.72;
    const left = cx - blockSize / 2;
    const top = cy - blockSize / 2;
    const fill = value === CELL_BLOCK_BLACK ? '#353b4a' : '#d8cba7';
    const border = value === CELL_BLOCK_BLACK ? 'rgba(18, 20, 30, 0.85)' : 'rgba(132, 120, 90, 0.9)';
    const inner = value === CELL_BLOCK_BLACK ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.32)';
    context.save();
    context.globalAlpha = alpha;
    context.fillStyle = fill;
    context.fillRect(left, top, blockSize, blockSize);
    context.strokeStyle = border;
    context.lineWidth = CELL_SIZE * 0.08;
    context.strokeRect(left, top, blockSize, blockSize);
    const innerSize = blockSize * 0.56;
    const innerLeft = cx - innerSize / 2;
    const innerTop = cy - innerSize / 2;
    context.strokeStyle = inner;
    context.lineWidth = CELL_SIZE * 0.05;
    context.strokeRect(innerLeft, innerTop, innerSize, innerSize);
    context.restore();
}

function drawEyeStone(context, cx, cy, radius, eyeValue, alpha) {
    const baseColor = eyeValue === CELL_EYE_BLACK ? CELL_BLACK : CELL_WHITE;
    drawStone(context, cx, cy, radius, baseColor, alpha);
    context.save();
    context.globalAlpha = alpha;
    const irisRadius = radius * 0.48;
    context.fillStyle = eyeValue === CELL_EYE_BLACK ? 'rgba(58, 150, 222, 0.85)' : 'rgba(238, 204, 90, 0.88)';
    context.beginPath();
    context.arc(cx, cy, irisRadius, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    context.lineWidth = radius * 0.16;
    context.beginPath();
    context.moveTo(cx - irisRadius * 0.55, cy);
    context.lineTo(cx + irisRadius * 0.55, cy);
    context.moveTo(cx, cy - irisRadius * 0.55);
    context.lineTo(cx, cy + irisRadius * 0.55);
    context.stroke();
    context.fillStyle = 'rgba(255, 255, 255, 0.68)';
    context.beginPath();
    context.arc(cx, cy, irisRadius * 0.35, 0, Math.PI * 2);
    context.fill();
    context.restore();
}

function getGhostRow(piece) {
    const ghostPiece = {
        ...piece,
        position: { ...piece.position }
    };
    while (isValidPosition(ghostPiece, 1, 0)) {
        ghostPiece.position.row += 1;
    }
    return ghostPiece.position.row;
}

function rotateCurrentPiece(direction) {
    if (!currentPiece) {
        return;
    }
    const rotated = rotatePiece(currentPiece, direction);
    const kicks = [0, -1, 1, -2, 2];
    for (const kick of kicks) {
        rotated.position = {
            row: currentPiece.position.row,
            col: currentPiece.position.col + kick
        };
        if (isValidPosition(rotated, 0, 0)) {
            currentPiece = {
                ...rotated,
                position: { ...rotated.position }
            };
            return;
        }
    }
}

function rotatePiece(piece, direction) {
    const rotatedCells = piece.cells.map(cell => {
        const shared = {
            color: cell.color,
            boardValue: cell.boardValue,
            lockOnPlace: cell.lockOnPlace,
            drawValue: cell.drawValue,
            isEyeCenter: cell.isEyeCenter
        };
        if (direction === 1) {
            return {
                row: cell.col,
                col: piece.height - 1 - cell.row,
                ...shared
            };
        }
        return {
            row: piece.width - 1 - cell.col,
            col: cell.row,
            ...shared
        };
    });

    const newWidth = Math.max(...rotatedCells.map(cell => cell.col)) + 1;
    const newHeight = Math.max(...rotatedCells.map(cell => cell.row)) + 1;

    return {
        ...piece,
        cells: rotatedCells,
        width: newWidth,
        height: newHeight,
        rotation: (piece.rotation + (direction === 1 ? 1 : -1) + 4) % 4,
        position: { ...piece.position }
    };
}

function handleKeyDown(event) {
    if (event.code === 'KeyP') {
        event.preventDefault();
        if (gameActive) {
            togglePause();
        }
        return;
    }

    const target = event.target;
    const tagName = target && target.tagName ? target.tagName.toUpperCase() : '';
    if (tagName === 'INPUT' || tagName === 'TEXTAREA') {
        return;
    }

    if (!gameActive) {
        return;
    }

    if (!CONTROL_KEY_CODES.has(event.code)) {
        return;
    }

    event.preventDefault();

    if (paused || !currentPiece) {
        return;
    }

    switch (event.code) {
        case 'ArrowLeft':
            movePiece(-1);
            break;
        case 'ArrowRight':
            movePiece(1);
            break;
        case 'ArrowDown':
            stepDown();
            dropAccumulator = 0;
            break;
        case 'ArrowUp':
            rotateCurrentPiece(1);
            break;
        case 'Space':
        case 'Enter':
            hardDrop();
            break;
        default:
            break;
    }
}

function togglePause(forceState) {
    if (!gameActive) {
        return;
    }
    const targetState = typeof forceState === 'boolean' ? forceState : !paused;
    paused = targetState;
    pauseBtn.textContent = paused ? '再開' : 'ポーズ';
    if (paused) {
        setStatusMessage('一時停止中。Pキーか再開ボタンで続行。');
    } else {
        setStatusMessage('再開します。');
        dropAccumulator = 0;
        lastFrameTime = null;
    }
    refreshMobileControls();
    syncBgmVolume();
    updateBgmStatusText();
}

document.addEventListener('keydown', handleKeyDown);
if (headerStartBtn) {
    const triggerStart = () => {
        startGame();
        headerStartBtn.blur();
        if (startBtn) {
            startBtn.blur();
        }
    };
    headerStartBtn.addEventListener('click', event => {
        event.preventDefault();
        triggerStart();
    });
    headerStartBtn.addEventListener('keydown', event => {
        if (event.code === 'Space' || event.code === 'Enter') {
            event.preventDefault();
        }
    });
    if (SUPPORTS_POINTER) {
        headerStartBtn.addEventListener('pointerdown', event => {
            if (event.pointerType === 'touch') {
                event.preventDefault();
                triggerStart();
            }
        }, { passive: false });
    } else {
        headerStartBtn.addEventListener('touchstart', event => {
            event.preventDefault();
            triggerStart();
        }, { passive: false });
    }
}
startBtn.addEventListener('click', event => {
    event.preventDefault();
    startGame();
    startBtn.blur();
    if (headerStartBtn) {
        headerStartBtn.blur();
    }
});
startBtn.addEventListener('keydown', event => {
    if (event.code === 'Space' || event.code === 'Enter') {
        event.preventDefault();
    }
});
pauseBtn.addEventListener('click', () => {
    togglePause();
});
restartBtn.addEventListener('click', event => {
    event.preventDefault();
    startGame();
    restartBtn.blur();
    startBtn.blur();
    if (headerStartBtn) {
        headerStartBtn.blur();
    }
});
document.addEventListener('visibilitychange', () => {
    if (document.hidden && gameActive && !paused) {
        togglePause(true);
    }
    if (!document.hidden) {
        startBgmIfEnabled();
    }
    syncBgmVolume();
    updateBgmStatusText();
});

function gameLoop(timestamp) {
    if (!lastFrameTime) {
        lastFrameTime = timestamp;
    }
    const delta = timestamp - lastFrameTime;
    lastFrameTime = timestamp;

    if (gameActive && !paused && currentPiece) {
        dropAccumulator += delta;
        if (dropAccumulator >= dropInterval) {
            dropAccumulator -= dropInterval;
            stepDown();
        }
    }

    updateEffects(delta);
    draw();
    requestAnimationFrame(gameLoop);
}

initializeAudioControls();
initializeMobileControls();
refreshMobileControls();
requestAnimationFrame(gameLoop);

setHeaderScoreActive(false);
updateStats();
updatePreview();
