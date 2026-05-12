import { useEffect, useRef, useState } from 'react';
import { TRACKS, type Track } from './music';

// Tiny background-music player.
//
//   - A small play/pause button parks in the bottom-right corner.
//   - Clicking it starts the playlist (browsers block autoplay without a
//     user gesture, so the button-press doubles as that gesture).
//   - The "now playing" toast slides in from the right whenever a new
//     track starts, lingers a few seconds, then slides away.
//   - At the end of each track we advance to the next and loop the list.
//
// If TRACKS is empty the button still renders but is disabled — the rest
// of the app keeps working regardless.

type ToastState = { track: Track; key: number } | null;
const TOAST_DURATION_MS = 4500;

export function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const empty = TRACKS.length === 0;

  // Pause / play in response to state, and surface a toast whenever a new
  // track actually starts playing.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || empty) return;
    audio.src = TRACKS[idx].src;
    audio.load();
    if (playing) {
      audio
        .play()
        .then(() => {
          setToast({ track: TRACKS[idx], key: Date.now() });
        })
        .catch(() => {
          // Autoplay blocked — surface failure by flipping state back.
          setPlaying(false);
        });
    }
  }, [idx, playing, empty]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => window.clearTimeout(t);
  }, [toast]);

  function toggle() {
    if (empty) return;
    setPlaying((p) => !p);
  }

  function next() {
    if (empty) return;
    setIdx((i) => (i + 1) % TRACKS.length);
  }

  return (
    <>
      <audio
        ref={audioRef}
        onEnded={() => next()}
        preload="none"
      />
      <button
        type="button"
        className={`music-btn ${playing ? 'music-btn-playing' : ''}`}
        onClick={toggle}
        disabled={empty}
        aria-label={playing ? 'pause music' : 'play music'}
        title={empty ? 'no tracks in /music' : playing ? 'pause' : 'play'}
      >
        {playing ? (
          // pause icon (two bars)
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
            <rect x="3" y="2" width="3.5" height="12" fill="currentColor" />
            <rect x="9.5" y="2" width="3.5" height="12" fill="currentColor" />
          </svg>
        ) : (
          // play icon (triangle)
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
            <path d="M3 2 L13 8 L3 14 Z" fill="currentColor" />
          </svg>
        )}
      </button>
      <div className={`music-toast ${toast ? 'music-toast-show' : ''}`} aria-hidden={!toast}>
        {toast && (
          <>
            <div className="music-toast-label">now playing</div>
            <div className="music-toast-title">{toast.track.title}</div>
            {toast.track.artist && (
              <div className="music-toast-artist">{toast.track.artist}</div>
            )}
          </>
        )}
      </div>
    </>
  );
}
