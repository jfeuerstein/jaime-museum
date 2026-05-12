import { readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join } from 'node:path';
import { timingSafeEqual } from 'node:crypto';
import type { Connect, Plugin } from 'vite';
import { loadEnv } from 'vite';
import Busboy from 'busboy';
import { imageSize } from 'image-size';

/**
 * Dev-only Vite middleware that exposes POST /admin/upload.
 *
 *   - Password is read from process.env.MUSEUM_ADMIN_PASSWORD (set it in
 *     `.env.local`). If unset, the endpoint refuses every request.
 *   - Body is multipart/form-data with one or more `file` parts and an
 *     optional `tags` field (comma-separated).
 *   - Each upload is saved under public/art/ with the next free numeric
 *     name, and an entry is appended to src/extraArtwork.json — the main
 *     app's ARTWORK list merges it in, and HMR re-renders automatically.
 *
 * The hook only fires from `configureServer`, so it's gone in production
 * builds. A real deployment would need a proper auth-protected upload
 * service; for now, the workflow is: run dev locally with the password,
 * upload, redeploy the built static site.
 */
export function adminUploadPlugin(): Plugin {
  return {
    name: 'admin-upload',
    apply: 'serve',
    configureServer(server) {
      const root = server.config.root;
      const artDir = join(root, 'public', 'art');
      const extraPath = join(root, 'src', 'extraArtwork.json');

      // loadEnv reads .env, .env.local, .env.[mode], .env.[mode].local in
      // that order — the empty prefix means non-VITE_ keys are returned too,
      // which is what we want for a server-only secret.
      const env = loadEnv(server.config.mode, root, '');

      const handler: Connect.NextHandleFunction = async (req, res, next) => {
        if (req.url !== '/admin/upload' && !req.url?.startsWith('/admin/upload?')) {
          return next();
        }
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'method not allowed' }));
          return;
        }

        const expected = env.MUSEUM_ADMIN_PASSWORD || process.env.MUSEUM_ADMIN_PASSWORD;
        if (!expected || expected.length === 0) {
          res.statusCode = 503;
          res.setHeader('content-type', 'application/json');
          res.end(
            JSON.stringify({
              error: 'admin upload disabled: set MUSEUM_ADMIN_PASSWORD in .env.local',
            }),
          );
          return;
        }
        const provided = (req.headers['x-admin-password'] as string | undefined) ?? '';
        // constant-time compare (pad to the same length)
        const a = Buffer.from(provided);
        const b = Buffer.from(expected);
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          res.statusCode = 401;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ error: 'invalid password' }));
          return;
        }

        let bb: Busboy.Busboy;
        try {
          bb = Busboy({ headers: req.headers });
        } catch (e) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'bad multipart request' }));
          return;
        }

        const collected: { name: string; buf: Buffer }[] = [];
        let tagsField = '';

        bb.on('file', (_field, fileStream, info) => {
          const chunks: Buffer[] = [];
          fileStream.on('data', (c: Buffer) => chunks.push(c));
          fileStream.on('end', () => {
            collected.push({ name: info.filename || 'upload.png', buf: Buffer.concat(chunks) });
          });
          fileStream.on('error', () => {
            // ignored — we report a 500 below if collected is empty
          });
        });

        bb.on('field', (name, val) => {
          if (name === 'tags') tagsField = val;
        });

        bb.on('error', (err: Error) => {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: err.message }));
        });

        bb.on('close', async () => {
          if (collected.length === 0) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'no files received' }));
            return;
          }

          // Find next free numeric filename.
          let nextN = 1;
          try {
            const files = await readdir(artDir);
            const nums = files
              .map((f) => parseInt(f.replace(/\D+/g, ''), 10))
              .filter((n) => Number.isFinite(n));
            if (nums.length) nextN = Math.max(...nums) + 1;
          } catch {
            // dir might not exist on a fresh checkout
          }

          // Load (or create) the extras JSON.
          let extras: Array<{ src: string; aspect: number; tags: string[] }> = [];
          if (existsSync(extraPath)) {
            try {
              extras = JSON.parse(await readFile(extraPath, 'utf-8'));
              if (!Array.isArray(extras)) extras = [];
            } catch {
              extras = [];
            }
          }

          const tags = tagsField
            .split(',')
            .map((t) => t.trim().toLowerCase())
            .filter(Boolean);

          const added: Array<{ src: string; aspect: number }> = [];
          for (const { name, buf } of collected) {
            const ext = (extname(name) || '.png').toLowerCase();
            const safeExt = /^\.(png|jpe?g|webp|gif|avif)$/.test(ext) ? ext : '.png';
            const filename = `${nextN}${safeExt}`;
            nextN += 1;
            const dest = join(artDir, filename);
            await writeFile(dest, buf);

            let aspect = 1;
            try {
              const dims = imageSize(buf);
              if (dims.width && dims.height) aspect = dims.width / dims.height;
            } catch {
              // fall back to 1.0; the runtime image-aspect derivation in
              // Painting.tsx will still kick in once the image is on the GPU.
            }

            const entry = { src: `/art/${filename}`, aspect, tags: tags.slice() };
            extras.push(entry);
            added.push({ src: entry.src, aspect });
          }

          await writeFile(extraPath, JSON.stringify(extras, null, 2) + '\n', 'utf-8');

          res.statusCode = 200;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ ok: true, added }));
        });

        req.pipe(bb);
      };

      server.middlewares.use(handler);
    },
  };
}
