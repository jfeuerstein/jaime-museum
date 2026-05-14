import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// A pool of slowly-drifting additive points around the camera. Each mote
// follows the camera in a toroidal box (wrap-around within ±RANGE on X/Z and
// between FLOOR_Y .. CEIL_Y on Y), so we always have particles in view but
// don't simulate the entire museum's air volume.

const COUNT = 350;
const RANGE = 11;          // half-extent on each horizontal axis around the camera
const FLOOR_Y = 0.45;
const CEIL_Y = 3.6;
const DRIFT_AMP = 0.07;     // horizontal drift speed (m/s) at peak
const VERTICAL_DRIFT = 0.04; // gentle vertical breathing speed (m/s)

export function DustMotes() {
  const ref = useRef<THREE.Points>(null);
  const camera = useThree((s) => s.camera);

  // Initial positions distributed around the origin; remapped each frame to
  // follow the camera's actual position.
  const { positions, phases } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const phases = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (Math.random() * 2 - 1) * RANGE;
      positions[i * 3 + 1] = FLOOR_Y + Math.random() * (CEIL_Y - FLOOR_Y);
      positions[i * 3 + 2] = (Math.random() * 2 - 1) * RANGE;
      phases[i * 3] = Math.random() * Math.PI * 2;
      phases[i * 3 + 1] = Math.random() * Math.PI * 2;
      phases[i * 3 + 2] = Math.random() * Math.PI * 2;
    }
    return { positions, phases };
  }, []);

  useFrame((state, dt) => {
    const points = ref.current;
    if (!points) return;
    const attr = points.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const t = state.clock.elapsedTime;
    const cx = camera.position.x;
    const cz = camera.position.z;
    // dt is per-frame seconds; the drift is small so motes barely move.
    for (let i = 0; i < COUNT; i++) {
      const px = phases[i * 3];
      const py = phases[i * 3 + 1];
      const pz = phases[i * 3 + 2];
      // World-space drift independent of camera.
      arr[i * 3] += Math.sin(t * 0.45 + px) * DRIFT_AMP * dt;
      arr[i * 3 + 1] += Math.sin(t * 0.3 + py) * VERTICAL_DRIFT * dt;
      arr[i * 3 + 2] += Math.cos(t * 0.45 + pz) * DRIFT_AMP * dt;

      // Wrap horizontally so motes always live in ±RANGE of the camera.
      const dx = arr[i * 3] - cx;
      if (dx > RANGE) arr[i * 3] -= RANGE * 2;
      else if (dx < -RANGE) arr[i * 3] += RANGE * 2;
      const dz = arr[i * 3 + 2] - cz;
      if (dz > RANGE) arr[i * 3 + 2] -= RANGE * 2;
      else if (dz < -RANGE) arr[i * 3 + 2] += RANGE * 2;

      // Wrap vertically into the room volume.
      if (arr[i * 3 + 1] < FLOOR_Y) arr[i * 3 + 1] = CEIL_Y;
      else if (arr[i * 3 + 1] > CEIL_Y) arr[i * 3 + 1] = FLOOR_Y;
    }
    attr.needsUpdate = true;
  });

  // Build the geometry imperatively so we can keep TypeScript happy on
  // newer r3f versions where <bufferAttribute>'s props changed.
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return g;
  }, [positions]);

  return (
    <points ref={ref} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        size={0.03}
        sizeAttenuation
        color="#fff2cf"
        transparent
        opacity={0.42}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
}
