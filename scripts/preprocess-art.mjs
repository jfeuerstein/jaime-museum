// One-shot preprocessing for /public/art. For each image in
// public/art-original/:
//
//   1) Detect the painting's four corners via Sobel edges + boundary-point
//      sampling + PCA line fitting on each side. If the four lines form a
//      convex quadrilateral with small fit residuals, treat the painting
//      as rectangular and apply a perspective warp to make it actually
//      rectangular. Otherwise fall back to an axis-aligned bbox crop using
//      the same edge-energy projection we've used previously.
//
//   2) Downscale so the long side is at most MAX_OUTPUT_DIM. Keeps every
//      device's MAX_TEXTURE_SIZE inside its limit.
//
//   3) Encode as high-quality WebP (q92) so detail is preserved while files
//      stay small enough to deploy comfortably.
//
// No tone/levels manipulation any more — the goal is to keep the painting's
// original colour as faithfully as possible.
//
// Run with:  node scripts/preprocess-art.mjs

import sharp from 'sharp';
import { readdir } from 'node:fs/promises';
import { join, basename, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const ART_DIR = join(ROOT, 'public', 'art');
const ORIG_DIR = join(ROOT, 'public', 'art-original');

const MAX_OUTPUT_DIM = 2560;        // ≥ 2048 (WebGL2 min) with headroom
const ANALYSIS_LONG_SIDE = 512;     // downsample for the edge/corner pass
const EDGE_THRESH_FRAC = 0.18;      // edge magnitude as fraction of peak
const BBOX_PEAK_THRESH = 0.4;       // for the axis-aligned bbox fallback
const QUAD_RESIDUAL_LIMIT = 4.0;    // px residual on the analysis grid
const QUAD_AREA_FRACTION = 0.25;    // quad must cover ≥ this of the image
const WEBP_QUALITY = 92;
const BBOX_PAD_FRACTION = 0.015;

// -----------------------------------------------------------------------------
// Step 1: edge map on a downsampled grayscale copy.

async function loadAnalysisData(srcPath) {
  const meta = await sharp(srcPath).metadata();
  const W = meta.width;
  const H = meta.height;
  const ratio = ANALYSIS_LONG_SIDE / Math.max(W, H);
  const sw = Math.max(16, Math.round(W * ratio));
  const sh = Math.max(16, Math.round(H * ratio));

  const { data: gray } = await sharp(srcPath)
    .resize(sw, sh, { fit: 'fill' })
    .removeAlpha()
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Two separate gradient maps so the boundary sampler can vote with the
  // gradient that *should* run perpendicular to the side it's looking for:
  //   absDy → strong horizontal edges → top / bottom of the painting
  //   absDx → strong vertical   edges → left / right of the painting
  // Combining them (|dx|+|dy|) lets easel arms and neighbour-frame edges
  // pollute the boundary fit.
  const absDx = new Float32Array(sw * sh);
  const absDy = new Float32Array(sw * sh);
  for (let y = 1; y < sh - 1; y++) {
    for (let x = 1; x < sw - 1; x++) {
      const i = y * sw + x;
      absDx[i] = Math.abs(gray[i + 1] - gray[i - 1]);
      absDy[i] = Math.abs(gray[i + sw] - gray[i - sw]);
    }
  }
  // Combined map only used for the bbox fallback.
  const edges = new Float32Array(sw * sh);
  let peak = 0;
  let peakDx = 0;
  let peakDy = 0;
  for (let i = 0; i < edges.length; i++) {
    edges[i] = absDx[i] + absDy[i];
    if (edges[i] > peak) peak = edges[i];
    if (absDx[i] > peakDx) peakDx = absDx[i];
    if (absDy[i] > peakDy) peakDy = absDy[i];
  }

  return { W, H, sw, sh, ratio, edges, peak, absDx, absDy, peakDx, peakDy };
}

// -----------------------------------------------------------------------------
// Step 2: try to detect a confident 4-corner quadrilateral.

function fitLine(pts) {
  if (pts.length < 5) return null;
  let mx = 0;
  let my = 0;
  for (const p of pts) {
    mx += p.x;
    my += p.y;
  }
  mx /= pts.length;
  my /= pts.length;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (const p of pts) {
    const dx = p.x - mx;
    const dy = p.y - my;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }
  // Eigenvector of the 2x2 covariance for the smaller eigenvalue = line normal
  const trace = sxx + syy;
  const det = sxx * syy - sxy * sxy;
  const disc = Math.max(0, (trace * trace) / 4 - det);
  const lambdaSmall = trace / 2 - Math.sqrt(disc);
  let nx;
  let ny;
  if (Math.abs(sxy) > 1e-6) {
    nx = lambdaSmall - syy;
    ny = sxy;
  } else if (sxx < syy) {
    nx = 1;
    ny = 0;
  } else {
    nx = 0;
    ny = 1;
  }
  const norm = Math.hypot(nx, ny) || 1;
  nx /= norm;
  ny /= norm;
  const c = nx * mx + ny * my;

  let residual = 0;
  for (const p of pts) residual += Math.abs(nx * p.x + ny * p.y - c);
  residual /= pts.length;

  return { nx, ny, c, residual };
}

function intersect(a, b) {
  const det = a.nx * b.ny - a.ny * b.nx;
  if (Math.abs(det) < 1e-6) return null;
  return {
    x: (a.c * b.ny - a.ny * b.c) / det,
    y: (a.nx * b.c - a.c * b.nx) / det,
  };
}

function quadArea(p) {
  // Shoelace for {tl, tr, br, bl}
  return (
    Math.abs(
      p.tl.x * p.tr.y -
        p.tr.x * p.tl.y +
        p.tr.x * p.br.y -
        p.br.x * p.tr.y +
        p.br.x * p.bl.y -
        p.bl.x * p.br.y +
        p.bl.x * p.tl.y -
        p.tl.x * p.bl.y,
    ) / 2
  );
}

function isConvex(p) {
  const order = [p.tl, p.tr, p.br, p.bl];
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const a = order[i];
    const b = order[(i + 1) % 4];
    const c = order[(i + 2) % 4];
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (cross !== 0) {
      const s = cross > 0 ? 1 : -1;
      if (sign === 0) sign = s;
      else if (s !== sign) return false;
    }
  }
  return true;
}

