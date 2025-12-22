import { describe, expect, it } from 'vitest';

import {
  CELL_BLACK,
  CELL_EMPTY,
  CELL_EYE_BLACK,
  CELL_EYE_WHITE,
  CELL_WHITE,
  COLS,
  DANGER_FILL_THRESHOLD,
  ROWS
} from './constants';
import {
  applyGravity,
  canPlaceStoneInEye,
  createBoard,
  createLockedGrid,
  eyeMatchesColor,
  isDangerZoneTriggered,
  isEyeCell,
  isValidPosition,
  resolveCaptures
} from './logic';
import { instantiatePiece, listPieceTemplates } from './pieces';

describe('resolveCaptures', () => {
  it('captures surrounded groups and reports totals', () => {
    const board = createBoard();
    const locked = createLockedGrid();
    const targetRow = 10;
    const targetCol = 5;
    board[targetRow][targetCol] = CELL_BLACK;
    board[targetRow - 1][targetCol] = CELL_WHITE;
    board[targetRow + 1][targetCol] = CELL_WHITE;
    board[targetRow][targetCol - 1] = CELL_WHITE;
    board[targetRow][targetCol + 1] = CELL_WHITE;

    const result = resolveCaptures(board);

    expect(result.totalRemoved).toBe(1);
    expect(result.captureTotals.white).toBe(1);
    expect(result.captureTotals.black).toBe(0);
    expect(result.removedStones).toHaveLength(1);
    expect(result.removedStones[0]).toMatchObject({ row: targetRow, col: targetCol, color: CELL_BLACK });

    // captured stones should be cleared once gravity is applied
    result.removedStones.forEach(({ row, col }) => {
      board[row][col] = 0;
      locked[row][col] = false;
    });
    applyGravity(board, locked);
    expect(board[targetRow][targetCol]).toBe(0);
  });
});

describe('applyGravity', () => {
  it('drops floating stones to the lowest available row', () => {
    const board = createBoard();
    const locked = createLockedGrid();
    board[5][0] = CELL_BLACK;
    applyGravity(board, locked);
    expect(board[ROWS - 1][0]).toBe(CELL_BLACK);
  });

  it('respects locked cells while shifting others', () => {
    const board = createBoard();
    const locked = createLockedGrid();
    board[ROWS - 1][0] = CELL_WHITE;
    locked[ROWS - 1][0] = true;
    board[5][0] = CELL_BLACK;
    applyGravity(board, locked);
    expect(board[ROWS - 1][0]).toBe(CELL_WHITE);
    expect(board[ROWS - 2][0]).toBe(CELL_BLACK);
  });
});

describe('isValidPosition', () => {
  it('detects collisions against board boundaries', () => {
    const template = listPieceTemplates()[0];
    const piece = instantiatePiece(template);
    piece.position = { row: 0, col: 0 };
    const board = createBoard();
    expect(isValidPosition(board, piece, 0, 0)).toBe(true);
    expect(isValidPosition(board, piece, 0, -5)).toBe(false);
    expect(isValidPosition(board, piece, ROWS, 0)).toBe(false);
    expect(isValidPosition(board, piece, 0, COLS)).toBe(false);
  });

  it('detects collisions with existing stones', () => {
    const template = listPieceTemplates()[0];
    const piece = instantiatePiece(template);
    piece.position = { row: 0, col: 0 };
    const board = createBoard();
    board[1][1] = CELL_BLACK;
    expect(isValidPosition(board, piece, 1, 0)).toBe(false);
  });
});

describe('Eye Logic', () => {
  it('correctly identifies eye cells', () => {
    expect(isEyeCell(CELL_EYE_BLACK)).toBe(true);
    expect(isEyeCell(CELL_EYE_WHITE)).toBe(true);
    expect(isEyeCell(CELL_BLACK)).toBe(false);
    expect(isEyeCell(CELL_EMPTY)).toBe(false);
  });

  it('matches eyes to stone colors', () => {
    expect(eyeMatchesColor(CELL_EYE_BLACK, CELL_BLACK)).toBe(true);
    expect(eyeMatchesColor(CELL_EYE_WHITE, CELL_WHITE)).toBe(true);
    expect(eyeMatchesColor(CELL_EYE_BLACK, CELL_WHITE)).toBe(false);
  });

  it('validates stone placement in eyes', () => {
    const board = createBoard();
    const eyePositions = [{ row: 10, col: 5 }];

    // Valid: 0 liberties (surrounded), single eye, target is empty
    board[10][5] = CELL_EMPTY;
    expect(canPlaceStoneInEye(board, eyePositions, 0, 1)).toBe(true);

    // Invalid: Has liberties (not surrounded)
    expect(canPlaceStoneInEye(board, eyePositions, 1, 1)).toBe(false);

    // Invalid: Connecting two eyes (suicide/immortality rule)
    expect(canPlaceStoneInEye(board, eyePositions, 0, 2)).toBe(false);

    // Invalid: Target is already occupied
    board[10][5] = CELL_BLACK;
    expect(canPlaceStoneInEye(board, eyePositions, 0, 1)).toBe(false);
  });
});

describe('Danger Zone Logic', () => {
  it('triggers when total occupied cells exceed threshold', () => {
    const board = createBoard();
    const lockedCount = DANGER_FILL_THRESHOLD + 1;

    // Mock robust board fill
    let filled = 0;
    for (let r = ROWS - 1; r >= 0 && filled < lockedCount; r--) {
      for (let c = 0; c < COLS && filled < lockedCount; c++) {
        board[r][c] = CELL_BLACK;
        filled++;
      }
    }

    expect(isDangerZoneTriggered(board, null)).toBe(true);
  });

  it('triggers when stones reach high row cutoff', () => {
    const board = createBoard();
    // Place a stone above the cutoff (e.g., row 0)
    board[0][5] = CELL_BLACK;
    expect(isDangerZoneTriggered(board, null)).toBe(true);

    // Should not trigger if board is clear at top
    board[0][5] = CELL_EMPTY;
    expect(isDangerZoneTriggered(board, null)).toBe(false);
  });
});
