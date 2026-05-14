// Music manifest. Drop audio files into public/music/ and add entries here.
// MP3 / OGG / WebM all fine in modern browsers. The MusicPlayer cycles
// through the list in order on each track end, and a "now playing" toast
// surfaces the title/artist whenever a new track starts.

export type Track = {
  src: string;
  title: string;
  artist?: string;
};

export const TRACKS: Track[] = [
  // Example:
  { src: '/music/Cat.mp3', title: 'Cat', artist: 'C418' },
  { src: '/music/Haggstrom.mp3', title: 'Haggstrom', artist: 'C418' },
  { src: '/music/Mice on Venus.mp3', title: 'Mice on Venus', artist: 'C418' },
  { src: '/music/Subwoofer Lullaby.mp3', title: 'Subwoofer Lullaby', artist: 'C418' },
  { src: '/music/Sweden.mp3', title: 'Sweden', artist: 'C418' },
  { src: '/music/1-10. Break It Down -elp version-.mp3', title: 'Break It Down -elp version-', artist: 'Shoji Meguro' },
  { src: '/music/1-038 7 P.M..mp3', title: '7PM (Animal Crossing New Leaf)', artist: 'Nintendo' },
  { src: '/music/03. Timber Hearth (live).mp3', title: 'Timber Hearth (live)', artist: 'Andrew Prahlow' },
  { src: '/music/21. Zora\'s Domain (Night).mp3', title: 'Zora\'s Domain (Night)', artist: 'Nintendo' },
  { src: '/music/Ideal And The Real.mp3', title: 'Ideal and the Real', artist: 'Shoji Meguro' },
];