// RANSAC line fit: tolerant of outliers (easel arms, neighbouring frames,
// wall objects). Iterates a few hundred times picking two random points,
// scores the implied line by inlier count within a small distance, and
// returns the best inlier-set's least-squares fit.
function ransacLine(pts, distThresh, iterations) {
  if (pts.length < 10) return null;
  let bestInliers = [];
  for (let iter = 0; iter < iterations; iter++) {
    const i = Math.floor(Math.random() * pts.length);
    let j = Math.floor(Math.random() * pts.length);
    if (j === i) j = (j + 1) % pts.length;
    const a = pts[i];
    const b = pts[j];
    let nx = b.y - a.y;
    let ny = -(b.x - a.x);
    const norm = Math.hypot(nx, ny);
    if (norm < 1e-6) continue;
    nx /= norm;
    ny /= norm;
    const c = nx * a.x + ny * a.y;
    const inliers = [];
    for (const p of pts) {
      if (Math.abs(nx * p.x + ny * p.y - c) <= distThresh) inliers.push(p);
    }
    if (inliers.length > bestInliers.length) bestInliers = inliers;
  }
  if (bestInliers.length < Math.max(15, pts.length * 0.3)) return null;
  return fitLine(bestInliers);
}

function detectQuad(analysis) {
  const { sw, sh, absDx, absDy, peakDx, peakDy } = analysis;
  if (peakDx === 0 || peakDy === 0) return null;
  const tDx = peakDx * EDGE_THRESH_FRAC;
  const tDy = peakDy * EDGE_THRESH_FRAC;

  const marginCol = Math.max(2, Math.round(sw * 0.03));
  const marginRow = Math.max(2, Math.round(sh * 0.03));

  // Boundary point sampler with directional gradient gating.
  //   top    — first row with strong |dy|, scanning down  per column
  //   bottom — first row with strong |dy|, scanning up    per column
  //   left   — first col with strong |dx|, scanning right per row
  //   right  — first col with strong |dx|, scanning left  per row
  const topPts = [];
  const bottomPts = [];
  const leftPts = [];
  const rightPts = [];

  for (let x = marginCol; x < sw - marginCol; x++) {
    for (let y = marginRow; y < sh / 2; y++) {
      if (absDy[y * sw + x] > tDy) {
        topPts.push({ x, y });
        break;
      }
    }
    for (let y = sh - 1 - marginRow; y >= sh / 2; y--) {
      if (absDy[y * sw + x] > tDy) {
        bottomPts.push({ x, y });
        break;
      }
    }
  }
  for (let y = marginRow; y < sh - marginRow; y++) {
    for (let x = marginCol; x < sw / 2; x++) {
      if (absDx[y * sw + x] > tDx) {
        leftPts.push({ x, y });
        break;
      }
    }
    for (let x = sw - 1 - marginCol; x >= sw / 2; x--) {
      if (absDx[y * sw + x] > tDx) {
        rightPts.push({ x, y });
        break;
      }
    }
  }

  const minPts = Math.max(20, Math.round(Math.min(sw, sh) * 0.20));
  if (
    topPts.length < minPts ||
    bottomPts.length < minPts ||
    leftPts.length < minPts ||
    rightPts.length < minPts
  ) {
    return null;
  }

  const distT = Math.max(2, Math.round(Math.min(sw, sh) * 0.012));
  const iters = 400;
  const top = ransacLine(topPts, distT, iters);
  const bottom = ransacLine(bottomPts, distT, iters);
  const left = ransacLine(leftPts, distT, iters);
  const right = ransacLine(rightPts, distT, iters);
  if (!top || !bottom || !left || !right) return null;

  if (
    top.residual > QUAD_RESIDUAL_LIMIT ||
    bottom.residual > QUAD_RESIDUAL_LIMIT ||
    left.residual > QUAD_RESIDUAL_LIMIT ||
    right.residual > QUAD_RESIDUAL_LIMIT
  ) {
    return null;
  }

  const tbDot = Math.abs(top.nx * bottom.nx + top.ny * bottom.ny);
  const lrDot = Math.abs(left.nx * right.nx + left.ny * right.ny);
  if (tbDot < 0.9 || lrDot < 0.9) return null;
  const tlDot = Math.abs(top.nx * left.nx + top.ny * left.ny);
  if (tlDot > 0.35) return null;

  const tl = intersect(top, left);
  const tr = intersect(top, right);
  const br = intersect(bottom, right);
  const bl = intersect(bottom, left);
  if (!tl || !tr || !br || !bl) return null;

  for (const c of [tl, tr, br, bl]) {
    if (c.x < -sw * 0.1 || c.x > sw * 1.1 || c.y < -sh * 0.1 || c.y > sh * 1.1) return null;
  }
  if (tl.y > bl.y || tr.y > br.y || tl.x > tr.x || bl.x > br.x) return null;

  const quad = { tl, tr, br, bl };
  const area = quadArea(quad);
  if (area < sw * sh * QUAD_AREA_FRACTION) return null;
  if (!isConvex(quad)) return null;

  const invR = 1 / analysis.ratio;
  return {
    tl: { x: tl.x * invR, y: tl.y * invR },
    tr: { x: tr.x * invR, y: tr.y * invR },
    br: { x: br.x * invR, y: br.y * invR },
    bl: { x: bl.x * invR, y: bl.y * invR },
  };
}

