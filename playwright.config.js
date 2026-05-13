import { defineConfig, devices } from '@playwright/test';

// Local vs CI:
//   - Local: build once, reuse server if it's up.
//   - CI: full run, fail on missing snapshots.
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? [['list'], ['html', { open: 'never' }]] : 'list',

  // Cross-platform pixel drift on canvas + font hinting is real.
  // 0.5% leeway is enough to absorb subpixel differences without
  // letting real regressions through.
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.005,
      animations: 'disabled',
      caret: 'hide',
    },
  },

  use: {
    baseURL: 'http://localhost:4173',
    trace: isCI ? 'retain-on-failure' : 'off',
    video: 'off',
    // Honor prefers-reduced-motion so .reveal items are visible
    // immediately and CSS transitions are skipped. Combined with
    // `?test=1` (which freezes the visualizer clock), every paint
    // is deterministic.
    reducedMotion: 'reduce',
    locale: 'en-US',
    timezoneId: 'America/Chicago',
  },

  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !isCI,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
  ],
});
