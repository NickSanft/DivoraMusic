import { test, expect } from '@playwright/test';

const HOME = '/?test=1';
const LAB = '/lab.html?test=1';

test.describe('nav', () => {
  test('adds .scrolled after 40px scroll', async ({ page }) => {
    await page.goto(HOME);
    const nav = page.locator('.nav');
    await expect(nav).not.toHaveClass(/scrolled/);
    await page.evaluate(() => window.scrollTo(0, 200));
    await expect(nav).toHaveClass(/scrolled/);
  });

  test('scroll-spy activates the in-view section link', async ({ page }) => {
    await page.goto(HOME);
    await page.evaluate(() => {
      const el = document.getElementById('about');
      window.scrollTo({ top: el.offsetTop + 100, behavior: 'instant' });
    });
    const aboutLink = page.locator('.nav-links a[href="#about"]');
    await expect(aboutLink).toHaveClass(/active/);

    await page.evaluate(() => {
      const el = document.getElementById('contact');
      window.scrollTo({ top: el.offsetTop + 100, behavior: 'instant' });
    });
    const contactLink = page.locator('.nav-links a[href="#contact"]');
    await expect(contactLink).toHaveClass(/active/);
  });

  test('anchor click lands at the section, offset by header', async ({ page }) => {
    await page.goto(HOME);
    await page.click('.nav-links a[href="#latest"]');
    // Poll until scrollY stops moving — chromium's smooth-scroll
    // duration depends on distance, and the hero is tall enough that
    // a fixed 800ms wasn't reliable.
    await page.waitForFunction(
      () => {
        if (!window.__lastY) window.__lastY = -1;
        const y = window.scrollY;
        const stable = y === window.__lastY;
        window.__lastY = y;
        return stable && y > 100;
      },
      undefined,
      { polling: 120, timeout: 5000 },
    );
    const { scrollY, targetTop } = await page.evaluate(() => ({
      scrollY: window.scrollY,
      targetTop: document.getElementById('latest').getBoundingClientRect().top + window.scrollY,
    }));
    // We scroll to (target - 60px). Allow a few px slack for browser rounding.
    expect(Math.abs(scrollY - (targetTop - 60))).toBeLessThan(8);
  });

  test('mobile burger toggles the overlay', async ({ page }) => {
    await page.setViewportSize({ width: 480, height: 800 });
    await page.goto(HOME);
    const overlay = page.locator('.nav-overlay');
    await expect(overlay).not.toHaveClass(/open/);
    await page.click('.nav-burger');
    await expect(overlay).toHaveClass(/open/);
    // Click an anchor inside the overlay closes it.
    await page.click('.nav-overlay a[href="#about"]');
    await expect(overlay).not.toHaveClass(/open/);
  });
});

test.describe('contact', () => {
  test('copy badge flips to "copied" and reverts after ~1.6s', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(HOME);
    const badge = page.locator('.contact .email .copy');
    await expect(badge).toContainText('copy');
    await badge.click();
    await expect(badge).toContainText('copied');
    await page.waitForTimeout(1800);
    await expect(badge).toContainText('copy');
  });
});

test.describe('lab discovery', () => {
  test('Konami code navigates to /lab', async ({ page }) => {
    await page.goto(HOME);
    const seq = [
      'ArrowUp',
      'ArrowUp',
      'ArrowDown',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'ArrowLeft',
      'ArrowRight',
      'KeyB',
      'KeyA',
    ];
    for (const k of seq) await page.keyboard.press(k);
    await page.waitForURL(/lab\.html/);
    expect(page.url()).toMatch(/lab\.html/);
  });

  test('5× brand-tap navigates to /lab', async ({ page }) => {
    await page.goto(HOME);
    const prism = page.locator('.nav-brand svg');
    for (let i = 0; i < 5; i++) await prism.click({ force: true });
    await page.waitForURL(/lab\.html/);
    expect(page.url()).toMatch(/lab\.html/);
  });

  test('lab-hint dot becomes visible near the page bottom', async ({ page }) => {
    await page.goto(HOME);
    const dot = page.locator('.lab-hint');
    await expect(dot).not.toHaveClass(/visible/);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(dot).toHaveClass(/visible/);
  });
});

