// First-visit boot sequence + hero entrance choreography.
//
// On the first page load of a session, a black terminal overlay
// types a few mystical lines, then fades. Underneath, the hero
// stages itself in: visualizer ring fades in, the DIVORA wordmark
// stroke-draws via a clip-path wipe, the tagline fades, the
// cassette rises into the deck, and the switchers settle in.
//
// Subsequent loads in the same session, `?test=1`, and
// `prefers-reduced-motion: reduce` all skip everything — the page
// just renders settled.

const BOOT_LINES = [
  '> signal acquired _____________________ ok',
  '> prism aligned _______________________ ok',
  '> tape spindled _______________________ ok',
  '> sigil verified ______________________ ok',
  '> divora · awake',
];

const LINE_MS = 200; // per-line reveal interval
const FADE_MS = 320; // overlay fade-out
const SESSION_KEY = 'divora:booted';

const PREFERS_REDUCED =
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const IS_TEST =
  typeof URLSearchParams !== 'undefined' &&
  new URLSearchParams(globalThis.location?.search || '').get('test') === '1';

const SKIP = PREFERS_REDUCED || IS_TEST;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function alreadyBootedThisSession() {
  try {
    return globalThis.sessionStorage?.getItem(SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

function markBooted() {
  try {
    globalThis.sessionStorage?.setItem(SESSION_KEY, '1');
  } catch {
    // ignore
  }
}

export async function initBoot() {
  if (SKIP) return;
  if (alreadyBootedThisSession()) return;

  const overlay = document.querySelector('.boot-overlay');
  const hero = document.querySelector('.hero');
  if (!overlay || !hero) return;

  // Mark booted *before* running the animation so a mid-flight
  // reload doesn't replay it.
  markBooted();

  // — boot terminal —
  overlay.classList.add('active');
  const term = overlay.querySelector('.boot-term');
  if (term) term.textContent = '';
  for (let i = 0; i < BOOT_LINES.length; i += 1) {
    const div = document.createElement('div');
    div.className = 'boot-line';
    if (i === BOOT_LINES.length - 1) div.classList.add('boot-line-final');
    div.textContent = BOOT_LINES[i];
    term?.appendChild(div);
    await sleep(LINE_MS);
  }
  // Hold the last line briefly so the user actually reads it.
  await sleep(180);

  // — hero entrance —
  // Add `.first-boot` to the hero so its CSS animations fire, then
  // start the overlay fade. The two run in parallel — the overlay
  // dimming while the hero staging crossfades in beneath feels
  // like the deck booting up.
  hero.classList.add('first-boot');
  overlay.classList.add('fading');
  await sleep(FADE_MS);
  overlay.classList.remove('active', 'fading');
  // Strip the class after the longest stage finishes (1.4s).
  await sleep(1400);
  hero.classList.remove('first-boot');
}
