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
  await page.waitForTimeout(600);
}

test.describe('M1c HUD / inventory phone screenshots', () => {
  test.use({
    viewport: { width: 1024, height: 473 },
    deviceScaleFactor: 2.5,
  });

  test('phone HUD + inventory → artifacts/m1c-*-phone.png', async ({
    page,
  }) => {
    fs.mkdirSync(OUT, { recursive: true });
    await bootReady(page, '/?smoke=1&touch=1');

    const hudPath = path.join(OUT, 'm1c-hud-phone.png');
    await page.locator('canvas').first().screenshot({ path: hudPath });
    expect(fs.existsSync(hudPath)).toBe(true);

    await page.evaluate(() => {
      window.__RIFTBORN?.openInventory();
    });
    await page.waitForTimeout(500);

    const invPath = path.join(OUT, 'm1c-inv-phone.png');
    await page.locator('canvas').first().screenshot({ path: invPath });
    expect(fs.existsSync(invPath)).toBe(true);
  });
});

test.describe('M1c HUD desktop screenshot', () => {
  test.use({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });

  test('desktop HUD → artifacts/m1c-hud-desktop.png', async ({ page }) => {
    fs.mkdirSync(OUT, { recursive: true });
    await bootReady(page, '/?smoke=1&touch=0');

    const deskPath = path.join(OUT, 'm1c-hud-desktop.png');
    await page.locator('canvas').first().screenshot({ path: deskPath });
    expect(fs.existsSync(deskPath)).toBe(true);
  });
});
