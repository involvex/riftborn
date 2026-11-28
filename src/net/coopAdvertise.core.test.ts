import { describe, expect, test } from 'bun:test';

/**
 * Mirrors server/lanHosts advertiseWs pick logic (pure) so client-side
 * tests cover URL selection without importing node:os into src/.
 */
function pickAdvertiseWs(
  port: number,
  lanHosts: string[],
): { ws: string; lan: string[] } {
  const host = lanHosts[0] ?? '127.0.0.1';
  return {
    ws: `ws://${host}:${port}`,
    lan: lanHosts.map((ip) => `ws://${ip}:${port}`),
  };
}

describe('pickAdvertiseWs', () => {
  test('falls back to loopback when no LAN hosts', () => {
    expect(pickAdvertiseWs(8787, [])).toEqual({
      ws: 'ws://127.0.0.1:8787',
      lan: [],
    });
  });

  test('prefers the first LAN host', () => {
    expect(pickAdvertiseWs(9000, ['10.0.0.2', '10.0.0.3'])).toEqual({
      ws: 'ws://10.0.0.2:9000',
      lan: ['ws://10.0.0.2:9000', 'ws://10.0.0.3:9000'],
    });
  });
});
