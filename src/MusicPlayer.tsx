import { useEffect, useMemo, useRef, useState } from 'react';
import { TRACKS, type Track } from './music';

// Tiny background-music player.
//
//   - Small play/pause + skip buttons in the bottom-right corner.
//   - On first play, the track order is shuffled (Fisher–Yates) so each
//     reload picks a different sequence; the playlist still loops once it
//     reaches the end.
//   - Audio is routed through a WebAudio graph that mixes the dry signal
//     with a procedural convolver reverb — adds the sense that the music
//     is in the room with you rather than in your headphones. Reverb wet
//     gain is intentionally low (0.22).
//   - A "now playing" toast slides in from the right whenever a track
//     starts (initial play or after skip / auto-advance).

type ToastState = { track: Track; key: number } | null;
const TOAST_DURATION_MS = 4500;
const REVERB_DURATION = 1.6;     // seconds of decay in the impulse response
const REVERB_DECAY = 2.2;        // exponent on the impulse envelope — higher = darker tail
const WET_GAIN = 0.22;
const DRY_GAIN = 0.92;

function shuffledIndices(n: number): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

function generateImpulseResponse(ctx: BaseAudioContext, seconds: number, decay: number): AudioBuffer {
  const sr = ctx.sampleRate;
  const length = Math.floor(sr * seconds);
  const buf = ctx.createBuffer(2, length, sr);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    // Slight pre-delay (5 ms of silence) before the diffuse tail.
    const preDelay = Math.floor(sr * 0.005);
    for (let i = preDelay; i < length; i++) {
      const t = (i - preDelay) / (length - preDelay);
      // Coloured noise that decays exponentially.
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
    }
  }
  return buf;
}

export function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Lazy-built WebAudio graph. Created on first play because Safari & Chrome
  // require a user gesture before AudioContext can resume.
  const ctxRef = useRef<AudioContext | null>(null);
  const wiredRef = useRef(false);

  // `order` is a shuffled permutation of TRACKS indices. `cursor` is the
  // position within `order`; `currentTrackIdx = order[cursor]`.
  const initialOrder = useMemo(() => shuffledIndices(TRACKS.length), []);
  const [order, setOrder] = useState<number[]>(initialOrder);
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const empty = TRACKS.length === 0;
  const currentTrack: Track | null = empty ? null : TRACKS[order[cursor] ?? 0];

  // Lazy-init the WebAudio graph: <audio> → MediaElementSource → split into
  // dry gain & convolver → wet gain → destination.
  function ensureGraph() {
    if (wiredRef.current) return;
    const audio = audioRef.current;
    if (!audio) return;
    try {
      const W = window as unknown as {
        AudioContext?: typeof AudioContext;
        webkitAudioContext?: typeof AudioContext;
      };
      const Ctor = W.AudioContext || W.webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      ctxRef.current = ctx;
      const source = ctx.createMediaElementSource(audio);
      const dry = ctx.createGain();
      dry.gain.value = DRY_GAIN;
      const wet = ctx.createGain();
      wet.gain.value = WET_GAIN;
      const convolver = ctx.createConvolver();
      convolver.buffer = generateImpulseResponse(ctx, REVERB_DURATION, REVERB_DECAY);
      source.connect(dry);
      source.connect(convolver);
      convolver.connect(wet);
      dry.connect(ctx.destination);
      wet.connect(ctx.destination);
      wiredRef.current = true;
    } catch {
      // If routing through WebAudio fails for any reason we still let the
      // raw <audio> element play through default output.
    }
  }

  // Whenever cursor / playing changes, swap the audio src and start/stop.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    if (audio.src !== window.location.origin + currentTrack.src) {
      audio.src = currentTrack.src;
      audio.load();
    }
    if (playing) {
      ensureGraph();
      const ctx = ctxRef.current;
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
      audio
        .play()
        .then(() => setToast({ track: currentTrack, key: Date.now() }))
        .catch(() => setPlaying(false));
    } else {
      audio.pause();
    }
  }, [cursor, playing, currentTrack]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => window.clearTimeout(t);
  }, [toast]);

  function toggle() {
    if (empty) return;
    setPlaying((p) => !p);
  }

  function skip() {
    if (empty) return;
    setCursor((c) => {
      const next = c + 1;
      if (next >= order.length) {
        // Reshuffle for the next pass so a session doesn't lock to one order.
        setOrder(shuffledIndices(TRACKS.length));
        return 0;
      }
      return next;
    });
    if (!playing) setPlaying(true);
  }

  return (
    <>
      <audio ref={audioRef} onEnded={skip} preload="none" />
      <button
        type="button"
        className="music-btn music-btn-skip"
        onClick={skip}
        disabled={empty}
        aria-label="skip to next track"
        title={empty ? 'no tracks in /music' : 'skip'}
      >
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
          <path d="M3 2 L11 8 L3 14 Z" fill="currentColor" />
          <rect x="11.5" y="2" width="2.5" height="12" fill="currentColor" />
        </svg>
      </button>
      <button
        type="button"
        className={`music-btn ${playing ? 'music-btn-playing' : ''}`}
        onClick={toggle}
        disabled={empty}
        aria-label={playing ? 'pause music' : 'play music'}
        title={empty ? 'no tracks in /music' : playing ? 'pause' : 'play'}
      >
        {playing ? (
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
            <rect x="3" y="2" width="3.5" height="12" fill="currentColor" />
            <rect x="9.5" y="2" width="3.5" height="12" fill="currentColor" />
          </svg>
        ) : (
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
            {toast.track.artist && <div className="music-toast-artist">{toast.track.artist}</div>}
          </>
        )}
      </div>
    </>
  );
}
