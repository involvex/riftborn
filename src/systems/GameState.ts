import { Events, gameEvents } from '../core/EventBus';
import { saveStore } from '../core/SaveStore';
import type {
  CharacterClassId,
  CharacterGender,
  GearInstance,
} from '../types/game';
import type { CharacterSave } from '../types/save';
import { CombatSystem } from './CombatSystem';
import { CraftingSystem } from './CraftingSystem';
import { GatheringSystem } from './GatheringSystem';
import { emptyEquipment, InventorySystem } from './InventorySystem';
import { createStarterLoadout } from './ItemGen';
import { getClassDef, ProgressionSystem } from './ProgressionSystem';

export class GameState {
  readonly inventory = new InventorySystem();
  readonly progression = new ProgressionSystem();
  readonly crafting = new CraftingSystem(this.inventory);
  readonly gathering = new GatheringSystem(this.inventory);
  readonly combat = new CombatSystem(this.inventory, this.progression);

  name = 'Wanderer';
  gender: CharacterGender = 'male';
  hp = 100;
  maxHp = 100;
  worldX = 8;
  worldY = 8;
  inRift = false;
  riftSeed: number | null = null;
  playTimeSec = 0;
  pendingSessionToken: string | null = null;

  createNew(
    name: string,
    classId: CharacterClassId,
    gender: CharacterGender = 'male',
  ): void {
    this.name = name.trim() || 'Wanderer';
    this.gender = gender;
    this.progression.initClass(classId);
    this.inventory.load([], emptyEquipment());
    const def = getClassDef(classId);
    const kit = createStarterLoadout(classId, def.starterWeaponDamage);
    this.inventory.equipment.weapon = kit.weapon;
    this.inventory.equipment.hat = kit.hat;
    this.inventory.equipment.chest = kit.chest;
    this.inventory.equipment.legs = kit.legs;
    this.inventory.equipment.feet = kit.feet;
    this.inventory.equipment.tool = 'hatchet';
    this.inventory.add('wood', 3);
    this.inventory.add('ore', 1);
    this.inventory.add('scrap', 2);
    this.recalcMaxHp();
    this.hp = this.maxHp;
    this.worldX = 8;
    this.worldY = 8;
    this.inRift = false;
    this.riftSeed = null;
    this.playTimeSec = 0;
    this.pendingSessionToken = null;
    this.persist();
  }

  tryLoad(): boolean {
    const data = saveStore.load();
    if (!data) return false;
    this.applySave(data);
    return true;
  }

  applySave(data: CharacterSave): void {
    this.name = data.name;
    this.gender = data.gender ?? 'male';
    this.progression.load(
      data.level,
      data.xp,
      data.unspentStatPoints,
      data.stats,
      data.classId,
    );
    this.inventory.load(data.inventory, data.equipment);
    this.recalcMaxHp();
    this.hp = Math.min(data.hp, this.maxHp);
    this.worldX = data.worldX;
    this.worldY = data.worldY;
    this.inRift = data.inRift;
    this.riftSeed = data.riftSeed;
    this.playTimeSec = data.playTimeSec;
  }

  toSave(): CharacterSave {
    return {
      version: 3,
      name: this.name,
      classId: this.progression.classId,
      gender: this.gender,
      level: this.progression.level,
      xp: this.progression.xp,
      unspentStatPoints: this.progression.unspentStatPoints,
      stats: { ...this.progression.stats },
      hp: this.hp,
      maxHp: this.maxHp,
      inventory: this.inventory.slots.map((s) =>
        s.kind === 'stack'
          ? { ...s }
          : { kind: 'gear', item: { ...s.item, stats: { ...s.item.stats } } },
      ),
      equipment: {
        weapon: this.inventory.equipment.weapon
          ? { ...this.inventory.equipment.weapon }
          : null,
        hat: this.inventory.equipment.hat
          ? { ...this.inventory.equipment.hat }
          : null,
        chest: this.inventory.equipment.chest
          ? { ...this.inventory.equipment.chest }
          : null,
        legs: this.inventory.equipment.legs
          ? { ...this.inventory.equipment.legs }
          : null,
        feet: this.inventory.equipment.feet
          ? { ...this.inventory.equipment.feet }
          : null,
        tool: this.inventory.equipment.tool,
      },
      worldX: this.worldX,
      worldY: this.worldY,
      inRift: this.inRift,
      riftSeed: this.riftSeed,
      playTimeSec: this.playTimeSec,
    };
  }

  persist(): void {
    saveStore.save(this.toSave());
    gameEvents.emit(Events.SAVE_WRITTEN, this.toSave());
  }

  recalcMaxHp(): void {
    const gear = this.inventory.totalGearStats();
    this.maxHp = this.progression.baseMaxHp(gear.stamina) + gear.maxHp;
    this.hp = Math.min(this.hp, this.maxHp);
  }

  takeDamage(raw: number): number {
    const dealt = this.combat.mitigateIncoming(raw);
    this.hp = Math.max(0, this.hp - dealt);
    gameEvents.emit(Events.PLAYER_DAMAGED, { dealt, hp: this.hp });
    if (this.hp <= 0) gameEvents.emit(Events.PLAYER_DIED, {});
    return dealt;
  }

  healFull(): void {
    this.recalcMaxHp();
    this.hp = this.maxHp;
  }

  spendStat(stat: 'strength' | 'dexterity' | 'stamina' | 'intellect'): boolean {
    const ok = this.progression.spendStat(stat);
    if (ok) {
      this.recalcMaxHp();
      this.persist();
    }
    return ok;
  }

  addGearDrop(item: GearInstance): boolean {
    const ok = this.inventory.addGear(item);
    if (ok) this.persist();
    return ok;
  }

  applySessionRewards(payload: {
    token: string;
    xp: number;
    items: { itemId: string; qty: number }[];
    gear?: GearInstance[];
  }): void {
    if (this.pendingSessionToken === payload.token) return;
    this.pendingSessionToken = payload.token;
    this.progression.addXp(payload.xp);
    for (const item of payload.items) {
      this.inventory.add(item.itemId, item.qty);
    }
    for (const g of payload.gear ?? []) {
      this.inventory.addGear(g);
    }
    this.recalcMaxHp();
    this.persist();
    gameEvents.emit(Events.SESSION_REWARDS, payload);
  }
}

export const gameState = new GameState();
