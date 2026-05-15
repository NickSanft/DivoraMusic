// Persistent mini-player.
//
// Hidden by default. Becomes visible when the hero section is
// out of the viewport AND there's a track loaded. Mirrors the main
// cassette: play/pause toggles the host's audio, the jump button
// smooth-scrolls back to the hero so the user can see the full
// player + visualizer. The host (hero.js) tells us the current track
// and play state via setTrack() / setPlaying().

const playIcon = `<svg width="9" height="11" viewBox="0 0 10 12" aria-hidden="true"><polygon points="0,0 0,12 10,6" fill="currentColor"/></svg>`;
const pauseIcon = `<svg width="9" height="11" viewBox="0 0 10 12" aria-hidden="true"><rect x="0" y="0" width="3" height="12" fill="currentColor"/><rect x="7" y="0" width="3" height="12" fill="currentColor"/></svg>`;

export function initMiniPlayer({ onPlayPause } = {}) {
  const root = document.querySelector('.mini-player');
  const playBtn = root?.querySelector('.mini-play');
  const titleEl = root?.querySelector('.mini-title');
  const subEl = root?.querySelector('.mini-sub');
  const jumpBtn = root?.querySelector('.mini-jump');
  const hero = document.getElementById('hero');
  if (!root || !playBtn || !hero) return null;

  let heroInView = true;
  let isPlaying = false;
  let hasTrack = false;

  const sync = () => {
    // Show iff hero is out of view AND we've started a track at least
    // once. We don't gate on "currently playing" — once you've started,
    // the bar stays so you can pause from down the page.
    const shouldShow = !heroInView && hasTrack;
    root.classList.toggle('visible', shouldShow);
    root.setAttribute('aria-hidden', String(!shouldShow));
  };

  // Hero visibility — once hero leaves the top 15% of viewport we
  // consider it gone enough to surface the mini-player.
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        heroInView = e.isIntersecting;
      }
      sync();
    },
    { threshold: 0, rootMargin: '-15% 0px 0px 0px' },
  );
  io.observe(hero);

  // Play/pause delegates to the host.
  const onPlay = () => onPlayPause?.();
  playBtn.addEventListener('click', onPlay);

  // Jump back to the hero / cassette.
  const onJump = () => {
    hero.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  jumpBtn?.addEventListener('click', onJump);

  return {
    setTrack(track) {
      hasTrack = true;
      if (titleEl) titleEl.textContent = track.title;
      if (subEl) subEl.textContent = `${track.albumShort} · ${track.number}`;
      root.style.setProperty('--accent', track.accent);
      sync();
    },
    setPlaying(v) {
      isPlaying = !!v;
      playBtn.innerHTML = isPlaying ? pauseIcon : playIcon;
      playBtn.setAttribute('aria-pressed', String(isPlaying));
      playBtn.setAttribute('aria-label', isPlaying ? 'Pause preview' : 'Play preview');
    },
    destroy() {
      io.disconnect();
      playBtn.removeEventListener('click', onPlay);
      jumpBtn?.removeEventListener('click', onJump);
    },
  };
}
