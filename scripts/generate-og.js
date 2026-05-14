// Generate the OG / Twitter share image.
//
// Boots a `vite preview` against the existing dist/, opens the home
// page in chromium at 1200×630 with `?test=1` (so the visualizer
// renders a deterministic frame), hides the cassette + nav so the
// composition is wordmark + visualizer ring only, and writes the
// screenshot to public/og.png.
//
// Usage:
//   npm run build         # ensure dist/ exists
//   npm run og:generate   # writes public/og.png
//
// Re-run whenever the hero design changes meaningfully. The image
// gets committed; we don't regenerate in CI to avoid drift between
// what's committed and what gets pushed to GH Pages.

import { preview } from 'vite';
import { chromium } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'public', 'og.png');
const PORT = 4174;

const server = await preview({
  root: ROOT,
  preview: { port: PORT, strictPort: true },
});

let exit = 0;
try {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1200, height: 630 },
    reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${PORT}/?test=1`, { waitUntil: 'load' });

  // Strip the chrome / cassette so the OG composition is just the
  // wordmark + visualizer ring on the deep-violet field.
  await page.addStyleTag({
    content: `
      .hero-controls, .hero-meta, .lab-hint, .nav { display: none !important; }
      body { overflow: hidden; }
      .hero { padding-top: 0; padding-bottom: 0; }
    `,
  });

  // Wait for fonts and one settled visualizer frame.
  await page.evaluate(() => document.fonts?.ready);
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );

  await page.screenshot({ path: OUT });
  await browser.close();
  // eslint-disable-next-line no-console
  console.log(`✓ Wrote ${path.relative(ROOT, OUT)}`);
} catch (err) {
  console.error('OG generation failed:', err);
  exit = 1;
} finally {
  // PreviewServer in Vite 6 exposes close() — try it, fall back to
  // closing the http server directly.
  if (typeof server.close === 'function') await server.close();
  else server.httpServer?.close();
}

process.exit(exit);
