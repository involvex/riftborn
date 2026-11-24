import type { ShiftLayerId } from '../data/shiftLayers';
import type { RiftModifierId } from '../systems/RiftModifiers';
import type {
  CharacterClassId,
  CharacterGender,
  GearInstance,
  LootTier,
  PlayerStats,
} from './game';

export type RiftRunEnemySave = {
  defId: string;
  x: number;
  y: number;
  hp: number;
  elitePack: boolean;
  boss: boolean;
  /** Optional spur champion (not the Rift Lord). */
  champion?: boolean;
  combatLayer: ShiftLayerId | 'both';
};

/** Mid-rift snapshot — geometry regenerates from seed; living state from here. */
export type RiftRunSave = {
  seed: number;
  depth: number;
  modId: RiftModifierId;
  kills: number;
  bossSpawned: boolean;
  bossDead: boolean;
  cleared: boolean;
  shiftLayer: ShiftLayerId;
  shiftEnergy: number;
  shiftCooldownLeft: number;
  /** Rift fog bit-pack (same encoding as hubExplored). */
  explored: string | null;
  enemies: RiftRunEnemySave[];
  groundLoot: { x: number; y: number; item: GearInstance }[];
  bossChest: {
    x: number;
    y: number;
    looted: boolean;
    lootTier: LootTier;
  } | null;
  /** Resource nodes still in the run (id = defId). */
  nodes: { id: string; x: number; y: number; hp: number }[];
  /** Active skill slot cooldowns remaining (seconds). */
  skillCooldowns: [number, number, number, number];
  /** Mage barrier HP left (0 = none). */
  barrierHp: number;
  /** Seconds of barrier duration remaining. */
  barrierLeft: number;
  /** Ember Shrine (and similar) damage buff multiplier. */
  damageBuffMult: number;
  /** Seconds of damage buff remaining. */
  damageBuffLeft: number;
  /** Active one-rift elixirs for this run (optional for older saves). */
  activeElixirs?: string[];
};

export type BountyKind =
  | 'scout'
  | 'chests'
  | 'cull'
  | 'shrine'
  | 'bramble'
  | 'forge'
  | 'rift_clear'
  | 'rift_boss'
  | 'rift_mat';

export type ActiveBounty = {
  kind: BountyKind;
  label: string;
  target: number;
  progress: number;
  rewardGold: number;
  rewardXp: number;
  /** Craft-sink item paid by the forge contract (optional). */
  rewardItemId?: string;
};

export type StackSlot = {
  kind: 'stack';
  itemId: string;
  qty: number;
};

export type GearBagSlot = {
  kind: 'gear';
  item: GearInstance;
};

export type InventorySlot = StackSlot | GearBagSlot;

export type EquipmentSlots = {
  weapon: GearInstance | null;
  hat: GearInstance | null;
  chest: GearInstance | null;
  legs: GearInstance | null;
  feet: GearInstance | null;
  tool: string | null;
};

export type CharacterSave = {
  version: 5;
  name: string;
  classId: CharacterClassId;
  gender: CharacterGender;
  level: number;
  xp: number;
  unspentStatPoints: number;
  unspentSkillPoints: number;
  /** Ability id → rank (0 = locked). */
  skillRanks: Record<string, number>;
  stats: PlayerStats;
  hp: number;
  maxHp: number;
  inventory: InventorySlot[];
  equipment: EquipmentSlots;
  worldX: number;
  worldY: number;
  inRift: boolean;
  riftSeed: number | null;
  playTimeSec: number;
  /** Active plaza bounty (optional for older saves). */
  bounty?: ActiveBounty | null;
  bountyLastKind?: BountyKind | null;
  /** Seconds left before the board accepts a new bounty. */
  bountyCooldownLeft?: number;
  /**
   * Hub fog of war — base64 bit-pack of explored tiles (hub size²).
   */
  hubExplored?: string | null;
  /** Mid-rift living state; null when in town. */
  riftRun?: RiftRunSave | null;
  /**
   * Post-cap pressure step (optional; missing = 0 for legacy saves).
   * Raised on Apex clears after depth 10 / level 50.
   */
  pressureStep?: number;
  /** Biome elixirs armed for the next rift (optional; missing = []). */
  armedElixirs?: string[];
};
