// Cassette tape player UI.
//
// Owns the now-playing widget's DOM (markup is in index.html), the
// reel rotation, the typewriter title reveal, and the eject/insert
// animation. Audio playback + analyser graph belong to hero.js;
// this module is purely presentational and is told what to show.

import { TRACKS, BLANK_SIDE, SOUNDS, findAlbumMate } from './tracks.js';
import waveforms from './waveforms.json';

const EJECT_MS = 500;
const INSERT_MS = 600;
const FLIP_HALF_MS = 350;
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

// Build a closed SVG path from a peaks array (0..1 floats). Maps each
// peak to a vertical bar centered on y=12 of a 240×24 viewBox — bar
// width is 1px with no gap, so 240 peaks yield a clean fill.
function peaksToPath(peaks) {
  if (!peaks?.length) return '';
  const w = 240;
  const h = 24;
  const midY = h / 2;
  const step = w / peaks.length;
  let top = `M0 ${midY} `;
  let bottom = '';
  for (let i = 0; i < peaks.length; i += 1) {
    const x = (i + 0.5) * step;
    const peak = Math.max(0.04, peaks[i]); // floor so quiet sections still have visible body
    const y = peak * (h / 2);
    top += `L${x.toFixed(2)} ${(midY - y).toFixed(2)} `;
    bottom = `L${x.toFixed(2)} ${(midY + y).toFixed(2)} ${bottom}`;
  }
  return `${top}L${w} ${midY} ${bottom}L0 ${midY} Z`;
}

