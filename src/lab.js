// Divora /lab — entry. Imports styles, mounts each experiment
// against its container, wires the Escape-to-return shortcut.

import './tokens.css';
import './lab.css';

import { mountPrismStage, createSimulatedSpectrum } from './visualizer.js';
import { mountLinearBars, mountParticlePrism, mountHexlattice } from './lab-experiments.js';

const BOOT_LINES = [
  '> boot.divora _____________________ ok',
  '> mount /reliquary _______________ ok',
  '> spectrum.init fft=1024 ___________ ok',
  '> shader.refract::v0.3 ____________ ok',
  '> // candle warm: hsla(33, 80%, 60%)',
  '> // void cold: hsla(265, 70%, 18%)',
  '> // signal:noise ratio = 0.884',
  '> sigil.unlock(folio_iv) ___________ pending',
  '> awaiting kick: bpm ≈ 124 ________ ok',
  '> hello, you. there is no audience here',
  '> press [escape] to return to surface',
];

function mountTerminalLog(container) {
  let visible = 0;
  const render = () => {
    container.innerHTML = '';
    for (let i = 0; i < visible; i += 1) {
      const div = document.createElement('div');
      div.textContent = BOOT_LINES[i];
      if (i === visible - 1) div.className = 'cur';
      container.appendChild(div);
    }
  };
  render();
  const id = setInterval(() => {
    visible = Math.min(BOOT_LINES.length, visible + 1);
    render();
    if (visible >= BOOT_LINES.length) clearInterval(id);
  }, 220);
  return () => clearInterval(id);
}

function ready(fn) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  } else {
    fn();
  }
}

ready(() => {
  // 01 — Spectral Reliquary (the production visualizer at smaller size).
  const reliquary = document.querySelector('[data-exp="reliquary"]');
  if (reliquary) {
    mountPrismStage(reliquary, createSimulatedSpectrum({ bins: 48, kickStrength: 1.2 }), {
      bars: 48,
    });
  }

  // 02 — Linear / Subway.
  const linear = document.querySelector('[data-exp="linear"]');
  if (linear) mountLinearBars(linear, { bars: 48 });

  // 03 — Particle Reliquary.
  const particle = document.querySelector('[data-exp="particle"]');
  if (particle) mountParticlePrism(particle, { count: 300 });

  // 04 — Hexlattice.
  const hex = document.querySelector('[data-exp="hexlattice"]');
  if (hex) mountHexlattice(hex);

  // 05 — boot.divora terminal.
  const term = document.querySelector('[data-exp="terminal"]');
  if (term) mountTerminalLog(term);

  // 06 — Working Note is fully static markup.

  // Escape returns to the surface page.
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') window.location.href = 'index.html';
  });
});
