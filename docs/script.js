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
const mobileLeftBtn = document.getElementById('mobileLeftBtn');
const mobileRightBtn = document.getElementById('mobileRightBtn');
const mobileRotateBtn = document.getElementById('mobileRotateBtn');
const mobileSoftDropBtn = document.getElementById('mobileSoftDropBtn');
const mobileHardDropBtn = document.getElementById('mobileHardDropBtn');
const mobilePauseBtn = document.getElementById('mobilePauseBtn');
const headerStartBtn = document.getElementById('headerStartBtn');
const playerNameInput = document.getElementById('playerNameInput');
const dailyLeaderboardList = document.getElementById('dailyLeaderboard');
const leaderboardEmpty = document.getElementById('leaderboardEmpty');
const leaderboardDateLabel = document.getElementById('leaderboardDate');

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


const SWIPE_THRESHOLD = CELL_SIZE;
const effects = [];
const HIGH_SCORE_KEY = 'goDropHighScore';
const PLAYER_NAME_KEY = 'goDropPlayerName';
const API_BASE = 'https://script.google.com/macros/s/AKfycbwcZpx3SLF1z8jTOL6lHeayA4eWzIDGAjzc_fXIffIGyAOliZuiMxVrfV3682ACfT5g/exec';
const LEADERBOARD_LIMIT = 5;
const LEADERBOARD_TIMEOUT_MS = 6000;

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

const board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));

const BASE_BOARD_WIDTH = canvas.width;
const BASE_BOARD_HEIGHT = canvas.height;
const BASE_PREVIEW_WIDTH = nextCanvas.width;
const BASE_PREVIEW_HEIGHT = nextCanvas.height;
const BOARD_PIXEL_WIDTH = BASE_BOARD_WIDTH;
const BOARD_PIXEL_HEIGHT = BASE_BOARD_HEIGHT;

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
    if (!value) {
        return '';
    }
    return value
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

function formatLeaderboardDate(key) {
    if (!key) {
        return '';
    }
    const [year, month, day] = key.split('-');
    const monthNum = parseInt(month, 10) || 0;
    const dayNum = parseInt(day, 10) || 0;
    return `${year}年${monthNum}月${dayNum}日`;
}


function getActivePlayerName() {
    const current = playerNameInput ? sanitizePlayerName(playerNameInput.value) : playerName;
    const resolved = current || playerName || 'プレイヤー';
    return resolved;
}

async function refreshLeaderboard() {
    const todayKey = getTodayKey();
    if (leaderboardDateLabel) {
        leaderboardDateLabel.textContent = formatLeaderboardDate(todayKey);
    }

    if (!dailyLeaderboardList) {
        return;
    }

    if (leaderboardEmpty) {
        leaderboardEmpty.textContent = '読み込み中…';
        leaderboardEmpty.classList.remove('hidden');
    }

    try {
        const useAbort = typeof AbortController !== 'undefined';
        const controller = useAbort ? new AbortController() : null;
        const timeoutId = useAbort ? setTimeout(() => controller.abort(), LEADERBOARD_TIMEOUT_MS) : null;
        const response = await fetch(`${API_BASE}?date=${encodeURIComponent(todayKey)}&limit=${LEADERBOARD_LIMIT}`, {
            method: 'GET',
            mode: 'cors',
            cache: 'no-store',
            signal: controller ? controller.signal : undefined
        });
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
        }
        if (!response.ok) {
            throw new Error(`Leaderboard request failed: ${response.status}`);
        }
        const payload = await response.json();
        const entries = Array.isArray(payload.entries) ? payload.entries : [];
        renderLeaderboard(entries);
    } catch (error) {
        console.error('Failed to load leaderboard', error);
        renderLeaderboard([]);
        if (leaderboardEmpty) {
            leaderboardEmpty.textContent = 'ランキングを読み込めませんでした。';
            leaderboardEmpty.classList.remove('hidden');
        }
    }
}

function renderLeaderboard(entries) {
    if (!dailyLeaderboardList) {
        return;
    }
    dailyLeaderboardList.innerHTML = '';
    if (!entries || entries.length === 0) {
        if (leaderboardEmpty) {
            leaderboardEmpty.textContent = 'まだスコアがありません。';
            leaderboardEmpty.classList.remove('hidden');
        }
        return;
    }
    if (leaderboardEmpty) {
        leaderboardEmpty.classList.add('hidden');
    }
    entries.slice(0, LEADERBOARD_LIMIT).forEach((entry, index) => {
        const item = document.createElement('li');
        const rank = document.createElement('span');
        rank.className = 'rank';
        rank.textContent = String(index + 1);
        const name = document.createElement('span');
        name.className = 'name';
        const safeName = sanitizePlayerName(entry.name) || 'プレイヤー';
        name.textContent = safeName;
        const score = document.createElement('span');
        score.className = 'score';
        const scoreValue = Number.isFinite(entry.score) ? Number(entry.score) : 0;
        score.textContent = scoreValue.toLocaleString('ja-JP');
        item.append(rank, name, score);
        dailyLeaderboardList.appendChild(item);
    });
}

