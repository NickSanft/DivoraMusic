// Divora — main site components

const PHOTO_URL = 'https://nick.sanft.com/music/static/divora.png';
const EMAIL = 'divoramusic@gmail.com';
const { PrismStage, useSimulatedSpectrum } = window.DivoraVisualizer;

// ── tiny utility: reveal on scroll ──
function useReveal() {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return ref;
}
function Reveal({ children, as: Tag = 'div', className = '', ...rest }) {
  const ref = useReveal();
  return <Tag ref={ref} className={`reveal ${className}`} {...rest}>{children}</Tag>;
}

// ── nav ──
function Nav({ onOpenLab }) {
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState('hero');

  React.useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  React.useEffect(() => {
    const ids = ['hero', 'about', 'latest', 'discography', 'contact'];
    const els = ids.map(id => document.getElementById(id)).filter(Boolean);
    if (!els.length) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id); });
    }, { rootMargin: '-40% 0px -55% 0px' });
    els.forEach(e => io.observe(e));
    return () => io.disconnect();
  }, []);

  const links = [
    { id: 'about', label: 'About' },
    { id: 'latest', label: 'Latest' },
    { id: 'discography', label: 'Discography' },
    { id: 'contact', label: 'Contact' },
  ];

  const go = (id) => (e) => {
    e.preventDefault();
    setOpen(false);
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.offsetTop - 60, behavior: 'smooth' });
  };

  return (
    <>
      <header className={`nav ${scrolled ? 'scrolled' : ''}`}>
        <a href="#hero" onClick={go('hero')} className="nav-brand">
          <svg viewBox="0 0 22 22" aria-hidden>
            <polygon points="11,2 19,7 19,15 11,20 3,15 3,7" fill="none" stroke="var(--lilac)" strokeWidth="1.2" />
            <polygon points="11,2 19,7 11,11 3,7" fill="var(--violet)" opacity="0.7" />
          </svg>
          DIVORA
        </a>
        <nav className="nav-links" aria-label="Primary">
          {links.map(l => (
            <a key={l.id} href={`#${l.id}`} onClick={go(l.id)} className={active === l.id ? 'active' : ''}>{l.label}</a>
          ))}
        </nav>
        <span className="nav-status">● LIVE · NASHVILLE</span>
        <button className="nav-burger" aria-label="Open menu" onClick={() => setOpen(o => !o)}>
          <svg width="14" height="10" viewBox="0 0 14 10">
            <line x1="0" y1="1" x2="14" y2="1" stroke="var(--mist)" strokeWidth="1.2" />
            <line x1="0" y1="5" x2="14" y2="5" stroke="var(--mist)" strokeWidth="1.2" />
            <line x1="0" y1="9" x2="14" y2="9" stroke="var(--mist)" strokeWidth="1.2" />
          </svg>
        </button>
      </header>

      <div className={`nav-overlay ${open ? 'open' : ''}`} onClick={() => setOpen(false)}>
        <nav aria-label="Mobile">
          {links.map(l => (
            <a key={l.id} href={`#${l.id}`} onClick={go(l.id)}>{l.label}</a>
          ))}
        </nav>
      </div>
    </>
  );
}

// ── hero ──
function Hero() {
  const [playing, setPlaying] = React.useState(true);
  const { frame, kick } = useSimulatedSpectrum(8, 1);
  // animate the progress with frame
  const t = (frame % 278) | 0; // mm:ss out of 4:38
  const mm = String((t / 60) | 0).padStart(2, '0');
  const ss = String(t % 60).padStart(2, '0');
  const pct = Math.min(100, (t / 278) * 100);

  return (
    <section id="hero" className="hero">
      <div className="hero-stage" aria-hidden>
        <div>
          <PrismStage bars={64} intensity={1} />
        </div>
      </div>

      <div className="hero-overlay">
        <div className="hero-eyebrow">est. mmxiii · nashville</div>
        <h1 className="hero-title">DIVORA</h1>
        <p className="hero-tag">synth · drum &amp; bass · whatever I feel like</p>

        <button className="now-playing" type="button" onClick={() => setPlaying(p => !p)}>
          <span className="np-play" aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? (
              <svg width="10" height="12" viewBox="0 0 10 12"><rect x="0" y="0" width="3" height="12" fill="currentColor" /><rect x="7" y="0" width="3" height="12" fill="currentColor" /></svg>
            ) : (
              <svg width="10" height="12" viewBox="0 0 10 12"><polygon points="0,0 0,12 10,6" fill="currentColor" /></svg>
            )}
          </span>
          <span className="np-meta">
            <span className="np-title">CROWNED IN STATIC</span>
            <span className="np-sub">Divora · 2026 · 01 / 06</span>
          </span>
          <span className="np-bar"><div style={{ width: `${pct}%` }} /></span>
          <span className="np-time">{mm}:{ss} / 04:38</span>
        </button>
      </div>

      <div className="hero-meta">
        <span>now playing · crowned in static</span>
        <span>↓ scroll</span>
      </div>
    </section>
  );
}

