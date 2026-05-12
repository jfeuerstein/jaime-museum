import { CELL, type DecorPlacement, type Floorplan, type PaintingPlacement } from './types';
import { FRAMES } from './frames';
import { ARTWORK } from './artwork';
import { isFloor } from './generate';

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

export function placePaintings(plan: Floorplan, seed = 17, density = 0.55): PaintingPlacement[] {
  const rand = mulberry32(seed);
  // Don't put paintings on walls of doorway-like cells (corridor cells, where opposite-side wall touches).
  // Corridor cells: a 1-wide thoroughfare. Detect by counting floor neighbors == 2 in a line.
  const corridor = (cx: number, cy: number) => {
    const n = isFloor(plan, cx, cy - 1);
    const s = isFloor(plan, cx, cy + 1);
    const e = isFloor(plan, cx + 1, cy);
    const w = isFloor(plan, cx - 1, cy);
    const cnt = +n + +s + +e + +w;
    return cnt <= 2;
  };

  // Build a shuffled bag of artwork indices so each work shows up at least
  // once (and most show up twice in a typical floorplan) before any repeat.
  const artBag: number[] = [];
  const refillBag = () => {
    const idxs = ARTWORK.map((_, i) => i);
    for (let i = idxs.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [idxs[i], idxs[j]] = [idxs[j], idxs[i]];
    }
    artBag.push(...idxs);
  };
  const nextArtIdx = () => {
    if (artBag.length === 0) refillBag();
    return artBag.shift()!;
  };

  const placements: PaintingPlacement[] = [];
  let id = 0;
  for (const wall of plan.walls) {
    if (corridor(wall.cx, wall.cy)) continue;
    if (rand() > density) continue;

    const paintingIdx = nextArtIdx();
    const aspect = ARTWORK[paintingIdx].aspect;

    // pick the frame whose natural inner aspect best matches the painting's
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < FRAMES.length; i++) {
      const d = Math.abs(Math.log(FRAMES[i].naturalInnerAspect / aspect));
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }

    // 0.85 .. 1.15 scale jitter so paintings vary in size on the wall.
    const paintingScale = 0.85 + rand() * 0.3;

    placements.push({
      id: id++,
      wall,
      frameIdx: bestIdx,
      paintingIdx,
      descIdx: Math.floor(rand() * 16),
      paintingAspect: aspect,
      paintingScale,
    });
  }
  return placements;
}

export function placeDecor(plan: Floorplan, seed = 33): DecorPlacement[] {
  const rand = mulberry32(seed);
  const out: DecorPlacement[] = [];
  // For each floor cell, determine if it's a "room interior" cell (all 4 neighbors floor),
  // and if its 8 neighbors are mostly floor. Place benches in such cells with low probability,
  // place plants on cells with 1 wall neighbor (corner-ish cells in rooms).
  for (let y = 0; y < plan.rows; y++) {
    for (let x = 0; x < plan.cols; x++) {
      if (!isFloor(plan, x, y)) continue;
      const n = isFloor(plan, x, y - 1);
      const s = isFloor(plan, x, y + 1);
      const e = isFloor(plan, x + 1, y);
      const w = isFloor(plan, x - 1, y);
      const cnt = +n + +s + +e + +w;
      const wx = x * CELL;
      const wz = y * CELL;
      if (cnt === 4) {
        // interior — bench, rare
        if (rand() < 0.08) {
          out.push({
            kind: 'bench',
            x: wx,
            z: wz,
            rotY: rand() < 0.5 ? 0 : Math.PI / 2,
            variant: Math.floor(rand() * 2),
          });
        }
      } else if (cnt === 3) {
        // wall on one side — plant in the inside corner near that wall
        if (rand() < 0.25) {
          // place plant slightly offset toward the wall
          let dx = 0;
          let dz = 0;
          if (!n) dz = -CELL * 0.32;
          else if (!s) dz = CELL * 0.32;
          else if (!e) dx = CELL * 0.32;
          else if (!w) dx = -CELL * 0.32;
          out.push({
            kind: 'plant',
            x: wx + dx,
            z: wz + dz,
            rotY: rand() * Math.PI * 2,
            variant: Math.floor(rand() * 3),
          });
        }
      } else if (cnt === 2) {
        // potential corner cell — plant in the inside corner
        if (rand() < 0.4) {
          let dx = 0;
          let dz = 0;
          if (!n) dz = -CELL * 0.32;
          if (!s) dz = CELL * 0.32;
          if (!e) dx = CELL * 0.32;
          if (!w) dx = -CELL * 0.32;
          out.push({
            kind: 'plant',
            x: wx + dx,
            z: wz + dz,
            rotY: rand() * Math.PI * 2,
            variant: Math.floor(rand() * 3),
          });
        }
      }
    }
  }
  return out;
}
