/**
 * Rift completion rule (pure, no Phaser).
 *
 * Elite-def fauna inside rifts (Nightwing / ash_bat, Ash Scout) also carries
 * `isBoss` — that flag is about size/loot, not about finishing a rift. Only the
 * Rift Lord spawned by `spawnRiftBoss` may open the exit and clear the run.
 */

export const RIFT_LORD_DEF_ID = 'rift_lord';

export function isRiftBossKill(
  enemy: { id: string; defId: string },
  riftBossId: string | null,
): boolean {
  if (riftBossId === null) return false;
  return enemy.id === riftBossId;
}
