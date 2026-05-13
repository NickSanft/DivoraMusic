# Divora

Artist site for **Divora** — Nashville musician, synth + DnD soundtracks. A static one-pager anchored on a real-time, audio-reactive prism visualizer, plus a hidden `/lab` page of canvas experiments.

- Live: <https://nicksanft.github.io/DivoraMusic/> and <https://nick.sanft.com/music/>
- Bandcamp: <https://divora.bandcamp.com/>

## Stack

- **Vite 6** multi-page (`index.html` + `lab.html`)
- Vanilla JS, plain ES modules — no framework runtime
- Self-hosted fonts via `@fontsource` (Anton, Oswald, Inter Tight, JetBrains Mono, Cormorant Garamond — latin subset only)
- **Playwright** for functional + visual regression + axe a11y
- **Lighthouse CI** for performance & accessibility budgets on PRs
- Deploys: **GitHub Pages** (automated) + manual upload of `dist/` to `nick.sanft.com/music`

## Develop

```bash
nvm use            # Node 22
npm ci
npm run dev        # vite dev on :5173
```

## Build

```bash
npm run build      # → dist/
npm run preview    # serves dist/ on :4173
```

`vite.config.js` is set to `base: './'` so the same `dist/` deploys to both `https://nicksanft.github.io/DivoraMusic/` and `https://nick.sanft.com/music/` without rebuilding.

## Test

```bash
npm test                              # full suite
npx playwright test tests/site.spec.js     # functional only
npx playwright test tests/visual.spec.js   # visual regression
npx playwright test tests/a11y.spec.js     # axe smoke
```

Visual baselines live in [tests/visual.spec.js-snapshots/](tests/visual.spec.js-snapshots/) and are platform-suffixed (`-chromium-linux.png`, `-chromium-win32.png`). To regenerate them after intentional design changes:

```bash
npm run test:update-snapshots         # locally, for your OS
```

…or trigger the **Update visual snapshots** workflow from GitHub Actions for Linux baselines.

Visual stability tricks:

- `?test=1` query flag — freezes the simulated audio clock so the visualizer renders a deterministic frame, and short-circuits the reveal-on-scroll observer to mark all `.reveal` elements `.in` immediately.
- Bandcamp iframes, the lab's stateful canvas experiments, and the rolling terminal log are masked from screenshots — we don't own those pixels.

## Deploy

**GitHub Pages** — runs automatically on push to `main` after CI passes. See [.github/workflows/ci.yml](.github/workflows/ci.yml).

**Manual to `nick.sanft.com/music`** — `npm run build`, then upload the contents of `dist/` to the `/music/` path by whatever method you use today. Because `vite.config.js` sets `base: './'`, the same build works there with no changes.

## Layout

```
src/
├── tokens.css            design tokens (colors, type, fonts)
├── site.css              main page styles
├── lab.css               /lab page styles
├── main.js               entry: imports CSS + initialises site modules
├── lab.js                entry for /lab
├── nav.js                sticky nav, scroll-spy, mobile burger
├── hero.js               now-playing widget + audio + visualizer wiring
├── contact.js            email copy-to-clipboard
├── lab-hint.js           three /lab discovery paths
├── reveal.js             reveal-on-scroll observer
├── visualizer.js         PrismStage (canvas + SVG core) + spectrum sources
└── lab-experiments.js    LinearBars, ParticlePrism, Hexlattice for /lab

public/
├── divora.png            artist photo (self-hosted)
├── audio/gyrefolk-docks.mp3  hero audio source
├── robots.txt
└── sitemap.xml

tests/
├── site.spec.js          functional behaviors
├── visual.spec.js        per-breakpoint screenshot regression
├── a11y.spec.js          axe smoke test per page
└── visual.spec.js-snapshots/  committed baselines

design_handoff_divora/    original design prototype (read-only)
```

## Credits

Design handoff by Claude Design. Production build by Claude Code.
