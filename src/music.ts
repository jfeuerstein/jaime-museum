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
  // { src: '/music/silent-museum.mp3', title: 'Silent Museum', artist: 'Composer' },
];
