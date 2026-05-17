# Divora

Artist site for **Divora** — Nashville musician, synth + DnD soundtracks. Single-page anchor-scrolled, with an audio-reactive prism visualizer, a cassette-tape player that flips between sides, and a hidden `/lab` page of canvas experiments.

- **Live:** <https://nicksanft.github.io/DivoraMusic/> and <https://nick.sanft.com/music/>
- **Bandcamp:** <https://divora.bandcamp.com/>

## Stack

- **Vite 6** multi-page build (`index.html` + `lab.html`)
- Vanilla JS, plain ES modules — no framework runtime
- Self-hosted fonts via `@fontsource` (Anton, Oswald, Inter Tight, JetBrains Mono, Cormorant Garamond — latin subset only)
- `sharp` for build-time image optimization
- **Playwright** for functional + visual regression + axe a11y
- **Lighthouse CI** for perf / a11y budgets on PRs and ad-hoc dispatch
- Deploys: **GitHub Pages** (automated via Actions) + manual upload of `dist/` to `nick.sanft.com/music`

## What's on the page

- **Hero with audio-reactive prism visualizer.** Four interchangeable styles selectable from the small `vis · I II III IV` switcher: Spectral Reliquary (the radial prism), Linear / Subway (bar spectrum), Particle Reliquary (orbiting particles), Hexlattice (counter-rotating hex rings). Choice persists in `localStorage`.
- **Sony-proportioned cassette tape player.** Two spinning reels with central hubs and 6-spoke radials, a label area with track title + side marker, a thin tape window at the bottom. Album-keyed accent color stripes the label edge. Spin speed pulses with audio amplitude (kick energy from the AnalyserNode).
- **Multi-track playback with eject/insert animation.** Three tracks (Gyrefolk Docks, Corruption Can Be Fun, Origins Of The Gyre). Same-album swaps trigger an in-place flip (B-side reveal); cross-album swaps trigger a full eject/insert with `TapeEject.mp3` + `TapeInsert.mp3` SFX and a tape-static glitch on the visualizer canvas during the swap.
- **First-visit boot terminal.** Once per session, a mono terminal types five mystical lines (`> signal acquired ___ ok` etc.) over ~1.2 seconds, then fades. Underneath, the hero stages itself in: visualizer ring scales up, the DIVORA wordmark stroke-draws via a clip-path wipe with a brief ember glow, tagline + cassette + switchers cascade in.
- **Persistent mini-player.** Slides in from the top when the user scrolls past the hero. Shows the current track + play/pause + a jump-back-to-the-cassette button.
- **Hidden `/lab` page.** Three discoverability paths: scroll near the bottom (a small prism dot fades in), tap the brand prism 5× rapidly, or enter the Konami code. Six experiment cards including a generative tape-static terminal, a particle reliquary, a hexlattice sigil, and the production visualizer.
- **Procedural disco sigils.** Each `.disco-item` has a hex-lattice sigil canvas seeded by its Bandcamp album ID — same album always renders the same sigil. Slowly rotates in CSS.
- **Cat parallax + idle blink.** The about-section portrait subtly tracks the cursor (±4 px) when it's inside `#about`. Independently blinks every 8–14 seconds.

## Keyboard shortcuts

| Key            | Action                        |
| -------------- | ----------------------------- |
| `Space`        | Play / pause                  |
| `F`            | Next track                    |
| `R`            | Previous track (rewind)       |
| `J` / `L`      | Seek −10s / +10s              |
| `M`            | Toggle mute                   |
| `Escape`       | Return to surface from `/lab` |
| `↑↑↓↓←→←→ B A` | Open `/lab`                   |

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

`vite.config.js` sets `base: './'` so the same `dist/` deploys to both `https://nicksanft.github.io/DivoraMusic/` and `https://nick.sanft.com/music/` without rebuilding.

Source maps build at `sourcemap: 'hidden'` — present on disk for error tracking but not auto-loaded by visitors' DevTools.

## Asset scripts

