import {
  BASE_DROP_INTERVAL,
  CELL_BLACK,
  CELL_BLOCK_BLACK,
  CELL_BLOCK_WHITE,
  CELL_EMPTY,
  CELL_EYE_BLACK,
  CELL_EYE_WHITE,
  CELL_SIZE,
  CELL_WHITE,
  COLS,
  EYE_FRAME_COOLDOWN_PIECES,
  EYE_FRAME_DROP_CHANCE,
  EYE_FRAME_RING_OFFSETS,
  GRID_MARGIN,
  MIN_PIECES_BEFORE_EYE_FRAME,
  ROWS
} from './constants';
import type { CellValue } from './constants';

import {
  applyGravity,
  collectCapturingStones,
  createBoard,
  createLockedGrid,
  isDangerZoneTriggered,
  isValidPosition,
  resolveCaptures,
  rotatePiece,
  evaluateGroup,
  canPlaceStoneInEye,
  isEyeCell
} from './logic';

import {
  clonePiece,
  createEyeFramePiecePrototype,
  instantiatePiece,
  randomTemplate
} from './pieces';
import type {
  CaptureGroup,
  PieceInstance,
  RemovedStone
} from './types';
import type { CaptureState, GameSessionState, LastResultSummary } from './state/session';

const GRID_LINE_COLOR = 'rgba(80, 58, 34, 0.65)';
const GRID_BORDER_COLOR = 'rgba(46, 36, 20, 0.75)';

export interface GameEngineOptions {
  boardCanvas: HTMLCanvasElement;
  nextDesktopCanvas?: HTMLCanvasElement | null;
  nextMobileCanvas?: HTMLCanvasElement | null;
  onStateChange: (state: GameSessionState) => void;
  onStatus: (message: string, duration?: number) => void;
  onGameOver: (summary: LastResultSummary & { captures: CaptureState; chain: number }) => void;
  onPlayStone?: () => void;
  onCapture?: (count: number) => void;
  onDangerChange?: (danger: boolean) => void;
}

interface CaptureHighlight {
  type: 'captured' | 'capturing';
  startTime: number;
  duration: number;
  groupId: number;
  capturingColor?: number;
}

interface CaptureLineEffect {
  groupId: number;
  startTime: number;
  duration: number;
  segments: Array<{
    from: { x: number; y: number };
    to: { x: number; y: number };
    length: number;
  }>;
  totalLength: number;
  strokeStyle: string;
  shadowColor: string;
  lineWidth: number;
}

interface ParticleEffect {
  type: 'spark';
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  opacity: number;
  gravity: number;
}

interface RingEffect {
  type: 'ring';
  x: number;
  y: number;
  life: number;
  maxLife: number;
  startRadius: number;
  endRadius: number;
  lineWidth: number;
  color: string;
  opacity: number;
}

interface FlashEffect {
  type: 'flash';
  x: number;
  y: number;
  life: number;
  maxLife: number;
  color: string;
}

interface ScorePopupEffect {
  type: 'scorePopup';
  x: number;
  startY: number;
  rise: number;
  life: number;
  maxLife: number;
  text: string;
  fill: string;
  stroke: string;
  shadow: string;
}

interface EyePulseEffect {
  type: 'eyePulse';
  x: number;
  y: number;
  life: number;
  maxLife: number;
  radius: number;
  eyeValue: number;
  rotationBase: number;
  glowColor: string;
  particleColor: string;
  particles: Array<{
    baseAngle: number;
    radialSpeed: number;
    spin: number;
    size: number;
    baseAlpha: number;
  }>;
}

type Effect =
  | ParticleEffect
  | RingEffect
  | FlashEffect
  | ScorePopupEffect
  | EyePulseEffect;

const CAPTURE_EFFECT_CONFIG = {
  [CELL_BLACK]: {
    sparkColors: ['#8ec5ff', '#cfe9ff', '#ffffff'],
    ringColor: 'rgba(142, 197, 255, 0.85)'
  },
  [CELL_WHITE]: {
    sparkColors: ['#ffd166', '#ffba5a', '#fff3c4'],
    ringColor: 'rgba(255, 210, 102, 0.9)'
  }
};

const CAPTURE_LINE_COLORS = {
  [CELL_BLACK]: { stroke: 'rgba(58, 137, 255, 0.88)', shadow: 'rgba(152, 206, 255, 0.95)' },
  [CELL_WHITE]: { stroke: 'rgba(255, 176, 66, 0.92)', shadow: 'rgba(255, 220, 160, 0.95)' }
};

const CAPTURE_COLOR_ANIM_DURATION = 400;
const CAPTURE_LINE_ANIM_DURATION = 500;
const CAPTURE_HIGHLIGHT_DURATION = CAPTURE_LINE_ANIM_DURATION;

const CAPTURE_PARTICLE_FACTOR = 10;
const PARTICLE_GRAVITY = 320;
const PARTICLE_FRICTION = 0.86;
const CAPTURE_FLASH_LIFE = 220;
const SCORE_POPUP_DURATION = 1100;
const SCORE_POPUP_RISE_DISTANCE = CELL_SIZE * 1.9;
const SCORE_POPUP_FADE_START = 0.65;
const SCORE_POPUP_FILL = 'rgba(255, 248, 224, 0.96)';
const SCORE_POPUP_STROKE = 'rgba(56, 42, 24, 0.68)';
const SCORE_POPUP_SHADOW = 'rgba(0, 0, 0, 0.3)';

const PREVIEW_RESPONSIVE_QUERY = '(max-width: 900px)';

export class GameEngine {
  #options: GameEngineOptions;
  #boardCanvas: HTMLCanvasElement;
  #boardCtx: CanvasRenderingContext2D;
  #nextCanvas?: HTMLCanvasElement | null;
  #nextCtx?: CanvasRenderingContext2D | null;
  #nextMobileCanvas?: HTMLCanvasElement | null;
  #nextMobileCtx?: CanvasRenderingContext2D | null;
  #previewWidth = 150;
  #previewHeight = 150;
  #mobilePreviewWidth = 0;
  #mobilePreviewHeight = 0;
  #previewMediaQuery: MediaQueryList | null = null;

  #board = createBoard();
  #locked = createLockedGrid();
  #currentPiece: PieceInstance | null = null;
  #nextPiece: PieceInstance | null = null;
  #specialPieceQueue: PieceInstance[] = [];
  #activeEyeFrames: Array<{ centerRow: number; centerCol: number; capturesLeft: number }> = [];

