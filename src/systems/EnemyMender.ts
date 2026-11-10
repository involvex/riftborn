/**
 * Pure Rift Mender logic (no Phaser).
 *
 * A support foe that never attacks: it keeps distance and channels a green
 * ring pulse, healing wounded allies in range. The tactical answer is to
 * kill it first — the windup is the counterplay window.
 */

import type { EnemyDef } from '../types/game';

/** Channel windup in seconds — long enough to read, short enough to punish. */
export const MENDER_WINDUP = 1.1;
/** Only acts while the player is close enough to witness the heal. */
export const MENDER_SIGHT = 16;
/** Standoff distance from the player (tiles). */
export const MENDER_STANDOFF = 4.5;

export interface Vec2 {
  x: number;
  y: number;
}

export interface MenderAlly extends Vec2 {
  id: string;
  hp: number;
  maxHp: number;
  alive: boolean;
}

export function isMenderEnemy(defId: string): boolean {
  return defId === 'rift_mender';
}

/** Live, wounded allies inside the heal radius, excluding the mender. */
export function menderWoundedAllies(
  self: MenderAlly,
  allies: readonly MenderAlly[],
  healRange: number,
): MenderAlly[] {
  if (healRange <= 0) return [];
  const out: MenderAlly[] = [];
  for (const ally of allies) {
    if (!ally.alive || ally.id === self.id) continue;
    if (ally.hp >= ally.maxHp) continue;
    const d = Math.hypot(ally.x - self.x, ally.y - self.y);
    if (d <= healRange) out.push(ally);
  }
  // Weakest first — deterministic order for tests and pulses.
  out.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
  return out;
}

/** Ground healed per ally: healFrac of their max HP, never below 1. */
export function menderHealAmount(allyMaxHp: number, healFrac: number): number {
  if (!(allyMaxHp > 0) || !(healFrac > 0)) return 0;
  return Math.max(1, Math.floor(allyMaxHp * healFrac));
}

/** Cooldown done, a wounded ally in range, and the player close enough. */
export function menderShouldChannel(
  cooldown: number,
  woundedCount: number,
  playerDist: number,
): boolean {
  return cooldown <= 0 && woundedCount > 0 && playerDist <= MENDER_SIGHT;
}

/**
 * Movement direction: pure standoff — away from the player inside the
 * ring, gentle idling outside. Never approaches the player, so the pack
 * keeps a readable formation.
 */
export function menderMoveDir(from: Vec2, player: Vec2): Vec2 {
  const dx = player.x - from.x;
  const dy = player.y - from.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1e-9) return { x: 0, y: 0 };
  if (dist < MENDER_STANDOFF) {
    return { x: -dx / dist, y: -dy / dist };
  }
  return { x: 0, y: 0 };
}

/** Resolved heal tick for the enemy entity (pure: returns the plan). */
export function menderHealPlan(
  self: MenderAlly,
  allies: readonly MenderAlly[],
  def: EnemyDef,
): { allyId: string; amount: number }[] {
  const plan: { allyId: string; amount: number }[] = [];
  for (const ally of menderWoundedAllies(self, allies, def.healRange ?? 0)) {
    plan.push({
      allyId: ally.id,
      amount: menderHealAmount(ally.maxHp, def.healFrac ?? 0),
    });
  }
  return plan;
}
