// Real paintings, served from /public/art. Tags are loose subject themes —
// they're intersected with the tags on each poem in `poems.ts` to pick a
// thematically-related citation per placement.
//
// Aspect ratios reflect the preprocessed images (see scripts/preprocess-art.mjs).
// Originals are kept in public/art-original/.
export type ArtDef = {
  src: string;
  /** width / height of the preprocessed image */
  aspect: number;
  /** subject-matter tags used to find a matching poem */
  tags: string[];
};

export const ARTWORK: ArtDef[] = [
  // 1. Nude male figure with halo, charcoal-style on craft paper
  { src: '/art/1.webp', aspect: 0.808, tags: ['figure', 'body', 'masculine', 'sacred'] },
  // 2. Bearded male portrait with decorative tiles
  { src: '/art/2.webp', aspect: 1.335, tags: ['portrait', 'masculine', 'figure'] },
  // 3. Master Chief / Halo painting, taped to wall
  { src: '/art/3.webp', aspect: 1.650, tags: ['hero', 'fantasy', 'mask', 'masculine'] },
  // 4. "JESUS SAVES" cross + lamb + flag + skull collage
  { src: '/art/4.webp', aspect: 1.517, tags: ['sacred', 'mortality', 'collage'] },
  // 5. Nude figure with halo
  { src: '/art/5.webp', aspect: 0.637, tags: ['figure', 'body', 'sacred', 'masculine'] },
  // 6. Sun-headed figure in archway with marigolds (Día de Muertos)
  { src: '/art/6.webp', aspect: 0.877, tags: ['mortality', 'sacred', 'mask', 'collage'] },
  // 7. Standing dog with religious collage (Madonna)
  { src: '/art/7.webp', aspect: 0.640, tags: ['animal', 'sacred', 'collage'] },
  // 8. Pencil sketch: figure with skull/triceratops mask
  { src: '/art/8.webp', aspect: 0.856, tags: ['figure', 'mask', 'fantasy'] },
  // 9. Self portrait with long hair, charcoal
  { src: '/art/9.webp', aspect: 0.998, tags: ['portrait', 'identity', 'figure'] },
  // 10. Black hole / accretion disk
  { src: '/art/10.webp', aspect: 0.952, tags: ['cosmos', 'mortality'] },
  // 11. Comic pages: horse, beach, clouds; "you forgot your floaties"
  { src: '/art/11.webp', aspect: 1.467, tags: ['animal', 'whimsy', 'youth'] },
  // 12. Sketch: child with two swords; "You'll be alright"
  { src: '/art/12.webp', aspect: 0.753, tags: ['youth', 'hero', 'fantasy'] },
  // 13. Pencil sketch: blocky / Minecraft-like figure
  { src: '/art/13.webp', aspect: 0.931, tags: ['fantasy', 'collage'] },
  // 14. Spider-Man hanging in web
  { src: '/art/14.webp', aspect: 0.699, tags: ['hero', 'mask', 'fantasy'] },
  // 16. Toddler in chair with red columns / lightning
  { src: '/art/16.webp', aspect: 0.719, tags: ['youth', 'portrait', 'identity'] },
  // 17. Gargoyle face with papel picado borders
  { src: '/art/17.webp', aspect: 0.733, tags: ['mask', 'sacred', 'collage'] },
  // 18. Green cat with antennae
  { src: '/art/18.webp', aspect: 0.523, tags: ['animal', 'whimsy'] },
  // 19. "Obituaries" — portrait with Watership Down passage
  { src: '/art/19.webp', aspect: 0.890, tags: ['portrait', 'mortality', 'masculine', 'identity'] },
];
