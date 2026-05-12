// One-shot preprocessing pass for /public/art. For each PNG:
//   1) Edge-energy projection (Sobel on a downsampled copy) to find the
//      tightest bbox containing the bulk of the visual content (the painting),
//      then crop to it with a 2% pad.
//   2) Downscale so the long side is at most MAX_OUTPUT_DIM. Keeps every GPU
//      inside its MAX_TEXTURE_SIZE and shrinks the JS bundle the browser
//      eventually fetches.
//   3) Per-channel percentile-based histogram stretch — same as the old
//      runtime levels pass — to neutralise warm wall casts and recover
//      contrast lost to flat ambient gallery lighting.
// The result overwrites the file in place. Originals are kept in
// public/art-original/.
//
// Run with: node scripts/preprocess-art.mjs
//
// All algorithms are direct ports of what processArtwork.ts used to do at
// runtime; the runtime version is now a no-op.

import sharp from 'sharp';
import { readdir, copyFile } from 'node:fs/promises';
import { join, basename, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const ART_DIR = join(ROOT, 'public', 'art');
const ORIG_DIR = join(ROOT, 'public', 'art-original');

const MAX_OUTPUT_DIM = 2048;
const PEAK_THRESHOLD = 0.4; // row/col energy must exceed this fraction of peak
const PAD_FRACTION = 0.02;
const LEVELS_PERCENTILE = 0.005;

async function detectContentBbox(srcPath) {
  const meta = await sharp(srcPath).metadata();
  const W = meta.width;
  const H = meta.height;

  const target = 256;
  const ratio = target / Math.max(W, H);
  const sw = Math.max(8, Math.round(W * ratio));
  const sh = Math.max(8, Math.round(H * ratio));

  // RGB without alpha — keeps Sobel arithmetic simple
  const { data } = await sharp(srcPath)
    .resize(sw, sh, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const lum = (idx) => 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];

  // Edge magnitude per pixel (|dx| + |dy|).
  const edges = new Float32Array(sw * sh);
  for (let y = 1; y < sh - 1; y++) {
    for (let x = 1; x < sw - 1; x++) {
      const il = (y * sw + (x - 1)) * 3;
      const ir = (y * sw + (x + 1)) * 3;
      const it = ((y - 1) * sw + x) * 3;
      const ib = ((y + 1) * sw + x) * 3;
      edges[y * sw + x] = Math.abs(lum(ir) - lum(il)) + Math.abs(lum(ib) - lum(it));
    }
  }

  const rowE = new Float32Array(sh);
  const colE = new Float32Array(sw);
  for (let y = 0; y < sh; y++) {
    let r = 0;
    for (let x = 0; x < sw; x++) r += edges[y * sw + x];
    rowE[y] = r;
  }
  for (let x = 0; x < sw; x++) {
    let c = 0;
    for (let y = 0; y < sh; y++) c += edges[y * sw + x];
    colE[x] = c;
  }

  const peakRow = Math.max(...rowE);
  const peakCol = Math.max(...colE);
  const rowThresh = peakRow * PEAK_THRESHOLD;
  const colThresh = peakCol * PEAK_THRESHOLD;

  let top = 0;
  while (top < sh - 1 && rowE[top] < rowThresh) top++;
  let bottom = sh - 1;
  while (bottom > top && rowE[bottom] < rowThresh) bottom--;
  let left = 0;
  while (left < sw - 1 && colE[left] < colThresh) left++;
  let right = sw - 1;
  while (right > left && colE[right] < colThresh) right--;

  const cropArea = (right - left + 1) * (bottom - top + 1);
  if (cropArea < 0.3 * sw * sh) {
    return { x: 0, y: 0, w: W, h: H, original: { W, H } };
  }

  const pad = Math.round(Math.min(sw, sh) * PAD_FRACTION);
  top = Math.max(0, top - pad);
  bottom = Math.min(sh - 1, bottom + pad);
  left = Math.max(0, left - pad);
  right = Math.min(sw - 1, right + pad);

  const scale = 1 / ratio;
  let x = Math.round(left * scale);
  let y = Math.round(top * scale);
  let w = Math.round((right - left + 1) * scale);
  let h = Math.round((bottom - top + 1) * scale);
  // Clamp to image bounds — rounding can push the bbox a pixel or two past
  // the edge, and sharp.extract rejects that.
  if (x < 0) { w += x; x = 0; }
  if (y < 0) { h += y; y = 0; }
  if (x + w > W) w = W - x;
  if (y + h > H) h = H - y;
  w = Math.max(1, w);
  h = Math.max(1, h);
  return { x, y, w, h, original: { W, H } };
}

function applyLevels(rgb, w, h) {
  const histR = new Uint32Array(256);
  const histG = new Uint32Array(256);
  const histB = new Uint32Array(256);
  for (let i = 0; i < rgb.length; i += 3) {
    histR[rgb[i]]++;
    histG[rgb[i + 1]]++;
    histB[rgb[i + 2]]++;
  }
  const total = w * h;
  const findPercentile = (hist, p) => {
    const target = total * p;
    let cum = 0;
    for (let v = 0; v < 256; v++) {
      cum += hist[v];
      if (cum >= target) return v;
    }
    return 255;
  };
  const rLo = findPercentile(histR, LEVELS_PERCENTILE);
  const rHi = findPercentile(histR, 1 - LEVELS_PERCENTILE);
  const gLo = findPercentile(histG, LEVELS_PERCENTILE);
  const gHi = findPercentile(histG, 1 - LEVELS_PERCENTILE);
  const bLo = findPercentile(histB, LEVELS_PERCENTILE);
  const bHi = findPercentile(histB, 1 - LEVELS_PERCENTILE);
  const stretch = (v, lo, hi) => {
    if (hi - lo < 8) return v;
    const out = ((v - lo) * 255) / (hi - lo);
    return out < 0 ? 0 : out > 255 ? 255 : Math.round(out);
  };
  for (let i = 0; i < rgb.length; i += 3) {
    rgb[i] = stretch(rgb[i], rLo, rHi);
    rgb[i + 1] = stretch(rgb[i + 1], gLo, gHi);
    rgb[i + 2] = stretch(rgb[i + 2], bLo, bHi);
  }
  return rgb;
}

async function processOne(srcPath, outPath) {
  const bbox = await detectContentBbox(srcPath);

  // Compute the post-resize output dimensions.
  const longSide = Math.max(bbox.w, bbox.h);
  const downscale = longSide > MAX_OUTPUT_DIM ? MAX_OUTPUT_DIM / longSide : 1;
  const outW = Math.max(1, Math.round(bbox.w * downscale));
  const outH = Math.max(1, Math.round(bbox.h * downscale));

  // Extract crop + resize to final dims, then take raw RGB for levels pass.
  const { data, info } = await sharp(srcPath)
    .extract({ left: bbox.x, top: bbox.y, width: bbox.w, height: bbox.h })
    .resize(outW, outH, { fit: 'fill', kernel: 'lanczos3' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  applyLevels(data, info.width, info.height);

  await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 3 },
  })
    // WebP at q88 keeps the photographic content effectively
    // indistinguishable while shrinking output ~10x vs. lossless PNG.
    .webp({ quality: 88, effort: 5 })
    .toFile(outPath);

  return { outW: info.width, outH: info.height, bbox };
}

async function main() {
  const files = (await readdir(ORIG_DIR))
    .filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
    .sort();

  console.log(`processing ${files.length} files`);
  for (const f of files) {
    const orig = join(ORIG_DIR, f);
    const outName = basename(f, extname(f)) + '.webp';
    const out = join(ART_DIR, outName);
    const result = await processOne(orig, out);
    const { W, H } = result.bbox.original;
    console.log(
      `${f}: ${W}x${H} → bbox ${result.bbox.w}x${result.bbox.h} → out ${result.outW}x${result.outH}`,
    );
  }
  console.log('done');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
