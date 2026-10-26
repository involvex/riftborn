/**
 * Release APK with game bundled offline (no Vite / Metro game server).
 * Usage: bun run mobile:build
 */
import { spawnSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const mobile = join(root, 'mobile');

function run(cmd, args, cwd = root) {
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: true });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

console.log('1/4 Build Phaser …');
run('bun', ['run', 'build']);

console.log('2/4 Sync into Android assets …');
run('bun', ['run', 'scripts/mobile-sync.mjs']);

const www = join(mobile, 'android', 'app', 'src', 'main', 'assets', 'www');
if (!existsSync(www)) {
  console.error(
    'No android project yet. Run once: cd mobile && bunx expo prebuild --platform android',
  );
  process.exit(1);
}

writeFileSync(
  join(mobile, '.env'),
  `# Release — bundled game, no LAN server\n` +
    `EXPO_PUBLIC_GAME_BUNDLE=1\n` +
    `EXPO_PUBLIC_GAME_URL=\n`,
  'utf8',
);

console.log('3/4 Assemble release APK …');
run('bunx', ['expo', 'run:android', '--variant', 'release'], mobile);

const apkCandidates = [
  join(
    mobile,
    'android',
    'app',
    'build',
    'outputs',
    'apk',
    'release',
    'app-release.apk',
  ),
  join(
    mobile,
    'android',
    'app',
    'build',
    'outputs',
    'apk',
    'release',
    'app-release-unsigned.apk',
  ),
];
const apk = apkCandidates.find((p) => existsSync(p));
console.log('4/4 Done.');
if (apk) {
  console.log(`APK → ${apk}`);
  console.log('Install: adb install -r "' + apk + '"');
} else {
  console.log('APK built under mobile/android/app/build/outputs/apk/');
}
