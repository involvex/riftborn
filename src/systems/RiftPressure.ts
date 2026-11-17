/**
 * Post-cap pressure ladder — stacks on top of Depth 10 / Apex after level 50.
 * Missing save field means 0 (legacy slots).
 */

import type { DepthRule } from './RiftDepth';

/** Cleared Apex runs raise pressure; soft-cap so packs stay fair. */
export const PRESSURE_MAX = 20;

export function clampPressureStep(raw: unknown): number {
  const n = Math.floor(Number(raw) || 0);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(PRESSURE_MAX, n);
}

export function nextPressureStep(current: number): number {
  return clampPressureStep(current + 1);
}

/** Per-step multipliers applied on top of the depth rule. */
export function pressureMults(step: number): {
  hpMult: number;
  dmgMult: number;
  lootBump: number;
  clearGold: number;
  clearShards: number;
} {
  const s = clampPressureStep(step);
  return {
    hpMult: 1 + s * 0.06,
    dmgMult: 1 + s * 0.05,
    lootBump: Math.floor(s / 3),
    clearGold: 20 + s * 8,
    clearShards: 1 + Math.floor(s / 4),
  };
}

export function applyPressureToRule(rule: DepthRule, step: number): DepthRule {
  const p = pressureMults(step);
  return {
    ...rule,
    hpMult: rule.hpMult * p.hpMult,
    dmgMult: rule.dmgMult * p.dmgMult,
    lootBump: rule.lootBump + p.lootBump,
    goldOnKill: rule.goldOnKill + Math.floor(step / 2),
  };
}

export function pressureHudLabel(step: number): string | null {
  const s = clampPressureStep(step);
  if (s <= 0) return null;
  return `P${s}`;
}
