import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const SIZES = [
  { name: 'phone-land', width: 1024, height: 473 },
  { name: 'desktop', width: 1280, height: 720 },
] as const;

test.describe('inventory layout screenshots', () => {
  for (const size of SIZES) {
    test(`${size.name} ${size.width}x${size.height}`, async ({ page }) => {
      await page.setViewportSize({
        width: size.width,
        height: size.height,
      });
      await page.goto('/?smoke=1&touch=1');

      await page.waitForFunction(
        () =>
          typeof window.__RIFTBORN !== 'undefined' &&
          window.__RIFTBORN?.ready === true,
        null,
        { timeout: 45_000 },
      );
      await page.waitForTimeout(400);

      await page.evaluate(() => {
        window.__RIFTBORN?.openInventory();
      });
      await page.waitForTimeout(500);

      const outDir = path.resolve('artifacts');
      fs.mkdirSync(outDir, { recursive: true });
      const shotPath = path.join(
        outDir,
        `inventory-${size.name}-${size.width}x${size.height}.png`,
      );
      await page.locator('canvas').first().screenshot({ path: shotPath });
      expect(fs.existsSync(shotPath)).toBe(true);
    });
  }
});
