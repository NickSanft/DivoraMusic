// Divora Lab — hidden experiments page
// Half code-sketchbook, half artist tomb. Mixed visualizers and primitives.

const { PrismStage, PrismVisualizer, PrismCore, useSimulatedSpectrum } = window.DivoraVisualizer;

// ── Experiment 1: linear spectrum bars ──
function LinearBars({ width = 320, height = 200, bars = 48 }) {
  const ref = React.useRef(null);
  const { spec } = useSimulatedSpectrum(bars, 1);
  React.useEffect(() => {
    const c = ref.current; if (!c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = width * dpr; c.height = height * dpr;
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const bw = width / bars;
    for (let i = 0; i < bars; i++) {
      const v = spec[i];
      const h = v * (height - 20);
      const g = ctx.createLinearGradient(0, height - h, 0, height);
      g.addColorStop(0, '#ff4d8f');
      g.addColorStop(0.5, '#c4a8ff');
      g.addColorStop(1, '#7c3aed');
      ctx.fillStyle = g;
      ctx.globalAlpha = 0.7 + v * 0.3;
      ctx.fillRect(i * bw + 1, height - h - 8, bw - 2, h);
    }
    // grid
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = '#c4a8ff';
    ctx.lineWidth = 0.5;
    for (let y = 0; y < 5; y++) {
      ctx.beginPath();
      ctx.moveTo(0, (height / 5) * y);
      ctx.lineTo(width, (height / 5) * y);
      ctx.stroke();
    }
  }, [spec, width, height, bars]);
  return <canvas ref={ref} style={{ width, height, display: 'block' }} />;
}

// ── Experiment 2: particle prism (canvas) ──
function ParticlePrism({ width = 320, height = 320, count = 280 }) {
  const ref = React.useRef(null);
  const particles = React.useRef([]);
  const { kick, frame } = useSimulatedSpectrum(8, 1);
  React.useEffect(() => {
    if (particles.current.length) return;
    for (let i = 0; i < count; i++) {
      particles.current.push({
        a: Math.random() * Math.PI * 2,
        r: Math.random() * 0.4 + 0.1,
        s: Math.random() * 0.4 + 0.2,
        hue: 240 + Math.random() * 80,
        life: Math.random(),
      });
    }
  }, [count]);
  React.useEffect(() => {
    const c = ref.current; if (!c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = width * dpr; c.height = height * dpr;
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = 'rgba(10, 4, 20, 0.18)';
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'lighter';
    const cx = width / 2, cy = height / 2;
    const R = Math.min(width, height) * 0.45;
    for (const p of particles.current) {
      p.a += p.s * 0.01 + kick * 0.02;
      p.life += 0.005;
      if (p.life > 1) { p.life = 0; p.r = Math.random() * 0.4 + 0.1; }
      const radius = R * (p.r + p.life * 0.4) * (1 + kick * 0.2);
      const x = cx + Math.cos(p.a) * radius;
      const y = cy + Math.sin(p.a) * radius;
      ctx.fillStyle = `hsla(${p.hue}, 80%, 65%, ${0.6 * (1 - p.life)})`;
      ctx.beginPath();
      ctx.arc(x, y, 1.2 + kick * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [frame, kick, width, height]);
  return <canvas ref={ref} style={{ width, height, display: 'block' }} />;
}

// ── Experiment 3: refraction wireframe ──
function RefractionWireframe({ width = 320, height = 320 }) {
  const ref = React.useRef(null);
  const { frame, kick } = useSimulatedSpectrum(8, 1);
  React.useEffect(() => {
    const c = ref.current; if (!c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = width * dpr; c.height = height * dpr;
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const cx = width / 2, cy = height / 2;
    const R = Math.min(width, height) * 0.4 * (1 + kick * 0.05);
    ctx.globalCompositeOperation = 'lighter';
    // 3 nested hexagons rotating slightly
    const colors = ['rgba(196,168,255,0.65)','rgba(255,77,143,0.55)','rgba(255,184,107,0.45)'];
    for (let k = 0; k < 3; k++) {
      ctx.strokeStyle = colors[k];
      ctx.lineWidth = 1;
      const rot = frame * (0.2 + k * 0.1) + k * 0.15;
      const r = R - k * 18;
      ctx.beginPath();
      for (let i = 0; i <= 6; i++) {
        const a = (i / 6) * Math.PI * 2 + rot;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      // connecting spokes
      ctx.lineWidth = 0.4;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + rot;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        ctx.stroke();
      }
    }
  }, [frame, kick, width, height]);
  return <canvas ref={ref} style={{ width, height, display: 'block' }} />;
}

// ── Experiment 4: terminal log scrolling ──
function TerminalLog() {
  const lines = [
    '> boot.divora _____________________ ok',
    '> mount /reliquary _______________ ok',
    '> spectrum.init fft=1024 ___________ ok',
    '> shader.refract::v0.3 ____________ ok',
    '> // candle warm: hsla(33, 80%, 60%)',
    '> // void cold: hsla(265, 70%, 18%)',
    '> // signal:noise ratio = 0.884',
    '> sigil.unlock(folio_iv) ___________ pending',
    '> awaiting kick: bpm ≈ 124 ________ ok',
    '> hello, you. there is no audience  here',
    '> press [escape] to return to surface',
  ];
  const [visible, setVisible] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setVisible(v => Math.min(lines.length, v + 1)), 220);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="lab-term">
      {lines.slice(0, visible).map((l, i) => (
        <div key={i} className={i === visible - 1 ? 'cur' : ''}>{l}</div>
      ))}
    </div>
  );
}

// ── lab page ──
function LabApp() {
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') window.location.href = 'divora.html';
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="lab-page">
      <header className="lab-header">
        <a href="divora.html" className="lab-back">
          <svg width="14" height="14" viewBox="0 0 14 14"><path d="M9 2 L3 7 L9 12" fill="none" stroke="currentColor" strokeWidth="1.2" /></svg>
          <span>return to surface</span>
        </a>
        <div className="lab-brand">
          <span className="lab-brand-tag">/lab</span>
          <span className="lab-brand-sub">// hidden chambers · v0.3</span>
        </div>
        <span className="lab-status">esc to exit</span>
      </header>

      <section className="lab-intro">
        <h1>You found the lab.</h1>
        <p>
          Sketches and code-ghosts. Some of these will end up in the visualizer.
          Some won&rsquo;t. None of them work yet.
        </p>
      </section>

      <section className="lab-grid">
        <article className="lab-card">
          <div className="lab-screen">
            <div style={{ width: 320, height: 320, position: 'relative' }}>
              <PrismVisualizer width={320} height={320} bars={48} intensity={1.2} />
              <PrismCore size={110} />
            </div>
          </div>
          <header>
            <span className="lab-num">01</span>
            <h3>Spectral Reliquary</h3>
          </header>
          <p>The shipping visualizer. Radial spectrum with refracted rings.</p>
          <code>visualizer.jsx :: PrismVisualizer</code>
        </article>

        <article className="lab-card">
          <div className="lab-screen">
            <LinearBars width={320} height={260} bars={48} />
          </div>
          <header>
            <span className="lab-num">02</span>
            <h3>Linear / Subway</h3>
          </header>
          <p>Old-school FFT bars with gradient fill. Stronger on phones.</p>
          <code>experiments/linear_bars.jsx</code>
        </article>

        <article className="lab-card">
          <div className="lab-screen">
            <ParticlePrism width={320} height={320} count={300} />
          </div>
          <header>
            <span className="lab-num">03</span>
            <h3>Particle Reliquary</h3>
          </header>
          <p>300 particles orbiting the core; outward push on the kick.</p>
          <code>experiments/particles.jsx</code>
        </article>

        <article className="lab-card">
          <div className="lab-screen">
            <RefractionWireframe width={320} height={320} />
          </div>
          <header>
            <span className="lab-num">04</span>
            <h3>Hexlattice</h3>
          </header>
          <p>Three counter-rotating hex rings + radial spokes. Wireframe sigil.</p>
          <code>experiments/hexlattice.jsx</code>
        </article>

        <article className="lab-card lab-card-wide">
          <div className="lab-screen lab-screen-term">
            <TerminalLog />
          </div>
          <header>
            <span className="lab-num">05</span>
            <h3>boot.divora</h3>
          </header>
          <p>The boot sequence I&rsquo;d show before the page loads if I were feeling indulgent.</p>
          <code>system/boot.jsx</code>
        </article>

        <article className="lab-card">
          <div className="lab-screen lab-screen-quote">
            <blockquote>
              <p>Some songs arrive as cathedrals. Some arrive as static.</p>
              <p>Both get released.</p>
            </blockquote>
          </div>
          <header>
            <span className="lab-num">06</span>
            <h3>Working Note</h3>
          </header>
          <p>Pinned to the wall of the studio. The whole pitch in two lines.</p>
          <code>notes/manifesto.md</code>
        </article>
      </section>

      <footer className="lab-footer">
        <span>/lab is undocumented · do not link · 26.05.12</span>
        <a href="divora.html">↩ surface</a>
      </footer>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<LabApp />);
