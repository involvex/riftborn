import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve('artifacts');

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

test.describe('J1 shift clarity (touch)', () => {
  test.use({
    viewport: { width: 1024, height: 473 },
    deviceScaleFactor: 2,
  });

  test('same view ash vs shadow → artifacts/j1-ash.png, j1-shadow.png', async ({
    page,
  }) => {
    fs.mkdirSync(OUT, { recursive: true });
    await bootReady(page, '/?smoke=1&touch=1');

    const ok = await page.evaluate(
      () => window.__RIFTBORN?.enterRift() ?? false,
    );
    expect(ok).toBe(true);
    await page.waitForFunction(
      () => window.__RIFTBORN?.snapshot()?.inRift === true,
      null,
      { timeout: 15_000 },
    );
    await page.waitForTimeout(600);

    await page.evaluate(() => window.__RIFTBORN?.setShiftLayer('ash'));
    await page.waitForTimeout(250);
    const ash = await page.evaluate(() => window.__RIFTBORN?.snapshot()?.shift);
    expect(ash?.layer).toBe('ash');

    const ashPath = path.join(OUT, 'j1-ash.png');
    await page.locator('canvas').first().screenshot({ path: ashPath });
    expect(fs.existsSync(ashPath)).toBe(true);

    await page.evaluate(() => window.__RIFTBORN?.setShiftLayer('shadow'));
    await page.waitForTimeout(350);
    const shadow = await page.evaluate(
      () => window.__RIFTBORN?.snapshot()?.shift,
    );
    expect(shadow?.layer).toBe('shadow');

    const shadowPath = path.join(OUT, 'j1-shadow.png');
    await page.locator('canvas').first().screenshot({ path: shadowPath });
    expect(fs.existsSync(shadowPath)).toBe(true);
  });

  test('tutorial overlay → artifacts/j1-tutorial.png', async ({ page }) => {
    fs.mkdirSync(OUT, { recursive: true });
    await bootReady(page, '/?smoke=1&touch=1');
    await page.evaluate(() => window.__RIFTBORN?.showTutorial());
    await page.waitForTimeout(350);
    const outPath = path.join(OUT, 'j1-tutorial.png');
    await page.locator('canvas').first().screenshot({ path: outPath });
    expect(fs.existsSync(outPath)).toBe(true);
  });
});
