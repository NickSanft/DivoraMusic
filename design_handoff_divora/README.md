# Handoff: Divora — Artist Website

## Overview

A new website for the musician **Divora** (Nashville-based, working in synth and drum &amp; bass). The site is an **artist showcase that doubles as a quiet developer-skills demo** via a real-time audio-reactive visualizer that anchors the landing page.

Replaces the current site at <https://nick.sanft.com/music/>.

The aesthetic is **dark academia synth × crystalline geometry × subtle glitch**, on a deep void-purple palette with a warm magenta accent. Type voice is **mysterious / sparse**. Photo is used **subtly, stylized** — not as a background.

## About the design files

The files in this bundle (`source/divora.html`, `source/lab.html`, and the JSX/CSS modules under `source/src/`) are **design references created in HTML/React-via-Babel-standalone**. They are working prototypes meant to communicate intended look, feel, and behavior — **not production code to ship as-is**.

The task is to **recreate these designs in the appropriate production environment**:

- If a target framework is already in use, recreate the UI in it.
- Otherwise, recommended stack is **plain HTML + CSS + a single small bundle of JS for the visualizer** (Vite, Astro, or even no bundler). The site is small enough that a static-site build is ideal, and the prototype itself is structured close to that — `tokens.css` + `site.css` + `lab.css` + a small JS canvas module.
- React-via-Babel-standalone is **only used in the prototype for fast iteration**; the production version should drop it. There is no genuine need for React — the prototype's components map cleanly onto small JS modules driving plain HTML.

## Fidelity

**High-fidelity (hifi).** Final palette, type system, spacing, copy, and interactions are all set. Reproduce pixel-close, then adapt to the chosen production framework.

## Screens / Views

### 1. `index.html` — Main site (single page, anchor-scrolled sections)

**`#hero`** — landing.
- Full-viewport (`min-height: 100vh`), centered grid.
- Centerpiece is a **canvas audio-reactive visualizer**: a radial spectrum of bars + 5 refracted spectral rings + a central glowing hexagonal prism core (SVG, scaled by the kick).
- Overlaid in front: eyebrow line, giant outlined wordmark **DIVORA** (`font-family: Anton`, `clamp(60px, 16vw, 220px)`, `WebkitTextStroke: 1px rgba(196,168,255,0.6)`, faint violet text-shadow), serif italic tagline, **now-playing widget** (play button, track title, progress bar, time).
- Visualizer is sized `min(92vw, 880px)` square, capped by `max-height: 82vh`.
- Bottom-left/right meta strips: "NOW PLAYING · CROWNED IN STATIC" and "↓ SCROLL".
- See `screenshots/01-hero-desktop.png`.

**`#about` (I · The Artist)**
- 2-column grid (`0.85fr 1fr`, `gap: 80px`) at ≥880px; stacked on mobile.
- Left: photo clipped to a **hexagonal crystal silhouette** (`clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)`), with `mix-blend-mode: screen`, hue-shifted purple. SVG outer frame with two inset hexagons (faint lilac/violet strokes). Vertical "light leak" line down the center (`linear-gradient(to bottom, transparent, var(--candle), transparent)`, blurred).
- Right: section label, large serif-italic pull quote ("A musician in Nashville making synth, drum & bass, and whatever music feels true."), two short prose paragraphs, three-stat row (03 / 14 / 2013).
- See `screenshots/02-about-desktop.png`.

**`#latest` (II · Latest Transmission)**
- 2-column at ≥880px.
- Left: red-magenta "NEW · 2026" badge with leading dot, then the album title in `Anton`, italic serif blurb, dashed-divider tracklist (4 rows: number / title / duration).
- Right: **Bandcamp embed** for the latest album, framed in a `.latest-embed` container with corner brackets (top-left and bottom-right L-shapes via `::before`/`::after`).
- Bandcamp embed URL pattern: `https://bandcamp.com/EmbeddedPlayer/album=<ID>/size=large/bgcol=181a1b/linkcol=c4a8ff/tracklist=false/artwork=small/transparent=true/`. Latest album id: `1491704455` (placeholder; verify with Nick).
- See `screenshots/03-latest-desktop.png`.

**`#discography` (III · Discography)**
- Section title spans two lines: "THREE FOLIOS." / "ONE SIGNAL." (`Anton`, `clamp(36px, 7vw, 88px)`).
- Grid of 3 album cards (`grid-template-columns: repeat(3, 1fr)` at ≥1100px, `repeat(2,1fr)` at ≥720px, single column on mobile, `gap: 32px`).
- Each card: thin lilac border, dark inner bg, padding 18px, "FOL. NN" tag top-right, album title in `Anton`, year line in mono ("MMXXVI · 2026"), Bandcamp embed iframe.
- See `screenshots/04-discography-desktop.png`.