test.describe('/lab page', () => {
  test('Escape returns to /', async ({ page }) => {
    await page.goto(LAB);
    await page.keyboard.press('Escape');
    await page.waitForURL(
      (url) => url.pathname.endsWith('/') || url.pathname.endsWith('/index.html'),
    );
    expect(page.url()).not.toMatch(/lab\.html/);
  });

  test('all six experiment cards render', async ({ page }) => {
    await page.goto(LAB);
    await expect(page.locator('.lab-card')).toHaveCount(6);
    // Canvas-based experiments mount a canvas into their lab-screen.
    await expect(page.locator('.lab-card [data-exp="reliquary"] canvas')).toBeVisible();
    await expect(page.locator('.lab-card [data-exp="linear"] canvas')).toBeVisible();
    await expect(page.locator('.lab-card [data-exp="particle"] canvas')).toBeVisible();
    await expect(page.locator('.lab-card [data-exp="hexlattice"] canvas')).toBeVisible();
  });
});

test.describe('reveal', () => {
  test('reveal elements receive .in once scrolled on-screen', async ({ page }) => {
    await page.goto(HOME);
    await page.locator('#about').scrollIntoViewIfNeeded();
    await expect(page.locator('.about-photo.reveal')).toHaveClass(/\bin\b/);
  });
});

test.describe('hero visualizer', () => {
  test('canvas mounts inside the hero stage', async ({ page }) => {
    await page.goto(HOME);
    await expect(page.locator('.hero-stage canvas')).toBeVisible();
    // Prism core SVG is appended next to the canvas (only for the
    // default Reliquary visualizer; other styles are pure canvas).
    await expect(page.locator('.hero-stage svg polygon').first()).toBeVisible();
  });

  test('switcher swaps visualizers and persists in localStorage', async ({ page }) => {
    // Each Playwright test runs in a fresh context, so localStorage
    // starts empty and the initial selection is the default.
    await page.goto(HOME);

    const selected = page.locator('.vis-switcher button[aria-selected="true"]');
    await expect(selected).toHaveAttribute('data-viz', 'reliquary');

    // Switch to Linear/Subway. The Reliquary's prism-core SVG should
    // be torn down with the old controller; the new canvas should
    // mount in its place.
    await page.click('.vis-switcher button[data-viz="linear"]');
    await expect(page.locator('.vis-switcher button[aria-selected="true"]')).toHaveAttribute(
      'data-viz',
      'linear',
    );
    await expect(page.locator('.hero-stage canvas')).toBeVisible();
    await expect(page.locator('.hero-stage svg polygon')).toHaveCount(0);

    // Reload — the choice survives because we persist to localStorage.
    await page.reload();
    await expect(page.locator('.vis-switcher button[aria-selected="true"]')).toHaveAttribute(
      'data-viz',
      'linear',
    );
  });
});

