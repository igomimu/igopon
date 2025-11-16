import {
  CELL_BLACK,
  CELL_EMPTY,
  CELL_EYE_BLACK,
  CELL_EYE_WHITE,
  CELL_WHITE,
  COLS,
  DANGER_FILL_THRESHOLD,
  DANGER_HIGH_ROW_CUTOFF,
  DIRECTIONS,
  ROWS
} from './constants';
import type {
  BoardMatrix,
  CaptureGroup,
  CaptureResolution,
  PieceInstance,
  RemovedStone
} from './types';

export function createBoard(): BoardMatrix {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(CELL_EMPTY));
}

export function createLockedGrid(): boolean[][] {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(false));
}

export function isEyeCell(value: number): boolean {
  return value === CELL_EYE_BLACK || value === CELL_EYE_WHITE;
}

export function eyeMatchesColor(eyeValue: number, stoneColor: number): boolean {
  return (eyeValue === CELL_EYE_BLACK && stoneColor === CELL_BLACK) ||
    (eyeValue === CELL_EYE_WHITE && stoneColor === CELL_WHITE);
}

export function isValidPosition(
  board: BoardMatrix,
  piece: PieceInstance,
  offsetRow: number,
  offsetCol: number
): boolean {
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

export function rotatePiece(piece: PieceInstance, direction: 1 | -1): PieceInstance {
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

  return {
    ...piece,
    cells: rotatedCells,
    width: piece.height,
    height: piece.width
  };
}

interface EvaluateGroupResult {
  stones: Array<{ row: number; col: number }>;
  liberties: number;
  hasEyeSupport: boolean;
}

export function evaluateGroup(
  board: BoardMatrix,
  row: number,
  col: number,
  color: number,
  visited: Set<string>
): EvaluateGroupResult {
  const queue: Array<[number, number]> = [[row, col]];
  const stones: Array<{ row: number; col: number }> = [];
  const libertySet = new Set<string>();
  let hasEyeSupport = false;
  visited.add(`${row},${col}`);

  while (queue.length > 0) {
    const [currentRow, currentCol] = queue.shift()!;
    stones.push({ row: currentRow, col: currentCol });

    DIRECTIONS.forEach(([dRow, dCol]) => {
      const nextRow = currentRow + dRow;
      const nextCol = currentCol + dCol;
      if (nextRow < 0 || nextRow >= ROWS || nextCol < 0 || nextCol >= COLS) {
        return;
      }
      const space = board[nextRow][nextCol];
      if (space === CELL_EMPTY) {
        libertySet.add(`${nextRow},${nextCol}`);
      } else if (isEyeCell(space)) {
        if (eyeMatchesColor(space, color)) {
          hasEyeSupport = true;
        }
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
    liberties: libertySet.size,
    hasEyeSupport
  };
}

export function collectCapturingStones(
  board: BoardMatrix,
  capturedStones: Array<{ row: number; col: number }>,
  capturingColor: number
): RemovedStone[] {
  const unique = new Set<string>();
  const result: RemovedStone[] = [];
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

export function resolveCaptures(board: BoardMatrix): CaptureResolution {
  const visited = new Set<string>();
  const captureTotals = { black: 0, white: 0 };
  const removedStones: RemovedStone[] = [];
  const groups: CaptureGroup[] = [];
  let removed = 0;

  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const stone = board[row][col];
      if (stone === CELL_EMPTY || isEyeCell(stone)) {
        continue;
      }
      const key = `${row},${col}`;
      if (visited.has(key)) {
        continue;
      }

      const result = evaluateGroup(board, row, col, stone, visited);
      if (result.liberties === 0 && !result.hasEyeSupport) {
        const capturingColor = stone === CELL_BLACK ? CELL_WHITE : CELL_BLACK;
        const capturedGroup = result.stones.map(cell => ({ ...cell }));
        const groupId = groups.length + 1;
        const startedAt = Date.now();
        const capturing = collectCapturingStones(board, capturedGroup, capturingColor);
        groups.push({
          groupId,
          captured: capturedGroup.map(cell => ({ ...cell, color: stone })),
          capturing,
          capturingColor,
          startedAt
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

export function applyGravity(board: BoardMatrix, locked: boolean[][]): void {
  for (let col = 0; col < COLS; col += 1) {
    const newColumn = new Array(ROWS).fill(CELL_EMPTY);
    const newLocked = new Array(ROWS).fill(false);

    for (let row = ROWS - 1; row >= 0; row -= 1) {
      if (locked[row][col]) {
        newColumn[row] = board[row][col];
        newLocked[row] = true;
      }
    }

    let writeRow = ROWS - 1;
    for (let row = ROWS - 1; row >= 0; row -= 1) {
      if (locked[row][col] || board[row][col] === CELL_EMPTY) {
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
      locked[row][col] = newLocked[row];
    }
  }
}

export function countOccupiedCells(board: BoardMatrix, currentPiece: PieceInstance | null): number {
  let occupied = 0;
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (board[row][col] !== CELL_EMPTY) {
        occupied += 1;
      }
    }
  }
  if (currentPiece) {
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

export function isDangerZoneTriggered(board: BoardMatrix, currentPiece: PieceInstance | null): boolean {
  const lockedCellsCount = countOccupiedCells(board, null);
  const totalCells = countOccupiedCells(board, currentPiece);
  if (totalCells >= DANGER_FILL_THRESHOLD) {
    return true;
  }

  if (lockedCellsCount >= DANGER_FILL_THRESHOLD) {
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
