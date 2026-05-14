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
    albumId: 'ominous',
    albumShort: 'OMINOUS',
    number: '01',
    side: 'A',
    accent: '#ff4d8f', // --ember
    file: `${base}audio/gyrefolk-docks.mp3`,
    duration: 154,
  },
  {
    id: 'corruption-can-be-fun',
    title: 'Corruption Can Be Fun',
    album: 'Ominous Augury',
    albumId: 'ominous',
    albumShort: 'OMINOUS',
    number: '02',
    side: 'B',
    accent: '#ff4d8f',
    file: `${base}audio/corruption-can-be-fun.mp3`,
    duration: 140,
  },
  {
    id: 'origins-of-the-gyre',
    title: 'Origins Of The Gyre',
    album: 'Origins · Folio I',
    albumId: 'origins',
    albumShort: 'ORIGINS',
    number: '03',
    side: 'A',
    accent: '#ffb86b', // --candle
    file: `${base}audio/origins-of-the-gyre-no-intro.mp3`,
    duration: 156,
  },
];

export const SOUNDS = {
  eject: `${base}sounds/tape-eject.mp3`,
  insert: `${base}sounds/tape-insert.mp3`,
};

// The "blank tape" placeholder for cassettes that only have one
// recorded side (e.g. Origins · Folio I). Flipping a single-side
// cassette reveals this — title-less, no audio, lilac accent.
export const BLANK_SIDE = {
  id: '__blank__',
  title: '— Blank —',
  album: '',
  albumId: '',
  albumShort: '—',
  number: '·',
  side: 'B',
  accent: '#c4a8ff',
  file: null,
  duration: 0,
  blank: true,
};

export function findTrackIndex(id) {
  const i = TRACKS.findIndex((t) => t.id === id);
  return i === -1 ? null : i;
}

// Return the other side of the same album, or null if this track
// is a single (no B-side recorded).
export function findAlbumMate(trackId) {
  const t = TRACKS.find((x) => x.id === trackId);
  if (!t) return null;
  return TRACKS.find((x) => x.albumId === t.albumId && x.id !== t.id) || null;
}
