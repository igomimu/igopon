import { describe, expect, it } from 'vitest';

import {
  CELL_BLACK,
  CELL_WHITE,
  COLS,
  ROWS
} from './constants';
import {
  applyGravity,
  createBoard,
  createLockedGrid,
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
