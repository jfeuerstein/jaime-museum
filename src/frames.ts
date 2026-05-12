// Frame metadata. naturalInnerAspect is the approximate (w/h) of the transparent
// hole at the center of the PNG — used to pick which frame best matches a given
// painting aspect at placement time. Actual inner bbox is detected from pixels
// at render time so the frame wraps the painting precisely.
export type FrameDef = {
  src: string;
  naturalInnerAspect: number;
};

export const FRAMES: FrameDef[] = [
  { src: '/frames/frame1.png', naturalInnerAspect: 0.75 },
  { src: '/frames/frame2.webp', naturalInnerAspect: 0.83 },
  { src: '/frames/frame3.png', naturalInnerAspect: 1.76 },
  { src: '/frames/frame4.png', naturalInnerAspect: 1.0 },
  { src: '/frames/frame5.webp', naturalInnerAspect: 1.83 },
  { src: '/frames/frame6.png', naturalInnerAspect: 2.64 },
];