// -----------------------------------------------------------------------------
// Step 3a: axis-aligned bbox fallback (same algorithm as before).

function detectBboxFromEdges(analysis) {
  const { sw, sh, edges, ratio, W, H } = analysis;

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
  const rowT = peakRow * BBOX_PEAK_THRESH;
  const colT = peakCol * BBOX_PEAK_THRESH;

  let top = 0;
  while (top < sh - 1 && rowE[top] < rowT) top++;
  let bottom = sh - 1;
  while (bottom > top && rowE[bottom] < rowT) bottom--;
  let left = 0;
  while (left < sw - 1 && colE[left] < colT) left++;
  let right = sw - 1;
  while (right > left && colE[right] < colT) right--;

  const cropArea = (right - left + 1) * (bottom - top + 1);
  if (cropArea < 0.3 * sw * sh) {
    return { x: 0, y: 0, w: W, h: H };
  }
  const pad = Math.round(Math.min(sw, sh) * BBOX_PAD_FRACTION);
  top = Math.max(0, top - pad);
  bottom = Math.min(sh - 1, bottom + pad);
  left = Math.max(0, left - pad);
  right = Math.min(sw - 1, right + pad);

  const scale = 1 / ratio;
  let x = Math.round(left * scale);
  let y = Math.round(top * scale);
  let w = Math.round((right - left + 1) * scale);
  let h = Math.round((bottom - top + 1) * scale);
  if (x < 0) { w += x; x = 0; }
  if (y < 0) { h += y; y = 0; }
  if (x + w > W) w = W - x;
  if (y + h > H) h = H - y;
  return { x, y, w: Math.max(1, w), h: Math.max(1, h) };
}

