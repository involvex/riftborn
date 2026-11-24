import type { GearInstance } from '../types/game';
import {
  compareGearStats,
  formatCompareDelta,
  summarizeCompare,
} from './GearCompare';
import { clampPressureStep, pressureMults } from './RiftPressure';

export type RiftEndKind = 'clear' | 'abandon' | 'death';

/** Spur outcome for the return card — omit when the rift had no Elite. */
export type ChampionEndStatus = 'none' | 'slain' | 'skipped';

export type RiftEndFacts = {
  kind: RiftEndKind;
  inRift: boolean;
  depth: number;
  biomeName?: string;
  modName?: string;
  kills: number;
  goal: number;
  level: number;
  gold: number;
  shards: number;
  pressureStep: number;
  hpAfter: number;
  maxHp: number;
  gearLine?: string | null;
  playTimeSec?: number;
  /** Unpicked ground drops will despawn on the zone change. */
  lootLeftBehind?: boolean;
  /** Optional spur — slain, skipped, or absent. */
  championStatus?: ChampionEndStatus;
  /** Named Champion's drop from this run, when one dropped. */
  championLootName?: string | null;
};

export type RiftEndPay = {
  xp: number;
  gold: number;
  shards: number;
};

/** XP granted when leaving a rift before the boss is dead. */
export const RIFT_ABANDON_XP = 8;

export function riftClearPay(pressureStep: number): RiftEndPay {
  const step = clampPressureStep(pressureStep);
  const pay = pressureMults(step);
  return {
    xp: 50 + step * 5,
    gold: pay.clearGold,
    shards: pay.clearShards,
  };
}

/** Clear pays the pressure purse. Abandon pays a token of XP. Death pays nothing. */
export function riftEndPay(
  kind: RiftEndKind,
  pressureStep: number,
): RiftEndPay {
  if (kind === 'clear') return riftClearPay(pressureStep);
  if (kind === 'abandon') return { xp: RIFT_ABANDON_XP, gold: 0, shards: 0 };
  return { xp: 0, gold: 0, shards: 0 };
}

export function riftEndTitle(facts: RiftEndFacts): string {
  if (facts.kind === 'clear') return 'Rift Cleared';
  if (facts.kind === 'abandon') return 'Rift Abandoned';
  return 'You Died';
}

export function riftEndAction(facts: RiftEndFacts): string {
  if (facts.kind === 'death') return 'Return to hub';
  if (facts.kind === 'clear') return 'Return to town';
  return 'Leave rift';
}

function formatPlayTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

export function normalizeRiftEnd(raw: Partial<RiftEndFacts>): RiftEndFacts {
  const status = raw.championStatus;
  return {
    kind: raw.kind ?? 'death',
    inRift: !!raw.inRift,
    depth: raw.depth ?? 1,
    biomeName: raw.biomeName,
    modName: raw.modName,
    kills: raw.kills ?? 0,
    goal: raw.goal ?? 0,
    level: raw.level ?? 1,
    gold: raw.gold ?? 0,
    shards: raw.shards ?? 0,
    pressureStep: raw.pressureStep ?? 0,
    hpAfter: raw.hpAfter ?? 0,
    maxHp: raw.maxHp ?? 0,
    gearLine: raw.gearLine ?? null,
    playTimeSec: raw.playTimeSec ?? 0,
    lootLeftBehind: !!raw.lootLeftBehind,
    championStatus:
      status === 'slain' || status === 'skipped' || status === 'none'
        ? status
        : 'none',
    championLootName: raw.championLootName ?? null,
  };
}

/**
 * One return-card line for the optional spur.
 * Absent when the rift had no Elite.
 */
export function championEndLine(
  status: ChampionEndStatus | undefined,
  lootName?: string | null,
): string | null {
  if (!status || status === 'none') return null;
  if (status === 'skipped') return 'Elite skipped';
  const loot = lootName?.trim();
  if (loot) return `Elite slain · ${loot}`;
  return 'Elite slain';
}

export function riftEndLines(raw: Partial<RiftEndFacts>): { text: string }[] {
  const facts = normalizeRiftEnd(raw);
  const lines: { text: string }[] = [];
  if (facts.inRift) {
    const biome = facts.biomeName ? `${facts.biomeName} · ` : '';
    lines.push({ text: `${biome}D${facts.depth}` });
    if (facts.modName) lines.push({ text: facts.modName });
    const goal = facts.goal > 0 ? `/${facts.goal}` : '';
    lines.push({ text: `Kills ${facts.kills}${goal}` });
    const spur = championEndLine(facts.championStatus, facts.championLootName);
    if (spur) lines.push({ text: spur });
  } else {
    lines.push({ text: `Level ${facts.level}` });
    lines.push({ text: `Kills this life: ${facts.kills}` });
  }

  const pay = riftEndPay(facts.kind, facts.pressureStep);
  if (facts.kind === 'clear') {
    lines.push({
      text: `+${pay.xp} XP · +${pay.gold}g · +${pay.shards} shards`,
    });
  } else if (facts.kind === 'abandon') {
    lines.push({ text: `+${pay.xp} XP` });
    lines.push({
      text: `Kept ${facts.gold}g · ${facts.shards} shards`,
    });
  } else {
    lines.push({
      text: `Kept ${facts.gold}g · ${facts.shards} shards`,
    });
    if (facts.maxHp > 0) {
      lines.push({ text: `Wake at ${facts.hpAfter}/${facts.maxHp} HP` });
    } else {
      lines.push({ text: 'Wake at half health' });
    }
  }

  if (facts.inRift) lines.push({ text: `Level ${facts.level}` });
  if (facts.gearLine) lines.push({ text: facts.gearLine });
  if (facts.lootLeftBehind && facts.kind !== 'death') {
    lines.push({ text: 'Ground loot left behind' });
  }
  if (facts.kind === 'death' && (facts.playTimeSec ?? 0) > 0) {
    lines.push({
      text: `Play time: ${formatPlayTime(facts.playTimeSec ?? 0)}`,
    });
  }
  return lines;
}

/**
 * One line when a drop beats the equipped piece in that slot.
 * Score is used to keep the best upgrade seen this rift.
 */
export function gearUpgradeHighlight(
  item: GearInstance,
  equipped: GearInstance | null | undefined,
): { line: string; score: number } | null {
  const rows = compareGearStats(item, equipped ?? null);
  const summary = summarizeCompare(rows);
  const upgrade = !equipped
    ? summary.betterCount > 0
    : summary.damageDelta > 0 ||
      summary.armorDelta > 0 ||
      summary.betterCount > summary.worseCount;
  if (!upgrade) return null;
  const bits: string[] = [];
  if (summary.damageDelta) {
    bits.push(`DMG ${formatCompareDelta(summary.damageDelta)}`);
  }
  if (summary.armorDelta) {
    bits.push(`ARM ${formatCompareDelta(summary.armorDelta)}`);
  }
  const extra = bits.length ? ` · ${bits.join(' ')}` : '';
  const score =
    summary.damageDelta * 10 +
    summary.armorDelta * 4 +
    summary.betterCount -
    summary.worseCount;
  return {
    line: `Upgrade · ${item.rarity} ${item.name}${extra}`,
    score,
  };
}
