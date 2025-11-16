export const ROWS = 20;
export const COLS = 10;
export const CELL_SIZE = 30;
export const BASE_DROP_INTERVAL = 900;

export const DIRECTIONS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1]
] as const;

export const CELL_EMPTY = 0;
export const CELL_BLACK = 1;
export const CELL_WHITE = 2;
export const CELL_BLOCK_BLACK = 3;
export const CELL_BLOCK_WHITE = 4;
export const CELL_EYE_BLACK = 5;
export const CELL_EYE_WHITE = 6;

export type CellValue =
  | typeof CELL_EMPTY
  | typeof CELL_BLACK
  | typeof CELL_WHITE
  | typeof CELL_BLOCK_BLACK
  | typeof CELL_BLOCK_WHITE
  | typeof CELL_EYE_BLACK
  | typeof CELL_EYE_WHITE;

export const GRID_MARGIN = CELL_SIZE / 2;

export const DANGER_FILL_RATIO = 0.7;
export const DANGER_FILL_THRESHOLD = Math.ceil(ROWS * COLS * DANGER_FILL_RATIO);
export const DANGER_HIGH_ROW_CUTOFF = 8;

export const MIN_PIECES_BEFORE_EYE_FRAME = 14;
export const EYE_FRAME_DROP_CHANCE = 0.12;
export const EYE_FRAME_COOLDOWN_PIECES = 6;

export const EYE_FRAME_RING_OFFSETS = [
  { row: -1, col: -1 },
  { row: 0, col: -1 },
  { row: 1, col: -1 },
  { row: -1, col: 0 },
  { row: 1, col: 0 },
  { row: -1, col: 1 },
  { row: 0, col: 1 },
  { row: 1, col: 1 }
];

export function getEyeFrameClearThreshold(currentScore: number): number {
  if (currentScore >= 100000) {
    return 40;
  }
  if (currentScore >= 50000) {
    return 30;
  }
  return 20;
}
