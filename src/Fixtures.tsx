import { Fragment, useMemo } from 'react';
import * as THREE from 'three';
import {
  CELL,
  WALL_HEIGHT,
  type Floorplan,
  type PaintingPlacement,
  type WallSegment,
} from './types';
import type { RoomStyle } from './roomStyle';

// One PRIMARY fixture is chosen per room — that fixture also supplies the
// room's only point light, keeping our overall light count low.
const PRIMARY_TYPES = ['pendant', 'ceiling_row', 'floor_lamps', 'skylight'] as const;
type PrimaryType = (typeof PRIMARY_TYPES)[number];

type RoomLayout = {
  roomIdx: number;
  centerCX: number;
  centerCY: number;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  longAxis: 'x' | 'z';
  longLen: number;
  shortLen: number;
};

function buildRoomLayouts(plan: Floorplan): RoomLayout[] {
  const sums = new Float32Array(plan.numRooms * 3);
  const minX = new Int32Array(plan.numRooms).fill(plan.cols);
  const maxX = new Int32Array(plan.numRooms).fill(-1);
  const minY = new Int32Array(plan.numRooms).fill(plan.rows);
  const maxY = new Int32Array(plan.numRooms).fill(-1);
  for (let y = 0; y < plan.rows; y++) {
    for (let x = 0; x < plan.cols; x++) {
      const r = plan.cellRoom[y * plan.cols + x];
      if (r < 0) continue;
      sums[r * 3] += x;
      sums[r * 3 + 1] += y;
      sums[r * 3 + 2] += 1;
      if (x < minX[r]) minX[r] = x;
      if (x > maxX[r]) maxX[r] = x;
      if (y < minY[r]) minY[r] = y;
      if (y > maxY[r]) maxY[r] = y;
    }
  }
  const out: RoomLayout[] = [];
  for (let r = 0; r < plan.numRooms; r++) {
    const cnt = sums[r * 3 + 2];
    if (cnt === 0) continue;
    const xExt = maxX[r] - minX[r] + 1;
    const yExt = maxY[r] - minY[r] + 1;
    out.push({
      roomIdx: r,
      centerCX: sums[r * 3] / cnt,
      centerCY: sums[r * 3 + 1] / cnt,
      minX: minX[r],
      maxX: maxX[r],
      minZ: minY[r],
      maxZ: maxY[r],
      longAxis: xExt >= yExt ? 'x' : 'z',
      longLen: Math.max(xExt, yExt),
      shortLen: Math.min(xExt, yExt),
    });
  }
  return out;
}

function buildWallsByRoom(plan: Floorplan): WallSegment[][][] {
  const out: WallSegment[][][] = [];
  for (let r = 0; r < plan.numRooms; r++) out.push([[], [], [], []]);
  for (const w of plan.walls) {
    const r = plan.cellRoom[w.cy * plan.cols + w.cx];
    if (r < 0) continue;
    out[r][w.side].push(w);
  }
  return out;
}

function wallKey(w: WallSegment): string {
  return `${w.cx}_${w.cy}_${w.side}`;
}

// Pick one sconce-bearing wall per side, avoiding walls that already hold a
// painting. Sides whose middle is occupied walk outward to a free neighbour.
function pickSconceWalls(
  roomIdx: number,
  wallsByRoom: WallSegment[][][],
  occupied: Set<string>,
): WallSegment[] {
  const sides = wallsByRoom[roomIdx];
  if (!sides) return [];
  const picks: WallSegment[] = [];
  for (let side = 0; side < 4; side++) {
    const ws = sides[side];
    if (ws.length === 0) continue;
    const sorted = ws.slice().sort((a, b) => {
      if (side === 0 || side === 2) return a.cx - b.cx;
      return a.cy - b.cy;
    });
    const mid = Math.floor(sorted.length / 2);
    let chosen: WallSegment | null = null;
    for (let off = 0; off < sorted.length; off++) {
      for (const dir of [0, 1, -1]) {
        if (off === 0 && dir !== 0) continue;
        const idx = mid + dir * off;
        if (idx < 0 || idx >= sorted.length) continue;
        const cand = sorted[idx];
        if (!occupied.has(wallKey(cand))) {
          chosen = cand;
          break;
        }
      }
      if (chosen) break;
    }
    if (chosen) picks.push(chosen);
  }
  return picks;
}

