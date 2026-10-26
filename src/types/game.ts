export type ItemKind = 'material' | 'tool' | 'weapon' | 'armor' | 'currency';

export type ItemDef = {
  id: string;
  name: string;
  stack: number;
  kind: ItemKind;
  color: string;
  /** Vendor gold per unit (0 / omit = not sellable). */
  sellValue?: number;
  gatherBonus?: number;
  damage?: number;
  attackRange?: number;
  armor?: number;
  maxHpBonus?: number;
};

export type NodeDef = {
  id: string;
  name: string;
  hp: number;
  color: string;
  drops: { itemId: string; qtyMin: number; qtyMax: number }[];
  toolBonusItem?: string;
};

export type RecipeDef = {
  id: string;
  name: string;
  resultId: string;
  resultQty: number;
  ingredients: { itemId: string; qty: number }[];
};

/** 1=starter wild, 2=normal rift, 3=tough, 4=boss/elite. */
export type LootTier = 1 | 2 | 3 | 4;

export type EnemyDef = {
  id: string;
  name: string;
  hp: number;
  damage: number;
  speed: number;
  attackRange: number;
  attackCooldown: number;
  xp: number;
  color: string;
  radius: number;
  lootTable: string;
  isElite: boolean;
  lootTier: LootTier;
};

export type LootRoll = {
  itemId: string;
  chance: number;
  qtyMin: number;
  qtyMax: number;
};

export type LootTableDef = {
  id: string;
  rolls: LootRoll[];
};

export type CharacterClassId = 'warrior' | 'mystic' | 'mage';

export type CharacterGender = 'male' | 'female' | 'nonbinary';

export type PlayerStats = {
  strength: number;
  dexterity: number;
  stamina: number;
  intellect: number;
};

export type GearSlot = 'weapon' | 'hat' | 'chest' | 'legs' | 'feet';

export type GearRarity = 'common' | 'magic' | 'rare' | 'legendary';

export type GearStats = {
  strength: number;
  dexterity: number;
  stamina: number;
  intellect: number;
  armor: number;
  damage: number;
  /** Percent boost to class skill damage (e.g. 8 = +8%). */
  skillPower: number;
};

export type GearInstance = {
  uid: string;
  baseId: string;
  name: string;
  slot: GearSlot;
  setId: string | null;
  /** Null = any class; otherwise only that class can equip. */
  classId: CharacterClassId | null;
  rarity: GearRarity;
  itemLevel: number;
  stats: GearStats;
  attackRange?: number;
};

export type ArmorSetDef = {
  id: string;
  name: string;
  color: string;
  classId: CharacterClassId;
  twoPiece: {
    label: string;
    armor?: number;
    strength?: number;
    dexterity?: number;
    stamina?: number;
    intellect?: number;
    damage?: number;
    skillPower?: number;
  };
  fourPiece: {
    label: string;
    armor?: number;
    strength?: number;
    dexterity?: number;
    stamina?: number;
    intellect?: number;
    damage?: number;
    maxHp?: number;
    skillPower?: number;
  };
};

export type ClassDef = {
  id: CharacterClassId;
  name: string;
  blurb: string;
  color: string;
  baseStats: PlayerStats;
  starterWeaponDamage: number;
  hpPerStamina: number;
  damageStat: keyof PlayerStats;
};

export type AbilityKind =
  | 'cleave'
  | 'strike'
  | 'buff'
  | 'dash_strike'
  | 'blink'
  | 'slow_nova'
  | 'pulse'
  | 'leap'
  | 'bolt'
  | 'barrier';

export type AbilityDef = {
  id: string;
  classId: CharacterClassId;
  name: string;
  blurb: string;
  maxRank: number;
  cooldown: number;
  kind: AbilityKind;
  range?: number;
  damageMult: number;
  rankBonus: number;
  maxTargets?: number;
  dash?: number;
  duration?: number;
  stun?: number;
  slow?: number;
  barrierHp?: number;
  rankBarrier?: number;
};

export type SkillNodeDef = {
  id: string;
  abilityId: string;
  name: string;
  blurb: string;
  col: number;
  row: number;
  requires: string[];
  starter: boolean;
};
