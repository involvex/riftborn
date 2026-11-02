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
      JSON.stringify({ ...base, graphicsQuality: 'auto' }),
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
  await page.waitForTimeout(700);
}

test.describe('M1g touch HUD chrome + context E', () => {
  test.use({
    viewport: { width: 1024, height: 473 },
    deviceScaleFactor: 2.5,
  });

  test('collapsed / expanded / E-loot → artifacts/m1g-*.png', async ({
    page,
  }) => {
    fs.mkdirSync(OUT, { recursive: true });
    await bootReady(page, '/?smoke=1&touch=1');

    const gfx = await page.evaluate(() => window.__RIFTBORN?.graphicsProfile());
    expect(gfx?.tier).toBe('low');
    expect(gfx?.setting).toBe('auto');

    await page.evaluate(() => window.__RIFTBORN?.setTouchChrome(false));
    await page.waitForTimeout(200);
    const collapsedOpen = await page.evaluate(
      () => window.__RIFTBORN?.touchChromeOpen() ?? true,
    );
    expect(collapsedOpen).toBe(false);

    const collapsedPath = path.join(OUT, 'm1g-hud-collapsed.png');
    await page.locator('canvas').first().screenshot({ path: collapsedPath });
    expect(fs.existsSync(collapsedPath)).toBe(true);

    await page.evaluate(() => window.__RIFTBORN?.setTouchChrome(true));
    await page.waitForTimeout(250);
    const expandedOpen = await page.evaluate(
      () => window.__RIFTBORN?.touchChromeOpen() ?? false,
    );
    expect(expandedOpen).toBe(true);

    const expandedPath = path.join(OUT, 'm1g-hud-expanded.png');
    await page.locator('canvas').first().screenshot({ path: expandedPath });
    expect(fs.existsSync(expandedPath)).toBe(true);

    await page.evaluate(() => window.__RIFTBORN?.setTouchChrome(false));
    const spawned = await page.evaluate(
      () => window.__RIFTBORN?.spawnLootNearPlayer() ?? false,
    );
    expect(spawned).toBe(true);
    await page.waitForTimeout(400);
    const hint = await page.evaluate(() => window.__RIFTBORN?.interactHint());
    expect(hint?.kind).toBe('loot');
    expect(hint?.label).toBe('Loot');
    expect(hint?.dimmed).toBe(false);

    const lootPath = path.join(OUT, 'm1g-e-loot.png');
    await page.locator('canvas').first().screenshot({ path: lootPath });
    expect(fs.existsSync(lootPath)).toBe(true);
  });
});
