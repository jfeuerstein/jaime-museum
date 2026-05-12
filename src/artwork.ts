// Real paintings, served from /public/art. Tags are loose subject themes —
// they're intersected with the tags on each poem in `poems.ts` to pick a
// thematically-related citation per placement.
//
// Images are preprocessed offline (see scripts/preprocess-art.mjs): each is
// auto-cropped or perspective-rectified if it resembles a rectangle, then
// encoded as WebP. Originals live in public/art-original/.
export type ArtDef = {
  src: string;
  /** width / height of the preprocessed image */
  aspect: number;
  /** subject-matter tags used to find a matching poem */
  tags: string[];
};

export const ARTWORK: ArtDef[] = [
  // 1. Nude male figure with halo, charcoal-style on craft paper
  { src: '/art/1.webp', aspect: 0.818, tags: ['figure', 'body', 'masculine', 'sacred', 'light'] },
  // 2. Bearded male portrait with decorative tiles
  { src: '/art/2.webp', aspect: 1.258, tags: ['portrait', 'masculine', 'figure', 'solitude'] },
  // 3. Master Chief / Halo painting, taped to wall
  { src: '/art/3.webp', aspect: 1.638, tags: ['hero', 'fantasy', 'mask', 'masculine'] },
  // 4. "JESUS SAVES" cross + lamb + flag + skull collage
  { src: '/art/4.webp', aspect: 1.353, tags: ['sacred', 'mortality', 'collage', 'ritual'] },
  // 5. Nude figure with halo
  { src: '/art/5.webp', aspect: 0.625, tags: ['figure', 'body', 'sacred', 'masculine', 'light'] },
  // 6. Sun-headed figure in archway with marigolds (Día de Muertos)
  { src: '/art/6.webp', aspect: 0.686, tags: ['mortality', 'sacred', 'mask', 'collage', 'ritual'] },
  // 7. Standing dog with religious collage (Madonna)
  { src: '/art/7.webp', aspect: 0.616, tags: ['animal', 'sacred', 'collage', 'solitude'] },
  // 8. Pencil sketch: figure with skull/triceratops mask
  { src: '/art/8.webp', aspect: 0.859, tags: ['figure', 'mask', 'fantasy', 'dream'] },
  // 9. Self portrait with long hair, charcoal
  { src: '/art/9.webp', aspect: 0.798, tags: ['portrait', 'identity', 'figure', 'solitude'] },
  // 10. Black hole / accretion disk
  { src: '/art/10.webp', aspect: 1.434, tags: ['cosmos', 'mortality', 'dream'] },
  // 11. Comic pages: horse, beach, clouds; "you forgot your floaties"
  { src: '/art/11.webp', aspect: 1.491, tags: ['animal', 'whimsy', 'youth', 'landscape'] },
  // 12. Sketch: child with two swords; "You'll be alright"
  { src: '/art/12.webp', aspect: 0.956, tags: ['youth', 'hero', 'fantasy'] },
  // 13. Pencil sketch: blocky / Minecraft-like figure
  { src: '/art/13.webp', aspect: 0.737, tags: ['fantasy', 'collage', 'dream'] },
  // 14. Spider-Man hanging in web
  { src: '/art/14.webp', aspect: 0.699, tags: ['hero', 'mask', 'fantasy'] },
  // 16. Toddler in chair with red columns / lightning
  { src: '/art/16.webp', aspect: 0.719, tags: ['youth', 'portrait', 'identity'] },
  // 17. Gargoyle face with papel picado borders
  { src: '/art/17.webp', aspect: 0.727, tags: ['mask', 'sacred', 'collage', 'ritual'] },
  // 18. Green cat with antennae
  { src: '/art/18.webp', aspect: 0.525, tags: ['animal', 'whimsy', 'dream'] },
  // 19. "Obituaries" — portrait with Watership Down passage
  { src: '/art/19.webp', aspect: 0.706, tags: ['portrait', 'mortality', 'masculine', 'identity'] },

  // New oil-on-canvas pieces.
  // painting_1: bearded man reading by lamplight
  { src: '/art/painting_1.webp', aspect: 0.743, tags: ['figure', 'masculine', 'portrait', 'solitude', 'domestic', 'light'] },
  // painting_2: white-and-gold still life on dark ground
  { src: '/art/painting_2.webp', aspect: 0.840, tags: ['still_life', 'light', 'dream'] },
  // painting_3: still life with sunflowers, jug, fabric (+ a second canvas peeking below)
  { src: '/art/painting_3.webp', aspect: 0.925, tags: ['still_life', 'collage', 'domestic'] },
  // painting_4: seated woman in white dress on blue ground (after Sargent)
  { src: '/art/painting_4.webp', aspect: 0.740, tags: ['figure', 'portrait', 'identity', 'light'] },
  // painting_5: brown hare under storm-clouded sunset, desert landscape
  { src: '/art/painting_5.webp', aspect: 0.721, tags: ['animal', 'landscape', 'dream', 'solitude'] },
];
