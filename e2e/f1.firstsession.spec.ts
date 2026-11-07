import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve('artifacts');

test.describe('F1 first-session hints (touch)', () => {
  test.use({
    viewport: { width: 1024, height: 473 },
    deviceScaleFactor: 2,
  });

  test('move hint banner → artifacts/f1-hint-move.png', async ({ page }) => {
    fs.mkdirSync(OUT, { recursive: true });
    await page.addInitScript(() => {
      const key = 'riftborn.settings.v1';
      const raw = localStorage.getItem(key);
      const base = raw ? JSON.parse(raw) : {};
      localStorage.setItem(
        key,
        JSON.stringify({ ...base, graphicsQuality: 'low' }),
      );
    });
    await page.goto('/?smoke=1&touch=1');
    await page.waitForFunction(
      () =>
        typeof window.__RIFTBORN !== 'undefined' &&
        window.__RIFTBORN?.ready === true,
      null,
      { timeout: 45_000 },
    );
    await page.waitForTimeout(500);

    await page.evaluate(() => window.__RIFTBORN?.showFirstSession('move'));
    await page.waitForTimeout(250);

    const movePath = path.join(OUT, 'f1-hint-move.png');
    await page.locator('canvas').first().screenshot({ path: movePath });
    expect(fs.existsSync(movePath)).toBe(true);

    await page.evaluate(() => window.__RIFTBORN?.showFirstSession('rift'));
    await page.waitForTimeout(250);
    const riftPath = path.join(OUT, 'f1-hint-rift.png');
    await page.locator('canvas').first().screenshot({ path: riftPath });
    expect(fs.existsSync(riftPath)).toBe(true);
  });
});
