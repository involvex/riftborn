import type {
  GearInstance,
  GearRarity,
  GearSlot,
  GearStats,
} from '../types/game';
import gearBases from '../data/gearBases.json';

type GearBase = {
  id: string;
  name: string;
  slot: GearSlot;
  setId: string | null;
  armorBias: number;
  damageBias?: number;
};

const bases = gearBases as Record<string, GearBase>;

const ARMOR_SLOTS: GearSlot[] = ['hat', 'chest', 'legs', 'feet'];
const RARITY_WEIGHTS: { rarity: GearRarity; w: number; affixes: number }[] = [
  { rarity: 'common', w: 50, affixes: 0 },
  { rarity: 'magic', w: 30, affixes: 1 },
  { rarity: 'rare', w: 15, affixes: 2 },
  { rarity: 'legendary', w: 5, affixes: 3 },
];

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

function emptyStats(): GearStats {
  return {
    strength: 0,
    dexterity: 0,
    stamina: 0,
    intellect: 0,
    armor: 0,
    damage: 0,
  };
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
  };
}

function rollAffix(
  stats: GearStats,
  itemLevel: number,
  rnd: () => number,
): void {
  const amount = 1 + Math.floor(rnd() * (2 + itemLevel / 8));
  const picks: (keyof GearStats)[] = [
    'strength',
    'dexterity',
    'stamina',
    'intellect',
    'armor',
    'damage',
  ];
  const key = picks[Math.floor(rnd() * picks.length)];
  stats[key] += amount;
}

export function createStarterWeapon(
  classId: string,
  damage: number,
): GearInstance {
  const baseId =
    classId === 'mage'
      ? 'ash_staff'
      : classId === 'warrior'
        ? 'iron_blade'
        : 'rift_blade';
  const base = bases[baseId] ?? bases.iron_blade;
  return {
    uid: uid(),
    baseId: base.id,
    name: `Recruit's ${base.name}`,
    slot: 'weapon',
    setId: null,
    rarity: 'common',
    itemLevel: 1,
    stats: { ...emptyStats(), damage },
    attackRange: classId === 'mage' ? 1.6 : 1.15,
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
  const stats = emptyStats();
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

/** Roll a random armor/weapon drop for the given item level. */
export function rollGearDrop(
  itemLevel: number,
  opts: { elite?: boolean; preferArmor?: boolean; rnd?: () => number } = {},
): GearInstance {
  const rnd = opts.rnd ?? Math.random;
  const rarity = pickRarity(rnd, opts.elite ? 2 : 0);
  const affixCount =
    RARITY_WEIGHTS.find((r) => r.rarity === rarity)?.affixes ?? 0;

  const armorBases = Object.values(bases).filter((b) =>
    ARMOR_SLOTS.includes(b.slot),
  );
  const weaponBases = Object.values(bases).filter((b) => b.slot === 'weapon');
  const pool =
    opts.preferArmor !== false && rnd() > 0.22 ? armorBases : weaponBases;
  const base = pool[Math.floor(rnd() * pool.length)] ?? armorBases[0];

  const stats = emptyStats();
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

  for (let i = 0; i < affixCount; i++) rollAffix(stats, itemLevel, rnd);

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
    rarity,
    itemLevel,
    stats,
    attackRange: base.slot === 'weapon' ? 1.2 + rnd() * 0.3 : undefined,
  };
}

export function describeGear(item: GearInstance): string {
  const parts = [`[${item.rarity}] ${item.name} (ilvl ${item.itemLevel})`];
  const s = item.stats;
  if (s.damage) parts.push(`DMG ${s.damage}`);
  if (s.armor) parts.push(`ARM ${s.armor}`);
  if (s.strength) parts.push(`STR ${s.strength}`);
  if (s.dexterity) parts.push(`DEX ${s.dexterity}`);
  if (s.stamina) parts.push(`STA ${s.stamina}`);
  if (s.intellect) parts.push(`INT ${s.intellect}`);
  if (item.setId) parts.push(`Set:${item.setId}`);
  return parts.join(' · ');
}
