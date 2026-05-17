// Procedural sigils for the disco cards.
//
// Each card has a `data-album-id` (Bandcamp's numeric album ID) and
// a child `<canvas class="disco-sigil">`. This module paints a unique
// hex-lattice sigil into each canvas, derived from a seeded PRNG so
// the output is deterministic per album.
//
// CSS handles slow rotation; we just paint once on init and on resize.

const PALETTE = ['#c4a8ff', '#9d5cff', '#ff4d8f', '#ffb86b', '#7c3aed'];

// mulberry32 — small fast deterministic PRNG. The Bandcamp ID seeds it,
// so the same album always renders the same sigil.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawSigil(canvas, seed) {
  const rand = mulberry32(seed);
  const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
  const cssW = Math.max(80, canvas.clientWidth);
  const cssH = Math.max(80, canvas.clientHeight);
  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  const cx = cssW / 2;
  const cy = cssH / 2;
  const R = Math.min(cx, cy) * 0.9;

  ctx.globalCompositeOperation = 'lighter';

  // Concentric hex rings — 4–6 layers, deterministic per album.
  const layers = 4 + Math.floor(rand() * 3);
  for (let i = 0; i < layers; i += 1) {
    const ringR = R * (0.28 + (i / layers) * 0.7);
    const rot = rand() * Math.PI;
    const color = PALETTE[Math.floor(rand() * PALETTE.length)];

    ctx.strokeStyle = color;
    ctx.lineWidth = 0.6 + rand() * 0.6;
    ctx.globalAlpha = 0.45 + rand() * 0.4;

    // outer hex
    ctx.beginPath();
    for (let v = 0; v <= 6; v += 1) {
      const a = (v / 6) * Math.PI * 2 + rot;
      const x = cx + Math.cos(a) * ringR;
      const y = cy + Math.sin(a) * ringR;
      if (v === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // 50% chance of inner chord pattern (vertex-to-vertex+2 lines)
    if (rand() > 0.45) {
      ctx.lineWidth *= 0.6;
      ctx.beginPath();
      for (let v = 0; v < 6; v += 1) {
        const a1 = (v / 6) * Math.PI * 2 + rot;
        const a2 = ((v + 2) / 6) * Math.PI * 2 + rot;
        ctx.moveTo(cx + Math.cos(a1) * ringR, cy + Math.sin(a1) * ringR);
        ctx.lineTo(cx + Math.cos(a2) * ringR, cy + Math.sin(a2) * ringR);
      }
      ctx.stroke();
    }
  }

  // center mark
  ctx.globalAlpha = 0.55;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#c4a8ff';
  ctx.beginPath();
  ctx.arc(cx, cy, 1.8, 0, Math.PI * 2);
  ctx.fill();
}

export function initDiscoSigils() {
  // The same procedural sigil treatment runs on the latest-embed
  // (Section II featured release) AND each disco-item (Section III).
  // Any element with `data-album-id` + a child `.disco-sigil` canvas
  // qualifies. We iterate the containers (which carry the seed) and
  // find their child canvases.
  const containers = document.querySelectorAll('[data-album-id]');
  if (!containers.length) return () => {};

  const cleanups = [];
  containers.forEach((container) => {
    const canvas = container.querySelector(':scope > .disco-sigil');
    if (!canvas) return;
    const seed = parseInt(container.dataset.albumId, 10);
    if (!Number.isFinite(seed)) return;
    const repaint = () => drawSigil(canvas, seed);
    repaint();
    const ro = new ResizeObserver(repaint);
    ro.observe(container);
    cleanups.push(() => ro.disconnect());
  });

  return () => cleanups.forEach((fn) => fn());
}