  #score = 0;
  #level = 1;
  #chain = 0;
  #captures: CaptureState = { black: 0, white: 0 };
  #piecesPlaced = 0;
  #dropInterval = BASE_DROP_INTERVAL;
  #dropAccumulator = 0;
  #lastFrameTime: number | null = null;
  #gameActive = false;
  #paused = false;
  #danger = false;
  #lastResult: LastResultSummary | null = null;
  #effects: Effect[] = [];
  #captureHighlights = new Map<string, CaptureHighlight>();
  #captureLineEffects = new Map<number, CaptureLineEffect>();
  #captureGroupSequence = 0;

  #eyeFrameCooldown = 0;
  #eyeFrameFirstDropPending = true;

  #swipeActive = false;
  #swipeReferenceX = 0;
  #displayScale = 1;

  #frameHandle: number | null = null;

  constructor(options: GameEngineOptions) {
    this.#options = options;
    this.#boardCanvas = options.boardCanvas;
    const boardCtx = this.#boardCanvas.getContext('2d');
    if (!boardCtx) {
      throw new Error('Board canvas context unavailable');
    }
    this.#boardCtx = boardCtx;
    this.#nextCanvas = options.nextDesktopCanvas ?? null;
    this.#nextCtx = this.#nextCanvas ? this.#nextCanvas.getContext('2d') : null;
    this.#nextMobileCanvas = options.nextMobileCanvas ?? null;
    this.#nextMobileCtx = this.#nextMobileCanvas ? this.#nextMobileCanvas.getContext('2d') : null;

    this.#configureCanvasResolution();
    this.#nextPiece = this.#pullNextPiecePrototype();
    this.#applyPreviewCanvasSize({ redraw: true });
    this.#attachPointerHandlers();
    this.#attachResizeHandlers();
    this.#startLoop();
    this.#publishState();
  }

  setDisplayScale(scale: number): void {
    const normalized = Number.isFinite(scale) ? scale : 1;
    const nextScale = Math.max(0.25, normalized);
    if (Math.abs(nextScale - this.#displayScale) < 0.01) {
      return;
    }
    this.#displayScale = nextScale;
    this.#configureCanvasResolution();
  }

  start(): void {
    if (this.#gameActive) {
      this.restart();
      return;
    }
    this.restart();
  }

  restart(): void {
    this.#resetBoard();
    this.#gameActive = true;
    this.#paused = false;
    this.#score = 0;
    this.#level = 1;
    this.#chain = 0;
    this.#captures = { black: 0, white: 0 };
    this.#piecesPlaced = 0;
    this.#dropInterval = BASE_DROP_INTERVAL;
    this.#dropAccumulator = 0;
    this.#lastFrameTime = null;
    this.#danger = false;
    this.#lastResult = null;
    this.#specialPieceQueue.length = 0;
    this.#activeEyeFrames.length = 0;
    this.#eyeFrameCooldown = 0;
    this.#eyeFrameFirstDropPending = true;
    this.#effects.length = 0;
    this.#captureHighlights.clear();
    this.#captureLineEffects.clear();
    this.#currentPiece = null;
    this.#nextPiece = this.#pullNextPiecePrototype();
    this.#setStatus('新しい対局開始。囲んで捕獲しよう。');
    this.#spawnNewPiece();
    this.#publishState();
    this.#updateDangerState();
  }

  pause(reason?: string): void {
    if (!this.#gameActive || this.#paused) {
      return;
    }
    this.#paused = true;
    this.#setStatus(reason ?? '一時停止中。PキーかGOボタンで再開。');
    this.#publishState();
  }

  resume(): void {
    if (!this.#gameActive || !this.#paused) {
      return;
    }
    this.#paused = false;
    this.#setStatus('再開します。');
    this.#dropAccumulator = 0;
    this.#lastFrameTime = null;
    this.#publishState();
  }

  togglePause(): void {
    if (!this.#gameActive) {
      this.restart();
      return;
    }
    if (this.#paused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  moveLeft(): void {
    this.#movePiece(-1);
  }

  moveRight(): void {
    this.#movePiece(1);
  }

  rotate(clockwise = true): void {
    this.#rotateCurrentPiece(clockwise ? 1 : -1);
  }

  softDrop(): void {
    this.#stepDown();
  }

  hardDrop(): void {
    this.#hardDrop();
  }

  snapshot(): GameSessionState {
    return this.#composeState();
  }

  #startLoop(): void {
    const tick = (timestamp: number) => {
      this.#frameHandle = window.requestAnimationFrame(tick);
      this.#update(timestamp);
      this.#draw();
    };
    this.#frameHandle = window.requestAnimationFrame(tick);
  }

  #stopLoop(): void {
    if (this.#frameHandle !== null) {
      window.cancelAnimationFrame(this.#frameHandle);
      this.#frameHandle = null;
    }
  }

  #resetBoard(): void {
    this.#board = createBoard();
    this.#locked = createLockedGrid();
  }

