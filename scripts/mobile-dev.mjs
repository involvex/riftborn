/**
 * Open Expo Go against the Vite dev server (?touch=1).
 * Expects `bun run dev` already listening on :5173 (or set EXPO_PUBLIC_GAME_URL).
 */
import { spawn } from 'node:child_process';
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

const url =
  process.env.EXPO_PUBLIC_GAME_URL || `http://${lanIp()}:5173/?touch=1`;

console.log(`Expo → ${url}`);
console.log('Start Vite with `bun run dev` if it is not already running.');

const child = spawn('bunx', ['expo', 'start'], {
  cwd: mobile,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, EXPO_PUBLIC_GAME_URL: url },
});

child.on('exit', (code) => process.exit(code ?? 0));
