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

test.describe('M1f rift stair pass', () => {
  test.use({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });

  test('scripted diagonal walk → artifacts/m1f-rift-pass.png', async ({
    page,
  }) => {
    fs.mkdirSync(OUT, { recursive: true });
    await bootReady(page, '/?smoke=1&touch=0');
    const ok = await page.evaluate(
      () => window.__RIFTBORN?.enterRift() ?? false,
    );
    expect(ok).toBe(true);
    await page.waitForFunction(
      () => window.__RIFTBORN?.snapshot()?.inRift === true,
      null,
      { timeout: 15_000 },
    );
    const dist = await page.evaluate(
      () => window.__RIFTBORN?.walkDiagonalCorridor(50) ?? 0,
    );
    expect(dist).toBeGreaterThan(0.5);
    await page.waitForTimeout(400);

    const outPath = path.join(OUT, 'm1f-rift-pass.png');
    await page.locator('canvas').first().screenshot({ path: outPath });
    expect(fs.existsSync(outPath)).toBe(true);
  });
});
