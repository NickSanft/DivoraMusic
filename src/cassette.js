// Cassette tape player UI.
//
// Owns the now-playing widget's DOM (markup is in index.html), the
// reel rotation, the typewriter title reveal, and the eject/insert
// animation. Audio playback + analyser graph belong to hero.js;
// this module is purely presentational and is told what to show.

import { TRACKS, SOUNDS } from './tracks.js';

const EJECT_MS = 500;
const INSERT_MS = 600;
const TYPE_MS_PER_CHAR = 22;

const PREFERS_REDUCED =
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const isTest =
  typeof URLSearchParams !== 'undefined' &&
  new URLSearchParams(globalThis.location?.search || '').get('test') === '1';

// In test mode skip the long swap animations so functional specs
// run snappily and the cassette's "settled" state is what gets
// screenshotted.
const SKIP_ANIM = PREFERS_REDUCED || isTest;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const playIcon = `
  <svg width="10" height="12" viewBox="0 0 10 12" aria-hidden="true">
    <polygon points="0,0 0,12 10,6" fill="currentColor" />
  </svg>`;
const pauseIcon = `
  <svg width="10" height="12" viewBox="0 0 10 12" aria-hidden="true">
    <rect x="0" y="0" width="3" height="12" fill="currentColor" />
    <rect x="7" y="0" width="3" height="12" fill="currentColor" />
  </svg>`;