**`#contact` (IV · Get In Touch)**
- 2-column at ≥880px (`1.4fr 1fr`).
- Left: serif-italic pitch line ("Bookings, collaborations, prayers. Reach out — the door is unlocked.") + the email button. Email is a `.email` chip — violet-tinted bg, mono font, `divoramusic@gmail.com`, with a small "⎘ copy" affordance that flips to "✓ copied".
- Right: socials row — Mail, Bandcamp, Spotify, Instagram, SoundCloud — each a bordered button with a tiny inline SVG icon and uppercase mono label.
- See `screenshots/05-contact-desktop.png`.

**Footer**
- Copyright + location line, hairline border-top, mono uppercase.

**Sticky top nav** (always present)
- Brand: hex SVG mark + "DIVORA" wordmark (linked to `#hero`).
- Center links: About / Latest / Discography / Contact (mono, 11px, 0.18em tracking).
- Right: "● LIVE · NASHVILLE" status (ember magenta dot).
- Initially transparent with gradient veil; on scroll past 40px adds `rgba(8,2,15,0.72)` bg + 14px backdrop-blur + 1px lilac bottom border.
- Mobile (<880px): brand left, hamburger button right; links + status hidden. Tapping hamburger opens a full-screen overlay (96% opacity backdrop + blur) with 4 large-serif links centered.
- Scroll-spy: as the user scrolls, the link for the section currently in view gets `.active` (full opacity, mist color). Implemented with `IntersectionObserver` and `rootMargin: '-40% 0px -55% 0px'`.

### 2. `lab.html` — Hidden /lab page

A 'developer experiments' easter-egg page. Same dark-purple aesthetic, but with a **horizontal scanline grid** background (`repeating-linear-gradient`, 38px rows). See `screenshots/06-lab-desktop.png`.

- Sticky header bar: ← "RETURN TO SURFACE" link, center "/lab // hidden chambers · v0.3", right "ESC TO EXIT".
- Centered intro: "YOU FOUND THE LAB." in `Anton`, italic-serif subtitle "Sketches and code-ghosts. Some of these will end up in the visualizer. Some won't. None of them work yet."
- 3-column grid of "experiment" cards (responsive: 1 / 2 / 3 col). Each card: thin border with corner brackets, a square "screen" canvas, a header row with number + title, a short description, and a mono-italic file path.
- Six experiments:
  1. **Spectral Reliquary** — the production radial visualizer (reuses `PrismVisualizer` from `src/visualizer.jsx`).
  2. **Linear / Subway** — classic FFT bars with magenta→lilac→violet gradient and 5 horizontal grid lines.
  3. **Particle Reliquary** — 300 colored particles orbiting the prism, pushed outward on each kick.
  4. **Hexlattice** — three counter-rotating hex rings + radial spokes.
  5. **boot.divora** — 16:9 terminal card, scrolling boot log (line revealed every 220ms, blinking magenta cursor on the newest line).
  6. **Working Note** — a serif-italic blockquote: "Some songs arrive as cathedrals. Some arrive as static. / Both get released."
- Footer: `/lab is undocumented · do not link · 26.05.12` and a "↩ surface" link.

#### How users discover `/lab`

Three discoverability paths, all in `src/site.jsx` → `LabHint`:
1. **Scroll near page bottom** — a small prism dot fades in at `position: fixed; bottom: 18px; right: 18px;` (`.lab-hint.visible`, 0.45 opacity, rises to 1.0 on hover). Click → navigate to `lab.html`.
2. **Tap brand prism 5×** rapidly (`.nav-brand svg`) within 800ms gaps. The dot fades in after 3 taps.
3. **Konami code** — `↑ ↑ ↓ ↓ ← → ← → B A`. Navigates immediately.

`lab.html` listens for `Escape` and returns to `divora.html`.

## Interactions & Behavior

- **Scroll-spy nav**: active link reflects current section (IntersectionObserver, threshold via rootMargin).
- **Smooth scroll**: anchor link clicks use `window.scrollTo({behavior:'smooth'})` with `-60` offset for the sticky nav.
- **Reveal-on-scroll**: every major element has class `.reveal`, animated from `opacity:0; translateY(24px)` to `1; 0` over `0.8s ease`. Triggered by IntersectionObserver (`threshold: 0.12`), with optional `transitionDelay` for staggered reveals (used on disco cards: 0ms / 80ms / 160ms).
- **Visualizer**:
  - In the prototype, driven by a **simulated spectrum** (`useSimulatedSpectrum` in `src/visualizer.jsx`) — low-freq-heavy tilt, slow + fast sine modulations, 120bpm-ish kick on bars 0–6, sub-kick on 6–14.
  - In production, **wire this to the real Bandcamp audio**: create an `HTMLAudioElement` for the now-playing track (CORS allowing), pipe it through `AudioContext` → `AnalyserNode` (FFT 1024, smoothing ~0.85), and replace the simulated spectrum with `analyser.getByteFrequencyData(arr)` normalized 0..1. The hook signature is intentionally identical.
  - If Bandcamp CORS blocks the audio capture, host a short preview MP3 from the same origin, or render a still version of the visualizer (the simulated spectrum is good enough as a fallback).