function submitScore(finalScore) {
    if (!Number.isFinite(finalScore) || finalScore <= 0) {
        refreshLeaderboard();
        return;
    }

    const payload = {
        name: getActivePlayerName(),
        score: Math.floor(finalScore),
        origin: location.hostname
    };

    playerName = payload.name;
    savePlayerName(playerName);
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
configureCanvasResolution(nextCanvas, nextCtx, BASE_PREVIEW_WIDTH, BASE_PREVIEW_HEIGHT);

window.addEventListener('resize', () => {
    configureCanvasResolution(canvas, ctx, BASE_BOARD_WIDTH, BASE_BOARD_HEIGHT);
    configureCanvasResolution(nextCanvas, nextCtx, BASE_PREVIEW_WIDTH, BASE_PREVIEW_HEIGHT);
});

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
        name: 'BambooJoint',
        cells: [
            { row: 0, col: 0, color: 1 },
            { row: 1, col: 0, color: 2 },
            { row: 2, col: 0, color: 1 },
            { row: 3, col: 0, color: 2 }
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
        name: 'Ladder',
        cells: [
            { row: 0, col: 0, color: 1 },
            { row: 1, col: 0, color: 1 },
            { row: 1, col: 1, color: 2 },
            { row: 2, col: 1, color: 2 }
        ]
    },
    {
        name: 'Keima',
        cells: [
            { row: 0, col: 0, color: 1 },
            { row: 0, col: 1, color: 2 },
            { row: 1, col: 2, color: 1 },
            { row: 2, col: 2, color: 2 }
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
        name: 'Seki',
        cells: [
            { row: 0, col: 0, color: 1 },
            { row: 0, col: 1, color: 2 },
            { row: 1, col: 0, color: 2 },
            { row: 1, col: 1, color: 1 }
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

function clearBoard() {
    for (let row = 0; row < ROWS; row += 1) {
        for (let col = 0; col < COLS; col += 1) {
            board[row][col] = 0;
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
    captures = { black: 0, white: 0 };
    dropInterval = BASE_DROP_INTERVAL;
    dropAccumulator = 0;
    lastFrameTime = null;
    gameActive = true;
    paused = false;
    currentPiece = null;
    nextPiece = instantiatePiece(randomTemplate());
    overlay.classList.add('hidden');
    pauseBtn.disabled = false;
    pauseBtn.textContent = 'ポーズ';
    startBtn.textContent = 'リスタート';
    if (headerStartBtn) {
        headerStartBtn.textContent = 'リスタート';
    }
    setStatusMessage('新しい対局開始。囲んで捕獲しよう。');
    updateStats();
    updatePreview();
    spawnNewPiece();
    refreshMobileControls();
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
    setStatusMessage('ゲーム終了。');
    refreshMobileControls();
}

function spawnNewPiece() {
    if (!nextPiece) {
        nextPiece = instantiatePiece(randomTemplate());
    }

    currentPiece = nextPiece;
    currentPiece.position = {
        row: -2,
        col: Math.floor((COLS - currentPiece.width) / 2)
    };
    dropAccumulator = 0;

    nextPiece = instantiatePiece(randomTemplate());
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
        return board[targetRow][targetCol] === 0;
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
    placedPiece.cells.forEach(cell => {
        const row = placedPiece.position.row + cell.row;
        const col = placedPiece.position.col + cell.col;
        if (row < 0) {
            overflow = true;
            return;
        }
        board[row][col] = cell.color;
    });

    if (overflow) {
        endGame('盤面が埋まりました');
        return;
    }

    currentPiece = null;
    applyGravity();

    captureResolutionInProgress = true;
    settleBoardWithHighlights(result => {
        const { totalRemoved, captureTotals, removedStones } = result;

        if (totalRemoved > 0) {
            chain += 1;
            const chainMultiplier = 1 + (chain - 1) * 0.5;
            score += Math.floor(totalRemoved * 60 * chainMultiplier);
            captures.black += captureTotals.black;
            captures.white += captureTotals.white;
            spawnCaptureEffects(removedStones);
            setStatusMessage(`${totalRemoved}個を捕獲。チェインx${chain}。`);
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

        updateStats();
        captureResolutionInProgress = false;

        if (!spawnNewPiece()) {
            refreshMobileControls();
            return;
        }
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
                    board[cell.row][cell.col] = 0;
                });
            });
            applyGravity();
            processLoop();
        }, CAPTURE_HIGHLIGHT_DURATION);
    }

    processLoop();
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
            if (stone === 0) {
                continue;
            }
            const key = `${row},${col}`;
            if (visited.has(key)) {
                continue;
            }

            const { stones, liberties } = evaluateGroup(row, col, stone, visited);
            if (liberties === 0) {
                const capturingColor = stone === 1 ? 2 : 1;
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
                if (stone === 1) {
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
        }
    });
    ctx.restore();
}

function evaluateGroup(row, col, color, visited) {
    const queue = [[row, col]];
    const stones = [];
    const libertySet = new Set();
    visited.add(`${row},${col}`);

    while (queue.length > 0) {
        const [currentRow, currentCol] = queue.shift();
        stones.push({ row: currentRow, col: currentCol });

        DIRECTIONS.forEach(([dRow, dCol]) => {
            const nextRow = currentRow + dRow;
            const nextCol = currentCol + dCol;

            if (nextRow < 0 || nextRow >= ROWS || nextCol < 0 || nextCol >= COLS) {
                return;
            }

            const space = board[nextRow][nextCol];
            if (space === 0) {
                libertySet.add(`${nextRow},${nextCol}`);
            } else if (space === color) {
                const key = `${nextRow},${nextCol}`;
                if (!visited.has(key)) {
                    visited.add(key);
                    queue.push([nextRow, nextCol]);
                }
            }
        });
    }

    return {
        stones,
        liberties: libertySet.size
    };
}

function applyGravity() {
    for (let col = 0; col < COLS; col += 1) {
        let writeRow = ROWS - 1;
        for (let row = ROWS - 1; row >= 0; row -= 1) {
            if (board[row][col] !== 0) {
                const value = board[row][col];
                board[row][col] = 0;
                board[writeRow][col] = value;
                writeRow -= 1;
            }
        }
    }
}

function updateStats() {
    scoreValue.textContent = score.toLocaleString('en-US');
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
    const repeatDelay = options.repeatDelay ?? 140;
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
    nextCtx.clearRect(0, 0, BASE_PREVIEW_WIDTH, BASE_PREVIEW_HEIGHT);

    const gradient = nextCtx.createLinearGradient(0, 0, 0, BASE_PREVIEW_HEIGHT);
    gradient.addColorStop(0, 'rgba(252, 242, 210, 0.95)');
    gradient.addColorStop(1, 'rgba(216, 183, 135, 0.9)');
    nextCtx.fillStyle = gradient;
    nextCtx.fillRect(0, 0, BASE_PREVIEW_WIDTH, BASE_PREVIEW_HEIGHT);

    nextCtx.strokeStyle = 'rgba(60, 40, 20, 0.2)';
    nextCtx.strokeRect(0.5, 0.5, BASE_PREVIEW_WIDTH - 1, BASE_PREVIEW_HEIGHT - 1);

    if (!nextPiece) {
        return;
    }

    const width = nextPiece.width;
    const height = nextPiece.height;
    const usableWidth = BASE_PREVIEW_WIDTH - 40;
    const usableHeight = BASE_PREVIEW_HEIGHT - 40;
    const cellSize = Math.min(usableWidth / width, usableHeight / height);
    const offsetX = (BASE_PREVIEW_WIDTH - width * cellSize) / 2;
    const offsetY = (BASE_PREVIEW_HEIGHT - height * cellSize) / 2;

    nextPiece.cells.forEach(cell => {
        const cx = offsetX + cell.col * cellSize + cellSize / 2;
        const cy = offsetY + cell.row * cellSize + cellSize / 2;
        drawStone(nextCtx, cx, cy, cellSize * 0.42, cell.color);
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
        drawStoneOnBoard(row, col, cell.color, 1);
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
        drawStoneOnBoard(row, col, cell.color, 0.25);
    });
}

function drawStoneOnBoard(row, col, color, alpha) {
    const cx = GRID_MARGIN + col * CELL_SIZE;
    const cy = GRID_MARGIN + row * CELL_SIZE;
    const highlight = captureHighlights.get(`${row},${col}`);
    if (highlight) {
        drawHighlightedStone(ctx, cx, cy, CELL_SIZE * 0.42, color, highlight);
        return;
    }
    drawStone(ctx, cx, cy, CELL_SIZE * 0.42, color, alpha);
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
        if (direction === 1) {
            return {
                row: cell.col,
                col: piece.height - 1 - cell.row,
                color: cell.color
            };
        }
        return {
            row: piece.width - 1 - cell.col,
            col: cell.row,
            color: cell.color
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

    if (!gameActive || paused || !currentPiece) {
        return;
    }

    switch (event.code) {
        case 'ArrowLeft':
            event.preventDefault();
            movePiece(-1);
            break;
        case 'ArrowRight':
            event.preventDefault();
            movePiece(1);
            break;
        case 'ArrowDown':
            event.preventDefault();
            stepDown();
            dropAccumulator = 0;
            break;
        case 'ArrowUp':
            event.preventDefault();
            rotateCurrentPiece(1);
            break;
        case 'Space':
        case 'Enter':
            event.preventDefault();
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

initializeMobileControls();
refreshMobileControls();
requestAnimationFrame(gameLoop);

updateStats();
updatePreview();

