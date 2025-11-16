import {
  CELL_BLACK,
  CELL_EMPTY,
  CELL_EYE_BLACK,
  CELL_EYE_WHITE,
  CELL_WHITE,
  COLS,
  EYE_FRAME_RING_OFFSETS
} from './constants';
import type { CellValue } from './constants';
import type { PieceCellDefinition, PieceDefinition, PieceInstance } from './types';

const PIECE_TEMPLATES: PieceDefinition[] = [
  {
    name: 'TigerMouth',
    cells: [
      { row: 0, col: 1, color: CELL_BLACK },
      { row: 1, col: 0, color: CELL_BLACK },
      { row: 1, col: 1, color: CELL_WHITE },
      { row: 1, col: 2, color: CELL_BLACK }
    ]
  },
  {
    name: 'TigerMouthWhite',
    cells: [
      { row: 0, col: 1, color: CELL_WHITE },
      { row: 1, col: 0, color: CELL_WHITE },
      { row: 1, col: 1, color: CELL_BLACK },
      { row: 1, col: 2, color: CELL_WHITE }
    ]
  },
  {
    name: 'BambooJoint',
    cells: [
      { row: 0, col: 0, color: CELL_BLACK },
      { row: 1, col: 0, color: CELL_WHITE },
      { row: 2, col: 0, color: CELL_BLACK },
      { row: 3, col: 0, color: CELL_WHITE }
    ]
  },
  {
    name: 'BambooJointWhite',
    cells: [
      { row: 0, col: 0, color: CELL_WHITE },
      { row: 1, col: 0, color: CELL_BLACK },
      { row: 2, col: 0, color: CELL_WHITE },
      { row: 3, col: 0, color: CELL_BLACK }
    ]
  },
  {
    name: 'Hane',
    cells: [
      { row: 0, col: 0, color: CELL_WHITE },
      { row: 0, col: 1, color: CELL_BLACK },
      { row: 1, col: 1, color: CELL_BLACK },
      { row: 1, col: 2, color: CELL_WHITE }
    ]
  },
  {
    name: 'HaneWhite',
    cells: [
      { row: 0, col: 0, color: CELL_BLACK },
      { row: 0, col: 1, color: CELL_WHITE },
      { row: 1, col: 1, color: CELL_WHITE },
      { row: 1, col: 2, color: CELL_BLACK }
    ]
  },
  {
    name: 'Clamp',
    cells: [
      { row: 0, col: 0, color: CELL_WHITE },
      { row: 1, col: 0, color: CELL_WHITE },
      { row: 1, col: 1, color: CELL_BLACK },
      { row: 1, col: 2, color: CELL_BLACK }
    ]
  },
  {
    name: 'ClampBlack',
    cells: [
      { row: 0, col: 0, color: CELL_BLACK },
      { row: 1, col: 0, color: CELL_BLACK },
      { row: 1, col: 1, color: CELL_WHITE },
      { row: 1, col: 2, color: CELL_WHITE }
    ]
  },
  {
    name: 'Seki',
    cells: [
      { row: 0, col: 0, color: CELL_BLACK },
      { row: 0, col: 1, color: CELL_WHITE },
      { row: 1, col: 0, color: CELL_WHITE },
      { row: 1, col: 1, color: CELL_BLACK }
    ]
  },
  {
    name: 'SekiAlt',
    cells: [
      { row: 0, col: 0, color: CELL_WHITE },
      { row: 0, col: 1, color: CELL_BLACK },
      { row: 1, col: 0, color: CELL_BLACK },
      { row: 1, col: 1, color: CELL_WHITE }
    ]
  }
];

export function listPieceTemplates(): ReadonlyArray<PieceDefinition> {
  return PIECE_TEMPLATES;
}

export function randomTemplate(): PieceDefinition {
  const index = Math.floor(Math.random() * PIECE_TEMPLATES.length);
  return PIECE_TEMPLATES[index];
}

export function instantiatePiece(template: PieceDefinition): PieceInstance {
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

export function clonePiece(piece: PieceInstance | null): PieceInstance | null {
  if (!piece) {
    return null;
  }
  return {
    ...piece,
    cells: piece.cells.map(cell => ({ ...cell })),
    position: { ...piece.position }
  };
}

export function createEyeFramePiecePrototype(stoneColor: CellValue): PieceInstance {
  const eyeValue = stoneColor === CELL_BLACK ? CELL_EYE_BLACK : CELL_EYE_WHITE;
  const cells: PieceCellDefinition[] = [
    {
      row: 1,
      col: 1,
      color: stoneColor,
      boardValue: CELL_EMPTY,
      drawValue: eyeValue,
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
    stoneColor: stoneColor === CELL_BLACK ? CELL_BLACK : CELL_WHITE
  };
}