| Command                   | What it does                                                                                                                                             |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run images:optimize` | Re-run to regenerate `public/divora.webp` + `public/divora@2x.webp` from the PNG source.                                                                 |
| `npm run og:generate`     | Regenerate `public/og.png` (1200×630 wordmark + visualizer composition). Boots `vite preview`, screenshots via Playwright headless, writes to `public/`. |

## Test

```bash
npm test                                # full suite
npx playwright test tests/site.spec.js  # functional only
npx playwright test tests/visual.spec.js   # visual regression
npx playwright test tests/a11y.spec.js     # axe smoke
```

### `?test=1` deterministic flag

Appending `?test=1` to any URL puts the page into a deterministic mode used by Playwright snapshots:

- Visualizer simulated-spectrum clock locks to a fixed frame
- `.reveal` IntersectionObserver short-circuits — all reveals immediately apply
- Cat parallax + blink disabled
- Disco sigils stop rotating
- Boot terminal sequence is skipped
- Cassette eject/insert/flip animations finish instantly (the settled state is what gets snapshotted)

### Visual baselines

Live at [tests/visual.spec.js-snapshots/](tests/visual.spec.js-snapshots/), platform-suffixed:

- `*-chromium-win32.png` — local dev on Windows
- `*-chromium-linux.png` — CI Linux runners

After intentional design changes, regen locally for your OS:

```bash
npm run test:update-snapshots
```

For Linux baselines (matched to CI), trigger the **Update visual snapshots** workflow from the GitHub Actions UI. A bot commit lands the new PNGs.

Stability tricks baked in:

- Bandcamp iframes are masked from screenshots (cross-origin pixels)
- On `/lab`, the stateful canvas experiments (Particle Reliquary, Hexlattice) and the rolling terminal log are masked
- All animations gated by `?test=1` settle to their final state before the screenshot

## Deploy

**GitHub Pages** runs automatically on push to `main` after CI passes. See [.github/workflows/ci.yml](.github/workflows/ci.yml).

**Manual to `nick.sanft.com/music`** — `npm run build`, then upload the contents of `dist/` to the `/music/` path. Because `vite.config.js` sets `base: './'`, the same build works there with no changes.

## Source layout

```
src/
├── tokens.css            design tokens (colors, type, self-hosted fonts)
├── site.css              main page styles
├── lab.css               /lab page styles
├── main.js               entry: imports CSS + initialises every site module
├── lab.js                entry for /lab
├── boot.js               first-visit terminal + hero entrance choreography
├── nav.js                sticky nav, scroll-spy, mobile burger, URL hash sync
├── hero.js               owns the audio graph; mounts visualizer + cassette + mini-player
├── cassette.js           cassette UI: reels, label typewriter, eject/insert/flip
├── mini-player.js        persistent mini-player at top of viewport after scroll
├── tracks.js             track + album metadata
├── visualizer.js         PrismStage (canvas + SVG core) + simulated/analyser spectrum sources
├── lab-experiments.js    LinearBars, ParticlePrism, Hexlattice for /lab
├── disco-sigils.js       procedural hex-lattice sigils per album
├── cat.js                cursor parallax + idle blink on the artist photo
├── lazy-iframes.js       IntersectionObserver-driven Bandcamp iframe lazy-load
├── contact.js            email copy-to-clipboard chip
├── lab-hint.js           three /lab discovery paths
└── reveal.js             reveal-on-scroll IntersectionObserver

public/
├── divora.png            artist photo (canonical source)
├── divora.webp           optimized webp
├── divora@2x.webp        retina webp
├── og.png                share image (1200×630)
├── audio/                MP3 tracks
├── sounds/               tape eject/insert SFX
├── robots.txt
└── sitemap.xml

scripts/
├── generate-og.js        regenerate public/og.png
└── optimize-images.js    regenerate webp variants

tests/
├── site.spec.js          functional behaviors (52 cases)
├── visual.spec.js        per-breakpoint screenshot regression
├── a11y.spec.js          axe smoke test per page
└── visual.spec.js-snapshots/  committed baselines

design_handoff_divora/    original design prototype (read-only)
```

## Credits

Design handoff by Claude Design. Production build by Claude Code.
