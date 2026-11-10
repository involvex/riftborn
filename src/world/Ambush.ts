/**
 * Pure ambush rules for hub POIs (no Phaser).
 *
 * Some wilderness POIs hide a surprise pack that only wakes up when the
 * player walks close enough — the counterplay is to expect it.
 */

export type AmbushDef = {
  /** POI id this ambush belongs to (used for the fired-once flag). */
  id: string;
  enemyId: string;
  count: number;
  /** Spawn tile (world). */
  x: number;
  y: number;
  /** Trigger radius around the spawn tile. */
  radius: number;
};

export type AmbushTriggerInput = {
  ambush: AmbushDef;
  playerX: number;
  playerY: number;
  /** Already triggered this visit? */
  fired: boolean;
};

/** True when the player is close enough and the ambush is still pending. */
export function shouldTriggerAmbush(input: AmbushTriggerInput): boolean {
  if (input.fired) return false;
  if (input.ambush.count <= 0) return false;
  const d = Math.hypot(
    input.playerX - input.ambush.x,
    input.playerY - input.ambush.y,
  );
  return d <= input.ambush.radius;
}
