import type {
  CharacterClassId,
  GearInstance,
  GearRarity,
  GearSlot,
  GearStats,
  LootTier,
} from '../types/game';
import gearBases from '../data/gearBases.json';
import setsData from '../data/sets.json';
import { gearSellValue } from './Economy';

type GearBase = {
  id: string;
  name: string;
  slot: GearSlot;
  setId: string | null;
  classId: CharacterClassId | null;
  armorBias: number;
  damageBias?: number;
};

const bases = gearBases as Record<string, GearBase>;
const setClass = setsData as Record<string, { classId: CharacterClassId }>;

const ARMOR_SLOTS: GearSlot[] = ['hat', 'chest', 'legs', 'feet'];
const RARITY_WEIGHTS: { rarity: GearRarity; w: number; affixes: number }[] = [
  { rarity: 'common', w: 50, affixes: 0 },
  { rarity: 'magic', w: 30, affixes: 1 },
  { rarity: 'rare', w: 15, affixes: 2 },
  { rarity: 'legendary', w: 5, affixes: 3 },
];

const CLASS_PRIMARY: Record<CharacterClassId, keyof GearStats> = {
  warrior: 'strength',
  mystic: 'dexterity',
  mage: 'intellect',
};

function uid(): string {
  return `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const RARITY_RANK: Record<GearRarity, number> = {
  common: 0,
  magic: 1,
  rare: 2,
  legendary: 3,
};

function pickRarity(
  rnd: () => number,
  eliteBonus = 0,
  minRarity: GearRarity = 'common',
): GearRarity {
  const bump = eliteBonus;
  const minRank = RARITY_RANK[minRarity];
  const pool = RARITY_WEIGHTS.map((r) => ({
    ...r,
    w:
      r.rarity === 'common'
        ? Math.max(0, r.w - bump * 10)
        : r.w + bump * (r.rarity === 'legendary' ? 8 : 4),
  })).filter((r) => RARITY_RANK[r.rarity] >= minRank);
  const usable = pool.length
    ? pool
    : RARITY_WEIGHTS.filter((r) => RARITY_RANK[r.rarity] >= minRank);
  const total = usable.reduce((n, r) => n + r.w, 0);
  let roll = rnd() * total;
  for (const r of usable) {
    roll -= r.w;
    if (roll <= 0) return r.rarity;
  }
  return minRarity;
}

export function emptyGearStats(): GearStats {
  return {
    strength: 0,
    dexterity: 0,
    stamina: 0,
    intellect: 0,
    armor: 0,
    damage: 0,
    skillPower: 0,
  };
}

/** Resolve class from explicit field, set membership, or base id. */
export function resolveGearClass(
  item: Pick<GearInstance, 'classId' | 'setId' | 'baseId'>,
): CharacterClassId | null {
  if (item.classId) return item.classId;
  if (item.setId && setClass[item.setId]?.classId) {
    return setClass[item.setId].classId;
  }
  const base = bases[item.baseId];
  return base?.classId ?? null;
}

/** Migrate legacy vitality/spirit gear rolls into stamina/dexterity. */
export function normalizeGearStats(
  raw: Partial<GearStats> & Record<string, number>,
): GearStats {
  return {
    strength: raw.strength ?? 0,
    dexterity: raw.dexterity ?? raw.spirit ?? 0,
    stamina: raw.stamina ?? raw.vitality ?? 0,
    intellect: raw.intellect ?? 0,
    armor: raw.armor ?? 0,
    damage: raw.damage ?? 0,
    skillPower: raw.skillPower ?? 0,
  };
}

export function migrateGearInstance(item: GearInstance): GearInstance {
  return {
    ...item,
    classId: resolveGearClass(item),
    stats: normalizeGearStats(item.stats as GearStats & Record<string, number>),
  };
}

function rollAffix(
  stats: GearStats,
  itemLevel: number,
  classId: CharacterClassId | null,
  rnd: () => number,
): void {
  const amount = 1 + Math.floor(rnd() * (2 + itemLevel / 8));
  // Class gear heavily prefers its primary stat + skill power
  if (classId && rnd() < 0.55) {
    const key = CLASS_PRIMARY[classId];
    stats[key] += amount;
    return;
  }
  if (classId && rnd() < 0.25) {
    stats.skillPower += 2 + Math.floor(rnd() * (2 + itemLevel / 10));
    return;
  }
  const picks: (keyof GearStats)[] = [
    'strength',
    'dexterity',
    'stamina',
    'intellect',
    'armor',
    'damage',
    'skillPower',
  ];
  const key = picks[Math.floor(rnd() * picks.length)]!;
  if (key === 'skillPower') {
    stats.skillPower += 2 + Math.floor(amount / 2);
  } else {
    stats[key] += amount;
  }
}

export function createStarterWeapon(
  classId: string,
  damage: number,
): GearInstance {
  const cid = classId as CharacterClassId;
  const baseId =
    cid === 'mage'
      ? 'ash_staff'
      : cid === 'warrior'
        ? 'iron_blade'
        : 'rift_blade';
  const base = bases[baseId] ?? bases.iron_blade;
  return {
    uid: uid(),
    baseId: base.id,
    name: `Recruit's ${base.name}`,
    slot: 'weapon',
    setId: null,
    classId: base.classId,
    rarity: 'common',
    itemLevel: 1,
    stats: { ...emptyGearStats(), damage },
    attackRange: cid === 'mage' ? 1.6 : 1.15,
  };
}

