/**
 * Pure range-gate rules for active skills (no Phaser).
 * Keeps targeted casts honest without touching damage, ranges or cooldowns.
 */

import type { AbilityKind } from '../types/game';

export type SkillRangeKind = 'targeted' | 'aoe' | 'mobility';
export type SkillRangeSkipReason = 'no_target' | 'out_of_range';

export type SkillRangeDecision =
  { action: 'cast' } | { action: 'skip'; reason: SkillRangeSkipReason };

/** Only one "Move closer" hint per window (WorldScene toast throttle). */
export const RANGE_HINT_COOLDOWN_MS = 1500;

export function skillRangeKind(kind: AbilityKind): SkillRangeKind {
  switch (kind) {
    case 'strike':
    case 'bolt':
    case 'chain':
      return 'targeted';
    case 'leap':
    case 'dash_strike':
    case 'blink':
      return 'mobility';
    case 'cleave':
    case 'slow_nova':
    case 'pulse':
    case 'buff':
    case 'barrier':
      return 'aoe';
  }
}

/**
 * Targeted: cast only with a foe in range; else skip (and say why once).
 * AoE / mobility: always cast — the skill centers on the player or auto-aims.
 */
export function decideSkillRangeGate(input: {
  kind: SkillRangeKind;
  hasTargetInRange: boolean;
  hasTargetInAssistRange: boolean;
}): SkillRangeDecision {
  if (input.kind !== 'targeted') return { action: 'cast' };
  if (input.hasTargetInRange) return { action: 'cast' };
  if (input.hasTargetInAssistRange) {
    return { action: 'skip', reason: 'out_of_range' };
  }
  return { action: 'skip', reason: 'no_target' };
}

export function shouldShowRangeHint(
  nowMs: number,
  lastShownMs: number,
): boolean {
  return nowMs - lastShownMs >= RANGE_HINT_COOLDOWN_MS;
}
