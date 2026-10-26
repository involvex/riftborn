import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

type RiftbornSnap = {
  ready: boolean;
  hubSize: number;
  inRift: boolean;
  hostilesNearTown: number;
  nearestHostileDistToPlaza: number;
  pois: { id: string }[];
  enemies: { alive: boolean }[];
};

test.describe('hub smoke', () => {
  test('boots hub, town is clear of hostiles, writes artifacts/hub.png', async ({
    page,
  }) => {
    await page.goto('/?smoke=1');

    await page.waitForFunction(
      () =>
        typeof window.__RIFTBORN !== 'undefined' &&
        window.__RIFTBORN?.ready === true,
      null,
      { timeout: 45_000 },
    );

    // Let a couple frames settle after spawn.
    await page.waitForTimeout(500);

    const snap = await page.evaluate(() => {
      const api = window.__RIFTBORN!;
      return api.snapshot() as RiftbornSnap;
    });

    expect(snap.ready).toBe(true);
    expect(snap.inRift).toBe(false);
    expect(snap.hubSize).toBe(64);
    expect(snap.pois.length).toBeGreaterThanOrEqual(8);
    // Soft town buffer (margin 10) must stay clear — agents assert this after map/POI edits.
    expect(snap.hostilesNearTown).toBe(0);
    expect(snap.nearestHostileDistToPlaza).toBeGreaterThanOrEqual(10);

    const outDir = path.resolve('artifacts');
    fs.mkdirSync(outDir, { recursive: true });
    const shotPath = path.join(outDir, 'hub.png');
    await page.locator('canvas').first().screenshot({ path: shotPath });
    expect(fs.existsSync(shotPath)).toBe(true);
  });
});
