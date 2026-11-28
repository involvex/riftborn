/**
 * Canvas screenshot + non-blank assert for e2e specs.
 * A black / empty WebGL canvas must not pass as a visual shot.
 */
import { expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const SAMPLE_STRIDE = 4;

/**
 * Write `page`'s first canvas to `outPath` and fail if the PNG is blank
 * (near-uniform dark / empty). Retries briefly — WebGL can be empty for a
 * frame or two after scene boots (esp. high deviceScaleFactor).
 */
export async function screenshotCanvasNonBlank(
  page: Page,
  outPath: string,
): Promise<void> {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  let lastErr: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await page.waitForTimeout(400);
    await page.locator('canvas').first().screenshot({ path: outPath });
    expect(fs.existsSync(outPath), `missing shot ${outPath}`).toBe(true);
    try {
      await assertPngNotBlank(outPath);
      return;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

/** Fail when a PNG has too few distinct colors (blank / solid fill). */
export async function assertPngNotBlank(filePath: string): Promise<void> {
  const byteSize = fs.statSync(filePath).size;
  expect(byteSize > 800, `${filePath} too small (${byteSize} bytes)`).toBe(
    true,
  );

  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const buckets = new Set<number>();
  let nonDark = 0;
  let samples = 0;
  for (let y = 0; y < h; y += SAMPLE_STRIDE) {
    for (let x = 0; x < w; x += SAMPLE_STRIDE) {
      const i = (y * w + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a < 8) continue;
      samples++;
      // 4-bit/channel buckets ≈ 4096 max
      buckets.add(((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4));
      if ((r + g + b) / 3 > 14) nonDark++;
    }
  }
  expect(samples, `${filePath} has no opaque samples`).toBeGreaterThan(100);
  expect(
    buckets.size,
    `${filePath} looks blank (unique≈${buckets.size})`,
  ).toBeGreaterThanOrEqual(12);
  expect(
    nonDark / samples,
    `${filePath} almost all dark (${nonDark}/${samples})`,
  ).toBeGreaterThanOrEqual(0.01);
}

/** Resolve under `artifacts/` and ensure the folder exists. */
export function artifactPath(...parts: string[]): string {
  const out = path.resolve('artifacts', ...parts);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  return out;
}
