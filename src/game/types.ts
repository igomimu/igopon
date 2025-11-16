import type { CellValue } from './constants';

export interface PieceCellDefinition {
  row: number;
  col: number;
  color: CellValue;
  boardValue?: CellValue;
  drawValue?: CellValue | null;
  lockOnPlace?: boolean;
  isEyeCenter?: boolean;
}

export interface PieceDefinition {
  name: string;
  cells: PieceCellDefinition[];
}

export interface PieceInstance {
  name: string;
  cells: PieceCellDefinition[];
  width: number;
  height: number;
  rotation: number;
  position: {
    row: number;
    col: number;
  };
  isEyeFrame?: boolean;
  stoneColor?: CellValue;
}

export type BoardMatrix = CellValue[][];

export interface RemovedStone {
  row: number;
  col: number;
  color: CellValue;
}

export interface CaptureGroup {
  groupId: number;
  captured: RemovedStone[];
  capturing: RemovedStone[];
  capturingColor: CellValue;
  startedAt: number;
}

export interface CaptureResolution {
  totalRemoved: number;
  captureTotals: {
    black: number;
    white: number;
  };
  removedStones: RemovedStone[];
  groups: CaptureGroup[];
}
