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

async function enterRift(page: import('@playwright/test').Page): Promise<void> {
  const ok = await page.evaluate(() => window.__RIFTBORN?.enterRift() ?? false);
  expect(ok).toBe(true);
  await page.waitForFunction(
    () => window.__RIFTBORN?.snapshot()?.inRift === true,
    null,
    { timeout: 15_000 },
  );
  await page.waitForTimeout(700);
}

test.describe('M1d rift scale phone', () => {
  test.use({
    viewport: { width: 1024, height: 473 },
    deviceScaleFactor: 2.5,
  });

  test('rift + inventory → artifacts/m1d-*-phone.png', async ({ page }) => {
    fs.mkdirSync(OUT, { recursive: true });
    await bootReady(page, '/?smoke=1&touch=1');
    await enterRift(page);

    const riftPath = path.join(OUT, 'm1d-rift-phone.png');
    await page.locator('canvas').first().screenshot({ path: riftPath });
    expect(fs.existsSync(riftPath)).toBe(true);

    await page.evaluate(() => {
      window.__RIFTBORN?.openInventory();
    });
    await page.waitForTimeout(500);

    const invPath = path.join(OUT, 'm1d-inv-phone.png');
    await page.locator('canvas').first().screenshot({ path: invPath });
    expect(fs.existsSync(invPath)).toBe(true);
  });
});

test.describe('M1d rift scale desktop', () => {
  test.use({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });

  test('rift → artifacts/m1d-rift-desktop.png', async ({ page }) => {
    fs.mkdirSync(OUT, { recursive: true });
    await bootReady(page, '/?smoke=1&touch=0');
    await enterRift(page);

    const deskPath = path.join(OUT, 'm1d-rift-desktop.png');
    await page.locator('canvas').first().screenshot({ path: deskPath });
    expect(fs.existsSync(deskPath)).toBe(true);
  });
});
