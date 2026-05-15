// Divora — Prism Visualizer (vanilla JS port of visualizer.jsx).
//
// A radial spectrum visualizer that "breathes" with audio. Two
// spectrum sources are interchangeable:
//
//   createSimulatedSpectrum() — pure function of time; what runs
//     before the user clicks play. Deterministic mode (URL param
//     `?test=1` or opts.deterministic) freezes the clock so the
//     canvas pixels are stable for visual-regression tests.
//
//   createAudioSpectrum(audioEl) — Web Audio AnalyserNode reading
//     real FFT data from an HTMLAudioElement. Same return shape as
//     simulated, so the visualizer doesn't know which is active.
//
// mountPrismStage() owns the RAF loop, pauses on document.hidden,
// and honors prefers-reduced-motion (renders a single still frame).

const IS_TEST =
  typeof URLSearchParams !== 'undefined' &&
  new URLSearchParams(globalThis.location?.search || '').get('test') === '1';

const PREFERS_REDUCED =
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── simulated spectrum (pre-play / fallback / tests) ──
export function createSimulatedSpectrum({
  bins = 64,
  speed = 1,
  kickStrength = 1,
  deterministic = IS_TEST,
} = {}) {
  const spec = new Float32Array(bins);
  const t0 = performance.now();
  const fixedFrame = 0.42; // arbitrary but representative; non-zero so bars have shape

  return function read() {
    const frame = deterministic ? fixedFrame : (performance.now() - t0) * 0.001 * speed;
    const beatPhase = (frame * 2) % 1;
    const kick = Math.max(0, 1 - beatPhase * 4) * 0.9 * kickStrength;
    const subKick = Math.max(0, 1 - ((frame * 1) % 1) * 3) * 0.5 * kickStrength;
    for (let i = 0; i < bins; i++) {
      const f = i / bins;
      const tilt = Math.pow(1 - f, 1.6);
      const slow = (Math.sin(frame * 1.2 + i * 0.3) * 0.5 + 0.5) * 0.6;
      const fast = (Math.sin(frame * 7 + i * 0.7) * 0.5 + 0.5) * 0.25;
      let v = tilt * (0.35 + slow * 0.55 + fast * 0.3);
      if (i < 6) v += kick * (1 - i / 6);
      if (i < 14 && i >= 6) v += subKick * (1 - (i - 6) / 8) * 0.7;
      spec[i] = Math.min(1, Math.max(0, v));
    }
    return { spec, frame, kick, beatPhase };
  };
}

// ── audio spectrum (live AnalyserNode) ──
//
// createAudioSpectrum owns the whole audio graph for a single
// audio element — useful when the visualizer is the *only* thing
// consuming the analyser.
export function createAudioSpectrum(audioEl, { bins = 64 } = {}) {
  const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!Ctx) throw new Error('Web Audio API unavailable');

  const ctx = new Ctx();
  const source = ctx.createMediaElementSource(audioEl);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.85;
  source.connect(analyser);
  analyser.connect(ctx.destination);

  return {
    ...createAnalyserSpectrum(analyser, { bins }),
    resume: () => ctx.resume(),
    suspend: () => ctx.suspend(),
    destroy: () => ctx.close(),
  };
}

// createAnalyserSpectrum wraps an *existing* AnalyserNode. Use this
// when one analyser is shared by multiple consumers (e.g. the hero
// drives both the visualizer and the cassette reels off the same
// audio graph).
export function createAnalyserSpectrum(analyser, { bins = 64 } = {}) {
  const buf = new Uint8Array(analyser.frequencyBinCount);
  const spec = new Float32Array(bins);
  const t0 = performance.now();

  const read = () => {
    analyser.getByteFrequencyData(buf);
    const step = buf.length / bins;
    for (let i = 0; i < bins; i++) {
      let sum = 0;
      const start = Math.floor(i * step);
      const end = Math.floor((i + 1) * step);
      for (let j = start; j < end; j++) sum += buf[j];
      spec[i] = sum / Math.max(1, end - start) / 255;
    }
    let kick = 0;
    for (let i = 0; i < 6; i++) kick += spec[i];
    kick = Math.min(1, (kick / 6) * 1.5);
    return { spec, frame: (performance.now() - t0) * 0.001, kick, beatPhase: 0 };
  };

  return { read };
}

