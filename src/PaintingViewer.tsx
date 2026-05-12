import { useEffect } from 'react';
import * as THREE from 'three';
import { type Poem } from './poems';

type Props = {
  paintingTex: THREE.Texture | null;
  poem: Poem | null;
  onClose: () => void;
};

export function PaintingViewer({ paintingTex, poem, onClose }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const open = paintingTex !== null && poem !== null;
  const src = paintingTex ? textureToImageURL(paintingTex) : null;

  return (
    <div
      className={`viewer ${open ? 'open' : ''}`}
      onClick={onClose}
      role="dialog"
      aria-hidden={!open}
    >
      <div className="viewer-inner" onClick={(e) => e.stopPropagation()}>
        {src && (
          <div className="viewer-art">
            <img src={src} alt="" />
          </div>
        )}
        {poem && (
          <div className="viewer-desc">
            <pre className="viewer-poem">{poem.text}</pre>
            <p className="viewer-cite">
              — {poem.author}
              {poem.source ? <>, <i>{poem.source}</i></> : null}
              {poem.year ? `, ${poem.year}` : null}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Real artworks are HTMLImageElement-backed (loaded via useTexture); the
// procedural placards/etc. are HTMLCanvasElement. Handle both — for image
// elements we just hand the original src URL to the <img>, for canvases
// we extract a data URL.
function textureToImageURL(tex: THREE.Texture): string | null {
  const src: any = tex.image;
  if (!src) return null;
  if (typeof src.src === 'string' && src.src.length > 0) return src.src;
  if (src instanceof HTMLCanvasElement) return src.toDataURL();
  if (typeof src.toDataURL === 'function') return src.toDataURL();
  return null;
}
