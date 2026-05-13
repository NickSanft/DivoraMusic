// Divora — main site entry. Imports styles and wires behaviors
// against the static markup in index.html.

import './tokens.css';
import './site.css';

import { initNav } from './nav.js';
import { initReveal } from './reveal.js';
import { initHero } from './hero.js';
import { initContact } from './contact.js';
import { initLabHint } from './lab-hint.js';

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
});
