import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve('artifacts');
const SIZES = [
  { name: '1024x473', width: 1024, height: 473 },
  { name: '1280x720', width: 1280, height: 720 },
] as const;

const MIN_HIT = 44;

async function bootReady(
  page: import('@playwright/test').Page,
  url: string,
): Promise<void> {
  await page.addInitScript(() => {
    const key = 'riftborn.settings.v1';
    const raw = localStorage.getItem(key);
    const base = raw ? JSON.parse(raw) : {};
    localStorage.setItem(
      key,
      JSON.stringify({ ...base, graphicsQuality: 'low' }),
    );
  });
  await page.goto(url);
  await page.waitForFunction(
    () =>
      typeof window.__RIFTBORN !== 'undefined' &&
      window.__RIFTBORN?.ready === true,
    null,
    { timeout: 45_000 },
  );
  await page.waitForTimeout(500);
}

async function shot(
  page: import('@playwright/test').Page,
  screen: string,
  sizeName: string,
): Promise<void> {
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, `m2a-${screen}-${sizeName}.png`);
  await page.locator('canvas').first().screenshot({ path: file });
  expect(fs.existsSync(file)).toBe(true);
}

async function assertTouchHitsInViewport(
  page: import('@playwright/test').Page,
  width: number,
  height: number,
): Promise<void> {
  const hits = await page.evaluate(() => window.__RIFTBORN?.touchHits() ?? []);
  expect(hits.length).toBeGreaterThan(5);
  for (const h of hits) {
    expect(h.minSide, `${h.name} minSide`).toBeGreaterThanOrEqual(MIN_HIT);
    expect(h.x, `${h.name}.x`).toBeGreaterThanOrEqual(-1);
    expect(h.y, `${h.name}.y`).toBeGreaterThanOrEqual(-1);
    expect(h.x + h.w, `${h.name} right`).toBeLessThanOrEqual(width + 1);
    expect(h.y + h.h, `${h.name} bottom`).toBeLessThanOrEqual(height + 1);
  }
}

for (const size of SIZES) {
  test.describe(`M2a touch audit ${size.name}`, () => {
    test.use({
      viewport: { width: size.width, height: size.height },
      deviceScaleFactor: size.height < 500 ? 2.5 : 1,
    });

    test(`screens + hits @ ${size.name}`, async ({ page }) => {
      fs.mkdirSync(OUT, { recursive: true });

      // —— Title ——
      await page.goto('/?touch=1');
      await page.waitForSelector('canvas', { timeout: 30_000 });
      await page.waitForTimeout(1000);
      await shot(page, 'title', size.name);

      // —— Character create (tap New Game) ——
      await page.mouse.click(size.width / 2, size.height * 0.48);
      await page.waitForTimeout(800);
      await shot(page, 'character-create', size.name);

      // —— Hub + overlays ——
      await bootReady(page, '/?smoke=1&touch=1');
      await page.evaluate(() => window.__RIFTBORN?.setTouchChrome(true));
      await page.waitForTimeout(200);
      await assertTouchHitsInViewport(page, size.width, size.height);
      await shot(page, 'hub', size.name);

      await page.evaluate(() => window.__RIFTBORN?.openInventory());
      await page.waitForTimeout(400);
      await shot(page, 'inventory', size.name);

      await page.evaluate(() => window.__RIFTBORN?.openCharacter());
      await page.waitForTimeout(400);
      await shot(page, 'character', size.name);

      await page.evaluate(() => window.__RIFTBORN?.openSkills());
      await page.waitForTimeout(400);
      await shot(page, 'skills', size.name);

      await page.evaluate(() => window.__RIFTBORN?.toggleMap());
      await page.waitForTimeout(400);
      await shot(page, 'map', size.name);

      await page.evaluate(() => {
        window.__RIFTBORN?.toggleMap();
        window.__RIFTBORN?.openShop();
      });
      await page.waitForTimeout(400);
      await shot(page, 'shop', size.name);

      await page.evaluate(() => window.__RIFTBORN?.openTrader());
      await page.waitForTimeout(400);
      await shot(page, 'trader', size.name);

      await page.evaluate(() => window.__RIFTBORN?.openCraft());
      await page.waitForTimeout(400);
      await shot(page, 'craft', size.name);

      await page.evaluate(() => window.__RIFTBORN?.toggleMenu());
      await page.waitForTimeout(400);
      await shot(page, 'pause', size.name);

      await page.evaluate(() => window.__RIFTBORN?.toggleMenu());
      await page.waitForTimeout(200);
      await page.evaluate(() => window.__RIFTBORN?.showDeathSummary());
      await page.waitForTimeout(400);
      await shot(page, 'death', size.name);
      await page.evaluate(() => window.__RIFTBORN?.dismissSummary());
      await page.waitForTimeout(500);

      const entered = await page.evaluate(
        () => window.__RIFTBORN?.enterRift() ?? false,
      );
      expect(entered).toBe(true);
      await page.waitForFunction(
        () => window.__RIFTBORN?.snapshot().inRift === true,
        null,
        { timeout: 20_000 },
      );
      await page.waitForTimeout(400);
      await page.evaluate(() => window.__RIFTBORN?.setTouchChrome(true));
      await assertTouchHitsInViewport(page, size.width, size.height);
      await shot(page, 'rift', size.name);
    });
  });
}
