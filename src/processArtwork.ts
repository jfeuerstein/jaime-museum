// Pure, synchronous image transform. The caller is responsible for image
// loading, texture creation, and caching — this module just turns one
// HTMLImageElement into a cleaned-up HTMLCanvasElement.
//
// Pipeline:
//   1) Edge-energy projection to find the tightest bbox containing the bulk
//      of the visual content (the painting), then crop to it.
//   2) A per-channel percentile-based histogram stretch to neutralise warm
//      wall casts and recover contrast lost to flat ambient lighting.

export function processArtwork(img: HTMLImageElement): HTMLCanvasElement {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;

  const work = document.createElement('canvas');
  work.width = w;
  work.height = h;
  const ctx = work.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  const bbox = detectContentBbox(work);

  const out = document.createElement('canvas');
  out.width = bbox.w;
  out.height = bbox.h;
  const octx = out.getContext('2d')!;
  octx.drawImage(work, bbox.x, bbox.y, bbox.w, bbox.h, 0, 0, bbox.w, bbox.h);
  applyLevels(octx, bbox.w, bbox.h);

  return out;
}

function detectContentBbox(src: HTMLCanvasElement): { x: number; y: number; w: number; h: number } {
  const W = src.width;
  const H = src.height;

  const target = 256;
  const ratio = target / Math.max(W, H);
  const sw = Math.max(8, Math.round(W * ratio));
  const sh = Math.max(8, Math.round(H * ratio));

  const small = document.createElement('canvas');
  small.width = sw;
  small.height = sh;
  const sctx = small.getContext('2d')!;
  sctx.drawImage(src, 0, 0, sw, sh);
  const data = sctx.getImageData(0, 0, sw, sh).data;

  const lum = (idx: number) =>
    0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];

  const edges = new Float32Array(sw * sh);
  for (let y = 1; y < sh - 1; y++) {
    for (let x = 1; x < sw - 1; x++) {
      const il = (y * sw + (x - 1)) * 4;
      const ir = (y * sw + (x + 1)) * 4;
      const it = ((y - 1) * sw + x) * 4;
      const ib = ((y + 1) * sw + x) * 4;
      const dx = lum(ir) - lum(il);
      const dy = lum(ib) - lum(it);
      edges[y * sw + x] = Math.abs(dx) + Math.abs(dy);
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

  // Threshold relative to the peak row/column energy. Invariant to how much
  // of the frame is painting vs. wall, unlike a mean-based threshold which
  // collapses when the painting fills the photo.
  const peakRow = maxOf(rowE);
  const peakCol = maxOf(colE);
  const rowThresh = peakRow * 0.4;
  const colThresh = peakCol * 0.4;

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
    return { x: 0, y: 0, w: W, h: H };
  }

  const pad = Math.round(Math.min(sw, sh) * 0.02);
  top = Math.max(0, top - pad);
  bottom = Math.min(sh - 1, bottom + pad);
  left = Math.max(0, left - pad);
  right = Math.min(sw - 1, right + pad);

  const scale = 1 / ratio;
  return {
    x: Math.round(left * scale),
    y: Math.round(top * scale),
    w: Math.round((right - left + 1) * scale),
    h: Math.round((bottom - top + 1) * scale),
  };
}

function maxOf(arr: Float32Array): number {
  let m = 0;
  for (let i = 0; i < arr.length; i++) if (arr[i] > m) m = arr[i];
  return m;
}

function applyLevels(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const PERCENTILE = 0.005;

  const img = ctx.getImageData(0, 0, w, h);
  const data = img.data;

  const histR = new Uint32Array(256);
  const histG = new Uint32Array(256);
  const histB = new Uint32Array(256);
  for (let i = 0; i < data.length; i += 4) {
    histR[data[i]]++;
    histG[data[i + 1]]++;
    histB[data[i + 2]]++;
  }

  const total = w * h;
  const findPercentile = (hist: Uint32Array, p: number) => {
    const target = total * p;
    let cum = 0;
    for (let v = 0; v < 256; v++) {
      cum += hist[v];
      if (cum >= target) return v;
    }
    return 255;
  };

  const rLo = findPercentile(histR, PERCENTILE);
  const rHi = findPercentile(histR, 1 - PERCENTILE);
  const gLo = findPercentile(histG, PERCENTILE);
  const gHi = findPercentile(histG, 1 - PERCENTILE);
  const bLo = findPercentile(histB, PERCENTILE);
  const bHi = findPercentile(histB, 1 - PERCENTILE);

  const stretchOrPass = (v: number, lo: number, hi: number) => {
    if (hi - lo < 8) return v;
    const out = ((v - lo) * 255) / (hi - lo);
    return out < 0 ? 0 : out > 255 ? 255 : out;
  };

  for (let i = 0; i < data.length; i += 4) {
    data[i] = stretchOrPass(data[i], rLo, rHi);
    data[i + 1] = stretchOrPass(data[i + 1], gLo, gHi);
    data[i + 2] = stretchOrPass(data[i + 2], bLo, bHi);
  }
  ctx.putImageData(img, 0, 0);
}
