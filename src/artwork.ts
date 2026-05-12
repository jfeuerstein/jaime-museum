// Real paintings, served from /public/art. Aspects are measured at build
// time. Tags are loose subject themes — they're intersected with the tags
// on each poem in `poems.ts` to pick a thematically-related citation per
// placement.
export type ArtDef = {
  src: string;
  /** width / height of the source image */
  aspect: number;
  /** subject-matter tags used to find a matching poem */
  tags: string[];
};

export const ARTWORK: ArtDef[] = [
  // 1. Nude male figure with halo, charcoal-style on craft paper
  { src: '/art/1.png', aspect: 0.867, tags: ['figure', 'body', 'masculine', 'sacred'] },
  // 2. Bearded male portrait with decorative tiles
  { src: '/art/2.png', aspect: 1.288, tags: ['portrait', 'masculine', 'figure'] },
  // 3. Master Chief / Halo painting, taped to wall
  { src: '/art/3.png', aspect: 1.632, tags: ['hero', 'fantasy', 'mask', 'masculine'] },
  // 4. "JESUS SAVES" cross + lamb + flag + skull collage
  { src: '/art/4.png', aspect: 1.363, tags: ['sacred', 'mortality', 'collage'] },
  // 5. Nude figure with halo
  { src: '/art/5.png', aspect: 0.778, tags: ['figure', 'body', 'sacred', 'masculine'] },
  // 6. Sun-headed figure in archway with marigolds (Día de Muertos)
  { src: '/art/6.png', aspect: 0.847, tags: ['mortality', 'sacred', 'mask', 'collage'] },
  // 7. Standing dog with religious collage (Madonna)
  { src: '/art/7.png', aspect: 0.743, tags: ['animal', 'sacred', 'collage'] },
  // 8. Pencil sketch: figure with skull/triceratops mask
  { src: '/art/8.png', aspect: 0.924, tags: ['figure', 'mask', 'fantasy'] },
  // 9. Self portrait with long hair, charcoal
  { src: '/art/9.png', aspect: 0.998, tags: ['portrait', 'identity', 'figure'] },
  // 10. Black hole / accretion disk
  { src: '/art/10.png', aspect: 1.529, tags: ['cosmos', 'mortality'] },
  // 11. Comic pages: horse, beach, clouds; "you forgot your floaties"
  { src: '/art/11.png', aspect: 1.473, tags: ['animal', 'whimsy', 'youth'] },
  // 12. Sketch: child with two swords; "You'll be alright"
  { src: '/art/12.png', aspect: 0.752, tags: ['youth', 'hero', 'fantasy'] },
  // 13. Pencil sketch: blocky / Minecraft-like figure
  { src: '/art/13.png', aspect: 0.693, tags: ['fantasy', 'collage'] },
  // 14. Spider-Man hanging in web
  { src: '/art/14.png', aspect: 0.700, tags: ['hero', 'mask', 'fantasy'] },
  // 16. Toddler in chair with red columns / lightning
  { src: '/art/16.png', aspect: 0.719, tags: ['youth', 'portrait', 'identity'] },
  // 17. Gargoyle face with papel picado borders
  { src: '/art/17.png', aspect: 0.734, tags: ['mask', 'sacred', 'collage'] },
  // 18. Green cat with antennae
  { src: '/art/18.png', aspect: 0.715, tags: ['animal', 'whimsy'] },
  // 19. "Obituaries" — portrait with Watership Down passage
  { src: '/art/19.png', aspect: 0.761, tags: ['portrait', 'mortality', 'masculine', 'identity'] },
];
