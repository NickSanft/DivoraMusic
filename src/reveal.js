// Reveal-on-scroll: every element with `.reveal` gets `.in` once it
// intersects the viewport. One-shot; we unobserve after firing.
// Honors prefers-reduced-motion by revealing everything immediately.

const prefersReduced =
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initReveal(root = document) {
  const targets = root.querySelectorAll('.reveal');

  if (prefersReduced || typeof IntersectionObserver === 'undefined') {
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
