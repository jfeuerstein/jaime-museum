import * as THREE from 'three';
import { type DecorPlacement } from './types';

type Props = { items: DecorPlacement[] };

// Stable per-instance seeded jitter
function jitter(seed: number) {
  let a = (seed * 9301 + 49297) >>> 0;
  return () => {
    a = (a * 1103515245 + 12345) >>> 0;
    return (a >>> 8) / 16777216;
  };
}

function tweakHSL(base: string, dh: number, ds: number, dl: number): string {
  const c = new THREE.Color(base);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(
    (hsl.h + dh + 1) % 1,
    Math.max(0, Math.min(1, hsl.s + ds)),
    Math.max(0, Math.min(1, hsl.l + dl)),
  );
  return `#${c.getHexString()}`;
}

export function Decor({ items }: Props) {
  return (
    <group>
      {items.map((it, i) =>
        it.kind === 'bench' ? (
          <Bench key={i} idx={i} x={it.x} z={it.z} rotY={it.rotY} variant={it.variant} />
        ) : (
          <Plant key={i} idx={i} x={it.x} z={it.z} rotY={it.rotY} variant={it.variant} />
        ),
      )}
    </group>
  );
}

function Bench({
  idx,
  x,
  z,
  rotY,
}: {
  idx: number;
  x: number;
  z: number;
  rotY: number;
  variant: number;
}) {
  const r = jitter(idx * 13 + 1);
  // Wood color jitter — small range across warm browns.
  const wood = tweakHSL('#5b3a26', (r() - 0.5) * 0.04, (r() - 0.5) * 0.12, (r() - 0.5) * 0.1);
  const woodLeg = tweakHSL(wood, 0, 0, -0.04);
  return (
    <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[1.6, 0.08, 0.45]} />
        <meshLambertMaterial color={wood} flatShading />
      </mesh>
      {[-0.7, 0.7].map((dx) => (
        <mesh key={dx} position={[dx, 0.21, 0]}>
          <boxGeometry args={[0.1, 0.42, 0.4]} />
          <meshLambertMaterial color={woodLeg} flatShading />
        </mesh>
      ))}
    </group>
  );
}

function Plant({
  idx,
  x,
  z,
  rotY,
  variant,
}: {
  idx: number;
  x: number;
  z: number;
  rotY: number;
  variant: number;
}) {
  const r = jitter(idx * 17 + 3);
  const foliage = tweakHSL(
    '#3f7a3a',
    (r() - 0.5) * 0.06,
    (r() - 0.5) * 0.14,
    (r() - 0.5) * 0.14,
  );
  const foliageHi = tweakHSL(foliage, 0, 0, 0.06);
  const pot = tweakHSL('#6b4226', (r() - 0.5) * 0.04, (r() - 0.5) * 0.12, (r() - 0.5) * 0.1);
  return (
    <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.22, 0.18, 0.36, 6]} />
        <meshLambertMaterial color={pot} flatShading />
      </mesh>
      <mesh position={[0, 0.36, 0]}>
        <cylinderGeometry args={[0.21, 0.21, 0.02, 6]} />
        <meshLambertMaterial color="#2d1f12" flatShading />
      </mesh>
      {variant === 0 ? (
        <>
          {[0, 1, 2, 3, 4].map((i) => {
            const a = (i / 5) * Math.PI * 2;
            return (
              <mesh
                key={i}
                position={[Math.cos(a) * 0.06, 0.85, Math.sin(a) * 0.06]}
                rotation={[Math.cos(a) * 0.4, a, Math.sin(a) * 0.4]}
              >
                <coneGeometry args={[0.08, 1.0, 4]} />
                <meshLambertMaterial color={foliage} flatShading />
              </mesh>
            );
          })}
        </>
      ) : variant === 1 ? (
        <>
          <mesh position={[0, 0.7, 0]}>
            <icosahedronGeometry args={[0.42, 0]} />
            <meshLambertMaterial color={foliage} flatShading />
          </mesh>
          <mesh position={[0.18, 0.86, 0.06]}>
            <icosahedronGeometry args={[0.22, 0]} />
            <meshLambertMaterial color={foliageHi} flatShading />
          </mesh>
        </>
      ) : (
        <>
          <mesh position={[0, 0.7, 0]}>
            <cylinderGeometry args={[0.05, 0.07, 0.6, 5]} />
            <meshLambertMaterial color={pot} flatShading />
          </mesh>
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const a = (i / 6) * Math.PI * 2;
            return (
              <mesh
                key={i}
                position={[Math.cos(a) * 0.18, 1.05, Math.sin(a) * 0.18]}
                rotation={[Math.cos(a) * 0.7, a, Math.sin(a) * 0.7]}
              >
                <coneGeometry args={[0.08, 0.5, 3]} />
                <meshLambertMaterial color={foliage} flatShading />
              </mesh>
            );
          })}
        </>
      )}
    </group>
  );
}