function makeStarterPiece(
  baseId: string,
  extras: Partial<GearStats> = {},
): GearInstance {
  const base = bases[baseId];
  if (!base) {
    throw new Error(`Unknown gear base ${baseId}`);
  }
  const stats = emptyGearStats();
  if (base.slot === 'weapon') {
    stats.damage = Math.max(4, Math.floor(5 * (base.damageBias ?? 1)));
  } else {
    stats.armor = Math.max(1, Math.floor(3 * base.armorBias));
  }
  Object.assign(stats, extras);
  return {
    uid: uid(),
    baseId: base.id,
    name: `Recruit's ${base.name}`,
    slot: base.slot,
    setId: base.setId,
    classId: base.classId,
    rarity: 'common',
    itemLevel: 1,
    stats,
    attackRange: base.slot === 'weapon' ? 1.2 : undefined,
  };
}

/** Full starter kit: weapon + 4 armor pieces matching class set. */
export function createStarterLoadout(
  classId: string,
  weaponDamage: number,
): {
  weapon: GearInstance;
  hat: GearInstance;
  chest: GearInstance;
  legs: GearInstance;
  feet: GearInstance;
} {
  const setPrefix =
    classId === 'warrior' ? 'bone' : classId === 'mage' ? 'rift' : 'ashen';
  const primaryExtra: Partial<GearStats> =
    classId === 'warrior'
      ? { strength: 2 }
      : classId === 'mage'
        ? { intellect: 2 }
        : { dexterity: 2 };

  return {
    weapon: createStarterWeapon(classId, weaponDamage),
    hat: makeStarterPiece(`${setPrefix}_hat`, primaryExtra),
    chest: makeStarterPiece(`${setPrefix}_chest`, {
      ...primaryExtra,
      stamina: 2,
    }),
    legs: makeStarterPiece(`${setPrefix}_legs`, { stamina: 1 }),
    feet: makeStarterPiece(`${setPrefix}_feet`),
  };
}

/** Gear drop chance by enemy loot tier (before elite bump). */
export function gearDropChance(tier: LootTier, elite = false): number {
  const base = tier === 1 ? 0.12 : tier === 2 ? 0.28 : tier === 3 ? 0.42 : 0.9;
  return elite ? Math.min(0.95, base + 0.35) : base;
}

/**
 * Roll a class-locked armor/weapon drop.
 * Higher loot tiers → higher item level, better rarity, different name bands.
 */
