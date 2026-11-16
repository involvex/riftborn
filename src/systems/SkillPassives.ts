/**
 * Pure passive rank math (no Phaser) — Iron Will / Rift Attunement /
 * Arcane Reservoir.
 */

/** Warrior Iron Will — fraction of incoming damage kept (≤1). */
export function incomingDamageMult(ranks: Record<string, number>): number {
  const rank = ranks['war_ironwill'] ?? 0;
  if (rank < 1) return 1;
  return Math.max(0.7, 1 - 0.08 * rank);
}

/** Mystic Rift Attunement — flat skill-power percent added to casts. */
export function passiveSkillPower(ranks: Record<string, number>): number {
  const rank = ranks['mys_riftattune'] ?? 0;
  if (rank < 1) return 0;
  return 10 * rank;
}

/** Mage Arcane Reservoir — barrier HP multiplier. */
export function passiveBarrierMult(ranks: Record<string, number>): number {
  const rank = ranks['mag_arcaneres'] ?? 0;
  if (rank < 1) return 1;
  return 1 + 0.25 * rank;
}