  #configureCanvasResolution(): void {
    const ctx = this.#boardCtx;
    const canvas = this.#boardCanvas;
    const ratio = window.devicePixelRatio || 1;
    const width = (COLS - 1) * CELL_SIZE + GRID_MARGIN * 2;
    const height = (ROWS - 1) * CELL_SIZE + GRID_MARGIN * 2;
    const cssWidth = width * this.#displayScale;
    const cssHeight = height * this.#displayScale;

    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    canvas.width = Math.round(width * this.#displayScale * ratio);
    canvas.height = Math.round(height * this.#displayScale * ratio);
    ctx.setTransform(ratio * this.#displayScale, 0, 0, ratio * this.#displayScale, 0, 0);
  }

  #applyPreviewCanvasSize({ redraw = true }: { redraw?: boolean } = {}): void {
    const fallbackIsMobile = typeof window !== 'undefined' ? window.innerWidth <= 900 : false;
    const isMobile = this.#previewMediaQuery ? this.#previewMediaQuery.matches : fallbackIsMobile;
    const scale = isMobile ? 0.5 : 1;
    const width = Math.max(1, Math.round(150 * scale));
    const height = Math.max(1, Math.round(150 * scale));
    this.#previewWidth = width;
    this.#previewHeight = height;
    if (this.#nextCanvas && this.#nextCtx) {
      this.#configureResolution(this.#nextCanvas, this.#nextCtx, width, height);
    }
    if (this.#nextMobileCanvas && this.#nextMobileCtx) {
      const targetWidth = Math.max(
        1,
        Math.round(this.#nextMobileCanvas.clientWidth || width)
      );
      const targetHeight = Math.max(
        1,
        Math.round(this.#nextMobileCanvas.clientHeight || height)
      );
      this.#mobilePreviewWidth = targetWidth;
      this.#mobilePreviewHeight = targetHeight;
      this.#configureResolution(this.#nextMobileCanvas, this.#nextMobileCtx, targetWidth, targetHeight);
    }
    if (redraw) {
      this.#updatePreview();
    }
  }

  #configureResolution(
    canvas: HTMLCanvasElement,
    context: CanvasRenderingContext2D,
    targetWidth: number,
    targetHeight: number
  ): void {
    const ratio = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(targetWidth * ratio) || canvas.height !== Math.round(targetHeight * ratio)) {
      canvas.width = Math.round(targetWidth * ratio);
      canvas.height = Math.round(targetHeight * ratio);
    }
    canvas.style.width = `${targetWidth} px`;
    canvas.style.height = `${targetHeight} px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  #attachResizeHandlers(): void {
    window.addEventListener('resize', () => {
      this.#configureCanvasResolution();
      this.#applyPreviewCanvasSize();
    });
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      this.#previewMediaQuery = window.matchMedia(PREVIEW_RESPONSIVE_QUERY);
      const handler = () => this.#applyPreviewCanvasSize();
      if (typeof this.#previewMediaQuery.addEventListener === 'function') {
        this.#previewMediaQuery.addEventListener('change', handler);
      } else if (typeof this.#previewMediaQuery.addListener === 'function') {
        this.#previewMediaQuery.addListener(handler);
      }
    }
  }

  #attachPointerHandlers(): void {
    const canvas = this.#boardCanvas;
    const supportsPointer = window.PointerEvent !== undefined;
    if (supportsPointer) {
      canvas.addEventListener('pointerdown', event => {
        if (event.button !== undefined && event.button !== 0) {
          return;
        }
        if ((event as PointerEvent).pointerType === 'touch') {
          event.preventDefault();
        }
        if (typeof canvas.setPointerCapture === 'function') {
          try {
            canvas.setPointerCapture(event.pointerId);
          } catch {
            // ignore
          }
        }
        this.#handleSwipeStart(event.clientX);
      });
      canvas.addEventListener('pointermove', event => {
        if (!this.#swipeActive) {
          return;
        }
        if ((event as PointerEvent).pointerType === 'touch') {
          event.preventDefault();
        }
        this.#handleSwipeMove(event.clientX);
      });
      ['pointercancel', 'pointerleave', 'lostpointercapture'].forEach(type => {
        canvas.addEventListener(type, event => {
          if (
            typeof canvas.releasePointerCapture === 'function' &&
            event instanceof PointerEvent &&
            event.pointerId !== undefined
          ) {
            try {
              canvas.releasePointerCapture(event.pointerId);
            } catch {
              // ignore
            }
          }
          this.#handleSwipeEnd();
        });
      });
    } else {
      canvas.addEventListener('touchstart', event => {
        if (event.touches.length === 0) {
          return;
        }
        event.preventDefault();
        this.#handleSwipeStart(event.touches[0].clientX);
      }, { passive: false });
      canvas.addEventListener('touchmove', event => {
        if (!this.#swipeActive || event.touches.length === 0) {
          return;
        }
        event.preventDefault();
        this.#handleSwipeMove(event.touches[0].clientX);
      }, { passive: false });
      ['touchend', 'touchcancel'].forEach(type => {
        canvas.addEventListener(type, () => this.#handleSwipeEnd());
      });
      canvas.addEventListener('mousedown', event => {
        if (event.button !== 0) {
          return;
        }
        this.#handleSwipeStart(event.clientX);
      });
      canvas.addEventListener('mousemove', event => {
        if (!this.#swipeActive) {
          return;
        }
        this.#handleSwipeMove(event.clientX);
      });
      ['mouseup', 'mouseleave', 'blur'].forEach(type => {
        canvas.addEventListener(type, () => this.#handleSwipeEnd());
      });
    }
  }

  #handleSwipeStart(clientX: number): void {
    if (!this.#gameActive || this.#paused || !this.#currentPiece) {
      return;
    }
    this.#swipeActive = true;
    this.#swipeReferenceX = clientX;
  }

  #handleSwipeMove(clientX: number): void {
    if (!this.#swipeActive || !this.#gameActive || this.#paused || !this.#currentPiece) {
      return;
    }
    const delta = clientX - this.#swipeReferenceX;
    const threshold = CELL_SIZE * this.#displayScale;
    if (delta >= threshold) {
      this.#movePiece(1);
      this.#swipeReferenceX = clientX;
    } else if (delta <= -threshold) {
      this.#movePiece(-1);
      this.#swipeReferenceX = clientX;
    }
  }

  #handleSwipeEnd(): void {
    this.#swipeActive = false;
    this.#swipeReferenceX = 0;
  }

  #pullNextPiecePrototype(): PieceInstance {
    if (this.#specialPieceQueue.length > 0) {
      return clonePiece(this.#specialPieceQueue.shift()!)!;
    }
    return instantiatePiece(randomTemplate());
  }

  #queueEyeFramePiece(stoneColor: CellValue, prioritizeNext = false): void {
    const prototype = createEyeFramePiecePrototype(stoneColor);
    if (!this.#currentPiece && !prioritizeNext) {
      this.#specialPieceQueue.unshift(prototype);
      return;
    }
    if (prioritizeNext || !this.#nextPiece) {
      if (this.#nextPiece) {
        this.#specialPieceQueue.unshift(clonePiece(this.#nextPiece)!);
      }
      this.#nextPiece = prototype;
      this.#updatePreview();
    } else if (!this.#nextPiece.isEyeFrame) {
      this.#specialPieceQueue.unshift(prototype);
    } else {
      this.#specialPieceQueue.push(prototype);
    }
  }

  #spawnNewPiece(): boolean {
    if (!this.#nextPiece) {
      this.#nextPiece = this.#pullNextPiecePrototype();
    }
    const spawned = clonePiece(this.#nextPiece);
    if (!spawned) {
      return false;
    }
    spawned.position = {
      row: -2,
      col: Math.floor((COLS - spawned.width) / 2)
    };
    spawned.rotation = 0;
    this.#currentPiece = spawned;
    this.#dropAccumulator = 0;
    this.#nextPiece = this.#pullNextPiecePrototype();
    this.#updatePreview();

    if (!isValidPosition(this.#board, this.#currentPiece, 0, 0)) {
      this.#currentPiece = null;
      this.#endGame('盤面が埋まりました');
      return false;
    }
    return true;
  }

  #movePiece(deltaCol: number): void {
    if (!this.#currentPiece || !this.#gameActive || this.#paused) {
      return;
    }
    if (isValidPosition(this.#board, this.#currentPiece, 0, deltaCol)) {
      this.#currentPiece.position.col += deltaCol;
    }
  }

  #rotateCurrentPiece(direction: 1 | -1): void {
    if (!this.#currentPiece || !this.#gameActive || this.#paused) {
      return;
    }
    const rotated = rotatePiece(this.#currentPiece, direction);
    const kicks = [0, -1, 1, -2, 2];
    for (const kick of kicks) {
      rotated.position = {
        row: this.#currentPiece.position.row,
        col: this.#currentPiece.position.col + kick
      };
      if (isValidPosition(this.#board, rotated, 0, 0)) {
        this.#currentPiece = {
          ...rotated,
          position: { ...rotated.position }
        };
        return;
      }
    }
  }

  #stepDown(): void {
    if (!this.#currentPiece || !this.#gameActive || this.#paused) {
      return;
    }
    if (isValidPosition(this.#board, this.#currentPiece, 1, 0)) {
      this.#currentPiece.position.row += 1;
      return;
    }

    // Eye placement check
    const eyeInfo = this.#checkEyePlacement(this.#currentPiece);
    if (eyeInfo.canPlace) {
      this.#placeStoneInEye(eyeInfo.eyePositions);
      this.#lockPiece();
      return;
    }

    this.#lockPiece();
  }

  #hardDrop(): void {
    if (!this.#currentPiece || !this.#gameActive || this.#paused) {
      return;
    }
    while (isValidPosition(this.#board, this.#currentPiece, 1, 0)) {
      this.#currentPiece.position.row += 1;
    }

    // Eye placement check for hard drop
    const eyeInfo = this.#checkEyePlacement(this.#currentPiece);
    if (eyeInfo.canPlace) {
      this.#placeStoneInEye(eyeInfo.eyePositions);
    }

    this.#lockPiece();
  }

  // Helper: check if piece can place stone inside eye
  #checkEyePlacement(piece: PieceInstance): { canPlace: boolean; eyePositions: Array<{ row: number; col: number }> } {
    const eyePositions: Array<{ row: number; col: number }> = [];
    piece.cells.forEach(cell => {
      const boardRow = piece.position.row + cell.row;
      const boardCol = piece.position.col + cell.col;
      if (boardRow < 0) return;
      const value = this.#board[boardRow][boardCol];
      if (isEyeCell(value)) {
        eyePositions.push({ row: boardRow, col: boardCol });
      }
    });

    if (eyePositions.length === 0) return { canPlace: false, eyePositions: [] };

    const group = evaluateGroup(
      this.#board,
      eyePositions[0].row,
      eyePositions[0].col,
      this.#board[eyePositions[0].row][eyePositions[0].col],
      new Set()
    );

    const canPlace = canPlaceStoneInEye(this.#board, eyePositions, group.liberties, group.eyeCount);
    return { canPlace, eyePositions };
  }

  // Helper: actually place stone(s) into eye cells using current piece's color
  #placeStoneInEye(eyePositions: Array<{ row: number; col: number }>): void {
    const color = this.#currentPiece?.cells[0].color ?? CELL_BLACK;
    eyePositions.forEach(p => {
      this.#board[p.row][p.col] = color;
    });
  }

  #lockPiece(): void {
    if (!this.#currentPiece) {
      return;
    }
    const placedPiece = this.#currentPiece;
    let overflow = false;
    const placedEyeFrame = placedPiece.isEyeFrame === true;
    let eyeFrameCenterGlobal: { row: number; col: number } | null = null;

    placedPiece.cells.forEach(cell => {
      const row = placedPiece.position.row + cell.row;
      const col = placedPiece.position.col + cell.col;
      if (row < 0) {
        overflow = true;
        return;
      }
      const boardValue = cell.boardValue ?? cell.color;
      this.#board[row][col] = boardValue;
      this.#locked[row][col] = cell.lockOnPlace === true;
      if (placedEyeFrame && cell.isEyeCenter) {
        eyeFrameCenterGlobal = { row, col };
      }
    });

    if (overflow) {
      this.#endGame('盤面が埋まりました');
      return;
    }

    if (placedEyeFrame && eyeFrameCenterGlobal !== null) {
      const { row: centerRow, col: centerCol } = eyeFrameCenterGlobal;
      this.#activeEyeFrames.push({
        centerRow,
        centerCol,
        capturesLeft: this.#getEyeFrameClearThreshold()
      });
    }

    this.#currentPiece = null;
    this.#options.onPlayStone?.();
    applyGravity(this.#board, this.#locked);

    this.#resolveCapturesWithEffects({ placedEyeFrame });
  }

  #resolveCapturesWithEffects(context: { placedEyeFrame?: boolean } = {}): void {
    const totals = {
      totalRemoved: 0,
      captureTotals: { black: 0, white: 0 },
      removedStones: [] as RemovedStone[]
    };

    const processLoop = () => {
      const result = resolveCaptures(this.#board);
      if (result.groups.length === 0) {
        this.#finalizeLock(totals, context);
        return;
      }

      totals.totalRemoved += result.totalRemoved;
      totals.captureTotals.black += result.captureTotals.black;
      totals.captureTotals.white += result.captureTotals.white;
      totals.removedStones.push(...result.removedStones);

      this.#stageCaptureHighlight(result.groups);

      window.setTimeout(() => {
        this.#clearCaptureHighlights(result.groups);
        result.groups.forEach(group => {
          group.captured.forEach(cell => {
            if (!this.#locked[cell.row][cell.col]) {
              this.#board[cell.row][cell.col] = CELL_EMPTY;
            }
          });
        });
        applyGravity(this.#board, this.#locked);
        processLoop();
      }, CAPTURE_HIGHLIGHT_DURATION);
    };

    processLoop();
  }

  #finalizeLock(
    result: { totalRemoved: number; captureTotals: CaptureState; removedStones: RemovedStone[] },
    context: { placedEyeFrame?: boolean }
  ): void {
    let clearedEyeFrame = false;

    if (result.totalRemoved > 0) {
      this.#chain += 1;
      const chainMultiplier = 1 + (this.#chain - 1) * 0.5;
      const pointsEarned = Math.floor(result.totalRemoved * 60 * chainMultiplier);
      this.#score += pointsEarned;
      this.#captures.black += result.captureTotals.black;
      this.#captures.white += result.captureTotals.white;
      this.#spawnCaptureEffects(result.removedStones);
      this.#spawnScorePopup(pointsEarned, result.removedStones);
      this.#setStatus(`${result.totalRemoved} 個捕獲。チェインx${this.#chain}！`);
      this.#options.onCapture?.(result.totalRemoved);
    } else {
      this.#chain = 0;
      this.#setStatus('石を配置。捕獲なし。');
    }

    this.#piecesPlaced += 1;
    if (this.#piecesPlaced % 5 === 0) {
      this.#level += 1;
      this.#dropInterval = Math.max(220, BASE_DROP_INTERVAL - (this.#level - 1) * 80);
      this.#setStatus(`レベル${this.#level}。落下間隔 ${(this.#dropInterval / 1000).toFixed(2)} 秒。`);
    }

    this.#maybeScheduleEyeFramePiece();

    if (result.totalRemoved > 0 && this.#activeEyeFrames.length > 0) {
      const framesToRemove: Array<{ centerRow: number; centerCol: number }> = [];
      this.#activeEyeFrames.forEach(frame => {
        frame.capturesLeft -= result.totalRemoved;
        if (frame.capturesLeft <= 0) {
          framesToRemove.push({
            centerRow: frame.centerRow,
            centerCol: frame.centerCol
          });
        }
      });
      if (framesToRemove.length > 0) {
        const framesSnapshot: Array<{ centerRow: number; centerCol: number }> = framesToRemove.slice();
        this.#activeEyeFrames = this.#activeEyeFrames.filter(frame => frame.capturesLeft > 0);
        window.setTimeout(() => {
          framesSnapshot.forEach(frame => {
            this.#clearEyeFrameAt(frame.centerRow, frame.centerCol);
          });
          applyGravity(this.#board, this.#locked);
        }, 0);
        clearedEyeFrame = true;
      }
    }

    if (context.placedEyeFrame) {
      this.#chain = 0;
      this.#setStatus('色付き眼フレームを設置しました。');
    } else if (clearedEyeFrame) {
      this.#setStatus('眼フレームが崩壊しました。');
    }

    if (!this.#gameActive) {
      this.#publishState();
      return;
    }

    this.#updateDangerState();

    if (!this.#spawnNewPiece()) {
      this.#publishState();
      return;
    }
    this.#updateDangerState();
    this.#publishState();
  }