function fmtTime(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  return `${String((s / 60) | 0).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function initCassette({
  initialIndex = 0,
  onSwap,
  onPlayPause,
  onNext,
  onSeek,
  onVolume,
  onMute,
} = {}) {
  const tape = document.querySelector('.cassette');
  const lblTitle = tape?.querySelector('.cassette-label .ttl-text');
  const lblSub = tape?.querySelector('.cassette-label .sub');
  // Controls live outside the cassette now (in .deck-controls under
  // .tape-player) so they don't animate with the eject/insert.
  const controls = document.querySelector('.deck-controls');
  const timeEl = controls?.querySelector('.cassette-time');
  const barBtn = controls?.querySelector('.cassette-bar');
  const barEl = controls?.querySelector('.cassette-bar-fill');
  const playBtn = controls?.querySelector('.cassette-play');
  const nextBtn = controls?.querySelector('.cassette-next');
  const muteBtn = controls?.querySelector('.cassette-mute');
  const volumeInput = controls?.querySelector('.volume-slider');
  const trackSwitcher = document.querySelector('.track-switcher');
  if (!tape || !lblTitle || !playBtn || !nextBtn) return null;

  // Pre-load the tiny SFX so they're warm by the time the user
  // triggers a swap. crossOrigin not needed — same-origin assets.
  const sfx = {
    eject: new Audio(SOUNDS.eject),
    insert: new Audio(SOUNDS.insert),
  };
  sfx.eject.preload = 'auto';
  sfx.insert.preload = 'auto';

  let currentIndex = initialIndex;
  let swapInFlight = false;
  let typeAbort = null;
  let reelAngle = 0;
  let reelEnergy = 0;
  let raf = 0;
  let lastTs = 0;
  let playing = false;

  const reels = tape.querySelectorAll('.reel');

  function applyTrackToTape(track) {
    tape.style.setProperty('--accent', track.accent);
    tape.setAttribute('data-track', track.id);
    lblSub.textContent = `${track.albumShort} · ${track.number}`;
    timeEl.textContent = `00:00 / ${fmtTime(track.duration)}`;
    if (barEl) barEl.style.width = '0%';
  }

  function renderTrackSwitcher() {
    if (!trackSwitcher) return;
    trackSwitcher.innerHTML = '';
    TRACKS.forEach((t, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.index = String(i);
      b.dataset.track = t.id;
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(i === currentIndex));
      b.innerHTML = `<span class="ts-num">${t.number}</span>${t.title}`;
      trackSwitcher.appendChild(b);
    });
  }

  function reflectSwitcher() {
    if (!trackSwitcher) return;
    for (const b of trackSwitcher.querySelectorAll('button')) {
      b.setAttribute('aria-selected', String(Number(b.dataset.index) === currentIndex));
    }
  }

  async function typewriteTitle(text) {
    // Cancel any in-flight typewriter so a rapid second swap doesn't
    // interleave two strings.
    if (typeAbort) typeAbort.aborted = true;
    const token = { aborted: false };
    typeAbort = token;

    if (SKIP_ANIM) {
      lblTitle.textContent = text;
      return;
    }
    lblTitle.textContent = '';
    for (let i = 1; i <= text.length; i++) {
      if (token.aborted) return;
      lblTitle.textContent = text.slice(0, i);

      await sleep(TYPE_MS_PER_CHAR);
    }
  }

  // — reel animation loop —
  // Reels spin continuously. Speed scales with `reelEnergy`, which
  // hero.js feeds us from the AnalyserNode (0..1). When paused, energy
  // decays toward 0 → slow idle rotation.
  function tick(ts) {
    if (!lastTs) lastTs = ts;
    const dt = Math.min(64, ts - lastTs); // clamp for tab-switches
    lastTs = ts;

    // baseline speed (idle), boosted by audio energy when playing
    const idleRadsPerSec = playing ? 1.5 : 0.6;
    const kickBoost = reelEnergy * 6;
    reelAngle = (reelAngle + ((idleRadsPerSec + kickBoost) * dt) / 1000) % (Math.PI * 2);
    // ease energy down so a kick decays naturally
    reelEnergy *= 0.92;
    const deg = (reelAngle * 180) / Math.PI;
    for (const r of reels) r.style.transform = `rotate(${deg}deg)`;
    raf = requestAnimationFrame(tick);
  }
  if (!PREFERS_REDUCED) raf = requestAnimationFrame(tick);
  const onVisibility = () => {
    if (document.hidden) {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      lastTs = 0;
    } else if (!raf && !PREFERS_REDUCED) {
      raf = requestAnimationFrame(tick);
    }
  };
  document.addEventListener('visibilitychange', onVisibility);

  // — event wiring —
  playBtn.addEventListener('click', () => onPlayPause?.());
  nextBtn.addEventListener('click', () => onNext?.());

  // Click-to-seek on the progress bar. We translate the click's
  // x-position within the bar to a 0..1 ratio and hand it to the
  // host, which knows the audio element.
  const onBarClick = (e) => {
    if (!barBtn) return;
    const rect = barBtn.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek?.(ratio);
  };
  barBtn?.addEventListener('click', onBarClick);

  // Mute toggle. Volume slider sends continuous updates to the host;
  // the host stores it and applies it to the live audio element.
  const onMuteClick = () => {
    const next = muteBtn.getAttribute('aria-pressed') !== 'true';
    muteBtn.setAttribute('aria-pressed', String(next));
    muteBtn.setAttribute('aria-label', next ? 'Unmute' : 'Mute');
    onMute?.(next);
  };
  muteBtn?.addEventListener('click', onMuteClick);

  const onVolumeInput = (e) => {
    const v = Number(e.target.value) / 100;
    onVolume?.(v);
    // Tapping the slider while muted implicitly unmutes if the user
    // chose any non-zero level.
    if (v > 0 && muteBtn?.getAttribute('aria-pressed') === 'true') {
      muteBtn.setAttribute('aria-pressed', 'false');
      muteBtn.setAttribute('aria-label', 'Mute');
      onMute?.(false);
    }
  };
  volumeInput?.addEventListener('input', onVolumeInput);

  const onSwitcherClick = (e) => {
    const b = e.target.closest('button[data-index]');
    if (!b) return;
    const idx = Number(b.dataset.index);
    if (!Number.isInteger(idx)) return;
    swapTo(idx);
  };
  trackSwitcher?.addEventListener('click', onSwitcherClick);

  // — public swap orchestrator —
  async function swapTo(nextIndex) {
    if (swapInFlight || nextIndex === currentIndex) return;
    if (nextIndex < 0 || nextIndex >= TRACKS.length) return;
    swapInFlight = true;
    const fromIndex = currentIndex;
    const toTrack = TRACKS[nextIndex];

    // Notify the host so it can pause audio + kick off a visualizer
    // glitch synchronized with the eject. host returns true if it
    // wants us to auto-resume after insert.
    const wantResume = (await onSwap?.({ fromIndex, toIndex: nextIndex })) === true;

    sfx.eject.currentTime = 0;
    sfx.eject.play().catch(() => {});

    if (!SKIP_ANIM) {
      tape.classList.remove('inserting');
      tape.classList.add('ejecting');
      await sleep(EJECT_MS);
    }

    // mid-swap: update the label + accent before the new tape rises
    currentIndex = nextIndex;
    applyTrackToTape(toTrack);
    reflectSwitcher();

    sfx.insert.currentTime = 0;
    sfx.insert.play().catch(() => {});

    if (!SKIP_ANIM) {
      tape.classList.remove('ejecting');
      // restart the keyframe cleanly
      void tape.offsetWidth;
      tape.classList.add('inserting');
      await sleep(INSERT_MS);
      tape.classList.remove('inserting');
    }

    // typewrite-in the new title
    await typewriteTitle(toTrack.title);
    swapInFlight = false;

    if (wantResume) onPlayPause?.({ forcePlay: true });
  }

  // — initial paint —
  applyTrackToTape(TRACKS[currentIndex]);
  renderTrackSwitcher();
  lblTitle.textContent = TRACKS[currentIndex].title;
  playBtn.innerHTML = playIcon;

  // — public API for hero.js —
  return {
    swapTo,
    next: () => swapTo((currentIndex + 1) % TRACKS.length),
    prev: () => swapTo((currentIndex - 1 + TRACKS.length) % TRACKS.length),
    getIndex: () => currentIndex,
    setPlaying(v) {
      playing = !!v;
      playBtn.innerHTML = playing ? pauseIcon : playIcon;
      playBtn.setAttribute('aria-pressed', String(playing));
      tape.classList.toggle('playing', playing);
    },
    setProgress(currentSec, durationSec) {
      const d = durationSec || TRACKS[currentIndex].duration;
      const pct = Math.min(100, (currentSec / d) * 100);
      if (barEl) barEl.style.width = `${pct}%`;
      if (barBtn) barBtn.setAttribute('aria-valuenow', String(Math.round(pct)));
      timeEl.textContent = `${fmtTime(currentSec)} / ${fmtTime(d)}`;
    },
    setVolumeUI(level, muted) {
      if (volumeInput) volumeInput.value = String(Math.round(level * 100));
      if (muteBtn) {
        muteBtn.setAttribute('aria-pressed', String(!!muted));
        muteBtn.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
      }
    },
    // Audio energy 0..1 — drives reel speed.
    pumpEnergy(v) {
      // Take the max so kicks are visible briefly even with decay.
      reelEnergy = Math.max(reelEnergy, Math.min(1, v));
    },
    destroy() {
      if (raf) cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
      trackSwitcher?.removeEventListener('click', onSwitcherClick);
      barBtn?.removeEventListener('click', onBarClick);
      muteBtn?.removeEventListener('click', onMuteClick);
      volumeInput?.removeEventListener('input', onVolumeInput);
    },
  };
}