export function rollGearDrop(
  itemLevel: number,
  opts: {
    elite?: boolean;
    preferArmor?: boolean;
    forClass?: CharacterClassId;
    /** Allow off-class pieces (shop). Default false for combat drops. */
    anyClass?: boolean;
    /** Enemy difficulty band — shifts power & naming. */
    lootTier?: LootTier;
    /** Floor rarity (e.g. scout always magic+). */
    minRarity?: GearRarity;
    rnd?: () => number;
  } = {},
): GearInstance {
  const rnd = opts.rnd ?? Math.random;
  const tier: LootTier = opts.lootTier ?? (opts.elite ? 4 : 2);
  const ilvlBump = tier === 1 ? -1 : tier === 3 ? 2 : tier === 4 ? 4 : 0;
  const effectiveLevel = Math.max(1, itemLevel + ilvlBump);
  const rarityBump =
    (opts.elite ? 2 : 0) +
    (tier === 1 ? -1 : tier === 3 ? 1 : tier === 4 ? 3 : 0);
  const rarity = pickRarity(
    rnd,
    Math.max(0, rarityBump),
    opts.minRarity ?? 'common',
  );
  const affixCount =
    (RARITY_WEIGHTS.find((r) => r.rarity === rarity)?.affixes ?? 0) +
    (tier >= 3 ? 1 : 0);

  const forClass = opts.forClass;
  const all = Object.values(bases);
  const preferArmor =
    opts.preferArmor !== undefined
      ? opts.preferArmor
      : rnd() > (tier === 1 ? 0.35 : 0.22);
  let pool = all.filter((b) =>
    preferArmor ? ARMOR_SLOTS.includes(b.slot) : b.slot === 'weapon',
  );
  if (tier === 1) {
    const light = pool.filter(
      (b) => b.slot === 'weapon' || b.armorBias <= 1.35,
    );
    if (light.length) pool = light;
  } else if (tier >= 3) {
    const heavy = pool.filter((b) => b.setId || (b.damageBias ?? 0) >= 1.15);
    if (heavy.length && rnd() < 0.65) pool = heavy;
  }
  if (!pool.length) {
    pool = all.filter((b) =>
      preferArmor ? ARMOR_SLOTS.includes(b.slot) : b.slot === 'weapon',
    );
  }
  if (forClass && !opts.anyClass) {
    const classPool = pool.filter((b) => b.classId === forClass);
    if (classPool.length) pool = classPool;
  } else if (forClass && opts.anyClass && rnd() < 0.7) {
    const classPool = pool.filter((b) => b.classId === forClass);
    if (classPool.length) pool = classPool;
  }

  const base = pool[Math.floor(rnd() * pool.length)] ?? all[0]!;
  const classId = base.classId;
  const tierMult = tier === 1 ? 0.75 : tier === 2 ? 1 : tier === 3 ? 1.2 : 1.45;

  const stats = emptyGearStats();
  if (base.slot === 'weapon') {
    const bias = base.damageBias ?? 1;
    stats.damage = Math.max(
      2,
      Math.floor((4 + effectiveLevel * 1.4) * bias * tierMult + rnd() * 3),
    );
  } else {
    stats.armor = Math.max(
      1,
      Math.floor(
        (2 + effectiveLevel * 0.9) * base.armorBias * tierMult + rnd() * 2,
      ),
    );
  }

  if (classId) {
    const key = CLASS_PRIMARY[classId];
    stats[key] += 1 + Math.floor(effectiveLevel / 6) + (tier >= 3 ? 1 : 0);
  }

  for (let i = 0; i < affixCount; i++) {
    rollAffix(stats, effectiveLevel, classId, rnd);
  }

  if (tier >= 3 && rnd() < 0.4) {
    stats.skillPower += 2 + Math.floor(rnd() * tier);
  }

  const rarityPrefix =
    rarity === 'common'
      ? ''
      : rarity === 'magic'
        ? 'Gleaming '
        : rarity === 'rare'
          ? 'Rift-Touched '
          : 'Ascendant ';
  const tierPrefix =
    rarity !== 'common'
      ? ''
      : tier === 1
        ? 'Worn '
        : tier === 3
          ? 'Hardened '
          : tier === 4
            ? 'Warlord '
            : '';

  return {
    uid: uid(),
    baseId: base.id,
    name: `${rarityPrefix || tierPrefix}${base.name}`,
    slot: base.slot,
    setId: base.setId,
    classId,
    rarity,
    itemLevel: effectiveLevel,
    stats,
    attackRange: base.slot === 'weapon' ? 1.2 + rnd() * 0.3 : undefined,
  };
}

/** Compact line for toasts / lists (no armor — use describeGearFull for that). */
export function describeGear(item: GearInstance): string {
  const parts = [`[${item.rarity}] ${item.name} (ilvl ${item.itemLevel})`];
  const s = item.stats;
  if (s.damage) parts.push(`DMG ${s.damage}`);
  if (s.strength) parts.push(`STR ${s.strength}`);
  if (s.dexterity) parts.push(`DEX ${s.dexterity}`);
  if (s.stamina) parts.push(`STA ${s.stamina}`);
  if (s.intellect) parts.push(`INT ${s.intellect}`);
  if (s.skillPower) parts.push(`Skill +${s.skillPower}%`);
  const cls = resolveGearClass(item);
  if (cls) parts.push(cls.toUpperCase());
  return parts.join(' · ');
}

/** Full tooltip including armor / set / vendor value. */
export function describeGearFull(item: GearInstance): string {
  const parts = [describeGear(item)];
  if (item.stats.armor) parts.push(`ARM ${item.stats.armor}`);
  if (item.setId) parts.push(`Set:${item.setId}`);
  parts.push(`Sell ${gearSellValue(item)}g`);
  return parts.join(' · ');
}

export function classLabel(id: CharacterClassId | null): string {
  if (!id) return 'Any';
  if (id === 'warrior') return 'Warrior';
  if (id === 'mystic') return 'Mystic';
  return 'Mage';
}
