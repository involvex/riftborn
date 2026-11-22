import type { GearInstance, GearNamedAffix, GearStats } from '../types/game';
import type { EquipmentSlots, InventorySlot } from '../types/save';
import { rarityCss } from './RarityVisual';
import { countSetPieces } from './SetBonus';
import { missingSetSlots, ownedSetSlots, slotShortLabel } from './SetChase';
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

export type CompareTone = 'better' | 'worse' | 'same';

export type CompareRow = {
  key: keyof GearStats;
  label: string;
  candidate: number;
  equipped: number;
  delta: number;
  tone: CompareTone;
};

export const COMPARE_TONE_CSS: Record<CompareTone, string> = {
  better: '#6ecf7a',
  worse: '#e07070',
  same: '#a8b0bc',
};

export type TooltipLine = { text: string; color: string };

const NAMED_AFFIX_COLOR = '#d0b070';

/**
 * Set name + progress if this item is worn. `equipment` is the full loadout,
 * so the count reflects the swap (candidate replaces its own slot). Bag
 * pieces count toward "need X" so chase reads in the inventory panel.
 * Breakpoints are always their own lines (gold when unlocked, muted preview).
 */
export function setTooltipLines(
  item: GearInstance,
  equipment?: EquipmentSlots | null,
  bag: InventorySlot[] = [],
): TooltipLine[] {
  if (!item.setId) return [];
  const def = sets[item.setId];
  if (!def) return [];
  const next: EquipmentSlots = { ...(equipment ?? emptyEquipment()) };
  (next as Record<string, unknown>)[item.slot] = item;
  const after = countSetPieces(next).get(item.setId) ?? 1;
  const before = equipment
    ? (countSetPieces(equipment).get(item.setId) ?? 0)
    : 0;
  const owned = ownedSetSlots(item.setId, next, bag);
  owned.add(item.slot);
  const collection = owned.size;
  const out: TooltipLine[] = [
    {
      text: `Set ${def.name} · ${collection}/4`,
      color: def.color,
    },
  ];
  if (after >= 4 && before < 4) {
    out.push({ text: `4pc: ${def.fourPiece.label}`, color: '#f0d090' });
  } else if (after >= 2 && before < 2) {
    out.push({ text: `2pc: ${def.twoPiece.label}`, color: '#f0d090' });
  } else if (after < 2) {
    out.push({ text: `2pc: ${def.twoPiece.label}`, color: '#8a9aaa' });
  } else if (after < 4) {
    out.push({ text: `4pc: ${def.fourPiece.label}`, color: '#8a9aaa' });
  } else {
    out.push({ text: `4pc: ${def.fourPiece.label}`, color: '#f0d090' });
  }
  const missing = missingSetSlots(owned);
  if (missing.length) {
    out.push({
      text: `Need ${missing.map(slotShortLabel).join(', ')}`,
      color: '#c8b898',
    });
  }
  return out;
}

/** Readable named skill affix line for tooltips / compare. */
export function formatNamedAffixLine(affix: GearNamedAffix): string {
  if (affix.kind === 'cooldown') {
    return `${affix.name}  −${affix.value.toFixed(1)}s CD`;
  }
  if (affix.kind === 'targets') {
    return `${affix.name}  +${affix.value} targets`;
  }
  return `${affix.name}  +${Math.round(affix.value * 100)}% skill`;
}

function affixKey(a: GearNamedAffix): string {
  return `${a.skillId}:${a.kind}:${a.value}`;
}

/** Absolute named affix lines on a piece (not a delta). */
export function namedAffixLines(item: GearInstance): TooltipLine[] {
  return (item.affixes ?? []).map((a) => ({
    text: formatNamedAffixLine(a),
    color: NAMED_AFFIX_COLOR,
  }));
}

/** Named affixes on the candidate that are not on the equipped piece. */
export function namedAffixGainLines(
  candidate: GearInstance,
  equipped: GearInstance | null | undefined,
): TooltipLine[] {
  const have = new Set((equipped?.affixes ?? []).map(affixKey));
  const out: TooltipLine[] = [];
  for (const a of candidate.affixes ?? []) {
    if (have.has(affixKey(a))) continue;
    out.push({
      text: formatNamedAffixLine(a),
      color: COMPARE_TONE_CSS.better,
    });
  }
  return out;
}

/** Named affixes on the equipped piece that the candidate would lose. */
export function namedAffixLossLines(
  candidate: GearInstance,
  equipped: GearInstance | null | undefined,
): TooltipLine[] {
  if (!equipped?.affixes?.length) return [];
  const keep = new Set((candidate.affixes ?? []).map(affixKey));
  const out: TooltipLine[] = [];
  for (const a of equipped.affixes) {
    if (keep.has(affixKey(a))) continue;
    out.push({
      text: `Lose ${formatNamedAffixLine(a)}`,
      color: COMPARE_TONE_CSS.worse,
    });
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

/**
 * Counts and combat deltas only — does not sum STR/armor/Skill% into one net
 * (those stay as their own tooltip lines).
 */
export function summarizeCompare(rows: CompareRow[]): {
  betterCount: number;
  worseCount: number;
  damageDelta: number;
  armorDelta: number;
} {
  let betterCount = 0;
  let worseCount = 0;
  let damageDelta = 0;
  let armorDelta = 0;
  for (const r of rows) {
    if (r.tone === 'better') betterCount += 1;
    if (r.tone === 'worse') worseCount += 1;
    if (r.key === 'damage') damageDelta = r.delta;
    if (r.key === 'armor') armorDelta = r.delta;
  }
  return { betterCount, worseCount, damageDelta, armorDelta };
}

/** Readable multi-line tooltip with rarity tint and equip deltas. */
export function buildGearTooltipLines(
  item: GearInstance,
  equipped: GearInstance | null | undefined,
  opts: {
    sellGold?: number;
    hint?: string;
    equipment?: EquipmentSlots | null;
    bag?: InventorySlot[];
  } = {},
): TooltipLine[] {
  const lines: TooltipLine[] = [
    {
      text: `[${item.rarity}] ${item.name}`,
      color: rarityCss(item.rarity),
    },
  ];
  for (const setLine of setTooltipLines(item, opts.equipment, opts.bag ?? [])) {
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

  for (const affixLine of namedAffixLines(item)) {
    lines.push(affixLine);
  }

  if (equipped) {
    lines.push({ text: '— vs equipped —', color: '#6a8090' });
    const cmp = compareGearStats(item, equipped);
    const gains = namedAffixGainLines(item, equipped);
    const losses = namedAffixLossLines(item, equipped);
    if (cmp.length === 0 && gains.length === 0 && losses.length === 0) {
      lines.push({ text: 'Same stats', color: '#a8b0bc' });
    } else {
      for (const r of cmp) {
        lines.push({
          text: `${r.label}  ${r.candidate}  (${formatCompareDelta(r.delta)})`,
          color: COMPARE_TONE_CSS[r.tone],
        });
      }
      for (const g of gains) lines.push(g);
      for (const loss of losses) lines.push(loss);
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
      for (const g of namedAffixGainLines(item, null)) lines.push(g);
    } else if (item.affixes?.length) {
      lines.push({ text: '— vs empty slot —', color: '#6a8090' });
      for (const g of namedAffixGainLines(item, null)) lines.push(g);
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