  #maybeScheduleEyeFramePiece(): void {
    if (!this.#gameActive) {
      return;
    }
    if (this.#piecesPlaced < MIN_PIECES_BEFORE_EYE_FRAME) {
      return;
    }
    if (this.#nextPiece && this.#nextPiece.isEyeFrame) {
      return;
    }
    if (this.#specialPieceQueue.some(piece => piece.isEyeFrame)) {
      return;
    }
    if (this.#eyeFrameCooldown > 0) {
      this.#eyeFrameCooldown -= 1;
      return;
    }
    if (this.#eyeFrameFirstDropPending) {
      this.#eyeFrameFirstDropPending = false;
      const firstColor = (Math.random() < 0.5 ? CELL_BLACK : CELL_WHITE) as CellValue;
      this.#queueEyeFramePiece(firstColor, true);
      this.#eyeFrameCooldown = EYE_FRAME_COOLDOWN_PIECES;
      return;
    }
    if (Math.random() > EYE_FRAME_DROP_CHANCE) {
      return;
    }
    const randomColor = (Math.random() < 0.5 ? CELL_BLACK : CELL_WHITE) as CellValue;
    this.#queueEyeFramePiece(randomColor);
    this.#eyeFrameCooldown = EYE_FRAME_COOLDOWN_PIECES;
  }

  #getEyeFrameClearThreshold(): number {
    if (this.#score >= 100000) {
      return 40;
    }
    if (this.#score >= 50000) {
      return 30;
    }
    return 20;
  }

  #update(timestamp: number): void {
    if (!this.#lastFrameTime) {
      this.#lastFrameTime = timestamp;
    }
    const delta = timestamp - this.#lastFrameTime;
    this.#lastFrameTime = timestamp;

    if (this.#gameActive && !this.#paused && this.#currentPiece) {
      this.#dropAccumulator += delta;
      if (this.#dropAccumulator >= this.#dropInterval) {
        this.#dropAccumulator -= this.#dropInterval;
        this.#stepDown();
      }
    }

    this.#updateEffects(delta);
  }

  #updateEffects(delta: number): void {
    const now = performance.now();
    this.#effects = this.#effects.filter(effect => {
      effect.life += delta;
      if (effect.life >= effect.maxLife) {
        return false;
      }
      if (effect.type === 'spark') {
        effect.vy += (effect.gravity * delta) / 1000;
        effect.vx *= PARTICLE_FRICTION;
        effect.vy *= PARTICLE_FRICTION;
        effect.x += (effect.vx * delta) / 1000;
        effect.y += (effect.vy * delta) / 1000;
      }
      return true;
    });

    Array.from(this.#captureLineEffects.values()).forEach(effect => {
      if (now - effect.startTime > effect.duration) {
        this.#captureLineEffects.delete(effect.groupId);
      }
    });
    Array.from(this.#captureHighlights.entries()).forEach(([key, highlight]) => {
      if (now - highlight.startTime > highlight.duration) {
        this.#captureHighlights.delete(key);
      }
    });
  }

  #draw(): void {
    const ctx = this.#boardCtx;
    ctx.clearRect(0, 0, this.#boardCanvas.width, this.#boardCanvas.height);
    this.#drawBoardGrid();
    this.#drawPlacedStones();
    if (this.#currentPiece) {
      this.#drawGhost(this.#currentPiece);
      this.#drawPiece(this.#currentPiece);
    }
    this.#drawEffects();
  }

  #drawBoardGrid(): void {
    const ctx = this.#boardCtx;
    const gridWidth = (COLS - 1) * CELL_SIZE;
    const gridHeight = (ROWS - 1) * CELL_SIZE;
    ctx.save();
    ctx.strokeStyle = GRID_LINE_COLOR;
    ctx.lineWidth = 1;
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
    ctx.strokeStyle = GRID_BORDER_COLOR;
    ctx.lineWidth = 1.4;
    ctx.strokeRect(GRID_MARGIN + 0.5, GRID_MARGIN + 0.5, gridWidth - 1, gridHeight - 1);
    ctx.restore();
  }

  #drawPlacedStones(): void {
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const stone = this.#board[row][col];
        if (stone === CELL_EMPTY) {
          continue;
        }
        this.#drawStoneOnBoard(row, col, stone, 1);
      }
    }
  }

  #drawPiece(piece: PieceInstance): void {
    piece.cells.forEach(cell => {
      const row = piece.position.row + cell.row;
      const col = piece.position.col + cell.col;
      if (row < 0) {
        return;
      }
      const value = cell.drawValue ?? cell.boardValue ?? cell.color;
      if (value === null || value === undefined || value === CELL_EMPTY) {
        return;
      }
      this.#drawStoneOnBoard(row, col, value, 1);
    });
  }

  #getGhostRow(piece: PieceInstance): number {
    const ghostPiece = {
      ...piece,
      position: { ...piece.position }
    };
    while (isValidPosition(this.#board, ghostPiece, 1, 0)) {
      ghostPiece.position.row += 1;
    }
    return ghostPiece.position.row;
  }

  #drawGhost(piece: PieceInstance): void {
    const ghostRow = this.#getGhostRow(piece);
    piece.cells.forEach(cell => {
      const row = ghostRow + cell.row;
      const col = piece.position.col + cell.col;
      if (row < 0) {
        return;
      }
      const ghostValue = cell.drawValue ?? cell.boardValue ?? cell.color;
      if (ghostValue === null || ghostValue === undefined || ghostValue === CELL_EMPTY) {
        return;
      }
      this.#drawStoneOnBoard(row, col, ghostValue, 0.25);
    });
  }

  #drawStoneOnBoard(row: number, col: number, value: number, alpha: number): void {
    if (value === null || value === undefined || value === CELL_EMPTY) {
      return;
    }
    const cx = GRID_MARGIN + col * CELL_SIZE;
    const cy = GRID_MARGIN + row * CELL_SIZE;
    if (value === CELL_BLOCK_BLACK || value === CELL_BLOCK_WHITE) {
      this.#drawObstacleBlock(this.#boardCtx, cx, cy, value, alpha);
      return;
    }
    if (value === CELL_EYE_BLACK || value === CELL_EYE_WHITE) {
      this.#drawEyeStone(this.#boardCtx, cx, cy, CELL_SIZE * 0.42, value, alpha);
      return;
    }
    const highlight = this.#captureHighlights.get(`${row},${col} `);
    if (highlight) {
      this.#drawHighlightedStone(this.#boardCtx, cx, cy, CELL_SIZE * 0.42, value, highlight);
      return;
    }
    this.#drawStone(this.#boardCtx, cx, cy, CELL_SIZE * 0.42, value, alpha);
  }

  #drawStone(
    context: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    color: number,
    alpha = 1
  ): void {
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
    if (color === CELL_BLACK || color === CELL_BLOCK_BLACK) {
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

  #drawObstacleBlock(
    context: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    value: number,
    alpha: number
  ): void {
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

  #drawEyeStone(
    context: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    eyeValue: number,
    alpha: number
  ): void {
    const baseColor = eyeValue === CELL_EYE_BLACK ? CELL_BLACK : CELL_WHITE;
    this.#drawStone(context, cx, cy, radius, baseColor, alpha);
    context.save();
    context.globalAlpha = alpha;
    const irisRadius = radius * 0.48;
    context.fillStyle =
      eyeValue === CELL_EYE_BLACK ? 'rgba(58, 150, 222, 0.85)' : 'rgba(238, 204, 90, 0.88)';
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

  #drawHighlightedStone(
    context: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    baseColor: number,
    highlight: CaptureHighlight
  ): void {
    const now = performance.now();
    const elapsed = now - (highlight.startTime || 0);
    const colorProgress = Math.min(elapsed / CAPTURE_COLOR_ANIM_DURATION, 1);
    const glowProgress = Math.min(elapsed / CAPTURE_LINE_ANIM_DURATION, 1);

    this.#drawStone(context, cx, cy, radius, baseColor, 1);

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
    context.shadowColor =
      highlight.type === 'captured' ? 'rgba(255, 150, 60, 0.8)' : 'rgba(90, 200, 255, 0.75)';
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

  #drawEffects(): void {
    const ctx = this.#boardCtx;
    const now = performance.now();
    ctx.save();
    this.#effects.forEach(effect => {
      if (effect.type === 'spark') {
        const progress = effect.life / effect.maxLife;
        const alpha = effect.opacity * (1 - progress);
        if (alpha <= 0) {
          return;
        }
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha;
        ctx.fillStyle = effect.color;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (effect.type === 'ring') {
        const progress = effect.life / effect.maxLife;
        if (progress >= 1) {
          return;
        }
        const radius = effect.startRadius + (effect.endRadius - effect.startRadius) * progress;
        ctx.save();
        ctx.globalAlpha = effect.opacity * (1 - progress);
        ctx.strokeStyle = effect.color;
        ctx.lineWidth = effect.lineWidth;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else if (effect.type === 'flash') {
        const progress = effect.life / effect.maxLife;
        if (progress >= 1) {
          return;
        }
        ctx.save();
        ctx.globalAlpha = 1 - progress;
        const radius = CELL_SIZE * 2.5;
        const gradient = ctx.createRadialGradient(
          effect.x,
          effect.y,
          0,
          effect.x,
          effect.y,
          radius
        );
        gradient.addColorStop(0, effect.color);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (effect.type === 'scorePopup') {
        const progress = effect.life / effect.maxLife;
        if (progress >= 1) {
          return;
        }
        const currentY = effect.startY - effect.rise * progress;
        const fadeStart = SCORE_POPUP_FADE_START;
        const alpha = progress < fadeStart ? 1 : Math.max(1 - (progress - fadeStart) / (1 - fadeStart), 0);
        ctx.save();
        ctx.font = `${CELL_SIZE * 0.8}px "Segoe UI", sans - serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 3;
        ctx.strokeStyle = effect.stroke;
        ctx.fillStyle = effect.fill;
        ctx.shadowColor = effect.shadow;
        ctx.shadowBlur = 8;
        ctx.strokeText(effect.text, effect.x, currentY);
        ctx.fillText(effect.text, effect.x, currentY);
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
        ctx.restore();
      } else if (effect.type === 'eyePulse') {
        this.#drawEyePulseEffect(effect);
      }
    });

    this.#captureLineEffects.forEach(effect => {
      const elapsed = now - effect.startTime;
      if (elapsed >= effect.duration) {
        return;
      }
      const progress = elapsed / effect.duration;
      const drawnLength = effect.totalLength * progress;
      let remaining = drawnLength;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = effect.lineWidth;
      ctx.strokeStyle = effect.strokeStyle;
      ctx.shadowColor = effect.shadowColor;
      ctx.shadowBlur = effect.lineWidth * 2;
      effect.segments.forEach(segment => {
        if (remaining <= 0) {
          return;
        }
        const fraction = Math.min(1, remaining / segment.length);
        const targetX = segment.from.x + (segment.to.x - segment.from.x) * fraction;
        const targetY = segment.from.y + (segment.to.y - segment.from.y) * fraction;
        ctx.beginPath();
        ctx.moveTo(segment.from.x, segment.from.y);
        ctx.lineTo(targetX, targetY);
        ctx.stroke();
        remaining -= segment.length;
      });
      ctx.restore();
    });

    ctx.restore();
  }

  #drawEyePulseEffect(effect: EyePulseEffect): void {
    const ctx = this.#boardCtx;
    const earlyProgress = Math.min(effect.life / 200, 1);
    const lateProgress = effect.life > 200 ? Math.min((effect.life - 200) / 300, 1) : 0;
    const easeOut = 1 - Math.pow(1 - earlyProgress, 3);
    const pulseScale = 1 + 0.18 * easeOut;
    const coreAlpha = effect.life < 200 ? 1 : Math.max(1 - lateProgress * 1.3, 0);

    ctx.save();
    this.#drawEyeStone(ctx, effect.x, effect.y, effect.radius * pulseScale, effect.eyeValue, coreAlpha);

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

  #stageCaptureHighlight(groups: CaptureGroup[]): void {
    const startedAt = performance.now();
    groups.forEach(group => {
      const groupId = ++this.#captureGroupSequence;
      group.groupId = groupId;
      group.startedAt = startedAt;
      group.captured.forEach(cell => {
        this.#captureHighlights.set(`${cell.row},${cell.col} `, {
          type: 'captured',
          startTime: startedAt,
          duration: CAPTURE_HIGHLIGHT_DURATION,
          groupId
        });
      });
      const captureStones = collectCapturingStones(
        this.#board,
        group.captured.map(cell => ({ row: cell.row, col: cell.col })),
        group.capturingColor
      );
      group.capturing = captureStones;
      captureStones.forEach(cell => {
        this.#captureHighlights.set(`${cell.row},${cell.col} `, {
          type: 'capturing',
          startTime: startedAt,
          duration: CAPTURE_HIGHLIGHT_DURATION,
          groupId,
          capturingColor: group.capturingColor
        });
      });
      this.#stageCaptureLineEffect(group);
    });
  }

  #stageCaptureLineEffect(group: CaptureGroup): void {
    if (!group || !Array.isArray(group.capturing) || group.capturing.length < 2) {
      return;
    }
    const points: Array<{ x: number; y: number }> = [];
    const seen = new Set<string>();
    group.capturing.forEach(cell => {
      const { x, y } = this.#boardToCanvasPosition(cell.row, cell.col);
      const key = `${x.toFixed(2)},${y.toFixed(2)} `;
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      points.push({ x, y });
    });
    if (points.length < 2) {
      return;
    }
    const centroid = points.reduce(
      (acc, point) => {
        acc.x += point.x;
        acc.y += point.y;
        return acc;
      },
      { x: 0, y: 0 }
    );
    centroid.x /= points.length;
    centroid.y /= points.length;

    const sorted = points
      .slice()
      .sort((a, b) => Math.atan2(a.y - centroid.y, a.x - centroid.x) - Math.atan2(b.y - centroid.y, b.x - centroid.x));
    if (sorted.length < 2) {
      return;
    }
    const segments: CaptureLineEffect['segments'] = [];
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
    const colorKey = group.capturingColor === CELL_WHITE ? CELL_WHITE : CELL_BLACK;
    const colorConfig = CAPTURE_LINE_COLORS[colorKey];
    this.#captureLineEffects.set(group.groupId, {
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

  #clearCaptureHighlights(groups: CaptureGroup[]): void {
    groups.forEach(group => {
      if (group.groupId) {
        this.#captureLineEffects.delete(group.groupId);
      }
      group.captured.forEach(cell => {
        this.#captureHighlights.delete(`${cell.row},${cell.col} `);
      });
      group.capturing.forEach(cell => {
        this.#captureHighlights.delete(`${cell.row},${cell.col} `);
      });
    });
  }

  #spawnCaptureEffects(removedStones: RemovedStone[]): void {
    if (!removedStones || removedStones.length === 0) {
      return;
    }
    const grouped = removedStones.reduce<Record<number, RemovedStone[]>>((acc, stone) => {
      const key = stone.color;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(stone);
      return acc;
    }, {});
    Object.entries(grouped).forEach(([colorKey, stones]) => {
      const normalizedColor = Number(colorKey) === CELL_BLACK ? CELL_BLACK : CELL_WHITE;
      const colorConfig = CAPTURE_EFFECT_CONFIG[normalizedColor];
      let centerX = 0;
      let centerY = 0;
      stones.forEach(stone => {
        const { x, y } = this.#boardToCanvasPosition(stone.row, stone.col);
        centerX += x;
        centerY += y;
        const particleCount = CAPTURE_PARTICLE_FACTOR + Math.floor(Math.random() * (CAPTURE_PARTICLE_FACTOR - 2));
        for (let index = 0; index < particleCount; index += 1) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 80 + Math.random() * 180;
          this.#effects.push({
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
      this.#effects.push({
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
      this.#effects.push({
        type: 'flash',
        x: centerX,
        y: centerY,
        life: 0,
        maxLife: CAPTURE_FLASH_LIFE,
        color: 'rgba(255, 255, 255, 0.7)'
      });
    });
  }

  #spawnScorePopup(points: number, removedStones: RemovedStone[]): void {
    if (!points || points <= 0) {
      return;
    }
    if (!removedStones || removedStones.length === 0) {
      return;
    }
    let sumX = 0;
    let minY = Infinity;
    removedStones.forEach(stone => {
      const { x, y } = this.#boardToCanvasPosition(stone.row, stone.col);
      sumX += x;
      if (y < minY) {
        minY = y;
      }
    });
    const centerX = sumX / removedStones.length;
    const safeTop = GRID_MARGIN - CELL_SIZE * 0.4;
    const startY = Math.max(safeTop, minY - CELL_SIZE * 0.9);
    const text = `+ ${points.toLocaleString('en-US')} `;
    this.#effects.push({
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

  #spawnEyePulseEffect(centerRow: number, centerCol: number, stoneColor: number): void {
    const position = this.#boardToCanvasPosition(centerRow, centerCol);
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
    this.#effects.push({
      type: 'eyePulse',
      x: position.x,
      y: position.y,
      life: 0,
      maxLife: 520,
      radius: CELL_SIZE * 0.48,
      eyeValue,
      rotationBase: Math.random() * Math.PI * 2,
      glowColor,
      particleColor,
      particles
    });
  }

  #clearEyeFrameAt(centerRow: number, centerCol: number): void {
    let stoneColor: number | null = null;
    const centerValue = this.#board[centerRow]?.[centerCol] ?? CELL_EMPTY;
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
        const value = this.#board[row][col];
        if (value === CELL_BLACK || value === CELL_WHITE) {
          stoneColor = value;
          break;
        }
      }
    }

    if (stoneColor === CELL_BLACK || stoneColor === CELL_WHITE) {
      this.#spawnEyePulseEffect(centerRow, centerCol, stoneColor);
    }

    const offsets = [{ row: 0, col: 0 }, ...EYE_FRAME_RING_OFFSETS];
    offsets.forEach(offset => {
      const targetRow = centerRow + offset.row;
      const targetCol = centerCol + offset.col;
      if (targetRow < 0 || targetRow >= ROWS || targetCol < 0 || targetCol >= COLS) {
        return;
      }
      this.#board[targetRow][targetCol] = CELL_EMPTY;
      this.#locked[targetRow][targetCol] = false;
    });
  }

  #boardToCanvasPosition(row: number, col: number): { x: number; y: number } {
    return {
      x: GRID_MARGIN + col * CELL_SIZE,
      y: GRID_MARGIN + row * CELL_SIZE
    };
  }

  #updatePreview(): void {
    if (!this.#nextCtx || !this.#nextCanvas) {
      return;
    }
    this.#nextCtx.clearRect(0, 0, this.#nextCanvas.width, this.#nextCanvas.height);
    if (!this.#nextPiece) {
      return;
    }
    const scale = Math.min(
      (this.#previewWidth - CELL_SIZE) / (this.#nextPiece.width * CELL_SIZE),
      (this.#previewHeight - CELL_SIZE) / (this.#nextPiece.height * CELL_SIZE),
      1
    );
    const offsetX = (this.#previewWidth - this.#nextPiece.width * CELL_SIZE * scale) / 2 + GRID_MARGIN;
    const offsetY = (this.#previewHeight - this.#nextPiece.height * CELL_SIZE * scale) / 2 + GRID_MARGIN;
    this.#drawPreview(this.#nextCtx, this.#nextPiece, offsetX, offsetY, scale);
    if (this.#nextMobileCtx && this.#nextMobileCanvas) {
      this.#nextMobileCtx.clearRect(0, 0, this.#nextMobileCanvas.width, this.#nextMobileCanvas.height);
      const mobileScale = Math.min(
        (this.#mobilePreviewWidth - CELL_SIZE) / (this.#nextPiece.width * CELL_SIZE),
        (this.#mobilePreviewHeight - CELL_SIZE) / (this.#nextPiece.height * CELL_SIZE),
        1
      );
      const mobileOffsetX =
        (this.#mobilePreviewWidth - this.#nextPiece.width * CELL_SIZE * mobileScale) / 2 + GRID_MARGIN;
      const mobileOffsetY =
        (this.#mobilePreviewHeight - this.#nextPiece.height * CELL_SIZE * mobileScale) / 2 + GRID_MARGIN;

      this.#drawPreview(this.#nextMobileCtx, this.#nextPiece, mobileOffsetX, mobileOffsetY, mobileScale);
    }
  }

  #drawPreview(
    ctx: CanvasRenderingContext2D,
    piece: PieceInstance,
    offsetX: number,
    offsetY: number,
    scale: number
  ): void {
    piece.cells.forEach(cell => {
      const cx = offsetX + cell.col * CELL_SIZE * scale;
      const cy = offsetY + cell.row * CELL_SIZE * scale;
      const value = cell.drawValue ?? cell.boardValue ?? cell.color;
      if (value === CELL_EYE_BLACK || value === CELL_EYE_WHITE) {
        this.#drawEyeStone(ctx, cx, cy, CELL_SIZE * 0.42 * scale, value, 1);
      } else {
        this.#drawStone(ctx, cx, cy, CELL_SIZE * 0.42 * scale, value ?? cell.color, 1);
      }
    });
  }

  #updateDangerState(): void {
    const dangerActive = isDangerZoneTriggered(this.#board, this.#currentPiece);
    if (dangerActive !== this.#danger) {
      this.#danger = dangerActive;
      if (this.#options.onDangerChange) {
        this.#options.onDangerChange(this.#danger);
      }
      this.#publishState();
    }
  }

  #setStatus(message: string, duration = 3500): void {
    this.#options.onStatus(message, duration);
  }

  #endGame(reason: string): void {
    if (!this.#gameActive) {
      return;
    }
    this.#gameActive = false;
    this.#paused = false;
    const summary: LastResultSummary & { captures: CaptureState; chain: number } = {
      reason,
      timestamp: Date.now(),
      finalScore: this.#score,
      captures: { ...this.#captures },
      chain: this.#chain
    };
    this.#options.onGameOver(summary);
    this.#lastResult = { reason, timestamp: summary.timestamp, finalScore: this.#score };
    this.#setStatus('ゲーム終了。');
    this.#publishState({ active: false, paused: false, lastResult: this.#lastResult });
  }

  #composeState(override?: Partial<GameSessionState>): GameSessionState {
    return {
      active: override?.active ?? this.#gameActive,
      paused: override?.paused ?? this.#paused,
      score: override?.score ?? this.#score,
      level: override?.level ?? this.#level,
      chain: override?.chain ?? this.#chain,
      captures: override?.captures ?? { ...this.#captures },
      piecesPlaced: override?.piecesPlaced ?? this.#piecesPlaced,
      danger: override?.danger ?? this.#danger,
      lastResult: override?.lastResult ?? this.#lastResult
    };
  }

  #publishState(override?: Partial<GameSessionState>): void {
    this.#options.onStateChange(this.#composeState(override));
  }

  dispose(): void {
    this.#stopLoop();
  }
}
