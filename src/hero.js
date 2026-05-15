// Hero — owns the audio graph for the whole hero, mounts the
// visualizer + cassette, and coordinates track swaps.
//
// Architecture:
//   One HTMLAudioElement is reused for every track (we change
//   `src` on swap; AnalyserNode connection persists). One
//   AudioContext + AnalyserNode are created lazily on the first
//   play and shared between the visualizer (drives canvas pixels)
//   and the cassette reels (drives rotation speed).
//
// Persistence:
//   - `divora:viz`   — selected visualizer style
//   - `divora:track` — last-played track id (random on first visit)
//   - `divora:auto`  — auto-advance toggle ('1' | '0')

import { mountPrismStage, createSimulatedSpectrum, createAnalyserSpectrum } from './visualizer.js';
import { mountLinearBars, mountParticlePrism, mountHexlattice } from './lab-experiments.js';
import { initCassette } from './cassette.js';
import { initMiniPlayer } from './mini-player.js';
import { TRACKS, findTrackIndex } from './tracks.js';

const VIZ_KEY = 'divora:viz';
const TRACK_KEY = 'divora:track';
const AUTO_KEY = 'divora:auto';
const VOLUME_KEY = 'divora:volume';
const MUTE_KEY = 'divora:mute';
const DEFAULT_VIZ = 'reliquary';
const DEFAULT_VOLUME = 0.9;
const SEEK_STEP_SEC = 10;

const VISUALIZERS = {
  reliquary: (el, getSpec) => mountPrismStage(el, getSpec, { bars: 64 }),
  linear: (el, getSpec) => mountLinearBars(el, getSpec, { bars: 64 }),
  particle: (el, getSpec) => mountParticlePrism(el, getSpec, { count: 400 }),
  hexlattice: (el, getSpec) => mountHexlattice(el, getSpec),
};

const isTest =
  typeof URLSearchParams !== 'undefined' &&
  new URLSearchParams(globalThis.location?.search || '').get('test') === '1';

function pickInitialTrack() {
  // In tests, always start at track 0 so screenshots are deterministic.
  if (isTest) return 0;
  try {
    const saved = globalThis.localStorage?.getItem(TRACK_KEY);
    const idx = saved ? findTrackIndex(saved) : null;
    if (idx !== null) return idx;
  } catch {
    // ignore
  }
  // First-time visitor — pick a random track.
  return Math.floor(Math.random() * TRACKS.length);
}

