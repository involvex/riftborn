/**
 * Build Phaser → sync into mobile/game-dist → preview on :4173 → Expo.
 */
import { spawn, spawnSync } from 'node:child_process';
import { networkInterfaces } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const mobile = join(root, 'mobile');

function lanIp() {
  const nets = networkInterfaces();
  for (const list of Object.values(nets)) {
    if (!list) continue;
    for (const n of list) {
      if (n.family === 'IPv4' && !n.internal) return n.address;
    }
  }
  return '127.0.0.1';
}

function run(cmd, args) {
  const r = spawnSync(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    shell: true,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run('bun', ['run', 'build']);
run('bun', ['run', 'scripts/mobile-sync.mjs']);

const url =
  process.env.EXPO_PUBLIC_GAME_URL || `http://${lanIp()}:4173/?touch=1`;

console.log(`Preview + Expo → ${url}`);

const preview = spawn('bunx', ['vite', 'preview', '--host', '--port', '4173'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
});

const expo = spawn('bunx', ['expo', 'start'], {
  cwd: mobile,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, EXPO_PUBLIC_GAME_URL: url },
});

function shutdown() {
  preview.kill();
  expo.kill();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

expo.on('exit', (code) => {
  preview.kill();
  process.exit(code ?? 0);
});
