/**
 * Jam-safe co-op gates. Local co-op is a hub sandbox prototype — it must
 * not freeze rift combat or strand judges who press P by mistake.
 */

export const COOP_PROTOTYPE = true;

/** Default loopback when no setting / discovery file is present. */
export const DEFAULT_COOP_WS = 'ws://127.0.0.1:8787';

/**
 * Normalize a typed host URL for WebSocket connect.
 * Empty → '' (caller falls through to discovery / default).
 * Bare `host:port` → `ws://host:port`. `http(s)` → `ws(s)`.
 */
export function normalizeCoopHostUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  if (/^wss?:\/\//i.test(t)) return t;
  if (/^https:\/\//i.test(t)) return `wss://${t.slice('https://'.length)}`;
  if (/^http:\/\//i.test(t)) return `ws://${t.slice('http://'.length)}`;
  return `ws://${t}`;
}

export function coopJoinBlockedReason(inRift: boolean): string | null {
  if (!COOP_PROTOTYPE) return null;
  if (inRift) return 'Leave the rift before joining co-op (hub prototype)';
  return null;
}

export function coopRiftBlockedReason(connected: boolean): string | null {
  if (!COOP_PROTOTYPE) return null;
  if (connected) return 'Leave co-op (P) before entering a rift — solo only';
  return null;
}

export function coopWelcomeToast(host: boolean): string {
  const role = host ? 'Hosting' : 'Joined';
  return `${role} co-op hub sandbox 64×64 (prototype — no rifts)`;
}

/** Leave / disconnect copy — keep hub-only expectation clear. */
export function coopLeftToast(): string {
  return 'Left co-op hub sandbox';
}

export function coopConnectingToast(url: string): string {
  return `Connecting hub co-op… ${url}`;
}
