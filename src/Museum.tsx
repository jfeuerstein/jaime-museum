import { useMemo } from 'react';
import * as THREE from 'three';
import { CELL, WALL_HEIGHT, type Floorplan } from './types';
import { isFloor } from './generate';
import type { RoomStyle } from './roomStyle';

type Props = {
  plan: Floorplan;
  roomStyles: RoomStyle[];
  corridorStyle: RoomStyle;
};

// Build per-room merged geometries so each room can have its own materials/textures.
export function Museum({ plan, roomStyles, corridorStyle }: Props) {
  const groups = useMemo(() => {
    // bucket index: 0..numRooms-1 = rooms, numRooms = corridor
    const numBuckets = plan.numRooms + 1;
    const corridorIdx = plan.numRooms;
    const floorBuckets: THREE.BufferGeometry[][] = Array.from({ length: numBuckets }, () => []);
    const ceilBuckets: THREE.BufferGeometry[][] = Array.from({ length: numBuckets }, () => []);
    const wallBuckets: THREE.BufferGeometry[][] = Array.from({ length: numBuckets }, () => []);

    for (let y = 0; y < plan.rows; y++) {
      for (let x = 0; x < plan.cols; x++) {
        if (!isFloor(plan, x, y)) continue;
        const room = plan.cellRoom[y * plan.cols + x];
        const bucket = room < 0 ? corridorIdx : room;

        const f = new THREE.PlaneGeometry(CELL, CELL);
        f.rotateX(-Math.PI / 2);
        f.translate(x * CELL, 0, y * CELL);
        floorBuckets[bucket].push(f);

        const c = new THREE.PlaneGeometry(CELL, CELL);
        c.rotateX(Math.PI / 2);
        c.translate(x * CELL, WALL_HEIGHT, y * CELL);
        ceilBuckets[bucket].push(c);
      }
    }

    for (const w of plan.walls) {
      const room = plan.cellRoom[w.cy * plan.cols + w.cx];
      const bucket = room < 0 ? corridorIdx : room;
      const g = new THREE.PlaneGeometry(CELL, WALL_HEIGHT);
      g.rotateY(w.rotY);
      g.translate(w.wx, WALL_HEIGHT / 2, w.wz);
      wallBuckets[bucket].push(g);
    }

    return Array.from({ length: numBuckets }, (_, i) => ({
      floor: mergeGeometries(floorBuckets[i]),
      ceil: mergeGeometries(ceilBuckets[i]),
      wall: mergeGeometries(wallBuckets[i]),
      style: i === corridorIdx ? corridorStyle : roomStyles[i],
    }));
  }, [plan, roomStyles, corridorStyle]);

  return (
    <group>
      {groups.map((g, i) => (
        <group key={i}>
          {g.floor.getAttribute('position') && (
            <mesh geometry={g.floor}>
              <meshPhongMaterial map={g.style.floorTex} shininess={0} flatShading />
            </mesh>
          )}
          {g.ceil.getAttribute('position') && (
            <mesh geometry={g.ceil}>
              <meshPhongMaterial color={g.style.ceilColor} shininess={0} flatShading />
            </mesh>
          )}
          {g.wall.getAttribute('position') && (
            <mesh geometry={g.wall}>
              <meshPhongMaterial map={g.style.wallTex} shininess={0} flatShading />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

function mergeGeometries(geoms: THREE.BufferGeometry[]): THREE.BufferGeometry {
  if (geoms.length === 0) return new THREE.BufferGeometry();
  let posCount = 0;
  let normCount = 0;
  let uvCount = 0;
  let indexCount = 0;
  for (const g of geoms) {
    posCount += g.getAttribute('position').count;
    if (g.getAttribute('normal')) normCount += g.getAttribute('normal').count;
    if (g.getAttribute('uv')) uvCount += g.getAttribute('uv').count;
    if (g.index) indexCount += g.index.count;
  }
  const positions = new Float32Array(posCount * 3);
  const normals = new Float32Array(normCount * 3);
  const uvs = new Float32Array(uvCount * 2);
  const indices = new Uint32Array(indexCount);
  let pOff = 0;
  let nOff = 0;
  let uOff = 0;
  let iOff = 0;
  let baseVertex = 0;
  for (const g of geoms) {
    const p = g.getAttribute('position');
    positions.set(p.array as Float32Array, pOff * 3);
    pOff += p.count;
    const n = g.getAttribute('normal');
    if (n) {
      normals.set(n.array as Float32Array, nOff * 3);
      nOff += n.count;
    }
    const u = g.getAttribute('uv');
    if (u) {
      uvs.set(u.array as Float32Array, uOff * 2);
      uOff += u.count;
    }
    if (g.index) {
      const src = g.index.array as ArrayLike<number>;
      for (let i = 0; i < src.length; i++) {
        indices[iOff + i] = src[i] + baseVertex;
      }
      iOff += g.index.count;
    }
    baseVertex += p.count;
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  if (nOff) merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  if (uOff) merged.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  if (iOff) merged.setIndex(new THREE.BufferAttribute(indices, 1));
  return merged;
}
