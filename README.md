# Jaime's Museum

A procedurally generated 3D museum that displays Jaime's artwork. The
floorplan is rebuilt each visit from a random seed, paintings hang in
ornate (and slightly pixelated) frames, and each piece is paired with a
thematically related public-domain poem chosen by tag overlap. Movement
is dungeon-crawler style: step forward one cell at a time, turn in 90°
increments. Click a painting to view it at high resolution alongside its
poem and citation.

## Tech

- **Vite** + **React** + **TypeScript**
- **three.js** via **@react-three/fiber** and **@react-three/drei**

## Running locally

```sh
npm install
npm run dev
```

Then open <http://localhost:5180>.

A short terminal-style boot animation plays while the WebGL scene warms
up, then the controls slide from the centre of the screen into the
bottom-left corner. Controls: <kbd>W</kbd>/<kbd>↑</kbd> to step forward,
<kbd>S</kbd>/<kbd>↓</kbd> to step back, <kbd>A</kbd>/<kbd>D</kbd> or
<kbd>←</kbd>/<kbd>→</kbd> to turn 90°, click a painting to view it,
<kbd>Esc</kbd> or click outside to return.

## Project structure

```
src/
  App.tsx, App.css     — root component, global styles, boot overlay
  generate.ts          — procedural floorplan generator (rooms + corridors)
  Museum.tsx           — per-room merged geometry for floors / ceilings / walls
  roomStyle.ts         — per-room wall/floor textures, palette, lighting tone
  Fixtures.tsx         — pendant / ceiling-row / floor-lamp / skylight + sconces,
                          all with the room's only point light + soft glow decals
  Decor.tsx            — low-poly benches and plants
  Painting.tsx         — frame mesh, painting plane, placard; loads + processes
                          each artwork (auto-crop + per-channel levels)
  processArtwork.ts    — Sobel edge-energy bbox detection + histogram stretch
  artwork.ts           — the curated list of paintings (src, aspect, tags)
  poems.ts             — public-domain poem pool with subject tags + seeded picker
  PaintingViewer.tsx   — overlay shown on painting click
  Player.tsx           — grid-locked camera controller with smooth lerp
  BootTerminal.tsx     — initial scripted "boot" overlay
  ControlsHUD.tsx      — three-phase HUD (hidden → central → corner)
  Fixtures.tsx, etc.
public/
  art/                 — Jaime's paintings, served at /art/*
  frames/              — frame PNGs with transparent centres
```

## Adding new artwork

Source images live in `public/art-original/` (the untouched gallery photos)
and the museum serves preprocessed copies from `public/art/`. Preprocessing
runs offline: it auto-crops to the painting's content rectangle, downscales
to ≤2048 on the long side (every GPU's `MAX_TEXTURE_SIZE` safety zone),
applies a per-channel histogram stretch to remove warm-wall casts, and
saves the result as WebP at quality 88.

To add a piece:

1. Drop the photo into `public/art-original/` with the next free number
   (e.g. `20.png`).
2. Run the preprocessor:

   ```sh
   node scripts/preprocess-art.mjs
   ```

   It writes `public/art/20.webp` (and re-processes every other image — fast,
   takes a couple of seconds total).

3. Append an entry to `ARTWORK` in `src/artwork.ts`:

   ```ts
   { src: '/art/20.webp', aspect: 0.78, tags: ['figure', 'sacred'] },
   ```

   - `aspect` is `width / height` of the **preprocessed** image (the
     preprocessor logs the output dimensions).
   - `tags` decide which poem candidates the viewer chooses from. Re-use
     existing tags so they intersect with the entries in `src/poems.ts`:
     `figure`, `body`, `portrait`, `identity`, `masculine`, `youth`,
     `sacred`, `mortality`, `hero`, `mask`, `fantasy`, `animal`, `cosmos`,
     `collage`, `whimsy`.

4. Commit `public/art-original/<n>.png`, `public/art/<n>.webp`, and the
   updated `src/artwork.ts`. The new piece appears in the next deploy.

## Deploying with Vercel

Vercel auto-detects Vite and uses sensible defaults (`npm run build`,
output in `dist/`), so there's no `vercel.json` to write.

### One-time setup (CLI)

```sh
npm i -g vercel
vercel login
```

### Deploying

From the project root:

```sh
vercel             # first run prompts you to link / create a project; produces a preview URL
vercel --prod      # promote to production (your real domain)
```

Vercel's first run asks a few questions:

- **Set up and deploy?** → yes
- **Which scope?** → your account or team
- **Link to existing project?** → no (first time)
- **Project name** → anything you like
- **In which directory is your code located?** → `./`
- It auto-detects "Vite" as the framework — accept the defaults
  (build command `vite build`, output directory `dist`).

A `.vercel/` folder is created locally to remember the project link
(it's already in the default `.gitignore`).

### Or via the Vercel dashboard

1. Push the repo to GitHub / GitLab / Bitbucket.
2. On <https://vercel.com>, "New Project" → import the repo.
3. Framework Preset: **Vite** (auto-detected).
4. Build Command: `npm run build` · Output Directory: `dist` (defaults).
5. Click **Deploy**.

Subsequent pushes to the connected branch trigger automatic deploys; pull
requests get preview URLs.

### Adding art after deployment

There's no admin UI in the deployed build — Jaime's art list is
compile-time data. To add new pieces:

1. Drop the image in `public/art/`.
2. Append the entry in `src/artwork.ts`.
3. Commit and push (or `vercel --prod`).

That's the entire content-management workflow.
