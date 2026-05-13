import { test, expect } from '@playwright/test';

// Five breakpoint pivots from the design README:
//   720  — 2-col grids start
//   880  — desktop nav + about/contact layouts
//   1100 — 3-col disco (legacy; we use 2-col now)
//   1280 — wide desktop
// Viewport HEIGHT is held to a standard 800px because the hero
// uses `min-height: 100vh` — making it taller would balloon the
// hero section and push every other section past the fold. Full-
// page snapshots scroll-and-paint regardless.
const WIDTHS = [
  { label: '360', width: 360, height: 800 },
  { label: '720', width: 720, height: 800 },
  { label: '880', width: 880, height: 800 },
  { label: '1100', width: 1100, height: 800 },
  { label: '1280', width: 1280, height: 800 },
];

const PAGES = [
  { label: 'home', url: '/?test=1' },
  { label: 'lab', url: '/lab.html?test=1' },
];

async function settle(page) {
  // Make sure web fonts are applied before snapshotting.
  await page.evaluate(() => document.fonts?.ready);
  // Two RAF ticks lets the visualizer paint its first stable frame
  // and the reveal observer apply its classes.
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
}

for (const p of PAGES) {
  test.describe(`visual: ${p.label}`, () => {
    for (const v of WIDTHS) {
      test(`@ ${v.label}px`, async ({ page }) => {
        await page.setViewportSize({ width: v.width, height: v.height });
        await page.goto(p.url, { waitUntil: 'load' });
        await settle(page);
        // Mask:
        //   - Bandcamp iframes — cross-origin, not our pixels.
        //   - /lab particle/terminal experiments — these carry state
        //     (orbit particles, line-by-line terminal log) that drift
        //     between Playwright's screenshot retries even with the
        //     simulated clock frozen. Layout around them is unmasked.
        //   The hero visualizer on the home page is deterministic
        //   (frame locked by ?test=1, no other state), so it's not
        //   masked.
        const masks = [page.locator('iframe[src*="bandcamp.com"]')];
        if (p.label === 'lab') {
          masks.push(
            page.locator('.lab-screen canvas'),
            // Mask the whole terminal screen, not just .lab-term: the
            // inner div grows as new boot lines append, so its bbox
            // changes between consecutive screenshot retries.
            page.locator('.lab-screen-term'),
          );
        }
        await expect(page).toHaveScreenshot(`${p.label}-${v.label}.png`, {
          fullPage: true,
          mask: masks,
        });
      });
    }
  });
}
