import { CELL, type Floorplan, type Side, type WallSegment } from './types';

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Room = { x: number; y: number; w: number; h: number };

function roomsOverlap(a: Room, b: Room, pad = 1) {
  return !(
    a.x + a.w + pad <= b.x ||
    b.x + b.w + pad <= a.x ||
    a.y + a.h + pad <= b.y ||
    b.y + b.h + pad <= a.y
  );
}

export function generateFloorplan(seed = 1): Floorplan {
  const rand = mulberry32(seed);
  const cols = 26;
  const rows = 26;
  const cells = new Uint8Array(cols * rows);
  const cellRoom = new Int8Array(cols * rows).fill(-1);
  const idx = (x: number, y: number) => y * cols + x;

  const targetRooms = 14;
  const rooms: Room[] = [];
  let attempts = 0;
  while (rooms.length < targetRooms && attempts < 600) {
    attempts++;
    const w = 3 + Math.floor(rand() * 3); // 3..5
    const h = 3 + Math.floor(rand() * 3);
    const x = 1 + Math.floor(rand() * (cols - w - 2));
    const y = 1 + Math.floor(rand() * (rows - h - 2));
    const r: Room = { x, y, w, h };
    if (rooms.some((o) => roomsOverlap(o, r, 1))) continue;
    rooms.push(r);
  }

  // Carve rooms.
  rooms.forEach((r, ri) => {
    for (let yy = r.y; yy < r.y + r.h; yy++) {
      for (let xx = r.x; xx < r.x + r.w; xx++) {
        cells[idx(xx, yy)] = 1;
        cellRoom[idx(xx, yy)] = ri;
      }
    }
  });

  // Connect rooms with L-shaped corridors (1 wide).
  // chain connections plus a few extra to make a more interconnected layout
  const carveCorridor = (a: Room, b: Room) => {
    const ax = a.x + Math.floor(a.w / 2);
    const ay = a.y + Math.floor(a.h / 2);
    const bx = b.x + Math.floor(b.w / 2);
    const by = b.y + Math.floor(b.h / 2);
    if (rand() < 0.5) {
      for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++) cells[idx(x, ay)] = 1;
      for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++) cells[idx(bx, y)] = 1;
    } else {
      for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++) cells[idx(ax, y)] = 1;
      for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++) cells[idx(x, by)] = 1;
    }
  };
  for (let i = 1; i < rooms.length; i++) carveCorridor(rooms[i - 1], rooms[i]);
  // a few cross-links for loops
  for (let i = 0; i < Math.floor(rooms.length / 4); i++) {
    const a = rooms[Math.floor(rand() * rooms.length)];
    const b = rooms[Math.floor(rand() * rooms.length)];
    if (a !== b) carveCorridor(a, b);
  }

  // Generate wall segments: for every floor cell, every neighbor that is wall/oob -> wall on that side.
  const walls: WallSegment[] = [];
  const sides: { dx: number; dy: number; side: Side; rotY: number; nx: number; nz: number }[] = [
    // North = -Y in grid, wall faces +Z (toward floor cell)? we map cellY -> world z, so -Y in grid = -Z in world.
    // floor cell at (cx,cy) world (cx*CELL, _, cy*CELL). If neighbor (cx, cy-1) is wall, wall is at -Z side of cell, faces +Z.
    { dx: 0, dy: -1, side: 0, rotY: 0, nx: 0, nz: 1 }, // N: wall on -z side of cell, faces +z
    { dx: 1, dy: 0, side: 1, rotY: -Math.PI / 2, nx: -1, nz: 0 }, // E: wall on +x side of cell, faces -x
    { dx: 0, dy: 1, side: 2, rotY: Math.PI, nx: 0, nz: -1 }, // S: wall on +z side of cell, faces -z
    { dx: -1, dy: 0, side: 3, rotY: Math.PI / 2, nx: 1, nz: 0 }, // W: wall on -x side of cell, faces +x
  ];

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (cells[idx(x, y)] !== 1) continue;
      for (const s of sides) {
        const nx = x + s.dx;
        const ny = y + s.dy;
        const isWall = nx < 0 || ny < 0 || nx >= cols || ny >= rows || cells[idx(nx, ny)] !== 1;
        if (!isWall) continue;
        // wall center: midway between this cell and neighbor cell
        const wx = (x + s.dx * 0.5) * CELL;
        const wz = (y + s.dy * 0.5) * CELL;
        walls.push({
          cx: x,
          cy: y,
          side: s.side,
          wx,
          wz,
          rotY: s.rotY,
          nx: s.nx,
          nz: s.nz,
        });
      }
    }
  }

  // Pick start cell: center of first room, facing into longest open direction.
  const start = rooms[0];
  const sx = start.x + Math.floor(start.w / 2);
  const sy = start.y + Math.floor(start.h / 2);

  return {
    cols,
    rows,
    cells,
    cellRoom,
    numRooms: rooms.length,
    walls,
    start: { cx: sx, cy: sy, dir: 2 }, // facing south initially
  };
}

export function isFloor(plan: Floorplan, cx: number, cy: number) {
  if (cx < 0 || cy < 0 || cx >= plan.cols || cy >= plan.rows) return false;
  return plan.cells[cy * plan.cols + cx] === 1;
}
