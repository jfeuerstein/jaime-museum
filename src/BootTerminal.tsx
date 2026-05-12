import { useEffect, useState } from 'react';

// Lines run sequentially with a small delay between each, mimicking a
// dependency-resolving / scene-initializing terminal. Total runtime ~3s, after
// which the whole overlay fades out and the 3D scene (which mounted in
// parallel) becomes visible.
const SCRIPT: { text: string; delay: number }[] = [
  { text: '> museum --init', delay: 280 },
  { text: '[ok] seeded procedural rng', delay: 200 },
  { text: '[ok] allocated 26x26 floorplan grid', delay: 220 },
  { text: '[..] carving rooms + corridors', delay: 320 },
  { text: '       resolved 14 rooms · 3 cross-links', delay: 200 },
  { text: '[..] loading frames/*.png', delay: 280 },
  { text: '       (6/6) cached', delay: 200 },
  { text: '[ok] generating procedural artwork', delay: 240 },
  { text: '[ok] compiled shader programs', delay: 220 },
  { text: '[ok] mounted fixtures and lighting', delay: 200 },
  { text: '[..] bleegle bloop', delay: 280 },
  { text: '       (6/7) blop', delay: 200 },
  { text: '[ok] cataloged exhibits', delay: 240 },
  { text: '', delay: 80 },
  { text: 'ready.', delay: 0 },
];

type Props = { onDone: () => void };

export function BootTerminal({ onDone }: Props) {
  const [lines, setLines] = useState<string[]>([]);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const acc: string[] = [];
    (async () => {
      for (const item of SCRIPT) {
        if (cancelled) return;
        acc.push(item.text);
        setLines([...acc]);
        await new Promise((r) => setTimeout(r, item.delay));
      }
      // brief lingering on "ready." before fading to scene
      await new Promise((r) => setTimeout(r, 600));
      if (cancelled) return;
      setFading(true);
      // matches the CSS opacity transition duration
      await new Promise((r) => setTimeout(r, 750));
      if (cancelled) return;
      onDone();
    })();
    return () => {
      cancelled = true;
    };
  }, [onDone]);

  return (
    <div className={`boot ${fading ? 'boot-fading' : ''}`} aria-hidden>
      <div className="boot-inner">
        {lines.map((l, i) => {
          const isLast = i === lines.length - 1;
          return (
            <div key={i} className="boot-line">
              {l}
              {!fading && isLast && <span className="boot-cursor" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
