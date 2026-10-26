import type {
  CharacterClassId,
  GearInstance,
  GearRarity,
  GearSlot,
  GearStats,
} from '../types/game';
import gearBases from '../data/gearBases.json';
import setsData from '../data/sets.json';

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

function pickRarity(rnd: () => number, eliteBonus = 0): GearRarity {
  const bump = eliteBonus;
  const pool = RARITY_WEIGHTS.map((r) => ({
    ...r,
    w:
      r.rarity === 'common'
        ? Math.max(5, r.w - bump * 10)
        : r.w + bump * (r.rarity === 'legendary' ? 8 : 4),
  }));
  const total = pool.reduce((n, r) => n + r.w, 0);
  let roll = rnd() * total;
  for (const r of pool) {
    roll -= r.w;
    if (roll <= 0) return r.rarity;
  }
  return 'common';
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

/**
 * Roll a class-locked armor/weapon drop.
 * Enemy kills pass the player class so drops match (Warrior Bone, etc.).
 */
export function rollGearDrop(
  itemLevel: number,
  opts: {
    elite?: boolean;
    preferArmor?: boolean;
    forClass?: CharacterClassId;
    /** Allow off-class pieces (shop). Default false for combat drops. */
    anyClass?: boolean;
    rnd?: () => number;
  } = {},
): GearInstance {
  const rnd = opts.rnd ?? Math.random;
  const rarity = pickRarity(rnd, opts.elite ? 2 : 0);
  const affixCount =
    RARITY_WEIGHTS.find((r) => r.rarity === rarity)?.affixes ?? 0;

  const forClass = opts.forClass;
  const all = Object.values(bases);
  let pool = all.filter((b) =>
    opts.preferArmor !== false && rnd() > 0.22
      ? ARMOR_SLOTS.includes(b.slot)
      : b.slot === 'weapon',
  );
  if (forClass && !opts.anyClass) {
    const classPool = pool.filter((b) => b.classId === forClass);
    if (classPool.length) pool = classPool;
  } else if (forClass && opts.anyClass && rnd() < 0.7) {
    const classPool = pool.filter((b) => b.classId === forClass);
    if (classPool.length) pool = classPool;
  }

  const base = pool[Math.floor(rnd() * pool.length)] ?? all[0]!;
  const classId = base.classId;

  const stats = emptyGearStats();
  if (base.slot === 'weapon') {
    const bias = base.damageBias ?? 1;
    stats.damage = Math.max(
      3,
      Math.floor((4 + itemLevel * 1.4) * bias + rnd() * 3),
    );
  } else {
    stats.armor = Math.max(
      1,
      Math.floor((2 + itemLevel * 0.9) * base.armorBias + rnd() * 2),
    );
  }

  // Guaranteed primary-stat bump on class gear
  if (classId) {
    const key = CLASS_PRIMARY[classId];
    stats[key] += 1 + Math.floor(itemLevel / 6);
  }

  for (let i = 0; i < affixCount; i++) {
    rollAffix(stats, itemLevel, classId, rnd);
  }

  const rarityPrefix =
    rarity === 'common'
      ? ''
      : rarity === 'magic'
        ? 'Gleaming '
        : rarity === 'rare'
          ? 'Rift-Touched '
          : 'Ascendant ';

  return {
    uid: uid(),
    baseId: base.id,
    name: `${rarityPrefix}${base.name}`,
    slot: base.slot,
    setId: base.setId,
    classId,
    rarity,
    itemLevel,
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

/** Full tooltip including armor / set (Character tab & hover). */
export function describeGearFull(item: GearInstance): string {
  const parts = [describeGear(item)];
  if (item.stats.armor) parts.push(`ARM ${item.stats.armor}`);
  if (item.setId) parts.push(`Set:${item.setId}`);
  return parts.join(' · ');
}

export function classLabel(id: CharacterClassId | null): string {
  if (!id) return 'Any';
  if (id === 'warrior') return 'Warrior';
  if (id === 'mystic') return 'Mystic';
  return 'Mage';
}
