import { useEffect, useState } from 'react';

type Phase = 'hidden' | 'central' | 'corner';

type Props = { booting: boolean };

// Three-phase HUD:
//   hidden  — invisible while the boot overlay covers the screen
//   central — large + viewport-centered as the boot fades away
//   corner  — eased into the bottom-left and parked there permanently
export function ControlsHUD({ booting }: Props) {
  const [phase, setPhase] = useState<Phase>('hidden');

  useEffect(() => {
    if (booting) {
      setPhase('hidden');
      return;
    }
    setPhase('central');
    const t = setTimeout(() => setPhase('corner'), 2400);
    return () => clearTimeout(t);
  }, [booting]);

  return (
    <div className={`hud hud-${phase}`}>
      <div className="hud-line">↑ / W — step forward</div>
      <div className="hud-line">↓ / S — step back</div>
      <div className="hud-line">← → / A D — turn 90°</div>
      <div className="hud-line">click a painting to view</div>
      <div className="hud-line">esc / click outside — return</div>
    </div>
  );
}
