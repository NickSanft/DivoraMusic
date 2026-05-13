// Hero — mounts the prism visualizer, wires the now-playing widget
// to the hosted MP3, and swaps the visualizer's spectrum source
// from simulated to AnalyserNode-driven once the user clicks play.
//
// The user can choose one of four visualizer styles (Spectral
// Reliquary, Linear/Subway, Particle Reliquary, Hexlattice) from
// the .vis-switcher tab strip. Selection persists in localStorage.
//
// Autoplay restrictions: AudioContext is created lazily on the
// first play click, then never torn down. Subsequent pause/play
// just toggles the <audio> element. The active visualizer's
// setSource() is called once the audio analyser is ready.

import { mountPrismStage, createSimulatedSpectrum, createAudioSpectrum } from './visualizer.js';
import { mountLinearBars, mountParticlePrism, mountHexlattice } from './lab-experiments.js';

const AUDIO_SRC = `${import.meta.env.BASE_URL}audio/gyrefolk-docks.mp3`;
const STORAGE_KEY = 'divora:viz';
const DEFAULT_VIZ = 'reliquary';

// Registry. Each entry's `mount(el, getSpec)` returns a controller
// with at least { destroy(), setSource(getSpec) }. The hero only
// ever holds one mounted at a time.
const VISUALIZERS = {
  reliquary: (el, getSpec) => mountPrismStage(el, getSpec, { bars: 64 }),
  linear: (el, getSpec) => mountLinearBars(el, getSpec, { bars: 64 }),
  particle: (el, getSpec) => mountParticlePrism(el, getSpec, { count: 400 }),
  hexlattice: (el, getSpec) => mountHexlattice(el, getSpec),
};

const playIcon = `
  <svg width="10" height="12" viewBox="0 0 10 12" aria-hidden="true">
    <polygon points="0,0 0,12 10,6" fill="currentColor" />
  </svg>`;
const pauseIcon = `
  <svg width="10" height="12" viewBox="0 0 10 12" aria-hidden="true">
    <rect x="0" y="0" width="3" height="12" fill="currentColor" />
    <rect x="7" y="0" width="3" height="12" fill="currentColor" />
  </svg>`;

const fmtTime = (sec) => {
  const s = Math.max(0, Math.floor(sec || 0));
  return `${String((s / 60) | 0).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

function loadVizChoice() {
  try {
    const v = globalThis.localStorage?.getItem(STORAGE_KEY);
    return v && VISUALIZERS[v] ? v : DEFAULT_VIZ;
  } catch {
    return DEFAULT_VIZ;
  }
}
function saveVizChoice(id) {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, id);
  } catch {
    // localStorage may be unavailable (private mode, etc.) — non-fatal.
  }
}

export function initHero() {
  const stage = document.querySelector('.hero-stage > div');
  const btn = document.querySelector('.now-playing');
  const playGlyph = document.querySelector('.np-play');
  const barFill = document.querySelector('.np-bar > div');
  const timeEl = document.querySelector('.np-time');
  const switcher = document.querySelector('.vis-switcher');
  if (!stage || !btn || !playGlyph) return () => {};

  // — visualizer state —
  const simulated = createSimulatedSpectrum({ bins: 64 });
  let currentSource = simulated; // swapped to audio source on play
  let currentVizId = loadVizChoice();
  let currentViz = VISUALIZERS[currentVizId](stage, currentSource);

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
    const btnEl = e.target.closest('button[data-viz]');
    if (btnEl) switchVisualizer(btnEl.dataset.viz);
  };
  switcher?.addEventListener('click', onSwitcherClick);

  // — audio + now-playing wiring —
  let audio = null;
  let audioSource = null;
  let duration = 154; // fallback estimate (2:34); replaced once metadata loads

  playGlyph.innerHTML = playIcon;

  const updateProgress = () => {
    if (!audio || !duration) return;
    const pct = Math.min(100, (audio.currentTime / duration) * 100);
    if (barFill) barFill.style.width = `${pct}%`;
    if (timeEl) timeEl.textContent = `${fmtTime(audio.currentTime)} / ${fmtTime(duration)}`;
  };

  const ensureAudio = async () => {
    if (audio) return audio;
    audio = new Audio(AUDIO_SRC);
    audio.preload = 'metadata';
    audio.crossOrigin = 'anonymous';

    audio.addEventListener('loadedmetadata', () => {
      duration = audio.duration || duration;
      updateProgress();
    });
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', () => {
      playGlyph.innerHTML = playIcon;
      btn.setAttribute('aria-pressed', 'false');
    });

    try {
      audioSource = createAudioSpectrum(audio, { bins: 64 });
      currentSource = audioSource.read;
      currentViz.setSource(currentSource);
    } catch (err) {
      console.warn('Web Audio unavailable; staying on simulated spectrum.', err);
    }
    return audio;
  };

  const onClick = async () => {
    const a = await ensureAudio();
    if (a.paused) {
      try {
        if (audioSource) await audioSource.resume();
        await a.play();
        playGlyph.innerHTML = pauseIcon;
        btn.setAttribute('aria-pressed', 'true');
      } catch (err) {
        console.warn('Audio play() rejected; user gesture may be required.', err);
      }
    } else {
      a.pause();
      playGlyph.innerHTML = playIcon;
      btn.setAttribute('aria-pressed', 'false');
    }
  };

  btn.addEventListener('click', onClick);
  btn.setAttribute('role', 'button');
  btn.setAttribute('aria-pressed', 'false');
  btn.setAttribute('aria-label', 'Play preview of Gyrefolk Docks');
  updateProgress();

  return () => {
    btn.removeEventListener('click', onClick);
    switcher?.removeEventListener('click', onSwitcherClick);
    currentViz.destroy();
    audioSource?.destroy?.();
    audio?.pause();
  };
}
