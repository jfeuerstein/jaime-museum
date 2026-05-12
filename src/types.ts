export const CELL = 4;
export const WALL_HEIGHT = 4;

export type Side = 0 | 1 | 2 | 3; // N, E, S, W

export type WallSegment = {
  cx: number;
  cy: number;
  side: Side;
  // world position of wall center (on-wall plane)
  wx: number;
  wz: number;
  // rotation around Y (face direction)
  rotY: number;
  // direction the wall is facing in cell coords (toward floor cell)
  // used for placing items in front of the wall
  nx: number; // normal x
  nz: number; // normal z
};

export type Floorplan = {
  cols: number;
  rows: number;
  cells: Uint8Array; // row-major, 1=floor 0=wall
  // Room id per cell, row-major. -1 for corridor/non-room floors and walls.
  cellRoom: Int8Array;
  numRooms: number;
  walls: WallSegment[];
  start: { cx: number; cy: number; dir: Side };
};

export type PaintingPlacement = {
  id: number;
  wall: WallSegment;
  frameIdx: number;
  paintingIdx: number;
  descIdx: number;
  // Aspect ratio (w/h) of the painting itself. Frame is sized to wrap it.
  paintingAspect: number;
  // Multiplier on the base painting size (~0.85–1.15) so paintings vary.
  paintingScale: number;
};

export type DecorPlacement = {
  kind: 'bench' | 'plant';
  x: number;
  z: number;
  rotY: number;
  variant: number;
};
