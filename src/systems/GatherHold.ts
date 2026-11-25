/**
 * Pure helpers for hold-to-mine (lock a node, approach, swing on cadence).
 */

export type GatherHoldGate = {
  held: boolean;
  uiBlocked: boolean;
  cooldownLeft: number;
};

/** True when a held mine input should try another gather swing. */
export function canRepeatGather(gate: GatherHoldGate): boolean {
  return gate.held && !gate.uiBlocked && gate.cooldownLeft <= 0;
}

/**
 * Move vector toward a gather node while hold-mining out of range.
 * Magnitude 1 when farther than stopRange; 0 when already in swing range.
 */
export function gatherApproachDelta(
  player: { x: number; y: number },
  node: { x: number; y: number },
  stopRange: number,
): { x: number; y: number; inRange: boolean } {
  const dx = node.x - player.x;
  const dy = node.y - player.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= stopRange) {
    return { x: 0, y: 0, inRange: true };
  }
  if (dist < 1e-6) {
    return { x: 0, y: 0, inRange: true };
  }
  return { x: dx / dist, y: dy / dist, inRange: false };
}
