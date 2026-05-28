import { useEffect, useState } from 'react';

type Phase = 'hidden' | 'central' | 'corner';

type Props = { booting: boolean };

// Detect a phone. Covers iOS Safari, Android Chrome, in-app browsers. Two
// independent signals — either one is enough:
//   • User-agent matches a known phone token.
//   • The device reports both a coarse pointer AND a phone-sized viewport.
// Plain desktops resized narrow stay on the regular HUD path because their
// pointer is fine and their UA is desktop.
function isPhone(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  const mobileUa = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua);
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const small = window.matchMedia('(max-width: 768px)').matches;
  return mobileUa || (coarse && small);
}

// Three-phase HUD on desktop:
//   hidden  — invisible while the boot overlay covers the screen
//   central — large + viewport-centered as the boot fades away
//   corner  — eased into the bottom-left and parked there permanently
//
// On phones the museum's keyboard-driven controls are useless, so we replace
// the whole HUD with a static centred apology that never animates anywhere.
export function ControlsHUD({ booting }: Props) {
  const [phase, setPhase] = useState<Phase>('hidden');
  const [phone] = useState<boolean>(() => isPhone());

  useEffect(() => {
    if (phone) return; // phone branch never transitions
    if (booting) {
      setPhase('hidden');
      return;
    }
    setPhase('central');
    const t = setTimeout(() => setPhase('corner'), 2400);
    return () => clearTimeout(t);
  }, [booting, phone]);

  if (phone) {
    return (
      <div
        className="hud hud-mobile"
        aria-label="mobile not supported"
        // Keep visible while the boot overlay is up too — the boot still
        // covers it, but as soon as it fades the message is already there
        // in place, no animation.
      >
        sorry this doesn't work on a phone im not being paid enough for responsive design &lt;3
      </div>
    );
  }

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
