import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES = [
  { label: 'home', url: '/?test=1' },
  { label: 'lab', url: '/lab.html?test=1' },
];

for (const p of PAGES) {
  test(`a11y: ${p.label} has no serious/critical violations`, async ({ page }) => {
    await page.goto(p.url, { waitUntil: 'load' });
    const result = await new AxeBuilder({ page })
      // Bandcamp iframes are out of our control.
      .exclude('iframe[src*="bandcamp.com"]')
      // The visualizer canvas is decorative (aria-hidden); skip color-contrast
      // checks against arbitrary canvas pixels.
      .exclude('.hero-stage canvas, .lab-screen canvas')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const serious = result.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );

    // Pretty-print failures so a CI log makes them legible.
    if (serious.length) {
      const msg = serious
        .map(
          (v) =>
            `[${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node${v.nodes.length === 1 ? '' : 's'})\n  → ${v.helpUrl}`,
        )
        .join('\n');

      console.error(`axe violations on ${p.label}:\n${msg}`);
    }

    expect(serious).toEqual([]);
  });
}
