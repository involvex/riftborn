import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve('artifacts');
const SIZE = { width: 1024, height: 473 };

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

test.describe('M2b touch readability 1024x473', () => {
  test.use({
    viewport: SIZE,
    deviceScaleFactor: 2.5,
  });

  test('inventory + rift skill cooldown screenshots', async ({ page }) => {
    fs.mkdirSync(OUT, { recursive: true });

    await bootReady(page, '/?smoke=1&touch=1');
    await page.evaluate(() => window.__RIFTBORN?.setTouchChrome(true));
    await page.waitForTimeout(200);

    await page.evaluate(() => window.__RIFTBORN?.openInventory());
    await page.waitForTimeout(400);
    const invPath = path.join(OUT, 'm2b-inventory.png');
    await page.locator('canvas').first().screenshot({ path: invPath });
    expect(fs.existsSync(invPath)).toBe(true);

    await page.evaluate(() => {
      // Close inventory by toggling menu then dismissing isn't needed —
      // enterRift / combat HUD still draws under overlays; hide via Esc.
    });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

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

    // Near-full cooldown on slot 0 so the dark pie + number read clearly.
    await page.evaluate(() => {
      window.__RIFTBORN?.forceSkillCooldown(0, 5);
      window.__RIFTBORN?.setTouchChrome(true);
    });
    await page.waitForTimeout(250);

    const riftPath = path.join(OUT, 'm2b-rift.png');
    await page.locator('canvas').first().screenshot({ path: riftPath });
    expect(fs.existsSync(riftPath)).toBe(true);
  });
});
