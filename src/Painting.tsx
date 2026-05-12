import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';
import { type PaintingPlacement } from './types';
import { FRAMES } from './frames';
import { ARTWORK } from './artwork';
import { processArtwork } from './processArtwork';
import { makePlacardTexture } from './textures';

// Per-src cache of the cropped + level-adjusted CanvasTexture. Multiple
// painting placements pointing at the same artwork share one GPU texture
// here, and the heavy CPU work (Sobel + histogram passes) only runs once.
const processedCache = new Map<string, THREE.CanvasTexture>();

type Props = {
  placement: PaintingPlacement;
  onSelect: (p: PaintingPlacement, paintingTex: THREE.Texture) => void;
};

const PIXEL_FRAME_LONG_SIDE = 110;

// Cache: per frame src, the detected inner-rect fractions (innerW, innerH)
// of the transparent center, plus the pixelated CanvasTexture.
type FrameInfo = { innerW: number; innerH: number; texture: THREE.CanvasTexture };
const frameInfoCache = new Map<string, FrameInfo>();

function detectInnerBbox(
  src: HTMLImageElement | HTMLCanvasElement | ImageBitmap,
): { innerW: number; innerH: number } {
  const sw = (src as any).width as number;
  const sh = (src as any).height as number;
  const probe = document.createElement('canvas');
  probe.width = sw;
  probe.height = sh;
  const pctx = probe.getContext('2d')!;
  pctx.drawImage(src as CanvasImageSource, 0, 0);
  const data = pctx.getImageData(0, 0, sw, sh).data;
  const isTransparent = (x: number, y: number) => data[(y * sw + x) * 4 + 3] < 32;

  const cx = Math.floor(sw / 2);
  const cy = Math.floor(sh / 2);
  let left = cx;
  let right = cx;
  let top = cy;
  let bottom = cy;
  while (left > 0 && isTransparent(left - 1, cy)) left--;
  while (right < sw - 1 && isTransparent(right + 1, cy)) right++;
  while (top > 0 && isTransparent(cx, top - 1)) top--;
  while (bottom < sh - 1 && isTransparent(cx, bottom + 1)) bottom++;
  return {
    innerW: (right - left + 1) / sw,
    innerH: (bottom - top + 1) / sh,
  };
}

