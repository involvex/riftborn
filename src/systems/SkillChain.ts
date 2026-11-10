/**
 * Pure chain-link logic for the Mage's Chain Surge (no Phaser).
 *
 * The first link comes from the player, every later link jumps to the
 * nearest not-yet-hit foe within `chainRange` of the current one.
 */

export interface ChainCandidate {
  id: string;
  x: number;
  y: number;
  alive: boolean;
}

/** Foe ids in chain order, starting at `startId`. */
export function pickChainTargetIds(
  enemies: readonly ChainCandidate[],
  startId: string,
  chainRange: number,
  maxTargets: number,
): string[] {
  if (maxTargets <= 0 || chainRange <= 0) return [];
  const start = enemies.find((e) => e.id === startId && e.alive);
  if (!start) return [];
  const out: string[] = [];
  const used = new Set<string>();
  let current: ChainCandidate | null = start;
  while (current && out.length < maxTargets) {
    used.add(current.id);
    out.push(current.id);
    let next: ChainCandidate | null = null;
    let nextD = Infinity;
    for (const e of enemies) {
      if (!e.alive || used.has(e.id)) continue;
      const d = Math.hypot(e.x - current!.x, e.y - current!.y);
      if (d <= chainRange && d < nextD) {
        nextD = d;
        next = e;
      }
    }
    current = next;
  }
  return out;
}