- **Now-playing button**: click toggles play/pause (purely visual in the prototype). On real wiring, it controls the audio element.
- **Email**: click → `mailto:`; the small "⎘ copy" badge inside the chip copies to clipboard and flips to "✓ copied" for 1.6s. Right-click on the chip also copies.
- **Mobile menu**: tap burger → overlay opens (opacity transition 0.25s). Tap any link or the backdrop → closes.
- **Page chrome (grain)**: full-page subtle SVG turbulence noise overlay (`url("data:image/svg+xml;utf8,...")`), `mix-blend-mode: overlay`, 0.35 opacity, `pointer-events: none`, `z-index: 200`. Both pages use this.

## State Management

Minimal. Hooks needed (or equivalent vanilla state):
- `nav.scrolled: boolean` — past 40px y-scroll.
- `nav.open: boolean` — mobile menu open.
- `nav.active: string` — currently-visible section id.
- `hero.playing: boolean` — play/pause state.
- `hero.t: number` — derived from a `requestAnimationFrame` clock for the simulated playhead.
- `contact.copied: boolean` — 1.6s flash after copy.
- `lab.taps: number` — short-lived counter for the 5× tap easter egg.
- Reveal observers are fire-once.

No global store needed.

## Design Tokens

All in `source/src/tokens.css`. Treat this file as the source of truth.

### Colors

| Token        | Hex        | Usage |
|---|---|---|
| `--void`     | `#0a0414`  | deepest page bg in glitch contexts |
| `--ink`      | `#12081f`  | primary page bg |
| `--bg`       | `#1a0b2e`  | hero radial gradient inner stop |
| `--bg-2`     | `#241246`  | gradient mid |
| `--shade`    | `#2d1654`  | gradient upper |
| `--violet`   | `#7c3aed`  | primary purple (now-playing button, links accent) |
| `--violet-2` | `#9d5cff`  | violet hover |
| `--lilac`    | `#c4a8ff`  | secondary text, lines, mono labels |
| `--mist`     | `#ece4ff`  | primary foreground / body text |
| `--ember`    | `#ff4d8f`  | **warm magenta accent** — badges, live dot, progress bar end stop |
| `--coral`    | `#ff6b6b`  | warmer ember alt (used sparingly) |
| `--candle`   | `#ffb86b`  | warm highlight — refraction ring, photo leak |
| `--paper`    | `#f4eee6`  | parchment (currently unused in shipping; reserved) |
| `--line`     | `rgba(196,168,255,0.18)` | hairline borders / dividers |
| `--line-2`   | `rgba(196,168,255,0.32)` | hover hairline |

Hero radial gradient: `radial-gradient(ellipse at 50% -10%, rgba(124,58,237,0.25), transparent 50%), radial-gradient(ellipse at 80% 110%, rgba(255,77,143,0.12), transparent 50%), var(--ink)`.

### Typography

Fonts loaded via Google Fonts in `tokens.css`:
- **Anton** — display headline.
- **Oswald** — fallback / sub-display.
- **Inter Tight** — body UI (300/400/500/600/700).
- **JetBrains Mono** — mono labels, status, terminal (300/400/500).
- **Cormorant Garamond** — serif italic quotes and pitch lines.

Token aliases: `--f-display: 'Anton', 'Oswald', sans-serif; --f-ui: 'Inter Tight', system-ui, sans-serif; --f-mono: 'JetBrains Mono', ui-monospace, monospace; --f-serif: 'Cormorant Garamond', Georgia, serif;`

Type rules:
- Display: `font-family: var(--f-display); font-weight: 400; letter-spacing: 0.005–0.08em; text-transform: uppercase; line-height: 0.85.`
- Mono labels: `font-family: var(--f-mono); font-size: 10–11px; letter-spacing: 0.18–0.4em; text-transform: uppercase.`
- Serif accent: `font-family: var(--f-serif); font-style: italic; font-weight: 300.`
- Body: `Inter Tight 300, line-height 1.55.`

### Spacing & layout

- Section vertical padding: `80px` mobile, `140px` desktop.
- Section horizontal padding: `20px` mobile, `56px` desktop.
- Max content width: `1180px` (`.s-inner`).
- Grid gaps: `20–32px` mobile, `40–80px` desktop.
- Mobile breakpoint pivots: **720px** (2-col grids start), **880px** (desktop nav + about/contact layouts), **1100px** (3-col disco).

