// Three paths to discover /lab:
//   1. Scroll within 400px of page bottom → dot fades in.
//   2. Tap the brand prism (.nav-brand svg) 5× within 800ms gaps.
//      After 3 taps the dot fades in; after 5, navigate.
//   3. Konami code (↑↑↓↓←→←→ B A) anywhere on the page → navigate.

const LAB_URL = 'lab.html';
const KONAMI = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a',
];

export function initLabHint() {
  const hint = document.querySelector('.lab-hint');
  if (!hint) return () => {};

  const reveal = () => hint.classList.add('visible');

  // — path 1: near-bottom scroll —
  const onScroll = () => {
    if (window.scrollY + window.innerHeight > document.body.scrollHeight - 400) reveal();
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // — path 2: 5× brand-tap —
  let taps = 0;
  let tapTimer = 0;
  const brandPrism = document.querySelector('.nav-brand svg');
  const onBrandClick = (e) => {
    e.preventDefault();
    clearTimeout(tapTimer);
    taps += 1;
    if (taps >= 5) {
      window.location.href = LAB_URL;
      return;
    }
    if (taps >= 3) reveal();
    tapTimer = setTimeout(() => {
      taps = 0;
    }, 800);
  };
  brandPrism?.addEventListener('click', onBrandClick);

  // — path 3: Konami code —
  let idx = 0;
  const onKey = (e) => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (k === KONAMI[idx]) {
      idx += 1;
      if (idx === KONAMI.length) {
        window.location.href = LAB_URL;
      }
    } else {
      idx = k === KONAMI[0] ? 1 : 0;
    }
  };
  window.addEventListener('keydown', onKey);

  return () => {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('keydown', onKey);
    brandPrism?.removeEventListener('click', onBrandClick);
    clearTimeout(tapTimer);
  };
}
