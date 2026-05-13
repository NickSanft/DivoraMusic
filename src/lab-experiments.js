// Divora /lab — vanilla ports of the prototype's 4 canvas
// experiments. The 5th and 6th experiments (terminal log and
// blockquote) are simpler so they live in lab.js.

import { createSimulatedSpectrum } from './visualizer.js';

const PREFERS_REDUCED =
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── Experiment 02: Linear / Subway — classic FFT bars ──
export function mountLinearBars(container, { bars = 48 } = {}) {
  const canvas = document.createElement('canvas');
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const read = createSimulatedSpectrum({ bins: bars });
  let raf = 0;
  let width = 0;
  let height = 0;

  const resize = () => {
    const r = container.getBoundingClientRect();
    width = Math.max(100, r.width);
    height = Math.max(100, r.height);
    const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const renderOnce = () => {
    const { spec } = read();
    ctx.clearRect(0, 0, width, height);
    const bw = width / bars;
    for (let i = 0; i < bars; i++) {
      const v = spec[i];
      const h = v * (height - 20);
      const g = ctx.createLinearGradient(0, height - h, 0, height);
      g.addColorStop(0, '#ff4d8f');
      g.addColorStop(0.5, '#c4a8ff');
      g.addColorStop(1, '#7c3aed');
      ctx.fillStyle = g;
      ctx.globalAlpha = 0.7 + v * 0.3;
      ctx.fillRect(i * bw + 1, height - h - 8, bw - 2, h);
    }
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = '#c4a8ff';
    ctx.lineWidth = 0.5;
    for (let y = 0; y < 5; y++) {
      ctx.beginPath();
      ctx.moveTo(0, (height / 5) * y);
      ctx.lineTo(width, (height / 5) * y);
      ctx.stroke();
    }
  };

  return startLoop(container, resize, renderOnce, () => {
    canvas.remove();
    if (raf) cancelAnimationFrame(raf);
  });
}

// ── Experiment 03: Particle Reliquary — particles orbiting the core ──
export function mountParticlePrism(container, { count = 300 } = {}) {
  const canvas = document.createElement('canvas');
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const read = createSimulatedSpectrum({ bins: 8 });
  let width = 0;
  let height = 0;

  const particles = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      a: Math.random() * Math.PI * 2,
      r: Math.random() * 0.4 + 0.1,
      s: Math.random() * 0.4 + 0.2,
      hue: 240 + Math.random() * 80,
      life: Math.random(),
    });
  }

  const resize = () => {
    const r = container.getBoundingClientRect();
    width = Math.max(100, r.width);
    height = Math.max(100, r.height);
    const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const renderOnce = () => {
    const { kick } = read();
    ctx.fillStyle = 'rgba(10, 4, 20, 0.18)';
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'lighter';
    const cx = width / 2;
    const cy = height / 2;
    const R = Math.min(width, height) * 0.45;
    for (const p of particles) {
      p.a += p.s * 0.01 + kick * 0.02;
      p.life += 0.005;
      if (p.life > 1) {
        p.life = 0;
        p.r = Math.random() * 0.4 + 0.1;
      }
      const radius = R * (p.r + p.life * 0.4) * (1 + kick * 0.2);
      const x = cx + Math.cos(p.a) * radius;
      const y = cy + Math.sin(p.a) * radius;
      ctx.fillStyle = `hsla(${p.hue}, 80%, 65%, ${0.6 * (1 - p.life)})`;
      ctx.beginPath();
      ctx.arc(x, y, 1.2 + kick * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  return startLoop(container, resize, renderOnce, () => canvas.remove());
}

// ── Experiment 04: Hexlattice — counter-rotating hex rings ──
export function mountHexlattice(container) {
  const canvas = document.createElement('canvas');
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const read = createSimulatedSpectrum({ bins: 8 });
  let width = 0;
  let height = 0;

  const resize = () => {
    const r = container.getBoundingClientRect();
    width = Math.max(100, r.width);
    height = Math.max(100, r.height);
    const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const renderOnce = () => {
    const { frame, kick } = read();
    ctx.clearRect(0, 0, width, height);
    const cx = width / 2;
    const cy = height / 2;
    const R = Math.min(width, height) * 0.4 * (1 + kick * 0.05);
    ctx.globalCompositeOperation = 'lighter';
    const colors = ['rgba(196,168,255,0.65)', 'rgba(255,77,143,0.55)', 'rgba(255,184,107,0.45)'];
    for (let k = 0; k < 3; k++) {
      ctx.strokeStyle = colors[k];
      ctx.lineWidth = 1;
      const rot = frame * (0.2 + k * 0.1) + k * 0.15;
      const r = R - k * 18;
      ctx.beginPath();
      for (let i = 0; i <= 6; i++) {
        const a = (i / 6) * Math.PI * 2 + rot;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.lineWidth = 0.4;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + rot;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        ctx.stroke();
      }
    }
  };

  return startLoop(container, resize, renderOnce, () => canvas.remove());
}

// ── shared loop helper: resize-aware, visibility-aware, reduced-motion-aware ──
function startLoop(container, resize, renderOnce, onDestroy) {
  resize();
  renderOnce();

  let raf = 0;
  let running = false;

  const tick = () => {
    if (!running) return;
    renderOnce();
    raf = requestAnimationFrame(tick);
  };

  const start = () => {
    if (running || PREFERS_REDUCED) {
      renderOnce();
      return;
    }
    running = true;
    raf = requestAnimationFrame(tick);
  };
  const stop = () => {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };

  const ro = new ResizeObserver(() => {
    resize();
    renderOnce();
  });
  ro.observe(container);

  const onVisibility = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVisibility);

  start();

  return {
    pause: stop,
    resume: start,
    destroy() {
      stop();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      onDestroy?.();
    },
  };
}
