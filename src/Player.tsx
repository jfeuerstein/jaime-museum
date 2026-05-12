import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CELL, type Floorplan, type Side } from './types';
import { isFloor } from './generate';

const EYE = 1.65;
// Direction lookup: 0=N(-z), 1=E(+x), 2=S(+z), 3=W(-x)
const DIR_DX = [0, 1, 0, -1];
const DIR_DZ = [-1, 0, 1, 0];
const DIR_ROT_Y = [0, -Math.PI / 2, Math.PI, Math.PI / 2];

type Props = {
  plan: Floorplan;
  paused: boolean;
};

export function Player({ plan, paused }: Props) {
  const { camera } = useThree();
  const cell = useRef<{ cx: number; cy: number; dir: Side }>({
    cx: plan.start.cx,
    cy: plan.start.cy,
    dir: plan.start.dir,
  });
  const target = useRef<{
    pos: THREE.Vector3;
    rotY: number;
  }>({
    pos: new THREE.Vector3(plan.start.cx * CELL, EYE, plan.start.cy * CELL),
    rotY: DIR_ROT_Y[plan.start.dir],
  });
  const moving = useRef(false);

  // Initial camera placement
  useEffect(() => {
    camera.position.copy(target.current.pos);
    camera.rotation.set(0, target.current.rotY, 0);
  }, [camera]);

  // Reset when plan changes
  useEffect(() => {
    cell.current = { cx: plan.start.cx, cy: plan.start.cy, dir: plan.start.dir };
    target.current.pos.set(plan.start.cx * CELL, EYE, plan.start.cy * CELL);
    target.current.rotY = DIR_ROT_Y[plan.start.dir];
    camera.position.copy(target.current.pos);
    camera.rotation.set(0, target.current.rotY, 0);
  }, [plan, camera]);

  useEffect(() => {
    function tryMove(forward: boolean) {
      if (moving.current || paused) return;
      const sign = forward ? 1 : -1;
      const ncx = cell.current.cx + DIR_DX[cell.current.dir] * sign;
      const ncy = cell.current.cy + DIR_DZ[cell.current.dir] * sign;
      if (!isFloor(plan, ncx, ncy)) return;
      cell.current.cx = ncx;
      cell.current.cy = ncy;
      target.current.pos.set(ncx * CELL, EYE, ncy * CELL);
      moving.current = true;
    }
    function turn(rightDelta: number) {
      if (moving.current || paused) return;
      cell.current.dir = (((cell.current.dir + rightDelta) % 4) + 4) % 4 as Side;
      target.current.rotY = DIR_ROT_Y[cell.current.dir];
      moving.current = true;
    }
    function onKey(e: KeyboardEvent) {
      if (paused) return;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          tryMove(true);
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          tryMove(false);
          break;
        case 'ArrowLeft':
        case 'q':
        case 'Q':
          turn(-1);
          break;
        case 'ArrowRight':
        case 'e':
        case 'E':
          turn(1);
          break;
        case 'a':
        case 'A':
          turn(-1);
          break;
        case 'd':
        case 'D':
          turn(1);
          break;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [plan, paused]);

  // Smoothly interpolate camera toward target each frame.
  useFrame((_, dt) => {
    const lerpT = 1 - Math.exp(-dt * 12); // smooth ease
    camera.position.x += (target.current.pos.x - camera.position.x) * lerpT;
    camera.position.y += (target.current.pos.y - camera.position.y) * lerpT;
    camera.position.z += (target.current.pos.z - camera.position.z) * lerpT;
    // Shortest-arc Y rotation
    let dy = target.current.rotY - camera.rotation.y;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    camera.rotation.y += dy * lerpT;
    if (
      Math.abs(target.current.pos.x - camera.position.x) < 0.005 &&
      Math.abs(target.current.pos.z - camera.position.z) < 0.005 &&
      Math.abs(dy) < 0.005
    ) {
      camera.position.copy(target.current.pos);
      camera.rotation.y = target.current.rotY;
      moving.current = false;
    }
  });

  return null;
}
