/**
 * Copy Vite dist/ into mobile/game-dist for Expo WebView offline/prod loads.
 */
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'dist');
const dest = join(root, 'mobile', 'game-dist');

if (!existsSync(src)) {
  console.error('dist/ missing — run `bun run build` first');
  process.exit(1);
}

rmSync(dest, { recursive: true, force: true });
mkdirSync(dirname(dest), { recursive: true });
cpSync(src, dest, { recursive: true });
console.log(`Synced ${src} → ${dest}`);