// ── about ──
function About() {
  return (
    <section id="about" className="s">
      <div className="s-inner">
        <Reveal className="s-label">I · The Artist</Reveal>
        <div className="about">
          <Reveal className="about-photo">
            <svg className="frame" viewBox="0 0 100 133" preserveAspectRatio="none">
              <polygon points="50,1 99,25 99,108 50,132 1,108 1,25" fill="none" stroke="var(--lilac)" strokeWidth="0.3" opacity="0.6" />
              <polygon points="50,3 97,26 97,107 50,130 3,107 3,26" fill="none" stroke="var(--violet)" strokeWidth="0.15" opacity="0.5" />
            </svg>
            <div className="clip">
              <img src={PHOTO_URL} alt="Divora" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            </div>
            <div className="leak" />
          </Reveal>

          <div className="about-body">
            <Reveal>
              <p className="quote">A musician in Nashville making synth, drum &amp; bass, and whatever music feels true.</p>
            </Reveal>
            <Reveal>
              <p>Writing under the name Divora since 2013 — three records, fourteen tracks, no genre.</p>
              <p>Some songs arrive as cathedrals. Some arrive as static. Both get released.</p>
            </Reveal>
            <Reveal as="div" className="about-stats">
              <div className="about-stat"><b>03</b>Albums</div>
              <div className="about-stat"><b>14</b>Tracks</div>
              <div className="about-stat"><b>2013</b>Est.</div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── latest release ──
function Latest() {
  // newest album is Bandcamp 1491704455 per the existing site
  const tracks = [
    { n: '01', ttl: 'Crowned in Static', t: '4:38' },
    { n: '02', ttl: 'Cathedral / Cassette', t: '3:52' },
    { n: '03', ttl: 'Salt &amp; Signal', t: '5:14' },
    { n: '04', ttl: 'Reliquary', t: '4:01' },
  ];
  return (
    <section id="latest" className="s">
      <div className="s-inner">
        <Reveal className="s-label">II · Latest Transmission</Reveal>
        <div className="latest">
          <Reveal as="div" className="latest-meta">
            <span className="badge">new · 2026</span>
            <h2 className="latest-album">Crowned in Static</h2>
            <p className="latest-blurb">A record about candle-lit interfaces and the holiness of broken signals.</p>
            <div className="latest-tracks">
              {tracks.map(t => (
                <div className="row" key={t.n}>
                  <span className="n">{t.n}</span>
                  <span className="ttl" dangerouslySetInnerHTML={{ __html: t.ttl }} />
                  <span>{t.t}</span>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal className="latest-embed">
            <iframe
              src="https://bandcamp.com/EmbeddedPlayer/album=1491704455/size=large/bgcol=181a1b/linkcol=c4a8ff/tracklist=false/artwork=small/transparent=true/"
              title="Divora — Crowned in Static"
              seamless
              loading="lazy"
            />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// ── discography ──
function Discography() {
  const albums = [
    { id: 1491704455, title: 'Crowned in Static', year: '2026', num: '03' },
    { id: 1498558516, title: 'Folio II', year: '2021', num: '02' },
    { id: 95361347,   title: 'Folio I',  year: '2014', num: '01' },
  ];
  return (
    <section id="discography" className="s">
      <div className="s-inner">
        <Reveal className="s-label">III · Discography</Reveal>
        <Reveal><h2 className="s-title">Three folios.<br/>One signal.</h2></Reveal>
        <div className="disco-grid">
          {albums.map((a, i) => (
            <Reveal key={a.id} className="disco-item" style={{ transitionDelay: `${i * 80}ms` }}>
              <span className="disco-num">FOL. {a.num}</span>
              <h3>{a.title}</h3>
              <span className="yr">MMXXVI · {a.year}</span>
              <iframe
                src={`https://bandcamp.com/EmbeddedPlayer/album=${a.id}/size=large/bgcol=181a1b/linkcol=c4a8ff/tracklist=false/artwork=small/transparent=true/`}
                title={`Divora — ${a.title}`}
                seamless
                loading="lazy"
              />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── contact ──
function Contact() {
  const [copied, setCopied] = React.useState(false);
  const copy = (e) => {
    e.preventDefault();
    navigator.clipboard?.writeText(EMAIL);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <section id="contact" className="s">
      <div className="s-inner">
        <Reveal className="s-label">IV · Get In Touch</Reveal>
        <div className="contact">
          <Reveal>
            <p className="pitch">Bookings, collaborations, prayers. Reach out — the door is unlocked.</p>
            <a href={`mailto:${EMAIL}`} className="email" onContextMenu={copy}>
              {EMAIL}
              <span className="copy" onClick={copy} title="Copy">{copied ? '✓ copied' : '⎘ copy'}</span>
            </a>
          </Reveal>
          <Reveal as="div" className="socials">
            <a href={`mailto:${EMAIL}`} aria-label="Email">
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1"><rect x="1" y="3" width="12" height="9" /><path d="M1 4 L7 8 L13 4" /></svg>
              Mail
            </a>
            <a href="https://divoramusic.bandcamp.com" target="_blank" rel="noreferrer" aria-label="Bandcamp">
              <svg viewBox="0 0 14 14" fill="currentColor"><polygon points="0,11 4,3 14,3 10,11" /></svg>
              Bandcamp
            </a>
            <a href="#" aria-label="Spotify">
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1"><circle cx="7" cy="7" r="6" /><path d="M3 6 Q7 4.5 11 6.5 M3.5 8 Q7 7 10.5 8.5 M4 10 Q7 9.5 10 10.5" /></svg>
              Spotify
            </a>
            <a href="#" aria-label="Instagram">
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1"><rect x="1.5" y="1.5" width="11" height="11" rx="3" /><circle cx="7" cy="7" r="2.5" /><circle cx="10.5" cy="3.5" r="0.6" fill="currentColor" /></svg>
              Instagram
            </a>
            <a href="#" aria-label="SoundCloud">
              <svg viewBox="0 0 14 14" fill="currentColor"><path d="M1 9 L1 11 M2.5 7.5 L2.5 11 M4 7 L4 11 M5.5 6 L5.5 11 M7 5 L7 11 L13 11 Q13.8 11 13.8 10.2 L13.8 8.4 Q13.8 7 12 7 Q11.5 5 9.5 5 Q8 5 7 5" /></svg>
              SoundCloud
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// ── footer ──
function Footer() {
  return (
    <footer>
      <span>© 2013 — 2026 · Divora · All rights reserved</span>
      <span className="right">Nashville · Built with care</span>
    </footer>
  );
}

// ── hidden lab discovery ──
function LabHint() {
  const [visible, setVisible] = React.useState(false);
  const [taps, setTaps] = React.useState(0);
  const tapTimer = React.useRef(null);

  React.useEffect(() => {
    // Reveal after scrolling near the bottom OR after Konami code
    const onScroll = () => {
      const nearBottom = window.scrollY + window.innerHeight > document.body.scrollHeight - 400;
      if (nearBottom) setVisible(true);
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    // Konami: ↑↑↓↓←→←→BA
    const seq = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
    let idx = 0;
    const onKey = (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (k === seq[idx]) {
        idx++;
        if (idx === seq.length) {
          window.location.href = 'lab.html';
        }
      } else {
        idx = (k === seq[0]) ? 1 : 0;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  // Tap the prism logo 5 times rapidly to reveal lab (mobile easter egg)
  React.useEffect(() => {
    const onClick = (e) => {
      if (e.target.closest('.nav-brand svg')) {
        e.preventDefault();
        clearTimeout(tapTimer.current);
        const next = taps + 1;
        setTaps(next);
        if (next >= 5) {
          window.location.href = 'lab.html';
          return;
        }
        tapTimer.current = setTimeout(() => setTaps(0), 800);
        if (next >= 3) setVisible(true);
      }
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [taps]);

  return (
    <a href="lab.html" className={`lab-hint ${visible ? 'visible' : ''}`} title="Enter the lab" aria-label="Enter the lab">
      <svg viewBox="0 0 14 14" fill="none" stroke="var(--lilac)" strokeWidth="1">
        <polygon points="7,1.5 12,4.5 12,9.5 7,12.5 2,9.5 2,4.5" />
        <circle cx="7" cy="7" r="1.5" fill="var(--ember)" stroke="none" />
      </svg>
    </a>
  );
}

// ── app ──
function App() {
  return (
    <div className="page">
      <Nav />
      <Hero />
      <About />
      <Latest />
      <Discography />
      <Contact />
      <Footer />
      <LabHint />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
