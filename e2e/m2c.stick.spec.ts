import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test.describe('m2c stick', () => {
  test.use({ viewport: { width: 1024, height: 473 }, deviceScaleFactor: 2.5 });

  test('stick screenshots', async ({ page }) => {
    const outDir = path.resolve('artifacts');
    fs.mkdirSync(outDir, { recursive: true });

    await page.goto('/?smoke=1&touch=1');
    await page.waitForFunction(
      () =>
        typeof window.__RIFTBORN !== 'undefined' &&
        window.__RIFTBORN?.ready === true,
      null,
      { timeout: 45_000 },
    );
    await page.waitForTimeout(1000);

    // Stick idle/visible
    await page
      .locator('canvas')
      .first()
      .screenshot({ path: path.join(outDir, 'm2c-stick-idle.png') });
    expect(fs.existsSync(path.join(outDir, 'm2c-stick-idle.png'))).toBe(true);

    // Move diagonally
    await page.touchscreen.tap(100, 400);
    await page.waitForTimeout(200);
    await page.keyboard.down('w');
    await page.keyboard.down('d');
    await page.waitForTimeout(400);
    await page.keyboard.up('w');
    await page.keyboard.up('d');
    await page.waitForTimeout(500);
    await page
      .locator('canvas')
      .first()
      .screenshot({ path: path.join(outDir, 'm2c-stick-diagonal.png') });
    expect(fs.existsSync(path.join(outDir, 'm2c-stick-diagonal.png'))).toBe(
      true,
    );
  });
});