// -----------------------------------------------------------------------------
// Step 3b: homography + perspective warp.

// Solve an 8x8 system via Gauss-Jordan; returns [h0..h7], h8=1.
function gaussSolve(A, B) {
  const n = B.length;
  const M = A.map((row, i) => [...row, B[i]]);
  for (let i = 0; i < n; i++) {
    let pivot = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(M[k][i]) > Math.abs(M[pivot][i])) pivot = k;
    }
    if (Math.abs(M[pivot][i]) < 1e-12) return null;
    if (pivot !== i) [M[i], M[pivot]] = [M[pivot], M[i]];
    for (let k = i + 1; k < n; k++) {
      const f = M[k][i] / M[i][i];
      for (let j = i; j <= n; j++) M[k][j] -= f * M[i][j];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = M[i][n];
    for (let j = i + 1; j < n; j++) s -= M[i][j] * x[j];
    x[i] = s / M[i][i];
  }
  return x;
}

// Compute the homography mapping (0..1,0..1) in output space to the four
// source corners in image coords.
function homographyFromCorners(corners) {
  // dst points: TL=(0,0), TR=(1,0), BR=(1,1), BL=(0,1)
  const src = [corners.tl, corners.tr, corners.br, corners.bl];
  const dst = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ];
  const A = [];
  const B = [];
  for (let i = 0; i < 4; i++) {
    const { x: u, y: v } = dst[i];
    const { x: xs, y: ys } = src[i];
    A.push([u, v, 1, 0, 0, 0, -u * xs, -v * xs]);
    B.push(xs);
    A.push([0, 0, 0, u, v, 1, -u * ys, -v * ys]);
    B.push(ys);
  }
  const h = gaussSolve(A, B);
  if (!h) return null;
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}

function estimateAspect(corners) {
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const w = (dist(corners.tl, corners.tr) + dist(corners.bl, corners.br)) / 2;
  const h = (dist(corners.tl, corners.bl) + dist(corners.tr, corners.br)) / 2;
  return w / h;
}

// Bilinear sample from an RGB buffer.
function sampleBilinear(src, sw, sh, fx, fy, out, oi) {
  if (fx < 0 || fy < 0 || fx > sw - 1 || fy > sh - 1) {
    out[oi] = 0;
    out[oi + 1] = 0;
    out[oi + 2] = 0;
    return;
  }
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const x1 = Math.min(sw - 1, x0 + 1);
  const y1 = Math.min(sh - 1, y0 + 1);
  const dx = fx - x0;
  const dy = fy - y0;
  const i00 = (y0 * sw + x0) * 3;
  const i10 = (y0 * sw + x1) * 3;
  const i01 = (y1 * sw + x0) * 3;
  const i11 = (y1 * sw + x1) * 3;
  const w00 = (1 - dx) * (1 - dy);
  const w10 = dx * (1 - dy);
  const w01 = (1 - dx) * dy;
  const w11 = dx * dy;
  for (let c = 0; c < 3; c++) {
    out[oi + c] =
      src[i00 + c] * w00 + src[i10 + c] * w10 + src[i01 + c] * w01 + src[i11 + c] * w11;
  }
}

