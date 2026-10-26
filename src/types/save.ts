import type {
  CharacterClassId,
  CharacterGender,
  GearInstance,
  PlayerStats,
} from './game';

export type BountyKind = 'scout' | 'chests' | 'cull';

export type ActiveBounty = {
  kind: BountyKind;
  label: string;
  target: number;
  progress: number;
  rewardGold: number;
  rewardXp: number;
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
  version: 4;
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
   * Rift fog is per-run and not saved.
   */
  hubExplored?: string | null;
};
