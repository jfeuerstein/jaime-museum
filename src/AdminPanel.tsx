import { useEffect, useRef, useState } from 'react';

// Mounted only when `?admin` is present in the URL. The password is held in
// sessionStorage so a refresh keeps you logged in for the tab session. It's
// sent as the X-Admin-Password header — the actual check runs in the Vite
// plugin in vite-plugin-admin-upload.ts, so the secret never lives in the
// shipped bundle.

const STORAGE_KEY = 'museum-admin-pwd';

type Status =
  | { kind: 'idle' }
  | { kind: 'busy' }
  | { kind: 'ok'; added: { src: string; aspect: number }[] }
  | { kind: 'error'; message: string };

export function AdminPanel({ onClose }: { onClose: () => void }) {
  const [password, setPassword] = useState<string>(() => sessionStorage.getItem(STORAGE_KEY) ?? '');
  const [tags, setTags] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) {
      setStatus({ kind: 'error', message: 'password required' });
      return;
    }
    if (!files || files.length === 0) {
      setStatus({ kind: 'error', message: 'choose at least one file' });
      return;
    }
    setStatus({ kind: 'busy' });
    sessionStorage.setItem(STORAGE_KEY, password);

    const fd = new FormData();
    for (const f of Array.from(files)) fd.append('file', f, f.name);
    if (tags.trim()) fd.append('tags', tags);

    try {
      const res = await fetch('/admin/upload', {
        method: 'POST',
        headers: { 'x-admin-password': password },
        body: fd,
      });
      const text = await res.text();
      let body: any = {};
      try {
        body = JSON.parse(text);
      } catch {
        body = { error: text || 'malformed response' };
      }
      if (!res.ok || !body.ok) {
        setStatus({ kind: 'error', message: body.error || `server returned ${res.status}` });
        return;
      }
      setStatus({ kind: 'ok', added: body.added || [] });
      setFiles(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setStatus({
        kind: 'error',
        message: err instanceof Error ? err.message : 'upload failed',
      });
    }
  }

  return (
    <div className="admin" role="dialog" aria-label="add artwork">
      <div className="admin-card" onClick={(e) => e.stopPropagation()}>
        <div className="admin-head">
          <span>add artwork</span>
          <button type="button" className="admin-close" onClick={onClose} aria-label="close">
            ×
          </button>
        </div>

        <form className="admin-body" onSubmit={submit}>
          <label className="admin-row">
            <span>password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="MUSEUM_ADMIN_PASSWORD"
            />
          </label>

          <label className="admin-row">
            <span>image(s)</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
              multiple
              onChange={(e) => setFiles(e.target.files)}
            />
          </label>

          <label className="admin-row">
            <span>tags</span>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="figure, mortality, mask  (comma-separated)"
            />
          </label>

          <p className="admin-hint">
            Files are saved under <code>public/art/</code> and an entry is appended to{' '}
            <code>src/extraArtwork.json</code>. Vite reloads automatically; the new work
            appears next time a placement is generated (refresh the page to re-seed).
          </p>

          <div className="admin-actions">
            <button type="submit" disabled={status.kind === 'busy'}>
              {status.kind === 'busy' ? 'uploading…' : 'upload'}
            </button>
          </div>

          {status.kind === 'error' && <p className="admin-error">{status.message}</p>}
          {status.kind === 'ok' && (
            <p className="admin-ok">
              added {status.added.length} {status.added.length === 1 ? 'piece' : 'pieces'}:{' '}
              {status.added.map((a) => a.src.replace('/art/', '')).join(', ')}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
