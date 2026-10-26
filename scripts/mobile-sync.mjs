/**
 * Copy Vite dist/ → mobile/game-dist and (if present)
 * android/app/src/main/assets/www for offline WebView.
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'dist');
const gameDist = join(root, 'mobile', 'game-dist');
const androidWww = join(
  root,
  'mobile',
  'android',
  'app',
  'src',
  'main',
  'assets',
  'www',
);

if (!existsSync(src)) {
  console.error('dist/ missing — run `bun run build` first');
  process.exit(1);
}

function syncTo(dest) {
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true });

  // Force touch UI when loaded from file:// (query string is unreliable)
  const indexPath = join(dest, 'index.html');
  if (existsSync(indexPath)) {
    let html = readFileSync(indexPath, 'utf8');
    if (!html.includes('__RIFTBORN_TOUCH')) {
      html = html.replace(
        '<head>',
        '<head>\n    <script>window.__RIFTBORN_TOUCH=1</script>',
      );
      writeFileSync(indexPath, html);
    }
  }
  console.log(`Synced → ${dest}`);
}

syncTo(gameDist);

const androidDir = join(root, 'mobile', 'android');
if (existsSync(androidDir)) {
  syncTo(androidWww);
} else {
  console.log(
    'Skip android assets (no mobile/android — run expo prebuild first)',
  );
}
