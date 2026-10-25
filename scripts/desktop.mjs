/**
 * Reliable desktop launcher for Windows/Bun.
 * Starts Vite, waits for the port, then launches Electron.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import waitOn from 'wait-on';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function run(command, args, opts = {}) {
  return spawn(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: true,
    ...opts,
  });
}

const vite = run('bunx', ['vite', '--host', '127.0.0.1', '--port', '5173']);

let electronProc = null;
let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  try {
    electronProc?.kill();
  } catch {
    /* ignore */
  }
  try {
    vite.kill();
  } catch {
    /* ignore */
  }
  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
vite.on('exit', (code) => {
  if (!shuttingDown) shutdown(code ?? 0);
});

try {
  console.log('[desktop] Waiting for Vite on 127.0.0.1:5173 …');
  await waitOn({
    resources: ['tcp:127.0.0.1:5173'],
    timeout: 90_000,
    interval: 250,
  });
  console.log('[desktop] Vite ready — launching Electron');
  electronProc = run('bunx', ['electron', '.']);
  electronProc.on('exit', (code) => shutdown(code ?? 0));
} catch (err) {
  console.error('[desktop] Failed to start Electron:', err);
  shutdown(1);
}
