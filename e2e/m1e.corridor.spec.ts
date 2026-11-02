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

async function enterRiftAtDiagonal(
  page: import('@playwright/test').Page,
): Promise<void> {
  const ok = await page.evaluate(() => window.__RIFTBORN?.enterRift() ?? false);
  expect(ok).toBe(true);
  await page.waitForFunction(
    () => window.__RIFTBORN?.snapshot()?.inRift === true,
    null,
    { timeout: 15_000 },
  );
  const warped = await page.evaluate(
    () => window.__RIFTBORN?.gotoDiagonalCorridor() ?? false,
  );
  expect(warped).toBe(true);
  await page.waitForTimeout(700);
}

test.describe('M1e rift corridor phone', () => {
  test.use({
    viewport: { width: 1024, height: 473 },
    deviceScaleFactor: 2.5,
  });

  test('diagonal corridor → artifacts/m1e-rift-phone.png', async ({ page }) => {
    fs.mkdirSync(OUT, { recursive: true });
    await bootReady(page, '/?smoke=1&touch=1');
    await enterRiftAtDiagonal(page);

    const riftPath = path.join(OUT, 'm1e-rift-phone.png');
    await page.locator('canvas').first().screenshot({ path: riftPath });
    expect(fs.existsSync(riftPath)).toBe(true);
  });
});

test.describe('M1e rift corridor desktop', () => {
  test.use({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });

  test('diagonal corridor → artifacts/m1e-rift-desktop.png', async ({
    page,
  }) => {
    fs.mkdirSync(OUT, { recursive: true });
    await bootReady(page, '/?smoke=1&touch=0');
    await enterRiftAtDiagonal(page);

    const deskPath = path.join(OUT, 'm1e-rift-desktop.png');
    await page.locator('canvas').first().screenshot({ path: deskPath });
    expect(fs.existsSync(deskPath)).toBe(true);
  });
});
