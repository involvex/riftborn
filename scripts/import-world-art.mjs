/**
 * Copy tile/prop art from image-wizard out-processed into
 * public/assets/tiles and public/assets/props.
 *
 * Usage:
 *   bun run scripts/import-world-art.mjs [sourceDir]
 *
 * Default source: D:/repos/image-wizard-cli/out-processed
 * Per logical id (tile_hub_0, prop_well, …) keeps the first/best
 * variant (…_0) and writes {id}.png.
 */
import { copyFile, mkdir, readFile, access } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DEFAULT_SRC = 'D:/repos/image-wizard-cli/out-processed';

const srcRoot = path.resolve(process.argv[2] ?? DEFAULT_SRC);

/**
 * Strip trailing variant index: tile_hub_0_0 → tile_hub_0,
 * prop_well_0 → prop_well.
 * @param {string} id
 */
function baseId(id) {
  const m = /^(tile_.+|prop_.+)_(\d+)$/.exec(id);
  return m ? m[1] : id;
}

/**
 * @param {string} p
 */
async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const manifestPath = path.join(srcRoot, 'manifest.json');
  if (!(await exists(manifestPath))) {
    console.error(`No manifest at ${manifestPath}`);
    process.exit(1);
  }

  /** @type {{ id: string, category: string }[]} */
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const tilesOut = path.join(ROOT, 'public/assets/tiles');
  const propsOut = path.join(ROOT, 'public/assets/props');
  await mkdir(tilesOut, { recursive: true });
  await mkdir(propsOut, { recursive: true });

  /** @type {Map<string, { category: string, file: string }>} */
  const best = new Map();

  for (const entry of manifest) {
    const { id, category } = entry;
    if (category !== 'tiles' && category !== 'props') continue;
    if (!id.startsWith('tile_') && !id.startsWith('prop_')) continue;
    const key = baseId(id);
    if (best.has(key)) continue;
    const sub = category === 'tiles' ? 'tiles' : 'props';
    const file = path.join(srcRoot, sub, `${id}.png`);
    if (!(await exists(file))) {
      console.warn(`skip missing ${file}`);
      continue;
    }
    best.set(key, { category, file });
  }

  let n = 0;
  for (const [key, { category, file }] of best) {
    const destDir = category === 'tiles' ? tilesOut : propsOut;
    const dest = path.join(destDir, `${key}.png`);
    await copyFile(file, dest);
    console.log(`${key}.png ← ${path.relative(srcRoot, file)}`);
    n++;
  }
  console.log(`Imported ${n} assets into public/assets/{tiles,props}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
