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
import { TRACKS, findTrackIndex } from './tracks.js';

const VIZ_KEY = 'divora:viz';
const TRACK_KEY = 'divora:track';
const AUTO_KEY = 'divora:auto';
const DEFAULT_VIZ = 'reliquary';

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
  });
  if (!cassette) return () => {};

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
      if (autoAdvance) {
        // Walk through the catalog. If at the end, wrap to start.
        const next = (cassette.getIndex() + 1) % TRACKS.length;
        cassette.swapTo(next);
      }
    });

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
      } catch (err) {
        console.warn('Audio play() rejected; user gesture may be required.', err);
      }
    } else {
      a.pause();
      cassette.setPlaying(false);
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

  // — keyboard nav: ← / → cycle tracks when the hero is in view —
  const onKey = (e) => {
    if (e.target instanceof HTMLElement && e.target.matches('input, textarea, [contenteditable]')) {
      return;
    }
    if (e.key === 'ArrowRight') cassette.next();
    else if (e.key === 'ArrowLeft') cassette.prev();
  };
  window.addEventListener('keydown', onKey);

  return () => {
    cancelAnimationFrame(pumpRaf);
    cassette.destroy();
    currentViz.destroy();
    switcher?.removeEventListener('click', onSwitcherClick);
    autoToggle?.removeEventListener('click', onAutoToggle);
    window.removeEventListener('keydown', onKey);
    if (audio) audio.pause();
    if (ctx) ctx.close().catch(() => {});
  };
}

const EJECT_GLITCH_MS = 320; // a bit longer than the eject CSS animation
