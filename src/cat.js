// Subtle parallax + occasional blink on the about-section photo.
//
// Eye-tracking on the source illustration would look wrong (the cat
// has stylized slit-eyes, not round pupils). Instead, the whole
// photo translates a few pixels following the cursor while it's in
// the about section — reads as "the cat is watching you." Paired
// with a brief vertical-scale blink every 8–14 seconds.
//
// Disabled under `?test=1` and `prefers-reduced-motion` so it stays
// out of visual regression baselines and respects user preference.

const PREFERS_REDUCED =
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const IS_TEST =
  typeof URLSearchParams !== 'undefined' &&
  new URLSearchParams(globalThis.location?.search || '').get('test') === '1';

const SKIP = PREFERS_REDUCED || IS_TEST;

const MAX_PARALLAX_PX = 4;
const BLINK_MIN_MS = 8000;
const BLINK_MAX_MS = 14000;
const BLINK_DURATION_MS = 180;

export function initCat() {
  if (SKIP) return () => {};

  const about = document.getElementById('about');
  const photo = document.querySelector('.about-photo');
  const shift = photo?.querySelector('.cat-shift');
  if (!about || !photo || !shift) return () => {};

  // — blink loop —
  let blinkTimer = 0;
  const scheduleBlink = () => {
    const delay = BLINK_MIN_MS + Math.random() * (BLINK_MAX_MS - BLINK_MIN_MS);
    blinkTimer = setTimeout(() => {
      shift.classList.add('blink');
      setTimeout(() => shift.classList.remove('blink'), BLINK_DURATION_MS);
      scheduleBlink();
    }, delay);
  };
  scheduleBlink();

  // — cursor parallax (only while the cursor is within #about) —
  let raf = 0;
  let targetX = 0;
  let targetY = 0;
  let curX = 0;
  let curY = 0;

  const tick = () => {
    curX += (targetX - curX) * 0.12;
    curY += (targetY - curY) * 0.12;
    shift.style.transform = `translate(${curX.toFixed(2)}px, ${curY.toFixed(2)}px)`;
    const settled = Math.abs(targetX - curX) < 0.05 && Math.abs(targetY - curY) < 0.05;
    if (!settled) raf = requestAnimationFrame(tick);
    else raf = 0;
  };

  const setTarget = (x, y) => {
    targetX = x;
    targetY = y;
    if (!raf) raf = requestAnimationFrame(tick);
  };

  const onMove = (e) => {
    // Touch devices on mobile fire one mousemove on tap; that's fine
    // but the @media (hover: hover) gate on the about-photo means
    // we ignore the parallax effect entirely for non-hover devices.
    if (typeof matchMedia !== 'undefined' && !matchMedia('(hover: hover)').matches) return;
    const r = photo.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    // distance from photo center, normalized to [-1, 1] across viewport
    const dx = Math.max(-1, Math.min(1, (e.clientX - cx) / window.innerWidth));
    const dy = Math.max(-1, Math.min(1, (e.clientY - cy) / window.innerHeight));
    setTarget(dx * MAX_PARALLAX_PX, dy * MAX_PARALLAX_PX);
  };

  const onLeave = () => setTarget(0, 0);

  about.addEventListener('mousemove', onMove);
  about.addEventListener('mouseleave', onLeave);

  return () => {
    clearTimeout(blinkTimer);
    if (raf) cancelAnimationFrame(raf);
    about.removeEventListener('mousemove', onMove);
    about.removeEventListener('mouseleave', onLeave);
  };
}
