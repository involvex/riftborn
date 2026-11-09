import type { GearInstance, GearStats } from '../types/game';
import type { EquipmentSlots } from '../types/save';
import { rarityCss } from './RarityVisual';
import { countSetPieces } from './SetBonus';
import setsData from '../data/sets.json';

const sets = setsData as Record<
  string,
  {
    name: string;
    color: string;
    twoPiece: { label: string };
    fourPiece: { label: string };
  }
>;

/**
 * Set name + progress if this item is worn. `equipment` is the full loadout,
 * so the count reflects the swap (candidate replaces its own slot).
 */
export function setTooltipLines(
  item: GearInstance,
  equipment?: EquipmentSlots | null,
): { text: string; color: string }[] {
  if (!item.setId) return [];
  const def = sets[item.setId];
  if (!def) return [];
  const next: EquipmentSlots = { ...(equipment ?? emptyEquipment()) };
  (next as Record<string, unknown>)[item.slot] = item;
  const after = countSetPieces(next).get(item.setId) ?? 1;
  const before = equipment
    ? (countSetPieces(equipment).get(item.setId) ?? 0)
    : 0;
  const out = [{ text: `Set ${def.name} · ${after}/4`, color: def.color }];
  if (after >= 4 && before < 4) {
    out.push({ text: `4pc: ${def.fourPiece.label}`, color: '#f0d090' });
  } else if (after >= 2 && before < 2) {
    out.push({ text: `2pc: ${def.twoPiece.label}`, color: '#f0d090' });
  }
  return out;
}

function emptyEquipment(): EquipmentSlots {
  return {
    weapon: null,
    hat: null,
    chest: null,
    legs: null,
    feet: null,
    tool: null,
  };
}

export type CompareTone = 'better' | 'worse' | 'same';

export type CompareRow = {
  key: keyof GearStats;
  label: string;
  candidate: number;
  equipped: number;
  delta: number;
  tone: CompareTone;
};

const STAT_ORDER: { key: keyof GearStats; label: string }[] = [
  { key: 'damage', label: 'DMG' },
  { key: 'armor', label: 'ARM' },
  { key: 'strength', label: 'STR' },
  { key: 'dexterity', label: 'DEX' },
  { key: 'stamina', label: 'STA' },
  { key: 'intellect', label: 'INT' },
  { key: 'skillPower', label: 'Skill%' },
];

function toneFor(delta: number): CompareTone {
  if (delta > 0) return 'better';
  if (delta < 0) return 'worse';
  return 'same';
}

/** Diff candidate vs equipped piece (or empty stats). Zero deltas omitted. */
export function compareGearStats(
  candidate: GearInstance,
  equipped: GearInstance | null | undefined,
): CompareRow[] {
  const eq = equipped?.stats;
  const rows: CompareRow[] = [];
  for (const { key, label } of STAT_ORDER) {
    const cand = candidate.stats[key] ?? 0;
    const base = eq?.[key] ?? 0;
    const delta = cand - base;
    if (delta === 0 && cand === 0) continue;
    if (delta === 0) continue;
    rows.push({
      key,
      label,
      candidate: cand,
      equipped: base,
      delta,
      tone: toneFor(delta),
    });
  }
  return rows;
}

export function formatCompareDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;
  return `${delta}`;
}

export function summarizeCompare(rows: CompareRow[]): {
  net: number;
  betterCount: number;
  worseCount: number;
} {
  let net = 0;
  let betterCount = 0;
  let worseCount = 0;
  for (const r of rows) {
    net += r.delta;
    if (r.tone === 'better') betterCount += 1;
    if (r.tone === 'worse') worseCount += 1;
  }
  return { net, betterCount, worseCount };
}

export const COMPARE_TONE_CSS: Record<CompareTone, string> = {
  better: '#6ecf7a',
  worse: '#e07070',
  same: '#a8b0bc',
};

export type TooltipLine = { text: string; color: string };

/** Readable multi-line tooltip with rarity tint and equip deltas. */
export function buildGearTooltipLines(
  item: GearInstance,
  equipped: GearInstance | null | undefined,
  opts: {
    sellGold?: number;
    hint?: string;
    equipment?: EquipmentSlots | null;
  } = {},
): TooltipLine[] {
  const lines: TooltipLine[] = [
    {
      text: `[${item.rarity}] ${item.name}`,
      color: rarityCss(item.rarity),
    },
  ];
  for (const setLine of setTooltipLines(item, opts.equipment)) {
    lines.push(setLine);
  }
  lines.push({
    text: `ilvl ${item.itemLevel}`,
    color: '#a8b0bc',
  });

  const stats = item.stats;
  const baseRows: { label: string; value: number }[] = [
    { label: 'DMG', value: stats.damage },
    { label: 'ARM', value: stats.armor },
    { label: 'STR', value: stats.strength },
    { label: 'DEX', value: stats.dexterity },
    { label: 'STA', value: stats.stamina },
    { label: 'INT', value: stats.intellect },
    { label: 'Skill%', value: stats.skillPower },
  ];
  for (const row of baseRows) {
    if (!row.value) continue;
    lines.push({
      text: `${row.label}  ${row.value}`,
      color: '#e8e4d8',
    });
  }

  if (equipped) {
    lines.push({ text: '— vs equipped —', color: '#6a8090' });
    const cmp = compareGearStats(item, equipped);
    if (cmp.length === 0) {
      lines.push({ text: 'Same stats', color: '#a8b0bc' });
    } else {
      for (const r of cmp) {
        lines.push({
          text: `${r.label}  ${r.candidate}  (${formatCompareDelta(r.delta)})`,
          color: COMPARE_TONE_CSS[r.tone],
        });
      }
    }
  } else {
    const cmp = compareGearStats(item, null);
    if (cmp.length) {
      lines.push({ text: '— vs empty slot —', color: '#6a8090' });
      for (const r of cmp) {
        lines.push({
          text: `${r.label}  ${formatCompareDelta(r.delta)}`,
          color: COMPARE_TONE_CSS.better,
        });
      }
    }
  }

  if (opts.sellGold != null) {
    lines.push({ text: `Sell ${opts.sellGold}g`, color: '#c4a574' });
  }
  if (opts.hint) {
    lines.push({ text: opts.hint, color: '#8a9aaa' });
  }
  return lines;
}
