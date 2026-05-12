import * as THREE from 'three';

function seededRand(seed: number) {
  let a = (seed * 9301 + 49297) >>> 0;
  return () => {
    a = (a * 1103515245 + 12345) >>> 0;
    return (a >>> 8) / 16777216;
  };
}

const PALETTES: [string, string, string, string, string][] = [
  ['#1f2937', '#9d4edd', '#ff8800', '#f5e6cf', '#52b788'],
  ['#0a0908', '#22333b', '#a9927d', '#f2f4f3', '#5e503f'],
  ['#264653', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51'],
  ['#3a0ca3', '#7209b7', '#f72585', '#4cc9f0', '#4361ee'],
  ['#283d3b', '#197278', '#edddd4', '#c44536', '#772e25'],
  ['#1b263b', '#415a77', '#778da9', '#e0e1dd', '#0d1b2a'],
  ['#22223b', '#4a4e69', '#9a8c98', '#c9ada7', '#f2e9e4'],
  ['#03071e', '#370617', '#9d0208', '#dc2f02', '#f48c06'],
];

// Generate a simple abstract painting on a canvas, returning a CanvasTexture.
export function makePaintingTexture(seed: number, w = 512, h = 512): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const rand = seededRand(seed);
  const palette = PALETTES[Math.floor(rand() * PALETTES.length)];
  // bg
  ctx.fillStyle = palette[0];
  ctx.fillRect(0, 0, w, h);

  const style = Math.floor(rand() * 4);
  if (style === 0) {
    // bands
    const bands = 4 + Math.floor(rand() * 6);
    for (let i = 0; i < bands; i++) {
      ctx.fillStyle = palette[1 + Math.floor(rand() * 4)];
      const y = (i / bands) * h + (rand() - 0.5) * 20;
      const bh = h / bands + (rand() - 0.5) * 30;
      ctx.fillRect(-10, y, w + 20, bh);
    }
  } else if (style === 1) {
    // shapes
    const shapes = 8 + Math.floor(rand() * 12);
    for (let i = 0; i < shapes; i++) {
      ctx.fillStyle = palette[1 + Math.floor(rand() * 4)];
      const cx = rand() * w;
      const cy = rand() * h;
      const r = 30 + rand() * 120;
      ctx.globalAlpha = 0.6 + rand() * 0.4;
      if (rand() < 0.5) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(cx - r / 2, cy - r / 2, r, r);
      }
    }
    ctx.globalAlpha = 1;
  } else if (style === 2) {
    // gradient + brushy lines
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, palette[1]);
    grad.addColorStop(1, palette[3]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.lineWidth = 4;
    for (let i = 0; i < 60; i++) {
      ctx.strokeStyle = palette[1 + Math.floor(rand() * 4)];
      ctx.globalAlpha = 0.3 + rand() * 0.5;
      ctx.beginPath();
      ctx.moveTo(rand() * w, rand() * h);
      ctx.bezierCurveTo(rand() * w, rand() * h, rand() * w, rand() * h, rand() * w, rand() * h);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else {
    // grid blocks
    const cols = 4 + Math.floor(rand() * 6);
    const rows = 4 + Math.floor(rand() * 6);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        ctx.fillStyle = palette[1 + Math.floor(rand() * 4)];
        ctx.fillRect((x / cols) * w, (y / rows) * h, w / cols + 1, h / rows + 1);
      }
    }
  }

  // subtle noise
  const img = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rand() - 0.5) * 24;
    img.data[i] = Math.max(0, Math.min(255, img.data[i] + n));
    img.data[i + 1] = Math.max(0, Math.min(255, img.data[i + 1] + n));
    img.data[i + 2] = Math.max(0, Math.min(255, img.data[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// Placard with illegible squiggle-text.
export function makePlacardTexture(seed: number): THREE.CanvasTexture {
  const w = 256;
  const h = 96;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const rand = seededRand(seed);
  ctx.fillStyle = '#e8dfc8';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#3a2e22';
  ctx.lineWidth = 2;
  // 3 lines of squiggle
  const lines = 3;
  const margin = 18;
  for (let l = 0; l < lines; l++) {
    const y = margin + ((h - margin * 2) / (lines - 1)) * l;
    let x = margin;
    const lineEnd = w - margin - rand() * 30;
    ctx.beginPath();
    while (x < lineEnd) {
      const wordLen = 12 + rand() * 36;
      const dips = 3 + Math.floor(rand() * 4);
      ctx.moveTo(x, y);
      for (let i = 0; i < dips; i++) {
        const cx1 = x + (wordLen / dips) * (i + 0.3);
        const cy1 = y + (rand() - 0.5) * 6;
        const cx2 = x + (wordLen / dips) * (i + 0.7);
        const cy2 = y + (rand() - 0.5) * 6;
        const ex = x + (wordLen / dips) * (i + 1);
        const ey = y;
        ctx.bezierCurveTo(cx1, cy1, cx2, cy2, ex, ey);
      }
      x += wordLen + 6 + rand() * 10;
    }
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