test.describe('cassette + tracks', () => {
  test('initial cassette shows the default track', async ({ page }) => {
    await page.goto(HOME);
    const tape = page.locator('.cassette');
    await expect(tape).toBeVisible();
    await expect(tape).toHaveAttribute('data-track', 'gyrefolk-docks');
    await expect(tape.locator('.ttl-text')).toHaveText('Gyrefolk Docks');
    await expect(tape.locator('.sub')).toHaveText(/OMINOUS · 01/);
  });

  test('three reels-bearing tracks appear in the track switcher', async ({ page }) => {
    await page.goto(HOME);
    await expect(page.locator('.track-switcher button')).toHaveCount(3);
    await expect(page.locator('.track-switcher button[aria-selected="true"]')).toContainText(
      'Gyrefolk Docks',
    );
  });

  test('clicking the next button cycles tracks', async ({ page }) => {
    await page.goto(HOME);
    await page.click('.cassette-next');
    const tape = page.locator('.cassette');
    await expect(tape).toHaveAttribute('data-track', 'corruption-can-be-fun');
    await expect(tape.locator('.ttl-text')).toHaveText('Corruption Can Be Fun');
    // accent var follows the album — both Ominous tracks share magenta.
    const accent = await tape.evaluate((el) =>
      getComputedStyle(el).getPropertyValue('--accent').trim(),
    );
    expect(accent).toBe('#ff4d8f');
  });

  test('clicking a track-switcher button swaps directly to that track', async ({ page }) => {
    await page.goto(HOME);
    await page.click('.track-switcher button[data-track="origins-of-the-gyre"]');
    const tape = page.locator('.cassette');
    await expect(tape).toHaveAttribute('data-track', 'origins-of-the-gyre');
    await expect(tape.locator('.sub')).toHaveText(/ORIGINS · 03/);
    // Origins tracks use amber accent.
    const accent = await tape.evaluate((el) =>
      getComputedStyle(el).getPropertyValue('--accent').trim(),
    );
    expect(accent).toBe('#ffb86b');
  });

  test('F / R keyboard shortcuts cycle tracks (F next, R rewind)', async ({ page }) => {
    await page.goto(HOME);
    // ←/→ are intentionally NOT bound so the Konami sequence still
    // works while the tape is queued. F = next, R = prev.
    await page.keyboard.press('KeyF');
    await expect(page.locator('.cassette')).toHaveAttribute('data-track', 'corruption-can-be-fun');
    await page.keyboard.press('KeyR');
    await expect(page.locator('.cassette')).toHaveAttribute('data-track', 'gyrefolk-docks');
    // wrap-around: rewind from track 1 = last track
    await page.keyboard.press('KeyR');
    await expect(page.locator('.cassette')).toHaveAttribute('data-track', 'origins-of-the-gyre');
  });

  test('progress bar is a click-to-seek slider', async ({ page }) => {
    await page.goto(HOME);
    const bar = page.locator('.cassette-bar');
    await expect(bar).toBeVisible();
    await expect(bar).toHaveAttribute('role', 'slider');
    await expect(bar).toHaveAttribute('aria-valuemin', '0');
    await expect(bar).toHaveAttribute('aria-valuemax', '100');
    // Clicking should register without throwing. Real-audio playback
    // testing (verify currentTime advances) belongs to manual QA —
    // headless chromium won't autoplay without a user gesture.
    await bar.click({ position: { x: 40, y: 6 } });
  });

  test('mute toggle persists in localStorage', async ({ page }) => {
    await page.goto(HOME);
    const mute = page.locator('.cassette-mute');
    await expect(mute).toHaveAttribute('aria-pressed', 'false');
    await mute.click();
    await expect(mute).toHaveAttribute('aria-pressed', 'true');
    const stored = await page.evaluate(() => globalThis.localStorage?.getItem('divora:mute'));
    expect(stored).toBe('1');
    await page.reload();
    await expect(page.locator('.cassette-mute')).toHaveAttribute('aria-pressed', 'true');
  });

  test('M keyboard shortcut toggles mute', async ({ page }) => {
    await page.goto(HOME);
    await expect(page.locator('.cassette-mute')).toHaveAttribute('aria-pressed', 'false');
    await page.keyboard.press('KeyM');
    await expect(page.locator('.cassette-mute')).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('KeyM');
    await expect(page.locator('.cassette-mute')).toHaveAttribute('aria-pressed', 'false');
  });

  test('flip button cycles between A-side and B-side of the same album', async ({ page }) => {
    await page.goto(HOME);
    const tape = page.locator('.cassette');
    await expect(tape).toHaveAttribute('data-track', 'gyrefolk-docks');
    await expect(tape).toHaveAttribute('data-side', 'A');
    // Gyrefolk Docks lives on Ominous Augury, side A. The B-side is
    // Corruption Can Be Fun — same album. Flipping should land us
    // there with the cassette now reading "SIDE B".
    await page.click('.cassette-flip');
    await expect(tape).toHaveAttribute('data-track', 'corruption-can-be-fun');
    await expect(tape).toHaveAttribute('data-side', 'B');
    // Flip back.
    await page.click('.cassette-flip');
    await expect(tape).toHaveAttribute('data-track', 'gyrefolk-docks');
    await expect(tape).toHaveAttribute('data-side', 'A');
  });

  test('flipping a single (Origins) reveals a blank B-side', async ({ page }) => {
    await page.goto(HOME);
    await page.click('.track-switcher button[data-track="origins-of-the-gyre"]');
    const tape = page.locator('.cassette');
    await expect(tape).toHaveAttribute('data-track', 'origins-of-the-gyre');
    // Origins is a single — no album-mate. Flipping shows the blank
    // side; the track ID stays the same because no audio is loaded
    // for a non-existent B-side.
    await page.click('.cassette-flip');
    await expect(tape).toHaveAttribute('data-side', 'blank');
    await expect(tape.locator('.cassette-label .sub')).toHaveText(/NO RECORDING/);
    // Flip back to side A.
    await page.click('.cassette-flip');
    await expect(tape).toHaveAttribute('data-side', 'A');
  });

  test('volume slider updates localStorage', async ({ page }) => {
    await page.goto(HOME);
    const slider = page.locator('.volume-slider');
    // Set via JS to avoid hover-slot timing.
    await slider.evaluate((el) => {
      el.value = '40';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const stored = await page.evaluate(() => globalThis.localStorage?.getItem('divora:volume'));
    expect(Number(stored)).toBeCloseTo(0.4, 1);
  });

  test('track choice persists across reload', async ({ page }) => {
    await page.goto(HOME);
    await page.click('.track-switcher button[data-track="origins-of-the-gyre"]');
    await expect(page.locator('.cassette')).toHaveAttribute('data-track', 'origins-of-the-gyre');
    // ?test=1 forces deterministic-start, so drop the flag for the
    // persistence-reload to actually exercise localStorage.
    await page.goto('/');
    await expect(page.locator('.cassette')).toHaveAttribute('data-track', 'origins-of-the-gyre');
  });

  test('auto-advance toggle persists in localStorage', async ({ page }) => {
    await page.goto(HOME);
    const toggle = page.locator('.auto-advance-toggle');
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(toggle).toHaveText(/auto · on/i);

    const stored = await page.evaluate(() => globalThis.localStorage?.getItem('divora:auto'));
    expect(stored).toBe('1');

    await page.reload();
    await expect(page.locator('.auto-advance-toggle')).toHaveAttribute('aria-pressed', 'true');
  });
});

test.describe('discography sigils', () => {
  test('each disco card mounts a deterministic sigil canvas', async ({ page }) => {
    await page.goto(HOME);
    // Two featured folios → two sigils.
    const sigils = page.locator('.disco-item .disco-sigil');
    await expect(sigils).toHaveCount(2);
    // Both canvases should have non-zero painted area (lhci would
    // otherwise mark them as "decoration-only"). We sample a pixel
    // away from the center via toDataURL → byte length comparison.
    const lens = await sigils.evaluateAll((els) =>
      els.map((c) => (c.toDataURL ? c.toDataURL('image/png').length : 0)),
    );
    expect(lens.every((n) => n > 200)).toBe(true);
    expect(lens[0]).not.toBe(lens[1]); // different albums → different sigils
  });
});

test.describe('scroll-spy URL hash', () => {
  test('scrolling to a section updates the URL hash', async ({ page }) => {
    await page.goto(HOME);
    await page.evaluate(() => {
      const el = document.getElementById('about');
      window.scrollTo({ top: el.offsetTop + 200, behavior: 'instant' });
    });
    await expect(page).toHaveURL(/#about$/);

    await page.evaluate(() => {
      const el = document.getElementById('discography');
      window.scrollTo({ top: el.offsetTop + 200, behavior: 'instant' });
    });
    await expect(page).toHaveURL(/#discography$/);
  });
});

test.describe('SEO meta', () => {
  test('home has canonical, og, and MusicGroup JSON-LD', async ({ page }) => {
    await page.goto(HOME);
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute(
      'href',
      'https://nick.sanft.com/music/',
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /Divora/);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /og\.png$/);
    await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute('content', /og\.png$/);
    const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
    const parsed = JSON.parse(jsonLd);
    expect(parsed['@type']).toBe('MusicGroup');
    expect(parsed.name).toBe('Divora');
    // Three featured releases as nested MusicAlbums.
    expect(Array.isArray(parsed.album)).toBe(true);
    expect(parsed.album).toHaveLength(3);
    expect(parsed.album.map((a) => a.name)).toEqual([
      'Ominous Augury',
      'Origins Of The Gyre',
      'Physiognomy',
    ]);
    for (const album of parsed.album) {
      expect(album['@type']).toBe('MusicAlbum');
      expect(album.byArtist.name).toBe('Divora');
      expect(album.url).toMatch(/^https:\/\/divora\.bandcamp\.com\//);
    }
  });

  test('og.png ships and serves with image content-type', async ({ request }) => {
    // og:image meta is the production URL (nick.sanft.com/music/og.png);
    // the file ships in public/ so on the preview server it lives at
    // /og.png regardless of the base path.
    const r = await request.get('/og.png');
    expect(r.ok()).toBe(true);
    expect(r.headers()['content-type']).toMatch(/image\/png/);
  });

  test('/lab has noindex robots meta', async ({ page }) => {
    await page.goto(LAB);
    await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', /noindex/);
  });
});
