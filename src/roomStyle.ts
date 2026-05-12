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
  floor: string;
  floorAccent: string;
  ceil: string;
  light: string;
  lightI: number;
  lightD: number;
  wallVariant: 'flecks' | 'streaks' | 'plaster' | 'hatch';
  floorVariant: 'planks' | 'tiles' | 'stone' | 'parquet';
};

// A handful of distinct gallery-room moods.
const PALETTES: Palette[] = [
  {
    wall: '#a89478',
    wallAccent: '#7a6850',
    floor: '#3a2e22',
    floorAccent: '#22180f',
    ceil: '#1a1612',
    light: '#ffd9a8',
    lightI: 3.0,
    lightD: 9,
    wallVariant: 'plaster',
    floorVariant: 'planks',
  },
  {
    wall: '#8a8d92',
    wallAccent: '#5d6266',
    floor: '#2c2f31',
    floorAccent: '#16181a',
    ceil: '#15171a',
    light: '#cfe1ff',
    lightI: 2.4,
    lightD: 8,
    wallVariant: 'hatch',
    floorVariant: 'stone',
  },
  {
    wall: '#9a6552',
    wallAccent: '#5e3a2c',
    floor: '#33221a',
    floorAccent: '#1a0f0a',
    ceil: '#1a1210',
    light: '#ffb47a',
    lightI: 2.6,
    lightD: 8,
    wallVariant: 'flecks',
    floorVariant: 'planks',
  },
  {
    wall: '#7a8a78',
    wallAccent: '#4f5e4d',
    floor: '#2a3026',
    floorAccent: '#161a14',
    ceil: '#161a18',
    light: '#e6f0d6',
    lightI: 2.5,
    lightD: 9,
    wallVariant: 'plaster',
    floorVariant: 'tiles',
  },
  {
    wall: '#5c6470',
    wallAccent: '#3a414b',
    floor: '#1f2326',
    floorAccent: '#0f1214',
    ceil: '#10131a',
    light: '#aacfe8',
    lightI: 2.0,
    lightD: 8,
    wallVariant: 'streaks',
    floorVariant: 'stone',
  },
  {
    wall: '#b39d7c',
    wallAccent: '#7c6a4f',
    floor: '#382b1f',
    floorAccent: '#1d150c',
    ceil: '#1a1610',
    light: '#ffe2a8',
    lightI: 3.2,
    lightD: 10,
    wallVariant: 'flecks',
    floorVariant: 'parquet',
  },
  {
    wall: '#9c8870',
    wallAccent: '#6b5b48',
    floor: '#332921',
    floorAccent: '#1a130d',
    ceil: '#181410',
    light: '#fff0d0',
    lightI: 2.8,
    lightD: 9,
    wallVariant: 'hatch',
    floorVariant: 'planks',
  },
];

const CORRIDOR: Palette = {
  wall: '#7d6e5b',
  wallAccent: '#534736',
  floor: '#28221c',
  floorAccent: '#15110d',
  ceil: '#13100c',
  light: '#d9b88a',
  lightI: 1.6,
  lightD: 7,
  wallVariant: 'plaster',
  floorVariant: 'stone',
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
  const w = 256;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const rand = seededRand(seed + 9999);

  ctx.fillStyle = p.floor;
  ctx.fillRect(0, 0, w, h);

  if (p.floorVariant === 'planks') {
    const planks = 4;
    const ph = h / planks;
    for (let i = 0; i < planks; i++) {
      ctx.fillStyle = i % 2 ? p.floor : p.floorAccent;
      ctx.globalAlpha = 0.55;
      ctx.fillRect(0, i * ph, w, ph);
      // grain
      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      for (let g = 0; g < 8; g++) {
        const y = i * ph + 2 + rand() * (ph - 4);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y + (rand() - 0.5) * 2);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    // plank seams
    ctx.strokeStyle = '#000';
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1;
    for (let i = 1; i < planks; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * ph);
      ctx.lineTo(w, i * ph);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (p.floorVariant === 'tiles') {
    const tiles = 4;
    const ts = w / tiles;
    for (let y = 0; y < tiles; y++) {
      for (let x = 0; x < tiles; x++) {
        ctx.fillStyle = (x + y) % 2 ? p.floor : p.floorAccent;
        ctx.fillRect(x * ts, y * ts, ts, ts);
      }
    }
    ctx.strokeStyle = '#000';
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 1;
    for (let i = 1; i < tiles; i++) {
      ctx.beginPath();
      ctx.moveTo(i * ts, 0);
      ctx.lineTo(i * ts, h);
      ctx.moveTo(0, i * ts);
      ctx.lineTo(w, i * ts);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (p.floorVariant === 'parquet') {
    const blocks = 4;
    const bs = w / blocks;
    for (let y = 0; y < blocks; y++) {
      for (let x = 0; x < blocks; x++) {
        const horiz = (x + y) % 2 === 0;
        const stripes = 4;
        for (let s = 0; s < stripes; s++) {
          ctx.fillStyle = s % 2 ? p.floor : p.floorAccent;
          if (horiz) ctx.fillRect(x * bs, y * bs + (s * bs) / stripes, bs, bs / stripes);
          else ctx.fillRect(x * bs + (s * bs) / stripes, y * bs, bs / stripes, bs);
        }
      }
    }
  } else {
    // stone — irregular cells
    for (let i = 0; i < 80; i++) {
      const x = rand() * w;
      const y = rand() * h;
      const r = 6 + rand() * 24;
      ctx.fillStyle = rand() < 0.5 ? p.floor : p.floorAccent;
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // global noise
  const img = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rand() - 0.5) * 22;
    img.data[i] = clamp(img.data[i] + n);
    img.data[i + 1] = clamp(img.data[i + 1] + n);
    img.data[i + 2] = clamp(img.data[i + 2] + n);
  }
  ctx.putImageData(img, 0, 0);

  return c;
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
  floorTex.repeat.set(2, 2);
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