function loadVizChoice() {
  try {
    const v = globalThis.localStorage?.getItem(VIZ_KEY);
    return v && VISUALIZERS[v] ? v : DEFAULT_VIZ;
  } catch {
    return DEFAULT_VIZ;
  }
}
function saveVizChoice(id) {
  try {
    globalThis.localStorage?.setItem(VIZ_KEY, id);
  } catch {
    // ignore
  }
}
function saveTrackChoice(id) {
  try {
    globalThis.localStorage?.setItem(TRACK_KEY, id);
  } catch {
    // ignore
  }
}
function loadAutoAdvance() {
  try {
    return globalThis.localStorage?.getItem(AUTO_KEY) === '1';
  } catch {
    return false;
  }
}
function saveAutoAdvance(v) {
  try {
    globalThis.localStorage?.setItem(AUTO_KEY, v ? '1' : '0');
  } catch {
    // ignore
  }
}
function loadVolume() {
  try {
    const v = Number(globalThis.localStorage?.getItem(VOLUME_KEY));
    if (Number.isFinite(v) && v >= 0 && v <= 1) return v;
  } catch {
    // ignore
  }
  return DEFAULT_VOLUME;
}
function saveVolume(v) {
  try {
    globalThis.localStorage?.setItem(VOLUME_KEY, String(v));
  } catch {
    // ignore
  }
}
function loadMute() {
  try {
    return globalThis.localStorage?.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}
function saveMute(v) {
  try {
    globalThis.localStorage?.setItem(MUTE_KEY, v ? '1' : '0');
  } catch {
    // ignore
  }
}

export function initHero() {
  const stage = document.querySelector('.hero-stage > div');
  const switcher = document.querySelector('.vis-switcher');
  const autoToggle = document.querySelector('.auto-advance-toggle');
  if (!stage) return () => {};

  // — visualizer source —
  const simulated = createSimulatedSpectrum({ bins: 64 });
  let currentSource = simulated;
  let currentVizId = loadVizChoice();
  let currentViz = VISUALIZERS[currentVizId](stage, currentSource);

  // — cassette + audio graph (audio context built lazily on play) —
  let audio = null;
  let ctx = null;
  let analyser = null;
  let mediaSource = null;
  let audioSource = null; // { read } from createAnalyserSpectrum

  let autoAdvance = loadAutoAdvance();
  if (autoToggle) {
    autoToggle.setAttribute('aria-pressed', String(autoAdvance));
    autoToggle.textContent = `auto · ${autoAdvance ? 'on' : 'off'}`;
  }

  const initialIndex = pickInitialTrack();
  let volume = loadVolume();
  let muted = loadMute();

  const applyVolumeToAudio = () => {
    if (!audio) return;
    audio.volume = volume;
    audio.muted = muted;
  };

  // Mini-player surfaces when the hero scrolls out of view.
  const mini = initMiniPlayer({
    onPlayPause: () => togglePlay().catch(() => {}),
  });
  mini?.setTrack(TRACKS[initialIndex]);

  const cassette = initCassette({
    initialIndex,
    async onSwap({ toIndex }) {
      // Glitch the visualizer in sync with the eject.
      currentViz.triggerGlitch?.(EJECT_GLITCH_MS);
      const wasPlaying = audio && !audio.paused;
      if (audio) {
        audio.pause();
      }
      // Mid-swap, change the source. The AnalyserNode connection is
      // preserved across `src` changes — same MediaElementSource node.
      if (audio) {
        audio.src = TRACKS[toIndex].file;
        audio.load();
      }
      saveTrackChoice(TRACKS[toIndex].id);
      mini?.setTrack(TRACKS[toIndex]);
      return wasPlaying;
    },
    onPlayPause({ forcePlay = false } = {}) {
      togglePlay(forcePlay).catch((e) => {
        console.warn('togglePlay failed', e);
      });
    },
    onNext() {
      cassette.next();
    },
    onSeek(ratio) {
      if (!audio) ensureAudio();
      const d = audio.duration || TRACKS[cassette.getIndex()].duration;
      if (Number.isFinite(d) && d > 0) {
        audio.currentTime = Math.max(0, Math.min(d, ratio * d));
        cassette.setProgress(audio.currentTime, d);
      }
    },
    onFlipAudio(toIndex) {
      // Cassette is mid-flip and asking for the new audio source.
      // toIndex is null when flipping to the blank B-side (no track
      // change required — same recording stays loaded, the visible
      // side is just "showing nothing").
      if (toIndex === null) return;
      const wasPlaying = audio && !audio.paused;
      if (audio) {
        audio.pause();
        audio.src = TRACKS[toIndex].file;
        audio.load();
      }
      saveTrackChoice(TRACKS[toIndex].id);
      mini?.setTrack(TRACKS[toIndex]);
      if (wasPlaying && audio) {
        // Best-effort resume — the ctx is already unlocked since we
        // got here from a user gesture earlier.
        audio.play().catch(() => {});
      }
    },
    onVolume(v) {
      volume = v;
      saveVolume(volume);
      applyVolumeToAudio();
    },
    onMute(m) {
      muted = m;
      saveMute(muted);
      applyVolumeToAudio();
    },
  });
  if (!cassette) return () => {};
  cassette.setVolumeUI(volume, muted);

  // — drive the cassette's reel energy + progress every frame —
  let pumpRaf = 0;
  function pump() {
    if (audioSource) {
      const { kick } = audioSource.read();
      cassette.pumpEnergy(kick);
    }
    if (audio && !audio.paused) {
      cassette.setProgress(audio.currentTime, audio.duration);
    }
    pumpRaf = requestAnimationFrame(pump);
  }
  pumpRaf = requestAnimationFrame(pump);

  function ensureAudio() {
    if (audio) return audio;
    audio = new Audio();
    audio.src = TRACKS[cassette.getIndex()].file;
    audio.preload = 'metadata';
    audio.crossOrigin = 'anonymous';

    audio.addEventListener('ended', () => {
      cassette.setPlaying(false);
      mini?.setPlaying(false);
      if (autoAdvance) {
        // Walk through the catalog. If at the end, wrap to start.
        const next = (cassette.getIndex() + 1) % TRACKS.length;
        cassette.swapTo(next);
      }
    });
    applyVolumeToAudio();

    try {
      const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext;
      ctx = new Ctx();
      mediaSource = ctx.createMediaElementSource(audio);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.85;
      mediaSource.connect(analyser);
      analyser.connect(ctx.destination);
      audioSource = createAnalyserSpectrum(analyser, { bins: 64 });
      currentSource = audioSource.read;
      currentViz.setSource(currentSource);
    } catch (err) {
      console.warn('Web Audio unavailable; staying on simulated spectrum.', err);
    }
    return audio;
  }

  async function togglePlay(forcePlay = false) {
    const a = ensureAudio();
    if (a.paused || forcePlay) {
      try {
        if (ctx?.state === 'suspended') await ctx.resume();
        await a.play();
        cassette.setPlaying(true);
        mini?.setPlaying(true);
      } catch (err) {
        console.warn('Audio play() rejected; user gesture may be required.', err);
      }
    } else {
      a.pause();
      cassette.setPlaying(false);
      mini?.setPlaying(false);
    }
  }

  // — visualizer switcher (existing behavior, retained) —
  const reflectSwitcherUI = () => {
    if (!switcher) return;
    for (const b of switcher.querySelectorAll('button[data-viz]')) {
      b.setAttribute('aria-selected', String(b.dataset.viz === currentVizId));
    }
  };
  reflectSwitcherUI();

  const switchVisualizer = (id) => {
    if (!VISUALIZERS[id] || id === currentVizId) return;
    currentViz.destroy();
    currentVizId = id;
    currentViz = VISUALIZERS[id](stage, currentSource);
    saveVizChoice(id);
    reflectSwitcherUI();
  };

  const onSwitcherClick = (e) => {
    const b = e.target.closest('button[data-viz]');
    if (b) switchVisualizer(b.dataset.viz);
  };
  switcher?.addEventListener('click', onSwitcherClick);

  // — auto-advance toggle —
  const onAutoToggle = () => {
    autoAdvance = !autoAdvance;
    saveAutoAdvance(autoAdvance);
    autoToggle.setAttribute('aria-pressed', String(autoAdvance));
    autoToggle.textContent = `auto · ${autoAdvance ? 'on' : 'off'}`;
  };
  autoToggle?.addEventListener('click', onAutoToggle);

  // — keyboard shortcuts —
  //   Space  play / pause
  //   F      next track
  //   R      previous track (rewind in cassette vernacular)
  //   J / L  seek -10s / +10s
  //   M      toggle mute
  //   (←/→ stay free for the Konami code in lab-hint.js)
  const onKey = (e) => {
    if (e.target instanceof HTMLElement && e.target.matches('input, textarea, [contenteditable]')) {
      return;
    }
    // Repeat events should be honoured for seeking (hold L to scrub
    // forward) but not for one-shot toggles. We only filter out repeat
    // for play/pause + mute.
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    switch (key) {
      case ' ':
      case 'Spacebar': // legacy Edge
        if (e.repeat) return;
        e.preventDefault(); // stop the page scrolling on Space
        onCassettePlayPause();
        return;
      case 'f':
        cassette.next();
        return;
      case 'r':
        cassette.prev();
        return;
      case 'j':
        seekBy(-SEEK_STEP_SEC);
        return;
      case 'l':
        seekBy(SEEK_STEP_SEC);
        return;
      case 'm':
        if (e.repeat) return;
        toggleMute();
        return;
      default:
        return;
    }
  };
  const onCassettePlayPause = () => togglePlay().catch(() => {});
  function seekBy(deltaSec) {
    if (!audio) return; // no-op if user hasn't started playback yet
    const d = audio.duration || TRACKS[cassette.getIndex()].duration;
    if (!Number.isFinite(d) || d <= 0) return;
    audio.currentTime = Math.max(0, Math.min(d, audio.currentTime + deltaSec));
    cassette.setProgress(audio.currentTime, d);
  }
  function toggleMute() {
    muted = !muted;
    saveMute(muted);
    applyVolumeToAudio();
    cassette.setVolumeUI(volume, muted);
  }
  window.addEventListener('keydown', onKey);

  return () => {
    cancelAnimationFrame(pumpRaf);
    cassette.destroy();
    mini?.destroy();
    currentViz.destroy();
    switcher?.removeEventListener('click', onSwitcherClick);
    autoToggle?.removeEventListener('click', onAutoToggle);
    window.removeEventListener('keydown', onKey);
    if (audio) audio.pause();
    if (ctx) ctx.close().catch(() => {});
  };
}

const EJECT_GLITCH_MS = 320; // a bit longer than the eject CSS animation
