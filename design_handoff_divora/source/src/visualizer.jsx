// Divora — Prism Visualizer
// A radial spectrum visualizer that "breathes" with simulated audio.
// On the production site this would be wired to an HTMLAudioElement
// via the Web Audio API (AnalyserNode → getByteFrequencyData) — the
// hook signature here matches that contract so the swap is trivial.

(function () {
  function useSimulatedSpectrum(bins = 64, speed = 1, kickStrength = 1) {
    const [frame, setFrame] = React.useState(0);
    React.useEffect(() => {
      let raf, t0 = performance.now();
      const tick = (t) => {
        setFrame((t - t0) * 0.001 * speed);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }, [speed]);

    const spec = new Float32Array(bins);
    const beatPhase = (frame * 2) % 1;
    const kick = Math.max(0, 1 - beatPhase * 4) * 0.9 * kickStrength;
    const subKick = Math.max(0, 1 - ((frame * 1) % 1) * 3) * 0.5 * kickStrength;
    for (let i = 0; i < bins; i++) {
      const f = i / bins;
      const tilt = Math.pow(1 - f, 1.6);
      const slow = (Math.sin(frame * 1.2 + i * 0.3) * 0.5 + 0.5) * 0.6;
      const fast = (Math.sin(frame * 7 + i * 0.7) * 0.5 + 0.5) * 0.25;
      let v = tilt * (0.35 + slow * 0.55 + fast * 0.3);
      if (i < 6) v += kick * (1 - i / 6);
      if (i < 14 && i >= 6) v += subKick * (1 - (i - 6) / 8) * 0.7;
      spec[i] = Math.min(1, Math.max(0, v));
    }
    return { spec, frame, kick, beatPhase };
  }

  function PrismVisualizer({ width, height, bars = 56, intensity = 1, dim = false }) {
    const ref = React.useRef(null);
    const { spec, frame, kick } = useSimulatedSpectrum(bars, 1, intensity);

    React.useEffect(() => {
      const c = ref.current;
      if (!c) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = width * dpr;
      c.height = height * dpr;
      const ctx = c.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2, cy = height / 2;
      const innerR = Math.min(width, height) * 0.12;
      const maxR = Math.min(width, height) * 0.46;

      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < bars; i++) {
        const a = (i / bars) * Math.PI * 2 - Math.PI / 2;
        const v = spec[i % spec.length];
        const r1 = innerR + 8;
        const r2 = innerR + 14 + v * (maxR - innerR - 14);
        const hue = 260 + Math.sin(frame * 0.4 + i * 0.1) * 30 - v * 30;
        const sat = 70 + v * 30;
        const light = 55 + v * 25;
        const alpha = (dim ? 0.18 : 0.4) + v * (dim ? 0.25 : 0.5);
        ctx.strokeStyle = `hsla(${hue}, ${sat}%, ${light}%, ${alpha})`;
        ctx.lineWidth = (Math.PI * 2 * (innerR + 8) / bars) * 0.7;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
        ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
        ctx.stroke();
      }

      // refracted spectral rings
      const colors = ['#ff4d8f', '#ffb86b', '#c4a8ff', '#7c3aed', '#5cd9ff'];
      for (let band = 0; band < colors.length; band++) {
        const angOffset = (band - 2) * 0.06 + frame * 0.05;
        ctx.strokeStyle = colors[band];
        ctx.globalAlpha = dim ? 0.18 : 0.35;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        for (let i = 0; i <= bars; i++) {
          const a = (i / bars) * Math.PI * 2 - Math.PI / 2 + angOffset;
          const v = spec[i % spec.length];
          const r = innerR + 18 + v * (maxR - innerR - 14) * 0.95 + band * 2;
          const x = cx + Math.cos(a) * r;
          const y = cy + Math.sin(a) * r;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      }

      // central prism glow
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, innerR * (1.4 + kick * 0.6));
      g.addColorStop(0, `rgba(255, 200, 220, ${(dim ? 0.18 : 0.4) + kick * 0.3})`);
      g.addColorStop(0.3, `rgba(156, 92, 255, ${(dim ? 0.18 : 0.35) + kick * 0.2})`);
      g.addColorStop(1, 'rgba(20, 8, 40, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, innerR * 2.4, 0, Math.PI * 2);
      ctx.fill();
    }, [spec, frame, kick, width, height, bars, dim]);

    return <canvas ref={ref} style={{ width, height, display: 'block' }} />;
  }

  function PrismCore({ size = 240 }) {
    const { kick } = useSimulatedSpectrum(8, 1);
    return (
      <svg width={size} height={size} viewBox="0 0 240 240"
           style={{ position: 'absolute', left: '50%', top: '50%',
                    transform: `translate(-50%, -50%) scale(${1 + kick * 0.04})`,
                    transition: 'transform 60ms linear' }}>
        <defs>
          <radialGradient id="prismCoreG" cx="0.5" cy="0.4" r="0.65">
            <stop offset="0" stopColor="#ffe4c4" stopOpacity="0.95" />
            <stop offset="0.35" stopColor="#c4a8ff" stopOpacity="0.7" />
            <stop offset="0.75" stopColor="#7c3aed" stopOpacity="0.5" />
            <stop offset="1" stopColor="#1a0b2e" stopOpacity="0" />
          </radialGradient>
        </defs>
        <polygon points="120,28 198,84 198,156 120,212 42,156 42,84"
                 fill="url(#prismCoreG)" stroke="#c4a8ff" strokeWidth="0.8" opacity="0.95" />
        <polygon points="120,28 198,84 120,120 42,84"
                 fill="rgba(255,180,140,0.12)" stroke="#ffb86b" strokeWidth="0.4" opacity="0.7" />
        <polygon points="120,120 198,84 198,156 120,212"
                 fill="rgba(124,58,237,0.18)" stroke="#9d5cff" strokeWidth="0.4" opacity="0.7" />
        <polygon points="120,120 120,212 42,156 42,84"
                 fill="rgba(255,77,143,0.10)" stroke="#ff4d8f" strokeWidth="0.4" opacity="0.7" />
      </svg>
    );
  }

  // Auto-sizing wrapper that fills its parent (used for hero where size depends on viewport)
  function PrismStage({ bars = 56, intensity = 1, dim = false }) {
    const wrap = React.useRef(null);
    const [size, setSize] = React.useState({ w: 0, h: 0 });
    React.useEffect(() => {
      if (!wrap.current) return;
      const ro = new ResizeObserver(entries => {
        for (const e of entries) {
          const { width, height } = e.contentRect;
          setSize({ w: Math.max(100, width), h: Math.max(100, height) });
        }
      });
      ro.observe(wrap.current);
      return () => ro.disconnect();
    }, []);
    return (
      <div ref={wrap} style={{ position: 'relative', width: '100%', height: '100%' }}>
        {size.w > 0 && (
          <>
            <PrismVisualizer width={size.w} height={size.h} bars={bars} intensity={intensity} dim={dim} />
            <PrismCore size={Math.min(size.w, size.h) * 0.32} />
          </>
        )}
      </div>
    );
  }

  Object.assign(window, {
    DivoraVisualizer: { PrismVisualizer, PrismCore, PrismStage, useSimulatedSpectrum },
  });
})();
