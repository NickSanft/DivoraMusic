// Divora — main site entry. Imports styles and wires behaviors
// against the static markup in index.html.

import './tokens.css';
import './site.css';

// `?test=1` flips the page into deterministic mode — visualizer
// frame frozen, reveal observers short-circuited, cat parallax/blink
// off, disco sigil rotation off. Set the attribute as early as
// possible so CSS sees it before first paint.
if (
  typeof URLSearchParams !== 'undefined' &&
  new URLSearchParams(globalThis.location?.search || '').get('test') === '1'
) {
  document.documentElement.setAttribute('data-test', '1');
}

import { initNav } from './nav.js';
import { initReveal } from './reveal.js';
import { initHero } from './hero.js';
import { initContact } from './contact.js';
import { initLabHint } from './lab-hint.js';
import { initCat } from './cat.js';
import { initDiscoSigils } from './disco-sigils.js';
import { initLazyIframes } from './lazy-iframes.js';
import { initBoot } from './boot.js';

function ready(fn) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  } else {
    fn();
  }
}

ready(() => {
  initNav();
  initReveal();
  initHero();
  initContact();
  initLabHint();
  initCat();
  initDiscoSigils();
  initLazyIframes();
  // Boot last so all the other modules' state is in place before
  // the entrance choreography references them.
  initBoot();
});
