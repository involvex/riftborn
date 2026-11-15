/**
 * Jam-safe co-op gates. Local co-op is a hub sandbox prototype — it must
 * not freeze rift combat or strand judges who press P by mistake.
 */

export const COOP_PROTOTYPE = true;

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
  return `${role} co-op hub sandbox (prototype — no rifts)`;
}
