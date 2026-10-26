/**
 * Print a LAN IPv4 usable for Expo → Vite (?touch=1).
 */
import { networkInterfaces } from 'node:os';

const nets = networkInterfaces();
const ips = [];
for (const list of Object.values(nets)) {
  if (!list) continue;
  for (const n of list) {
    if (n.family === 'IPv4' && !n.internal) ips.push(n.address);
  }
}
const ip = ips[0] ?? '127.0.0.1';
const url = `http://${ip}:5173/?touch=1`;
console.log(url);
if (typeof process.send === 'function') process.send(url);
