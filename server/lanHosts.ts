import os from 'node:os';

/** Non-loopback IPv4 addresses for LAN join hints. */
export function lanIpv4Hosts(): string[] {
  const out: string[] = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const a of list ?? []) {
      const family = a.family;
      const v4 = family === 'IPv4' || family === 4;
      if (v4 && !a.internal) out.push(a.address);
    }
  }
  return out;
}

/** Prefer a LAN host for coop-port.json; fall back to loopback. */
export function advertiseWs(port: number): { ws: string; lan: string[] } {
  const hosts = lanIpv4Hosts();
  const host = hosts[0] ?? '127.0.0.1';
  return {
    ws: `ws://${host}:${port}`,
    lan: hosts.map((ip) => `ws://${ip}:${port}`),
  };
}