// ── draw one frame onto the canvas ──
function drawPrism(ctx, width, height, spec, frame, kick, { bars, dim }) {
  ctx.clearRect(0, 0, width, height);

  const cx = width / 2;
  const cy = height / 2;
  const innerR = Math.min(width, height) * 0.12;
  const maxR = Math.min(width, height) * 0.46;

  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < bars; i++) {
    const a = (i / bars) * Math.PI * 2 - Math.PI / 2;
    const v = spec[i % spec.length];
    const r1 = innerR + 8;
    const r2 = innerR + 14 + v * (maxR - innerR - 14);
    const hue = 260 + Math.sin(frame * 0.4 + i * 0.1) * 30 - v * 30;
    const sat = 70 + v * 30;
    const light = 55 + v * 25;
    const alpha = (dim ? 0.18 : 0.4) + v * (dim ? 0.25 : 0.5);
    ctx.strokeStyle = `hsla(${hue}, ${sat}%, ${light}%, ${alpha})`;
    ctx.lineWidth = ((Math.PI * 2 * (innerR + 8)) / bars) * 0.7;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
    ctx.stroke();
  }

  // refracted spectral rings
  const colors = ['#ff4d8f', '#ffb86b', '#c4a8ff', '#7c3aed', '#5cd9ff'];
  for (let band = 0; band < colors.length; band++) {
    const angOffset = (band - 2) * 0.06 + frame * 0.05;
    ctx.strokeStyle = colors[band];
    ctx.globalAlpha = dim ? 0.18 : 0.35;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let i = 0; i <= bars; i++) {
      const a = (i / bars) * Math.PI * 2 - Math.PI / 2 + angOffset;
      const v = spec[i % spec.length];
      const r = innerR + 18 + v * (maxR - innerR - 14) * 0.95 + band * 2;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  // central prism glow
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, innerR * (1.4 + kick * 0.6));
  g.addColorStop(0, `rgba(255, 200, 220, ${(dim ? 0.18 : 0.4) + kick * 0.3})`);
  g.addColorStop(0.3, `rgba(156, 92, 255, ${(dim ? 0.18 : 0.35) + kick * 0.2})`);
  g.addColorStop(1, 'rgba(20, 8, 40, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, innerR * 2.4, 0, Math.PI * 2);
  ctx.fill();
}

// ── tape-static (used during cassette swaps) ──
//
// Mimics the look of a VHS / cassette dropout: dark base, a few
// bright horizontal scanlines tinted in the palette, and a sparse
// sprinkle of high-luma pixels. Re-randomized per frame, so the
// canvas "hisses" while it's on screen.
function drawStatic(ctx, width, height) {
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#0a0414';
  ctx.fillRect(0, 0, width, height);

  const rowH = 3;
  for (let y = 0; y < height; y += rowH) {
    const r = Math.random();
    if (r > 0.78) {
      ctx.fillStyle = `rgba(196, 168, 255, ${Math.random() * 0.35})`;
      ctx.fillRect(0, y, width, rowH);
    } else if (r > 0.55) {
      ctx.fillStyle = `rgba(255, 77, 143, ${Math.random() * 0.2})`;
      ctx.fillRect(0, y, width, rowH);
    }
  }

  // Sparse white speckle. Scaled so density looks the same across
  // canvas sizes — about 1 dot per 220 px².
  const speckles = (width * height) / 220;
  for (let i = 0; i < speckles; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    ctx.fillStyle = `rgba(236, 228, 255, ${Math.random() * 0.4})`;
    ctx.fillRect(x, y, 1, 1);
  }
}

