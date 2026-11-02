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

test.describe('M1h rift enemies + touch town button', () => {
  test.use({
    viewport: { width: 1024, height: 473 },
    deviceScaleFactor: 2.5,
  });

  test('rift with foes + town btn → artifacts/m1h-rift-enemies.png', async ({
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
    await page.waitForTimeout(400);

    const snap = await page.evaluate(() => window.__RIFTBORN?.snapshot());
    expect(snap?.inRift).toBe(true);
    const alive = snap?.enemies.filter((e) => e.alive).length ?? 0;
    expect(alive).toBeGreaterThanOrEqual(6);

    const framed = await page.evaluate(
      () => window.__RIFTBORN?.gotoNearestHostile() ?? false,
    );
    expect(framed).toBe(true);
    await page.waitForTimeout(500);

    const outPath = path.join(OUT, 'm1h-rift-enemies.png');
    await page.locator('canvas').first().screenshot({ path: outPath });
    expect(fs.existsSync(outPath)).toBe(true);
  });
});
