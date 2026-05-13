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
    await page.waitForTimeout(800); // smooth scroll
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
    // Prism core SVG is appended next to the canvas.
    await expect(page.locator('.hero-stage svg polygon').first()).toBeVisible();
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
    const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
    const parsed = JSON.parse(jsonLd);
    expect(parsed['@type']).toBe('MusicGroup');
    expect(parsed.name).toBe('Divora');
  });

  test('/lab has noindex robots meta', async ({ page }) => {
    await page.goto(LAB);
    await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', /noindex/);
  });
});