function pickPrimaryType(roomIdx: number, seed: number): PrimaryType {
  const a = ((roomIdx * 2654435761) ^ (seed * 0x9e3779b9)) >>> 0;
  return PRIMARY_TYPES[a % PRIMARY_TYPES.length];
}

// Sconces are an add-on layer; they appear in ~70% of rooms regardless of the
// primary fixture type. The check is deterministic per room.
function shouldHaveSconces(roomIdx: number, seed: number): boolean {
  const a = ((roomIdx * 0xabcdef01) ^ (seed * 0x12345678)) >>> 0;
  return a % 100 < 70;
}

// Soft radial-gradient texture used to fade a glow decal off into nothing.
function makeRadialGlowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.35, '#9b9b9b');
  grad.addColorStop(1, '#000000');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function GlowDecal({
  position,
  rotation = [0, 0, 0],
  width,
  height,
  color,
  opacity,
  tex,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  width: number;
  height: number;
  color: string;
  opacity: number;
  tex: THREE.Texture;
}) {
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        map={tex}
        color={color}
        transparent
        opacity={opacity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

type Props = {
  plan: Floorplan;
  styles: { rooms: RoomStyle[]; corridor: RoomStyle };
  paintings: PaintingPlacement[];
  seed: number;
};

export function Fixtures({ plan, styles, paintings, seed }: Props) {
  const layouts = useMemo(() => buildRoomLayouts(plan), [plan]);
  const wallsByRoom = useMemo(() => buildWallsByRoom(plan), [plan]);
  const glowTex = useMemo(() => makeRadialGlowTexture(), []);

  const occupiedWalls = useMemo(() => {
    const s = new Set<string>();
    for (const p of paintings) s.add(wallKey(p.wall));
    return s;
  }, [paintings]);

  const corridorLights = useMemo(() => {
    const cells: { x: number; y: number }[] = [];
    for (let y = 0; y < plan.rows; y++) {
      for (let x = 0; x < plan.cols; x++) {
        if (plan.cells[y * plan.cols + x] !== 1) continue;
        if (plan.cellRoom[y * plan.cols + x] !== -1) continue;
        cells.push({ x, y });
      }
    }
    const out: { x: number; z: number }[] = [];
    const max = 6;
    if (cells.length > 0) {
      const stride = Math.max(1, Math.floor(cells.length / max));
      for (let i = 0; i < cells.length && out.length < max; i += stride) {
        out.push({ x: cells[i].x * CELL, z: cells[i].y * CELL });
      }
    }
    return out;
  }, [plan]);

  return (
    <>
      {layouts.map((info) => {
        const style = styles.rooms[info.roomIdx];
        const primary = pickPrimaryType(info.roomIdx, seed);
        const wantSconces = shouldHaveSconces(info.roomIdx, seed);
        const sconces = wantSconces ? pickSconceWalls(info.roomIdx, wallsByRoom, occupiedWalls) : [];
        return (
          <Fragment key={info.roomIdx}>
            <PrimaryFixture info={info} style={style} type={primary} glowTex={glowTex} />
            {sconces.map((w, i) => (
              <Sconce key={i} wall={w} color={style.lightColor} glowTex={glowTex} />
            ))}
          </Fragment>
        );
      })}
      {corridorLights.map((l, i) => (
        <group key={i}>
          <mesh
            position={[l.x, WALL_HEIGHT - 0.04, l.z]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <circleGeometry args={[0.18, 10]} />
            <meshBasicMaterial color={styles.corridor.lightColor} toneMapped={false} />
          </mesh>
          <GlowDecal
            position={[l.x, WALL_HEIGHT - 0.05, l.z]}
            rotation={[Math.PI / 2, 0, 0]}
            width={1.2}
            height={1.2}
            color={styles.corridor.lightColor}
            opacity={0.5}
            tex={glowTex}
          />
          <pointLight
            position={[l.x, 3.4, l.z]}
            color={styles.corridor.lightColor}
            intensity={styles.corridor.lightIntensity * 1.2}
            distance={styles.corridor.lightDistance + 1}
            decay={2}
          />
        </group>
      ))}
    </>
  );
}

// A single wall sconce: visible mesh + wall glow decal, no point light. The
// room's primary fixture supplies the actual illumination.
function Sconce({
  wall,
  color,
  glowTex,
}: {
  wall: WallSegment;
  color: string;
  glowTex: THREE.Texture;
}) {
  return (
    <group
      position={[wall.wx + wall.nx * 0.04, 2.4, wall.wz + wall.nz * 0.04]}
      rotation={[0, wall.rotY, 0]}
    >
      <mesh position={[0, 0, 0.03]}>
        <boxGeometry args={[0.18, 0.42, 0.06]} />
        <meshLambertMaterial color="#0e0a07" />
      </mesh>
      <mesh position={[0, 0, 0.062]}>
        <planeGeometry args={[0.12, 0.34]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <GlowDecal
        position={[0, 0, -0.035]}
        width={0.85}
        height={1.2}
        color={color}
        opacity={0.55}
        tex={glowTex}
      />
    </group>
  );
}

function PrimaryFixture({
  info,
  style,
  type,
  glowTex,
}: {
  info: RoomLayout;
  style: RoomStyle;
  type: PrimaryType;
  glowTex: THREE.Texture;
}) {
  const cx = info.centerCX * CELL;
  const cz = info.centerCY * CELL;

  switch (type) {
    case 'pendant':
      return (
        <group>
          <mesh position={[cx, 3.6, cz]}>
            <cylinderGeometry args={[0.015, 0.015, 0.7, 5]} />
            <meshBasicMaterial color="#0e0a07" toneMapped={false} />
          </mesh>
          <mesh position={[cx, 3.0, cz]}>
            <cylinderGeometry args={[0.06, 0.2, 0.32, 12, 1, true]} />
            <meshBasicMaterial
              color={style.lightColor}
              side={THREE.DoubleSide}
              toneMapped={false}
            />
          </mesh>
          <mesh position={[cx, 2.84, cz]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.18, 14]} />
            <meshBasicMaterial color={style.lightColor} toneMapped={false} />
          </mesh>
          <GlowDecal
            position={[cx, WALL_HEIGHT - 0.02, cz]}
            rotation={[Math.PI / 2, 0, 0]}
            width={1.6}
            height={1.6}
            color={style.lightColor}
            opacity={0.5}
            tex={glowTex}
          />
          <pointLight
            position={[cx, 2.85, cz]}
            color={style.lightColor}
            intensity={style.lightIntensity * 1.1}
            distance={style.lightDistance + 1}
            decay={2}
          />
        </group>
      );

    case 'ceiling_row': {
      const count = Math.min(4, Math.max(2, info.longLen));
      const positions: [number, number][] = [];
      const startWorld =
        info.longAxis === 'x' ? info.minX * CELL + CELL / 2 : info.minZ * CELL + CELL / 2;
      const endWorld =
        info.longAxis === 'x' ? info.maxX * CELL + CELL / 2 : info.maxZ * CELL + CELL / 2;
      for (let i = 0; i < count; i++) {
        const t = count === 1 ? 0.5 : i / (count - 1);
        const along = startWorld * (1 - t) + endWorld * t;
        if (info.longAxis === 'x') positions.push([along, cz]);
        else positions.push([cx, along]);
      }
      return (
        <group>
          {positions.map(([px, pz], i) => (
            <group key={i}>
              <mesh position={[px, WALL_HEIGHT - 0.04, pz]}>
                <boxGeometry args={[0.55, 0.06, 0.55]} />
                <meshBasicMaterial color="#0e0a07" toneMapped={false} />
              </mesh>
              <mesh
                position={[px, WALL_HEIGHT - 0.075, pz]}
                rotation={[Math.PI / 2, 0, 0]}
              >
                <planeGeometry args={[0.42, 0.42]} />
                <meshBasicMaterial color={style.lightColor} toneMapped={false} />
              </mesh>
              <GlowDecal
                position={[px, WALL_HEIGHT - 0.085, pz]}
                rotation={[Math.PI / 2, 0, 0]}
                width={1.3}
                height={1.3}
                color={style.lightColor}
                opacity={0.5}
                tex={glowTex}
              />
            </group>
          ))}
          <pointLight
            position={[cx, 3.5, cz]}
            color={style.lightColor}
            intensity={style.lightIntensity * 1.15}
            distance={style.lightDistance + 2}
            decay={2}
          />
        </group>
      );
    }

    case 'floor_lamps': {
      const lamps: [number, number][] = [
        [info.minX * CELL + 0.6, info.minZ * CELL + 0.6],
        [info.maxX * CELL - 0.6, info.maxZ * CELL - 0.6],
      ];
      return (
        <group>
          {lamps.map(([lx, lz], i) => (
            <group key={i} position={[lx, 0, lz]}>
              <mesh position={[0, 0.05, 0]}>
                <cylinderGeometry args={[0.18, 0.22, 0.1, 10]} />
                <meshLambertMaterial color="#1a1410" />
              </mesh>
              <mesh position={[0, 0.65, 0]}>
                <cylinderGeometry args={[0.025, 0.025, 1.1, 6]} />
                <meshLambertMaterial color="#0e0a07" />
              </mesh>
              <mesh position={[0, 1.32, 0]}>
                <cylinderGeometry args={[0.13, 0.18, 0.22, 10, 1, true]} />
                <meshBasicMaterial
                  color={style.lightColor}
                  side={THREE.DoubleSide}
                  toneMapped={false}
                />
              </mesh>
              <mesh position={[0, 1.21, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.16, 12]} />
                <meshBasicMaterial color={style.lightColor} toneMapped={false} />
              </mesh>
            </group>
          ))}
          <pointLight
            position={[cx, 1.5, cz]}
            color={style.lightColor}
            intensity={style.lightIntensity * 1.1}
            distance={style.lightDistance + 3}
            decay={2}
          />
        </group>
      );
    }

    case 'skylight': {
      const w =
        info.longAxis === 'x'
          ? Math.min(info.longLen * CELL * 0.55, 2.8)
          : Math.min(info.shortLen * CELL * 0.55, 2.0);
      const h =
        info.longAxis === 'x'
          ? Math.min(info.shortLen * CELL * 0.55, 2.0)
          : Math.min(info.longLen * CELL * 0.55, 2.8);
      return (
        <group>
          <mesh position={[cx, WALL_HEIGHT - 0.01, cz]}>
            <boxGeometry args={[w + 0.16, 0.05, h + 0.16]} />
            <meshBasicMaterial color="#0e0a07" toneMapped={false} />
          </mesh>
          <mesh position={[cx, WALL_HEIGHT - 0.045, cz]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[w, h]} />
            <meshBasicMaterial color={style.lightColor} toneMapped={false} />
          </mesh>
          <mesh position={[cx, WALL_HEIGHT - 0.04, cz]}>
            <boxGeometry args={[w + 0.02, 0.02, 0.04]} />
            <meshBasicMaterial color="#0e0a07" toneMapped={false} />
          </mesh>
          <mesh position={[cx, WALL_HEIGHT - 0.04, cz]}>
            <boxGeometry args={[0.04, 0.02, h + 0.02]} />
            <meshBasicMaterial color="#0e0a07" toneMapped={false} />
          </mesh>
          <GlowDecal
            position={[cx, WALL_HEIGHT - 0.06, cz]}
            rotation={[Math.PI / 2, 0, 0]}
            width={w * 1.8}
            height={h * 1.8}
            color={style.lightColor}
            opacity={0.45}
            tex={glowTex}
          />
          <pointLight
            position={[cx, 3.6, cz]}
            color={style.lightColor}
            intensity={style.lightIntensity * 1.3}
            distance={style.lightDistance + 2}
            decay={2}
          />
        </group>
      );
    }
  }
}