// ── prism core (SVG, scales with the kick) ──
const PRISM_CORE_SVG = `
  <svg viewBox="0 0 240 240" aria-hidden="true">
    <defs>
      <radialGradient id="prismCoreG" cx="0.5" cy="0.4" r="0.65">
        <stop offset="0" stop-color="#ffe4c4" stop-opacity="0.95" />
        <stop offset="0.35" stop-color="#c4a8ff" stop-opacity="0.7" />
        <stop offset="0.75" stop-color="#7c3aed" stop-opacity="0.5" />
        <stop offset="1" stop-color="#1a0b2e" stop-opacity="0" />
      </radialGradient>
    </defs>
    <polygon points="120,28 198,84 198,156 120,212 42,156 42,84"
             fill="url(#prismCoreG)" stroke="#c4a8ff" stroke-width="0.8" opacity="0.95" />
    <polygon points="120,28 198,84 120,120 42,84"
             fill="rgba(255,180,140,0.12)" stroke="#ffb86b" stroke-width="0.4" opacity="0.7" />
    <polygon points="120,120 198,84 198,156 120,212"
             fill="rgba(124,58,237,0.18)" stroke="#9d5cff" stroke-width="0.4" opacity="0.7" />
    <polygon points="120,120 120,212 42,156 42,84"
             fill="rgba(255,77,143,0.10)" stroke="#ff4d8f" stroke-width="0.4" opacity="0.7" />
  </svg>
`;

// ── mount the full stage (canvas + core) into a container ──
export function mountPrismStage(container, getSpectrum, { bars = 64, dim = false } = {}) {
  container.style.position = container.style.position || 'relative';
  container.style.width = container.style.width || '100%';
  container.style.height = container.style.height || '100%';

  const canvas = document.createElement('canvas');
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.setAttribute('aria-hidden', 'true');
  container.appendChild(canvas);

  const core = document.createElement('div');
  core.innerHTML = PRISM_CORE_SVG;
  const coreSvg = core.firstElementChild;
  coreSvg.style.position = 'absolute';
  coreSvg.style.left = '50%';
  coreSvg.style.top = '50%';
  // Set the centering transform up front so it's already applied at
  // first paint. Otherwise the next transform write (which adds the
  // kick scale) would *transition* from the initial computed value
  // and the core appears to slide in from the lower-right corner.
  coreSvg.style.transform = 'translate(-50%, -50%) scale(1)';
  container.appendChild(coreSvg);
  // Now that the centering transform is baked in, opt into the
  // smooth kick-scale transition. Done in the next frame so the
  // browser commits the initial state before observing changes.
  requestAnimationFrame(() => {
    coreSvg.style.transition = 'transform 60ms linear';
  });

  const ctx = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  let dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
  let activeGet = getSpectrum;
  let raf = 0;
  let running = false;
  let lastKick = 0;
  let glitchUntil = 0;

  function resize() {
    const r = container.getBoundingClientRect();
    width = Math.max(100, r.width);
    height = Math.max(100, r.height);
    dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const coreSize = Math.min(width, height) * 0.32;
    coreSvg.setAttribute('width', String(coreSize));
    coreSvg.setAttribute('height', String(coreSize));
  }

  const ro = new ResizeObserver(() => {
    resize();
    renderOnce();
  });
  ro.observe(container);
  resize();

  function renderOnce() {
    if (performance.now() < glitchUntil) {
      drawStatic(ctx, width, height);
      // Hide the prism core during glitch — looks like the tape pulled.
      coreSvg.style.opacity = '0';
      return;
    }
    coreSvg.style.opacity = '1';
    const { spec, frame, kick } = activeGet();
    drawPrism(ctx, width, height, spec, frame, kick, { bars, dim });
    if (kick !== lastKick) {
      coreSvg.style.transform = `translate(-50%, -50%) scale(${1 + kick * 0.04})`;
      lastKick = kick;
    }
  }

  function tick() {
    if (!running) return;
    renderOnce();
    raf = requestAnimationFrame(tick);
  }

  function start() {
    if (running) return;
    if (PREFERS_REDUCED) {
      // honor reduced motion: render exactly one frame, no RAF.
      renderOnce();
      return;
    }
    running = true;
    raf = requestAnimationFrame(tick);
  }

  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  // pause when tab hidden
  const onVisibility = () => {
    if (document.hidden) stop();
    else start();
  };
  document.addEventListener('visibilitychange', onVisibility);

  start();

  return {
    setSource(nextGet) {
      activeGet = nextGet;
    },
    triggerGlitch(durationMs = 220) {
      glitchUntil = performance.now() + durationMs;
      // ensure we keep painting through the glitch window
      if (!running && !PREFERS_REDUCED) start();
    },
    renderOnce,
    pause: stop,
    resume: start,
    destroy() {
      stop();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.remove();
      coreSvg.remove();
    },
  };
}
