// Reveal-on-scroll: every element with `.reveal` gets `.in` once it
// intersects the viewport. One-shot; we unobserve after firing.
// Reveals everything immediately when:
//   - prefers-reduced-motion is set,
//   - the page is loaded with ?test=1 (for deterministic snapshots),
//   - or IntersectionObserver is unavailable.

const prefersReduced =
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const isTest =
  typeof URLSearchParams !== 'undefined' &&
  new URLSearchParams(globalThis.location?.search || '').get('test') === '1';

export function initReveal(root = document) {
  const targets = root.querySelectorAll('.reveal');

  if (prefersReduced || isTest || typeof IntersectionObserver === 'undefined') {
    targets.forEach((el) => el.classList.add('in'));
    return () => {};
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      }
    },
    { threshold: 0.12 },
  );

  targets.forEach((el) => io.observe(el));
  return () => io.disconnect();
}
