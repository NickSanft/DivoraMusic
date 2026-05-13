// Hero — mounts the prism visualizer, wires the now-playing widget
// to the hosted MP3, and swaps the visualizer's spectrum source
// from simulated to AnalyserNode-driven once the user clicks play.
//
// Autoplay restrictions: AudioContext is created lazily on the
// first play click, then never torn down. Subsequent pause/play
// just toggles the <audio> element.

import { mountPrismStage, createSimulatedSpectrum, createAudioSpectrum } from './visualizer.js';

const AUDIO_SRC = `${import.meta.env.BASE_URL}audio/gyrefolk-docks.mp3`;

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

export function initHero() {
  const stage = document.querySelector('.hero-stage > div');
  const btn = document.querySelector('.now-playing');
  const playGlyph = document.querySelector('.np-play');
  const barFill = document.querySelector('.np-bar > div');
  const timeEl = document.querySelector('.np-time');
  if (!stage || !btn || !playGlyph) return () => {};

  // 1. Mount the visualizer with the simulated source.
  const simulated = createSimulatedSpectrum({ bins: 64 });
  const visualizer = mountPrismStage(stage, simulated, { bars: 64 });

  // 2. Prepare the audio element (created lazily; not loaded yet).
  let audio = null;
  let audioSource = null;
  let duration = 278; // fallback estimate until metadata loads (4:38)

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
      visualizer.setSource(audioSource.read);
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
    visualizer.destroy();
    audioSource?.destroy?.();
    audio?.pause();
  };
}
