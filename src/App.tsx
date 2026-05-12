import { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { generateFloorplan } from './generate';
import { placeDecor, placePaintings } from './placements';
import { Museum } from './Museum';
import { Decor } from './Decor';
import { Painting } from './Painting';
import { Player } from './Player';
import { PaintingViewer } from './PaintingViewer';
import { ControlsHUD } from './ControlsHUD';
import { BootTerminal } from './BootTerminal';
import { Fixtures } from './Fixtures';
import { AdminPanel } from './AdminPanel';
import { buildRoomStyles } from './roomStyle';
import { ARTWORK } from './artwork';
import { pickPoem } from './poems';
import type { PaintingPlacement } from './types';
import './App.css';

function App() {
  const seed = useMemo(() => Math.floor(Math.random() * 1_000_000), []);
  const plan = useMemo(() => generateFloorplan(seed), [seed]);
  const paintings = useMemo(() => placePaintings(plan, seed + 1), [plan, seed]);
  const decor = useMemo(() => placeDecor(plan, seed + 2), [plan, seed]);
  const styles = useMemo(() => buildRoomStyles(plan.numRooms, seed + 3), [plan, seed]);

  const [selected, setSelected] = useState<{
    placement: PaintingPlacement;
    tex: THREE.Texture;
  } | null>(null);
  const [booting, setBooting] = useState(true);
  const [adminOpen, setAdminOpen] = useState(
    () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('admin'),
  );

  return (
    <>
      <Canvas
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        dpr={[1, 1.5]}
        camera={{ fov: 70, near: 0.1, far: 500 }}
        style={{ position: 'fixed', inset: 0, background: '#1c1812' }}
      >
        <fog attach="fog" args={['#1c1812', 14, 56]} />
        <ambientLight intensity={1.5} color="#fff1d6" />
        <hemisphereLight args={['#ffeec8', '#1f1a14', 0.7]} />
        <Fixtures plan={plan} styles={styles} paintings={paintings} seed={seed} />
        <Museum plan={plan} roomStyles={styles.rooms} corridorStyle={styles.corridor} />
        <Decor items={decor} />
        {paintings.map((p) => (
          <Painting
            key={p.id}
            placement={p}
            onSelect={(placement, tex) => setSelected({ placement, tex })}
          />
        ))}
        <Player plan={plan} paused={selected !== null || adminOpen} />
      </Canvas>
      <PaintingViewer
        paintingTex={selected?.tex ?? null}
        poem={
          selected
            ? pickPoem(
                ARTWORK[selected.placement.paintingIdx % ARTWORK.length].tags,
                `${seed}:${selected.placement.id}:${selected.placement.paintingIdx}`,
              )
            : null
        }
        onClose={() => setSelected(null)}
      />
      <ControlsHUD booting={booting} />
      {booting && <BootTerminal onDone={() => setBooting(false)} />}
      {adminOpen && (
        <AdminPanel
          onClose={() => {
            setAdminOpen(false);
            const url = new URL(window.location.href);
            url.searchParams.delete('admin');
            window.history.replaceState({}, '', url.toString());
          }}
        />
      )}
    </>
  );
}

export default App;
