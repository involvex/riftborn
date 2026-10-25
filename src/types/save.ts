import type {
  CharacterClassId,
  CharacterGender,
  GearInstance,
  PlayerStats,
} from './game';

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
  version: 3;
  name: string;
  classId: CharacterClassId;
  gender: CharacterGender;
  level: number;
  xp: number;
  unspentStatPoints: number;
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
};
