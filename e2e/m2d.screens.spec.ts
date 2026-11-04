import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test.describe('m2d screens', () => {
  test.use({ viewport: { width: 1024, height: 473 }, deviceScaleFactor: 2.5 });

  test('town roads screenshots', async ({ page }) => {
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

    // Town with roads
    await page
      .locator('canvas')
      .first()
      .screenshot({ path: path.join(outDir, 'm2d-town-roads.png') });
    expect(fs.existsSync(path.join(outDir, 'm2d-town-roads.png'))).toBe(true);

    // Try to move towards a POI to show road to POI
    await page.evaluate(() => {
      const api = window.__RIFTBORN;
      if (api?.snapshot) {
        const snap = api.snapshot();
        // Try to move player towards first POI
        const poi = snap.pois?.[0];
        if (poi) {
          // Just position camera/view by moving? Or just take another shot from different angle
        }
      }
    });
    // Take another shot from slightly different position/view
    await page.keyboard.down('d');
    await page.waitForTimeout(300);
    await page.keyboard.up('d');
    await page.waitForTimeout(500);
    await page
      .locator('canvas')
      .first()
      .screenshot({ path: path.join(outDir, 'm2d-road-poi.png') });
    expect(fs.existsSync(path.join(outDir, 'm2d-road-poi.png'))).toBe(true);
  });
});