export function initCassette({
  initialIndex = 0,
  onSwap,
  onPlayPause,
  onNext,
  onSeek,
  onVolume,
  onMute,
  onFlipAudio,
} = {}) {
  const tape = document.querySelector('.cassette');
  const lblTitle = tape?.querySelector('.cassette-label .ttl-text');
  const lblSub = tape?.querySelector('.cassette-label .sub');
  const sideEl = tape?.querySelector('.cassette-side');
  // The "now playing · ..." marker in the hero-meta strip at the
  // bottom-left of the hero. Kept in sync with whatever audio is
  // currently loaded — not whatever side is visible, so flipping a
  // single (Origins) to its blank B-side doesn't change this text.
  const nowEl = document.querySelector('.hero-meta-now');
  const barTooltip = document.querySelector('.cassette-bar-tooltip');
  const waveDim = document.querySelector('.cassette-bar-wave-dim');
  const waveFill = document.querySelector('.cassette-bar-wave-fill');
  const barWaveRoot = document.querySelector('.cassette-bar');
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
  const flipBtn = document.querySelector('.cassette-flip');
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
    tape.setAttribute('data-side', track.blank ? 'blank' : track.side);
    // Repaint the waveform for the new track. Blank-side flips reuse
    // whatever track was loaded (audio stays); we leave the previous
    // peaks in place because they still describe the actual audio.
    if (!track.blank && waveDim && waveFill) {
      const path = peaksToPath(waveforms[track.id]);
      waveDim.setAttribute('d', path);
      waveFill.setAttribute('d', path);
    }
    if (sideEl) sideEl.textContent = track.blank ? '— SIDE B —' : `SIDE ${track.side}`;
    if (track.blank) {
      lblSub.textContent = 'NO RECORDING';
    } else {
      lblSub.textContent = `${track.albumShort} · ${track.number}`;
    }
    timeEl.textContent = `00:00 / ${fmtTime(track.duration)}`;
    if (barEl) barEl.style.width = '0%';
    // Update the hero-meta "now playing" caption — but only for real
    // tracks. Flipping to a blank side leaves the audio untouched,
    // so the caption should stay on the recorded side.
    if (nowEl && !track.blank) {
      nowEl.textContent = `now playing · ${track.title}`;
    }
    // Hide / disable the flip button if this side has no mate.
    if (flipBtn) {
      const realTrack = !track.blank ? track : findRealTrackFromBlank();
      const mate = realTrack ? findAlbumMate(realTrack.id) : null;
      // We DO want the button enabled on tracks WITHOUT a mate (so
      // they can still flip to a blank side and back) — only disable
      // it when there's literally nothing on either side (impossible
      // in practice, but defensive).
      flipBtn.disabled = false;
      flipBtn.setAttribute(
        'aria-label',
        track.blank
          ? 'Flip back to the recorded side'
          : mate
            ? `Flip to side B: ${mate.title}`
            : 'Flip to the blank side',
      );
    }
  }

  // When we're on a blank side, the "real" track is whoever's still
  // loaded in audio (preserved in lastRealIndex).
  let lastRealIndex = initialIndex;
  function findRealTrackFromBlank() {
    return TRACKS[lastRealIndex];
  }

  function renderTrackSwitcher() {
    if (!trackSwitcher) return;
    trackSwitcher.innerHTML = '';
    TRACKS.forEach((t, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.index = String(i);
      b.dataset.track = t.id;
      // Per-album accent: CSS reads --accent on the button so the
      // ts-num matches the album's color (magenta for Ominous,
      // amber for Origins). Keeps the album language consistent
      // across cassette + sigil + track switcher.
      b.style.setProperty('--accent', t.accent);
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

  // Pointer-based seek: click anywhere on the bar, OR press-and-drag
  // to scrub. Uses pointer events so touch + mouse + pen all work
  // through the same path. The tooltip follows the cursor along the
  // bar and shows the target time live.
  let dragging = false;
  let currentDuration = TRACKS[initialIndex].duration;

  const ratioForEvent = (e) => {
    const rect = barBtn.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  };
  const updateTooltip = (ratio) => {
    if (!barTooltip) return;
    barTooltip.textContent = fmtTime(ratio * currentDuration);
    barTooltip.style.left = `${ratio * 100}%`;
  };
  const onBarPointerMove = (e) => {
    if (!barBtn) return;
    const ratio = ratioForEvent(e);
    updateTooltip(ratio);
    if (dragging) onSeek?.(ratio);
  };
  const onBarPointerDown = (e) => {
    if (!barBtn) return;
    dragging = true;
    barBtn.classList.add('dragging');
    barBtn.setPointerCapture?.(e.pointerId);
    const ratio = ratioForEvent(e);
    updateTooltip(ratio);
    onSeek?.(ratio);
  };
  const onBarPointerUp = (e) => {
    if (!barBtn || !dragging) return;
    dragging = false;
    barBtn.classList.remove('dragging');
    barBtn.releasePointerCapture?.(e.pointerId);
  };
  barBtn?.addEventListener('pointermove', onBarPointerMove);
  barBtn?.addEventListener('pointerdown', onBarPointerDown);
  barBtn?.addEventListener('pointerup', onBarPointerUp);
  barBtn?.addEventListener('pointercancel', onBarPointerUp);

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
    const pct = Math.round(Number(e.target.value));
    const v = pct / 100;
    onVolume?.(v);
    // aria-valuetext gives screen readers a friendlier readout than
    // the bare number — "60 percent" instead of "60".
    e.target.setAttribute('aria-valuetext', `${pct} percent`);
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

    const fromTrack = TRACKS[currentIndex];
    const toTrack = TRACKS[nextIndex];

    // Same album → flip rather than eject (it's the same tape, just
    // turning it over). Different album → full eject/insert.
    if (fromTrack && toTrack.albumId === fromTrack.albumId) {
      return flipToTrack(nextIndex);
    }

    swapInFlight = true;
    const fromIndex = currentIndex;

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
    lastRealIndex = nextIndex;
    swapInFlight = false;

    if (wantResume) onPlayPause?.({ forcePlay: true });
  }

  // Flip the cassette in place — used when switching to the album-mate
  // (same tape, different side) or to the blank B-side.
  async function flipToTrack(nextIndex) {
    if (swapInFlight) return;
    swapInFlight = true;
    const toTrack = TRACKS[nextIndex];
    await runFlip(toTrack, { audioSwapToIndex: nextIndex });
    currentIndex = nextIndex;
    lastRealIndex = nextIndex;
    reflectSwitcher();
    swapInFlight = false;
  }

  // Flip to the blank side (no recording).
  async function flipToBlank() {
    if (swapInFlight) return;
    swapInFlight = true;
    await runFlip(BLANK_SIDE, { audioSwapToIndex: null });
    // currentIndex stays the same — the real track is still loaded;
    // we just show the empty side of the tape.
    swapInFlight = false;
  }

  // Flip back from blank to the recorded side.
  async function flipBackFromBlank() {
    if (swapInFlight) return;
    swapInFlight = true;
    await runFlip(TRACKS[lastRealIndex], { audioSwapToIndex: null });
    swapInFlight = false;
  }

  async function runFlip(toTrack, { audioSwapToIndex }) {
    if (SKIP_ANIM) {
      applyTrackToTape(toTrack);
      if (audioSwapToIndex !== null) await onFlipAudio?.(audioSwapToIndex);
      await typewriteTitle(toTrack.title);
      return;
    }
    tape.classList.remove('flipping-in', 'flipping-out');
    void tape.offsetWidth;
    tape.classList.add('flipping-out');
    await sleep(FLIP_HALF_MS);
    // Cassette is perpendicular to the viewer — swap content invisibly.
    applyTrackToTape(toTrack);
    if (audioSwapToIndex !== null) await onFlipAudio?.(audioSwapToIndex);
    tape.classList.remove('flipping-out');
    void tape.offsetWidth;
    tape.classList.add('flipping-in');
    await sleep(FLIP_HALF_MS);
    tape.classList.remove('flipping-in');
    await typewriteTitle(toTrack.title);
  }

  // Flip button: figure out where we are and where to go.
  const onFlipClick = async () => {
    if (swapInFlight) return;
    const current = TRACKS[currentIndex];
    const isBlankShowing = tape.getAttribute('data-side') === 'blank';
    if (isBlankShowing) {
      await flipBackFromBlank();
      return;
    }
    const mate = findAlbumMate(current.id);
    if (mate) {
      const mateIndex = TRACKS.findIndex((t) => t.id === mate.id);
      await flipToTrack(mateIndex);
    } else {
      await flipToBlank();
    }
  };
  flipBtn?.addEventListener('click', onFlipClick);

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
      // First press clears the attention pulse — the user has
      // discovered the play button; the hint has done its job.
      if (playing) playBtn.classList.remove('attention');
    },
    setProgress(currentSec, durationSec) {
      const d = durationSec || TRACKS[currentIndex].duration;
      currentDuration = d;
      const pct = Math.min(100, (currentSec / d) * 100);
      if (barEl) barEl.style.width = `${pct}%`;
      // CSS variable drives the waveform's clip-path inset, revealing
      // the ember-colored fill up to the playhead.
      if (barWaveRoot) barWaveRoot.style.setProperty('--bar-pos', `${pct / 100}`);
      if (barBtn) barBtn.setAttribute('aria-valuenow', String(Math.round(pct)));
      timeEl.textContent = `${fmtTime(currentSec)} / ${fmtTime(d)}`;
    },
    setVolumeUI(level, muted) {
      if (volumeInput) {
        const pct = Math.round(level * 100);
        volumeInput.value = String(pct);
        volumeInput.setAttribute('aria-valuetext', `${pct} percent`);
      }
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
      barBtn?.removeEventListener('pointermove', onBarPointerMove);
      barBtn?.removeEventListener('pointerdown', onBarPointerDown);
      barBtn?.removeEventListener('pointerup', onBarPointerUp);
      barBtn?.removeEventListener('pointercancel', onBarPointerUp);
      muteBtn?.removeEventListener('click', onMuteClick);
      volumeInput?.removeEventListener('input', onVolumeInput);
      flipBtn?.removeEventListener('click', onFlipClick);
    },
  };
}