function buildPixelFrameTexture(
  src: HTMLImageElement | HTMLCanvasElement | ImageBitmap,
): THREE.CanvasTexture {
  const sw = (src as any).width as number;
  const sh = (src as any).height as number;
  const aspect = sw / sh;
  const w =
    aspect >= 1 ? PIXEL_FRAME_LONG_SIDE : Math.max(8, Math.round(PIXEL_FRAME_LONG_SIDE * aspect));
  const h =
    aspect >= 1 ? Math.max(8, Math.round(PIXEL_FRAME_LONG_SIDE / aspect)) : PIXEL_FRAME_LONG_SIDE;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src as CanvasImageSource, 0, 0, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

function getFrameInfo(
  src: string,
  loaded: HTMLImageElement | HTMLCanvasElement | ImageBitmap,
): FrameInfo {
  let info = frameInfoCache.get(src);
  if (!info) {
    info = {
      ...detectInnerBbox(loaded),
      texture: buildPixelFrameTexture(loaded),
    };
    frameInfoCache.set(src, info);
  }
  return info;
}

// Painting longer-side length (m). Frame outer dimensions derive from this + the
// detected inner bbox so the frame wraps the painting exactly.
const PAINTING_LONG_SIDE = 1.25;

function tintFromSeed(seed: number, hueRange = 0.04, satRange = 0.1, lightRange = 0.07) {
  let a = (seed * 9301 + 49297) >>> 0;
  const r = () => {
    a = (a * 1103515245 + 12345) >>> 0;
    return (a >>> 8) / 16777216;
  };
  const c = new THREE.Color();
  c.setHSL(
    0.08 + (r() - 0.5) * hueRange * 2,
    0.18 + (r() - 0.5) * satRange,
    0.92 + (r() - 0.5) * lightRange,
  );
  return c;
}

export function Painting({ placement, onSelect }: Props) {
  const { wall, frameIdx, paintingScale } = placement;
  const frame = FRAMES[frameIdx];
  const art = ARTWORK[placement.paintingIdx % ARTWORK.length];

  // Two-stage texture loading:
  //   1. useTexture suspends until the raw artwork PNG has loaded — that
  //      texture is shown immediately so the painting plane is never blank.
  //   2. After mount we run the auto-crop + levels pass off the main render
  //      and swap to a processed CanvasTexture. If processing throws (canvas
  //      tainting, bad image, etc.) we keep the raw texture rather than
  //      falling back to a black placeholder.
  const baseTex = useTexture(frame.src);
  const rawTex = useTexture(art.src);
  rawTex.colorSpace = THREE.SRGBColorSpace;
  rawTex.anisotropy = 4;

  const [processedTex, setProcessedTex] = useState<THREE.CanvasTexture | null>(
    () => processedCache.get(art.src) ?? null,
  );

  useEffect(() => {
    if (processedTex) return;
    const img = rawTex.image as HTMLImageElement | undefined;
    if (!img || !img.complete) return;
    let cancelled = false;
    // Defer to the next macrotask so we don't block the current paint while
    // running the Sobel/histogram passes; with N paintings it would otherwise
    // freeze first paint for several hundred ms.
    const id = window.setTimeout(() => {
      if (cancelled) return;
      try {
        const canvas = processArtwork(img);
        const t = new THREE.CanvasTexture(canvas);
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 4;
        t.needsUpdate = true;
        processedCache.set(art.src, t);
        if (!cancelled) setProcessedTex(t);
      } catch (e) {
        // Keep the raw texture if anything goes wrong.
        // eslint-disable-next-line no-console
        console.warn('artwork processing failed for', art.src, e);
      }
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [art.src, rawTex.image, processedTex]);

  const paintingTex: THREE.Texture = processedTex ?? rawTex;

  // Detect inner bbox + pixelate frame once per frame source.
  const frameInfo = useMemo(() => {
    const img = baseTex.image as HTMLImageElement | HTMLCanvasElement | ImageBitmap | undefined;
    if (!img) return null;
    return getFrameInfo(frame.src, img);
  }, [baseTex, frame.src]);

  // Painting aspect — derived from whichever texture is currently rendering
  // (raw HTMLImageElement until processing is done, then the cropped canvas).
  // Both expose width/height in pixels.
  const loadedImg = paintingTex.image as { width?: number; height?: number } | undefined;
  const paintingAspect =
    loadedImg && loadedImg.width && loadedImg.height
      ? loadedImg.width / loadedImg.height
      : art.aspect;

  // Painting size — driven by the artwork's aspect and per-instance scale.
  const longSide = PAINTING_LONG_SIDE * paintingScale;
  const paintW = paintingAspect >= 1 ? longSide : longSide * paintingAspect;
  const paintH = paintingAspect >= 1 ? longSide / paintingAspect : longSide;

  // Frame outer size = painting / detectedInnerRatios. Until detection completes,
  // fall back to a sensible estimate that will be replaced once the texture loads.
  const innerW = frameInfo ? frameInfo.innerW : 0.78;
  const innerH = frameInfo ? frameInfo.innerH : 0.78;
  const frameW = paintW / innerW;
  const frameH = paintH / innerH;

  const placardTex = useMemo(() => makePlacardTexture(placement.id), [placement.id]);
  const frameTint = useMemo(() => tintFromSeed(placement.id * 7 + 11), [placement.id]);

  const eyeY = 1.55;
  const off = 0.03;
  const offPaint = 0.02;
  const offPlacard = 0.04;

  const wx = wall.wx + wall.nx * off;
  const wz = wall.wz + wall.nz * off;
  const px = wall.wx + wall.nx * offPaint;
  const pz = wall.wz + wall.nz * offPaint;

  const placardW = 0.45;
  const placardH = 0.16;
  // Anchor placard directly below the painting's bottom edge with a small
  // gap. Previously this used a fixed offset that, for tall portraits, dragged
  // the placard near floor level.
  const placardGap = 0.22 + frameH / 10.0;
  const placardY = eyeY - paintH / 2 - placardGap - placardH / 2;

  const frameTexture = frameInfo?.texture ?? baseTex;

  return (
    <group>
      <mesh position={[px, eyeY, pz]} rotation={[0, wall.rotY, 0]}>
        <planeGeometry args={[paintW, paintH]} />
        <meshBasicMaterial map={paintingTex} toneMapped={false} />
      </mesh>
      <mesh
        position={[wx, eyeY, wz]}
        rotation={[0, wall.rotY, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(placement, paintingTex);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = '';
        }}
      >
        <planeGeometry args={[frameW, frameH]} />
        <meshBasicMaterial
          map={frameTexture}
          color={frameTint}
          transparent
          alphaTest={0.5}
          toneMapped={false}
        />
      </mesh>
      <group
        position={[wall.wx + wall.nx * offPlacard, placardY, wall.wz + wall.nz * offPlacard]}
        rotation={[0, wall.rotY, 0]}
      >
        <mesh>
          <boxGeometry args={[placardW, placardH, 0.02]} />
          <meshLambertMaterial color="#d8c79a" flatShading />
        </mesh>
        <mesh position={[0, 0, 0.011]}>
          <planeGeometry args={[placardW * 0.92, placardH * 0.78]} />
          <meshBasicMaterial map={placardTex} toneMapped={false} transparent />
        </mesh>
      </group>
    </group>
  );
}
