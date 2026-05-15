// Lazy-load the Bandcamp iframes via IntersectionObserver.
//
// Markup convention: an iframe with `data-src="..."` and no `src` is
// dormant. Once it intersects the viewport (or the rootMargin warmup
// zone), we copy data-src → src, which kicks off the iframe load.
// `loading="lazy"` is already on each iframe — this just gives us
// explicit control over the threshold + a placeholder we can style.
//
// Why bother on top of native lazy? Native lazy is conservative on
// iframes (Chrome won't defer if the iframe is < ~2 viewports
// below) and gives us no hook to render a placeholder. With this
// pattern the cross-origin Bandcamp player only mounts when the
// user actually scrolls anywhere near it.

const ROOT_MARGIN = '300px 0px';

export function initLazyIframes() {
  const targets = document.querySelectorAll('iframe[data-src]');
  if (!targets.length) return () => {};

  if (typeof IntersectionObserver === 'undefined') {
    // No IO support → just load everything immediately.
    targets.forEach((el) => {
      el.src = el.dataset.src;
      el.removeAttribute('data-src');
    });
    return () => {};
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target;
        if (el.dataset.src) {
          el.src = el.dataset.src;
          el.removeAttribute('data-src');
          el.parentElement?.classList.add('iframe-loaded');
        }
        io.unobserve(el);
      }
    },
    { rootMargin: ROOT_MARGIN },
  );

  targets.forEach((el) => io.observe(el));
  return () => io.disconnect();
}