async function warpToFile(srcPath, corners, outPath) {
  // Load full-resolution source RGB
  const { data: srcRGB, info: srcInfo } = await sharp(srcPath)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const sw = srcInfo.width;
  const sh = srcInfo.height;

  const aspect = estimateAspect(corners);
  let outW;
  let outH;
  if (aspect >= 1) {
    outW = MAX_OUTPUT_DIM;
    outH = Math.max(1, Math.round(MAX_OUTPUT_DIM / aspect));
  } else {
    outH = MAX_OUTPUT_DIM;
    outW = Math.max(1, Math.round(MAX_OUTPUT_DIM * aspect));
  }

  const H = homographyFromCorners(corners);
  if (!H) throw new Error('homography failed');

  const out = Buffer.alloc(outW * outH * 3);
  // For each output pixel, map back to source via H and bilinear-sample.
  for (let y = 0; y < outH; y++) {
    const v = y / (outH - 1);
    for (let x = 0; x < outW; x++) {
      const u = x / (outW - 1);
      const denom = H[6] * u + H[7] * v + H[8];
      const fx = (H[0] * u + H[1] * v + H[2]) / denom;
      const fy = (H[3] * u + H[4] * v + H[5]) / denom;
      sampleBilinear(srcRGB, sw, sh, fx, fy, out, (y * outW + x) * 3);
    }
  }

  await sharp(out, { raw: { width: outW, height: outH, channels: 3 } })
    .webp({ quality: WEBP_QUALITY, effort: 5 })
    .toFile(outPath);

  return { outW, outH, mode: 'warp' };
}

// -----------------------------------------------------------------------------
// Step 3c: simple crop + resize (fallback).

async function cropToFile(srcPath, bbox, outPath) {
  const longSide = Math.max(bbox.w, bbox.h);
  const scale = longSide > MAX_OUTPUT_DIM ? MAX_OUTPUT_DIM / longSide : 1;
  const outW = Math.max(1, Math.round(bbox.w * scale));
  const outH = Math.max(1, Math.round(bbox.h * scale));

  await sharp(srcPath)
    .extract({ left: bbox.x, top: bbox.y, width: bbox.w, height: bbox.h })
    .resize(outW, outH, { fit: 'fill', kernel: 'lanczos3' })
    .webp({ quality: WEBP_QUALITY, effort: 5 })
    .toFile(outPath);

  return { outW, outH, mode: 'crop' };
}

// -----------------------------------------------------------------------------

async function processOne(srcPath, outPath) {
  const analysis = await loadAnalysisData(srcPath);

  // Try perspective rectification first.
  const corners = detectQuad(analysis);
  if (corners) {
    return warpToFile(srcPath, corners, outPath);
  }
  // Fall back to axis-aligned crop.
  const bbox = detectBboxFromEdges(analysis);
  return cropToFile(srcPath, bbox, outPath);
}

async function main() {
  const files = (await readdir(ORIG_DIR))
    .filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
    .sort((a, b) => {
      // sort numerically when possible: 1.png, 2.png, ..., 19.png, painting_*.png
      const an = parseInt(a, 10);
      const bn = parseInt(b, 10);
      if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
      if (Number.isFinite(an)) return -1;
      if (Number.isFinite(bn)) return 1;
      return a.localeCompare(b);
    });

  console.log(`processing ${files.length} files`);
  for (const f of files) {
    const orig = join(ORIG_DIR, f);
    const outName = basename(f, extname(f)) + '.webp';
    const out = join(ART_DIR, outName);
    try {
      const r = await processOne(orig, out);
      console.log(`  ${f.padEnd(20)}  ${r.mode.padEnd(5)}  ${r.outW}x${r.outH}`);
    } catch (err) {
      console.error(`  ${f}: ${err.message}`);
    }
  }
  console.log('done');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
