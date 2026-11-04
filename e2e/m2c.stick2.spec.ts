import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test.describe('m2c stick2', () => {
  test.use({ viewport: { width: 1024, height: 473 }, deviceScaleFactor: 2.5 });

  test('stick diagonal', async ({ page }) => {
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

    await page.keyboard.down('w');
    await page.keyboard.down('d');
    await page.waitForTimeout(600);
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
