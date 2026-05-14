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

// Camera-bob (vertical wobble during a forward/backward step) and footstep
// thump tuning.
const BOB_AMPLITUDE = 0.022; // metres peak
const STEP_GAIN = 0.18;      // WebAudio output gain for the thump

type Props = {
  plan: Floorplan;
  paused: boolean;
};

// One AudioContext shared across re-renders. Lazily created on first use so
// it doesn't leak before the user has interacted with the page (browsers
// block AudioContext.resume() until then).
let audioCtx: AudioContext | null = null;
function getAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    try {
      const C =
        (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
          .AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!C) return null;
      audioCtx = new C();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

// Short low-frequency "thump" — sine sweep + lowpass + fast decay envelope.
function playFootstep() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  osc.type = 'sine';
  // Small frequency variation per step so successive thumps don't feel
  // identical.
  const baseHz = 78 + Math.random() * 18;
  osc.frequency.setValueAtTime(baseHz * 1.4, t);
  osc.frequency.exponentialRampToValueAtTime(baseHz, t + 0.06);
  filter.type = 'lowpass';
  filter.frequency.value = 240;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(STEP_GAIN, t + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.16);
}

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
  // Distinguishes a position move (bob + footstep) from a pure rotation.
  // 'idle' when no step is in flight.
  const stepKind = useRef<'idle' | 'move' | 'turn'>('idle');
  // Captured at the moment a move begins; used to compute bob progress as
  // the camera lerps from start → end.
  const stepStart = useRef(new THREE.Vector3());
  const stepEnd = useRef(new THREE.Vector3());
  const stepDist = useRef(0);

  useEffect(() => {
    camera.position.copy(target.current.pos);
    camera.rotation.set(0, target.current.rotY, 0);
  }, [camera]);

  useEffect(() => {
    cell.current = { cx: plan.start.cx, cy: plan.start.cy, dir: plan.start.dir };
    target.current.pos.set(plan.start.cx * CELL, EYE, plan.start.cy * CELL);
    target.current.rotY = DIR_ROT_Y[plan.start.dir];
    camera.position.copy(target.current.pos);
    camera.rotation.set(0, target.current.rotY, 0);
    moving.current = false;
    stepKind.current = 'idle';
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
      stepStart.current.set(camera.position.x, EYE, camera.position.z);
      target.current.pos.set(ncx * CELL, EYE, ncy * CELL);
      stepEnd.current.copy(target.current.pos);
      stepDist.current = stepStart.current.distanceTo(stepEnd.current);
      moving.current = true;
      stepKind.current = 'move';
    }
    function turn(rightDelta: number) {
      if (moving.current || paused) return;
      cell.current.dir = (((cell.current.dir + rightDelta) % 4) + 4) % 4 as Side;
      target.current.rotY = DIR_ROT_Y[cell.current.dir];
      moving.current = true;
      stepKind.current = 'turn';
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
  }, [plan, paused, camera]);

  useFrame((_, dt) => {
    const lerpT = 1 - Math.exp(-dt * 12);
    camera.position.x += (target.current.pos.x - camera.position.x) * lerpT;
    camera.position.z += (target.current.pos.z - camera.position.z) * lerpT;
    // Shortest-arc Y rotation
    let dy = target.current.rotY - camera.rotation.y;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    camera.rotation.y += dy * lerpT;

    // Bob: one half-sine over the duration of a forward/back step.
    // Progress is the fraction of the step distance the camera has covered.
    let bob = 0;
    if (stepKind.current === 'move' && stepDist.current > 0) {
      const traveled = stepStart.current.distanceTo(camera.position);
      const progress = Math.min(1, Math.max(0, traveled / stepDist.current));
      bob = Math.sin(progress * Math.PI) * BOB_AMPLITUDE;
    }
    camera.position.y = EYE + bob;

    const arrivedPos =
      Math.abs(target.current.pos.x - camera.position.x) < 0.005 &&
      Math.abs(target.current.pos.z - camera.position.z) < 0.005;
    const arrivedRot = Math.abs(dy) < 0.005;
    if (arrivedPos && arrivedRot) {
      camera.position.x = target.current.pos.x;
      camera.position.z = target.current.pos.z;
      camera.position.y = EYE;
      camera.rotation.y = target.current.rotY;
      // Trigger footstep on completion of a position move only.
      if (moving.current && stepKind.current === 'move') {
        playFootstep();
      }
      moving.current = false;
      stepKind.current = 'idle';
    }
  });

  return null;
}
