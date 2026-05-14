import * as THREE from 'three';

export type RoomStyle = {
  wallTex: THREE.CanvasTexture;
  floorTex: THREE.CanvasTexture;
  ceilColor: string;
  lightColor: string;
  lightIntensity: number;
  lightDistance: number;
};

type Palette = {
  wall: string;
  wallAccent: string;
  /** Dark plank colour visible at the edges of the rug. */
  floor: string;
  /** Rug field colour — the dominant tone inside the border. */
  floorAccent: string;
  /** Rug motif/border colour. Falls back to `floor` if absent. */
  rugMotif?: string;
  /** Rug border/edge colour. Falls back to `floor` if absent. */
  rugBorder?: string;
  ceil: string;
  light: string;
  lightI: number;
  lightD: number;
  wallVariant: 'flecks' | 'streaks' | 'plaster' | 'hatch';
  floorVariant: 'persian' | 'kilim' | 'tribal' | 'floral' | 'runner';
};

// A handful of distinct gallery-room moods. Each one pairs wall tones with a
// rug — `floor` is the dark plank colour beneath, `floorAccent` is the rug's
// field, `rugMotif` / `rugBorder` carry the pattern.
const PALETTES: Palette[] = [
  // 0. warm beige / cream walls — deep ruby persian rug
  {
    wall: '#a89478',
    wallAccent: '#7a6850',
    floor: '#2e231a',
    floorAccent: '#7e2122',
    rugMotif: '#e7d3a8',
    rugBorder: '#3a1418',
    ceil: '#1a1612',
    light: '#ffd9a8',
    lightI: 3.0,
    lightD: 9,
    wallVariant: 'plaster',
    floorVariant: 'persian',
  },
  // 1. cool gray walls — muted blue tribal rug with cream motifs
  {
    wall: '#8a8d92',
    wallAccent: '#5d6266',
    floor: '#23262a',
    floorAccent: '#3f5470',
    rugMotif: '#d4c8a6',
    rugBorder: '#1c2230',
    ceil: '#15171a',
    light: '#cfe1ff',
    lightI: 2.4,
    lightD: 8,
    wallVariant: 'hatch',
    floorVariant: 'tribal',
  },
  // 2. rust / red walls — gold-ochre persian rug
  {
    wall: '#9a6552',
    wallAccent: '#5e3a2c',
    floor: '#2d1d14',
    floorAccent: '#825b1d',
    rugMotif: '#3b1b13',
    rugBorder: '#2a140e',
    ceil: '#1a1210',
    light: '#ffb47a',
    lightI: 2.6,
    lightD: 8,
    wallVariant: 'flecks',
    floorVariant: 'persian',
  },
  // 3. sage walls — forest-green floral rug
  {
    wall: '#7a8a78',
    wallAccent: '#4f5e4d',
    floor: '#1f2520',
    floorAccent: '#3d5a3e',
    rugMotif: '#d8c39a',
    rugBorder: '#1d2a1a',
    ceil: '#161a18',
    light: '#e6f0d6',
    lightI: 2.5,
    lightD: 9,
    wallVariant: 'plaster',
    floorVariant: 'floral',
  },
  // 4. navy / slate walls — geometric kilim with cream stripes
  {
    wall: '#5c6470',
    wallAccent: '#3a414b',
    floor: '#1a1d22',
    floorAccent: '#2c3e58',
    rugMotif: '#c4b88a',
    rugBorder: '#101724',
    ceil: '#10131a',
    light: '#aacfe8',
    lightI: 2.0,
    lightD: 8,
    wallVariant: 'streaks',
    floorVariant: 'kilim',
  },
  // 5. gold / amber walls — burgundy persian-style runner
  {
    wall: '#b39d7c',
    wallAccent: '#7c6a4f',
    floor: '#2b1f15',
    floorAccent: '#6e1e1e',
    rugMotif: '#e9c98a',
    rugBorder: '#26100f',
    ceil: '#1a1610',
    light: '#ffe2a8',
    lightI: 3.2,
    lightD: 10,
    wallVariant: 'flecks',
    floorVariant: 'runner',
  },
  // 6. mellow brown — earth-tone tribal
  {
    wall: '#9c8870',
    wallAccent: '#6b5b48',
    floor: '#241d17',
    floorAccent: '#5d3e26',
    rugMotif: '#c2a279',
    rugBorder: '#1a130d',
    ceil: '#181410',
    light: '#fff0d0',
    lightI: 2.8,
    lightD: 9,
    wallVariant: 'hatch',
    floorVariant: 'tribal',
  },
];

