// Track metadata for the cassette player.
// All durations are seconds; values come from `ffprobe`. The MP3
// itself is the source of truth, so once loadedmetadata fires the
// real duration replaces this estimate.

const base = import.meta.env.BASE_URL;

export const TRACKS = [
  {
    id: 'gyrefolk-docks',
    title: 'Gyrefolk Docks',
    album: 'Ominous Augury',
    albumShort: 'OMINOUS',
    number: '01',
    accent: '#ff4d8f', // --ember
    file: `${base}audio/gyrefolk-docks.mp3`,
    duration: 154,
  },
  {
    id: 'corruption-can-be-fun',
    title: 'Corruption Can Be Fun',
    album: 'Ominous Augury',
    albumShort: 'OMINOUS',
    number: '02',
    accent: '#ff4d8f',
    file: `${base}audio/corruption-can-be-fun.mp3`,
    duration: 140,
  },
  {
    id: 'origins-of-the-gyre',
    title: 'Origins Of The Gyre',
    album: 'Origins · Folio I',
    albumShort: 'ORIGINS',
    number: '03',
    accent: '#ffb86b', // --candle
    file: `${base}audio/origins-of-the-gyre-no-intro.mp3`,
    duration: 156,
  },
];

export const SOUNDS = {
  eject: `${base}sounds/tape-eject.mp3`,
  insert: `${base}sounds/tape-insert.mp3`,
};

export function findTrackIndex(id) {
  const i = TRACKS.findIndex((t) => t.id === id);
  return i === -1 ? null : i;
}
