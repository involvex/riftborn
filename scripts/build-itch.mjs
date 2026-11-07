/**
 * Build for itch.io: build with relative base, zip dist/ contents to release/riftborn-web.zip
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(root, 'dist');
const releaseDir = join(root, 'release');
const zipPath = join(releaseDir, 'riftborn-web.zip');

console.log('[build:itch] Building with relative base (./)...');
// Build with base ./ to be safe for itch.io
const build = spawnSync('bun', ['run', 'build'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env },
});
if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

if (!existsSync(distDir)) {
  console.error('[build:itch] dist/ not found after build');
  process.exit(1);
}

mkdirSync(releaseDir, { recursive: true });
// Remove old zip if exists
if (existsSync(zipPath)) {
  rmSync(zipPath);
}

console.log(
  '[build:itch] Zipping dist/ contents to release/riftborn-web.zip...',
);
if (process.platform === 'win32') {
  // Use PowerShell Compress-Archive - compress contents of dist dir
  const psCmd = `Compress-Archive -Path '${distDir}\\*' -DestinationPath '${zipPath}' -Force`;
  const res = spawnSync('powershell', ['-NoProfile', '-Command', psCmd], {
    cwd: root,
    stdio: 'inherit',
    shell: true,
  });
  if (res.status !== 0) {
    process.exit(res.status ?? 1);
  }
} else {
  const res = spawnSync('zip', ['-r', zipPath, '.'], {
    cwd: distDir,
    stdio: 'inherit',
    shell: true,
  });
  if (res.status !== 0) {
    process.exit(res.status ?? 1);
  }
}

console.log(`[build:itch] Done: ${zipPath}`);
console.log('[build:itch] index.html should be at root of ZIP');
