// Idle-aliveness watcher.
//
// Tracks "last user input." After IDLE_MS of no input we add
// `.idle` to <body>. Any pointer move, keypress, touch, scroll, or
// focus event resets the timer and removes the class. CSS scopes
// the visible changes — see site.css for the actual idle styles.
//
// Skipped under `prefers-reduced-motion` and `?test=1` so visual
// baselines stay deterministic.

const IDLE_MS = 30_000;

const PREFERS_REDUCED =
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const IS_TEST =
  typeof URLSearchParams !== 'undefined' &&
  new URLSearchParams(globalThis.location?.search || '').get('test') === '1';

export function initIdle() {
  if (PREFERS_REDUCED || IS_TEST) return () => {};

  const body = document.body;
  let timer = 0;
  let isIdle = false;

  const wake = () => {
    if (isIdle) {
      body.classList.remove('idle');
      isIdle = false;
    }
    clearTimeout(timer);
    timer = setTimeout(() => {
      body.classList.add('idle');
      isIdle = true;
    }, IDLE_MS);
  };

  // First scheduling — even a passive user gets to "wake" the page
  // by doing anything within the first 30s.
  wake();

  const events = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'];
  for (const ev of events) {
    window.addEventListener(ev, wake, { passive: true });
  }

  return () => {
    clearTimeout(timer);
    for (const ev of events) {
      window.removeEventListener(ev, wake);
    }
    body.classList.remove('idle');
  };
}
