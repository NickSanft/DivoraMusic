// Sticky nav: adds `.scrolled` past 40px, runs a scroll-spy that
// flags the in-view section's link as `.active`, and toggles the
// mobile overlay. Smooth-scrolls anchor clicks with -60px offset
// to clear the fixed header.

const SCROLL_THRESHOLD = 40;
const SCROLL_OFFSET = 60;
const SECTION_IDS = ['hero', 'about', 'latest', 'discography', 'contact'];

export function initNav() {
  const nav = document.querySelector('.nav');
  if (!nav) return () => {};

  const overlay = document.querySelector('.nav-overlay');
  const burger = nav.querySelector('.nav-burger');
  const allLinks = document.querySelectorAll('.nav a[href^="#"], .nav-overlay a[href^="#"]');

  // — scrolled state —
  const onScroll = () => {
    nav.classList.toggle('scrolled', window.scrollY > SCROLL_THRESHOLD);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // — scroll-spy —
  const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
  const linksById = new Map();
  navLinks.forEach((a) => {
    const id = a.getAttribute('href').slice(1);
    linksById.set(id, a);
  });

  const sections = SECTION_IDS.map((id) => document.getElementById(id)).filter(Boolean);
  let spy;
  if (sections.length && typeof IntersectionObserver !== 'undefined') {
    spy = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          for (const a of navLinks) a.classList.remove('active');
          const a = linksById.get(e.target.id);
          if (a) a.classList.add('active');
        }
      },
      { rootMargin: '-40% 0px -55% 0px' },
    );
    sections.forEach((s) => spy.observe(s));
  }

  // — mobile menu toggle —
  const closeOverlay = () => overlay?.classList.remove('open');
  const toggleOverlay = () => overlay?.classList.toggle('open');
  burger?.addEventListener('click', toggleOverlay);
  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) closeOverlay();
  });

  // — smooth-scroll anchors, with header offset —
  const onAnchorClick = (e) => {
    const a = e.currentTarget;
    const id = a.getAttribute('href').slice(1);
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    closeOverlay();
    const y = target.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET;
    window.scrollTo({ top: y, behavior: 'smooth' });
    history.replaceState(null, '', `#${id}`);
  };
  allLinks.forEach((a) => a.addEventListener('click', onAnchorClick));

  return () => {
    window.removeEventListener('scroll', onScroll);
    spy?.disconnect();
    burger?.removeEventListener('click', toggleOverlay);
    allLinks.forEach((a) => a.removeEventListener('click', onAnchorClick));
  };
}