const CORRIDOR: Palette = {
  wall: '#7d6e5b',
  wallAccent: '#534736',
  floor: '#1d1814',
  floorAccent: '#43281f',
  rugMotif: '#a89668',
  rugBorder: '#15100c',
  ceil: '#13100c',
  light: '#d9b88a',
  lightI: 1.6,
  lightD: 7,
  wallVariant: 'plaster',
  floorVariant: 'runner',
};

function seededRand(seed: number) {
  let a = (seed * 9301 + 49297) >>> 0;
  return () => {
    a = (a * 1103515245 + 12345) >>> 0;
    return (a >>> 8) / 16777216;
  };
}

function clamp(v: number) {
  return Math.max(0, Math.min(255, v));
}

function makeWallCanvas(seed: number, p: Palette): HTMLCanvasElement {
  const w = 256;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const rand = seededRand(seed);

  ctx.fillStyle = p.wall;
  ctx.fillRect(0, 0, w, h);

  if (p.wallVariant === 'streaks') {
    ctx.globalAlpha = 0.1;
    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = i % 2 ? p.wallAccent : '#ffffff';
      const x = rand() * w;
      ctx.fillRect(x, 0, 1 + rand() * 2, h);
    }
    ctx.globalAlpha = 1;
  } else if (p.wallVariant === 'hatch') {
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = p.wallAccent;
    ctx.lineWidth = 1;
    for (let i = 0; i < 140; i++) {
      ctx.beginPath();
      const x = rand() * w;
      const y = rand() * h;
      ctx.moveTo(x, y);
      ctx.lineTo(x + 3 + rand() * 5, y + 3 + rand() * 5);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (p.wallVariant === 'flecks') {
    for (let i = 0; i < 300; i++) {
      const x = rand() * w;
      const y = rand() * h;
      const r = 0.5 + rand() * 1.2;
      ctx.fillStyle = rand() < 0.5 ? p.wallAccent : '#ffffff';
      ctx.globalAlpha = 0.1 + rand() * 0.16;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else {
    // plaster — fine, irregular speckle (was too blotchy before)
    for (let i = 0; i < 800; i++) {
      const x = rand() * w;
      const y = rand() * h;
      const r = 0.4 + rand() * 1.4;
      ctx.fillStyle = rand() < 0.5 ? p.wallAccent : '#ffffff';
      ctx.globalAlpha = 0.05 + rand() * 0.08;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Random ageing: hairline cracks and baseboard scuffs. Applied only to a
  // fraction of textures (the random seed varies per room/wall) so each
  // gallery has some pristine walls and some that look lived-in.
  if (rand() < 0.55) {
    // 1–2 hairline cracks starting from an edge and drifting inward.
    const cracks = 1 + (rand() < 0.4 ? 1 : 0);
    ctx.strokeStyle = p.wallAccent;
    ctx.lineWidth = 1;
    for (let k = 0; k < cracks; k++) {
      ctx.globalAlpha = 0.25 + rand() * 0.25;
      // Pick an entry edge and a starting position along it.
      const edge = Math.floor(rand() * 4);
      let cx = edge === 1 ? w - 1 : edge === 3 ? 0 : rand() * w;
      let cy = edge === 0 ? 0 : edge === 2 ? h - 1 : rand() * h;
      // Initial inward direction with some randomness.
      let dx = edge === 1 ? -1 : edge === 3 ? 1 : (rand() - 0.5) * 1.4;
      let dy = edge === 0 ? 1 : edge === 2 ? -1 : (rand() - 0.5) * 1.4;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      const steps = 12 + Math.floor(rand() * 16);
      for (let s = 0; s < steps; s++) {
        const stepLen = 3 + rand() * 8;
        cx += dx * stepLen;
        cy += dy * stepLen;
        // Tiny random angle drift to make the crack look jagged.
        const dAng = (rand() - 0.5) * 0.6;
        const cs = Math.cos(dAng);
        const sn = Math.sin(dAng);
        const ndx = dx * cs - dy * sn;
        const ndy = dx * sn + dy * cs;
        dx = ndx;
        dy = ndy;
        if (cx < 0 || cx >= w || cy < 0 || cy >= h) break;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  if (rand() < 0.4) {
    // Scuff marks along the bottom (baseboard wear). Few faint dark patches.
    const marks = 2 + Math.floor(rand() * 3);
    for (let m = 0; m < marks; m++) {
      const mx = rand() * w;
      const my = h - 4 - rand() * 28;
      const rx = 5 + rand() * 10;
      const ry = 2 + rand() * 4;
      ctx.fillStyle = p.wallAccent;
      ctx.globalAlpha = 0.12 + rand() * 0.18;
      ctx.beginPath();
      ctx.ellipse(mx, my, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  if (rand() < 0.15) {
    // Occasional paint chip — small irregular polygon.
    const cx = rand() * w;
    const cy = rand() * h;
    ctx.fillStyle = p.wallAccent;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    const verts = 5 + Math.floor(rand() * 3);
    for (let v = 0; v < verts; v++) {
      const a = (v / verts) * Math.PI * 2;
      const r = 2 + rand() * 4;
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      if (v === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // global noise
  const img = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rand() - 0.5) * 16;
    img.data[i] = clamp(img.data[i] + n);
    img.data[i + 1] = clamp(img.data[i + 1] + n);
    img.data[i + 2] = clamp(img.data[i + 2] + n);
  }
  ctx.putImageData(img, 0, 0);

  return c;
}

function makeFloorCanvas(seed: number, p: Palette): HTMLCanvasElement {
  // Bigger canvas now that each cell shows one full rug (texture.repeat is
  // set to 1×1 for floors). 512 gives enough detail to see motifs and weave.
  const W = 512;
  const H = 512;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  const rand = seededRand(seed + 9999);

  const motif = p.rugMotif ?? p.floor;
  const border = p.rugBorder ?? p.floor;
  const field = p.floorAccent;

  // 1. Dark plank floor beneath — visible in the gap around the rug.
  ctx.fillStyle = p.floor;
  ctx.fillRect(0, 0, W, H);
  // Faint plank grain on the visible floor strip.
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  for (let i = 0; i < 16; i++) {
    const y = rand() * H;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y + (rand() - 0.5) * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // 2. Rug rectangle — small inset so the plank shows around the edges.
  const inset = 22;
  const RX = inset;
  const RY = inset;
  const RW = W - 2 * inset;
  const RH = H - 2 * inset;
  ctx.fillStyle = field;
  ctx.fillRect(RX, RY, RW, RH);

  // 3. Border band around the rug. Outer thin stripe + inner repeating motif.
  const bw = 22;
  // outer border block
  ctx.fillStyle = border;
  ctx.fillRect(RX, RY, RW, bw);
  ctx.fillRect(RX, RY + RH - bw, RW, bw);
  ctx.fillRect(RX, RY, bw, RH);
  ctx.fillRect(RX + RW - bw, RY, bw, RH);
  // motif dots running along the inside of the border
  ctx.fillStyle = motif;
  const motifStep = 18;
  for (let x = RX + bw / 2; x < RX + RW; x += motifStep) {
    ctx.fillRect(x - 1.5, RY + bw / 2 - 1.5, 3, 3);
    ctx.fillRect(x - 1.5, RY + RH - bw / 2 - 1.5, 3, 3);
  }
  for (let y = RY + bw / 2; y < RY + RH; y += motifStep) {
    ctx.fillRect(RX + bw / 2 - 1.5, y - 1.5, 3, 3);
    ctx.fillRect(RX + RW - bw / 2 - 1.5, y - 1.5, 3, 3);
  }
  // inner pinstripe just inside the border
  ctx.strokeStyle = motif;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(RX + bw + 2, RY + bw + 2, RW - 2 * (bw + 2), RH - 2 * (bw + 2));

  // 4. Field — inside the border. Each variant draws its own pattern.
  const FX = RX + bw + 6;
  const FY = RY + bw + 6;
  const FW = RW - 2 * (bw + 6);
  const FH = RH - 2 * (bw + 6);

  ctx.save();
  ctx.beginPath();
  ctx.rect(FX, FY, FW, FH);
  ctx.clip();

  switch (p.floorVariant) {
    case 'persian':
      drawPersian(ctx, FX, FY, FW, FH, motif, field, border, rand);
      break;
    case 'kilim':
      drawKilim(ctx, FX, FY, FW, FH, motif, field, border);
      break;
    case 'tribal':
      drawTribal(ctx, FX, FY, FW, FH, motif, field, border);
      break;
    case 'floral':
      drawFloral(ctx, FX, FY, FW, FH, motif, field, border);
      break;
    case 'runner':
      drawRunner(ctx, FX, FY, FW, FH, motif, field, border);
      break;
  }
  ctx.restore();

  // 5. Fringe on the short ends — a row of tiny dashes.
  ctx.strokeStyle = motif;
  ctx.lineWidth = 1.4;
  ctx.globalAlpha = 0.85;
  for (let x = RX + 2; x < RX + RW - 2; x += 5) {
    ctx.beginPath();
    ctx.moveTo(x + rand() * 1.2, RY - 4);
    ctx.lineTo(x + rand() * 1.2, RY + 1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + rand() * 1.2, RY + RH - 1);
    ctx.lineTo(x + rand() * 1.2, RY + RH + 4);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // 6. Subtle weave — every other horizontal pixel row darkened by ~6%,
  // every other column lightened, only inside the rug area. Sells "fabric".
  const img = ctx.getImageData(0, 0, W, H);
  const data = img.data;
  for (let y = RY; y < RY + RH; y++) {
    const dark = (y & 1) === 0;
    for (let x = RX; x < RX + RW; x++) {
      const i = (y * W + x) * 4;
      const horizTick = (x & 3) === 0 ? 6 : 0;
      const delta = dark ? -10 - horizTick : 4;
      data[i] = clamp(data[i] + delta);
      data[i + 1] = clamp(data[i + 1] + delta);
      data[i + 2] = clamp(data[i + 2] + delta);
    }
  }
  // Global noise everywhere for grit.
  for (let i = 0; i < data.length; i += 4) {
    const n = (rand() - 0.5) * 14;
    data[i] = clamp(data[i] + n);
    data[i + 1] = clamp(data[i + 1] + n);
    data[i + 2] = clamp(data[i + 2] + n);
  }
  ctx.putImageData(img, 0, 0);

  return c;
}

// -- Rug field patterns -------------------------------------------------------

function drawPersian(
  ctx: CanvasRenderingContext2D,
  fx: number,
  fy: number,
  fw: number,
  fh: number,
  motif: string,
  field: string,
  border: string,
  rand: () => number,
) {
  const cx = fx + fw / 2;
  const cy = fy + fh / 2;
  const medR = Math.min(fw, fh) * 0.28;
  // Outer medallion (motif-coloured)
  ctx.fillStyle = motif;
  ctx.beginPath();
  ctx.ellipse(cx, cy, medR, medR * 0.78, 0, 0, Math.PI * 2);
  ctx.fill();
  // Inner medallion (field again — gives the layered look)
  ctx.fillStyle = field;
  ctx.beginPath();
  ctx.ellipse(cx, cy, medR * 0.65, medR * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Centre stamp
  ctx.fillStyle = motif;
  ctx.beginPath();
  ctx.arc(cx, cy, medR * 0.22, 0, Math.PI * 2);
  ctx.fill();
  // Corner spandrels — quarter-circle motif decorations
  ctx.fillStyle = motif;
  for (const [sx, sy] of [
    [fx, fy],
    [fx + fw, fy],
    [fx + fw, fy + fh],
    [fx, fy + fh],
  ]) {
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.arc(sx, sy, fw * 0.18, 0, Math.PI * 2);
    ctx.fill();
  }
  // Scatter of floral specks in the field
  ctx.fillStyle = border;
  for (let i = 0; i < 70; i++) {
    const x = fx + rand() * fw;
    const y = fy + rand() * fh;
    const dx = x - cx;
    const dy = y - cy;
    if ((dx * dx) / (medR * medR) + (dy * dy) / (medR * 0.78 * medR * 0.78) < 1.05) continue;
    ctx.fillRect(x - 1, y - 1, 2.5, 2.5);
  }
}

function drawKilim(
  ctx: CanvasRenderingContext2D,
  fx: number,
  fy: number,
  fw: number,
  fh: number,
  motif: string,
  field: string,
  border: string,
) {
  const bands = 7;
  const bh = fh / bands;
  for (let b = 0; b < bands; b++) {
    // alternating band ground
    ctx.fillStyle = b % 2 === 0 ? field : border;
    ctx.fillRect(fx, fy + b * bh, fw, bh);
    // diamond row
    const diamonds = 9;
    const dw = fw / diamonds;
    for (let d = 0; d < diamonds; d++) {
      const cx = fx + d * dw + dw / 2;
      const cy = fy + b * bh + bh / 2;
      ctx.fillStyle = b % 2 === 0 ? motif : field;
      ctx.beginPath();
      ctx.moveTo(cx, cy - bh * 0.35);
      ctx.lineTo(cx + dw * 0.4, cy);
      ctx.lineTo(cx, cy + bh * 0.35);
      ctx.lineTo(cx - dw * 0.4, cy);
      ctx.closePath();
      ctx.fill();
      // tiny inner dot
      ctx.fillStyle = b % 2 === 0 ? border : motif;
      ctx.fillRect(cx - 1, cy - 1, 2, 2);
    }
  }
}

function drawTribal(
  ctx: CanvasRenderingContext2D,
  fx: number,
  fy: number,
  fw: number,
  fh: number,
  motif: string,
  field: string,
  border: string,
) {
  const cols = 6;
  const rows = 8;
  const dw = fw / cols;
  const dh = fh / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = fx + c * dw + dw / 2;
      const cy = fy + r * dh + dh / 2;
      const sz = Math.min(dw, dh) * 0.42;
      ctx.fillStyle = (r + c) % 2 === 0 ? motif : border;
      ctx.beginPath();
      ctx.moveTo(cx, cy - sz);
      ctx.lineTo(cx + sz * 0.75, cy);
      ctx.lineTo(cx, cy + sz);
      ctx.lineTo(cx - sz * 0.75, cy);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = (r + c) % 2 === 0 ? field : motif;
      ctx.fillRect(cx - 1.5, cy - 1.5, 3, 3);
    }
  }
}

function drawFloral(
  ctx: CanvasRenderingContext2D,
  fx: number,
  fy: number,
  fw: number,
  fh: number,
  motif: string,
  _field: string,
  border: string,
) {
  const cols = 5;
  const rows = 7;
  const cw = fw / cols;
  const ch = fh / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = fx + c * cw + cw / 2;
      const cy = fy + r * ch + ch / 2;
      const offset = r % 2 === 0 ? 0 : cw / 2;
      const x = cx + offset;
      const petalR = Math.min(cw, ch) * 0.18;
      // 6 petals
      ctx.fillStyle = motif;
      for (let p = 0; p < 6; p++) {
        const a = (p / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * petalR, cy + Math.sin(a) * petalR, petalR * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
      // center
      ctx.fillStyle = border;
      ctx.beginPath();
      ctx.arc(x, cy, petalR * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // vine-like connecting strokes
  ctx.strokeStyle = motif;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.4;
  for (let r = 0; r < rows - 1; r++) {
    ctx.beginPath();
    ctx.moveTo(fx, fy + (r + 0.5) * ch);
    for (let x = fx; x < fx + fw; x += 12) {
      ctx.lineTo(x + 6, fy + (r + 0.5) * ch + Math.sin(x * 0.12) * 4);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawRunner(
  ctx: CanvasRenderingContext2D,
  fx: number,
  fy: number,
  fw: number,
  fh: number,
  motif: string,
  field: string,
  border: string,
) {
  const stripes = 14;
  const sh = fh / stripes;
  for (let s = 0; s < stripes; s++) {
    ctx.fillStyle = s % 3 === 0 ? border : s % 3 === 1 ? field : motif;
    ctx.fillRect(fx, fy + s * sh, fw, sh);
    if (s % 3 === 1) {
      // Chevron line of small triangles inside the field stripe.
      ctx.fillStyle = motif;
      const tw = 14;
      for (let x = fx + tw / 2; x < fx + fw; x += tw) {
        const y0 = fy + s * sh + sh / 2;
        ctx.beginPath();
        ctx.moveTo(x, y0 - sh * 0.32);
        ctx.lineTo(x + tw * 0.5, y0);
        ctx.lineTo(x, y0 + sh * 0.32);
        ctx.lineTo(x - tw * 0.5, y0);
        ctx.closePath();
        ctx.fill();
      }
    }
  }
}

function styleFromPalette(p: Palette, seed: number): RoomStyle {
  const wallCanvas = makeWallCanvas(seed, p);
  const floorCanvas = makeFloorCanvas(seed, p);
  const wallTex = new THREE.CanvasTexture(wallCanvas);
  const floorTex = new THREE.CanvasTexture(floorCanvas);
  for (const t of [wallTex, floorTex]) {
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.LinearMipMapLinearFilter;
    t.anisotropy = 4;
    t.needsUpdate = true;
  }
  // Tile the wall texture twice across each 4m wall face, and the floor twice across each cell.
  // PlaneGeometry UVs are 0..1; setting repeat shrinks the texture so it tiles.
  wallTex.repeat.set(2, 2);
  // Floors render one full rug per cell — no tiling.
  floorTex.repeat.set(1, 1);
  return {
    wallTex,
    floorTex,
    ceilColor: p.ceil,
    lightColor: p.light,
    lightIntensity: p.lightI,
    lightDistance: p.lightD,
  };
}

// Returns one style per room plus one for corridor (at the end).
export function buildRoomStyles(numRooms: number, seed: number): {
  rooms: RoomStyle[];
  corridor: RoomStyle;
} {
  const rooms: RoomStyle[] = [];
  for (let i = 0; i < numRooms; i++) {
    const p = PALETTES[(i + (seed % PALETTES.length)) % PALETTES.length];
    rooms.push(styleFromPalette(p, seed + i * 31));
  }
  const corridor = styleFromPalette(CORRIDOR, seed + 7777);
  return { rooms, corridor };
}