### Borders, shadows, effects

- Borders: `1px solid var(--line)` standard; `var(--line-2)` on hover.
- No traditional drop shadows. Light is done with **glow text-shadows** (`text-shadow: 0 0 60px rgba(124,58,237,0.3)` on the wordmark) and the global grain overlay.
- Card hover: `transform: translateY(-2px); border-color: var(--line-2);` (200ms).
- Backdrop-blur 10–20px on glass surfaces (now-playing widget, nav scrolled state, mobile overlay).

### Iconography

All inline SVG, 14px viewBox, 1px stroke or solid fills in `currentColor`/lilac. No icon font, no third-party icon library. Replace placeholder Spotify/Instagram/SoundCloud `href="#"` with real URLs from Divora.

## Assets

- **Artist photo** — referenced from `https://nick.sanft.com/music/static/divora.png` (the existing site). For production, **host the photo on the new domain** with the same path or update the constant `PHOTO_URL` in `src/site.jsx`. Heavily stylized in CSS (clip-path + grayscale + hue-rotate + saturate + screen blend) so the source can be a normal portrait.
- **Bandcamp album IDs** — placeholders in `src/site.jsx`:
  - `1491704455` — latest (Crowned in Static, 2026)
  - `1498558516` — Folio II (2021)
  - `95361347`  — Folio I (2014)
  - **Verify these with Nick before launch.** Track titles in `Latest` (`Crowned in Static`, `Cathedral / Cassette`, `Salt & Signal`, `Reliquary`) are placeholders matching the design's atmosphere — confirm or replace with the real tracklist.
- **Email** — `divoramusic@gmail.com` (constant `EMAIL` in `src/site.jsx`). Replace if Nick prefers a different contact address.

## Files

```
source/
├── divora.html           ← main site entry (replace with index.html in production)
├── lab.html              ← hidden /lab page (route as /lab or /lab.html)
└── src/
    ├── tokens.css        ← design tokens + font imports
    ├── site.css          ← main site styles
    ├── site.jsx          ← main site React components (port to your framework)
    ├── lab.css           ← /lab page styles
    ├── lab.jsx           ← /lab page React components (port to your framework)
    └── visualizer.jsx    ← canvas visualizer module (PrismVisualizer, PrismCore,
                            PrismStage, useSimulatedSpectrum) — reused in both pages
```

```
screenshots/
├── 01-hero-desktop.png          ← landing with visualizer + wordmark + now-playing
├── 02-about-desktop.png         ← Section I, photo treatment + bio
├── 03-latest-desktop.png        ← Section II, Bandcamp embed area appears dark
│                                  because cross-origin iframes don't render in
│                                  static captures — in the live page it shows
│                                  the embedded player
├── 04-discography-desktop.png   ← Section III, 3-card grid
├── 05-contact-desktop.png       ← Section IV, email + socials + footer
├── 06-lab-desktop.png           ← /lab landing with 3 of 6 experiment cards
└── 07-lab-desktop-scrolled.png  ← /lab further down
```

### Note about the hero screenshot

The visualizer is **animated, real-time canvas**. The screenshot captures a single representative frame (no kick, balanced bars). On the live site, the radial bars pulse with the beat, the prism core pulses subtly with the kick, and the spectral rings rotate slowly. See `src/visualizer.jsx` for the exact animation loop.

## Production checklist

1. **Drop React+Babel-standalone**. Port `site.jsx` and `lab.jsx` to plain JS (or to your framework). The components are small and have minimal state — straightforward.
2. **Replace simulated audio** with real Bandcamp/Spotify track via `AudioContext` + `AnalyserNode`. Honor autoplay restrictions: visualizer should run on the simulated source until the user clicks play.
3. **Verify Bandcamp album IDs and track titles** with Nick.
4. **Self-host the artist photo** on the new domain.
5. **Fill real social URLs** in `Contact` (`src/site.jsx`).
6. **Add SEO meta** beyond what's in the prototype: Open Graph image (a still of the visualizer is perfect), Twitter card, structured data for `MusicGroup`.
7. **Route `/lab`**: either keep as `lab.html` or set up a real `/lab` route. Add `<meta name="robots" content="noindex, nofollow">` (already present in the prototype).
8. **Performance**: preload the Google Fonts; consider self-hosting them. The visualizer canvas runs at 60fps via `requestAnimationFrame` — pause it when `document.hidden` to save battery.
9. **Accessibility**: nav links and now-playing button are real `<a>`/`<button>` elements. Confirm focus styles in production CSS; the prototype relies on browser defaults.
10. **Mobile QA**: the design is mobile-first; verify breakpoints at 360 / 390 / 720 / 880 / 1100 / 1280.
