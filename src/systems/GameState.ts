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
import { BountySystem } from './BountySystem';
import { ShopSystem } from './ShopSystem';
import { SkillSystem } from './SkillSystem';
import { TraderSystem } from './TraderSystem';

export class GameState {
  readonly inventory = new InventorySystem();
  readonly progression = new ProgressionSystem();
  readonly crafting = new CraftingSystem(this.inventory);
  readonly gathering = new GatheringSystem(this.inventory);
  readonly combat = new CombatSystem(this.inventory, this.progression);
  readonly shop = new ShopSystem(this.inventory);
  readonly trader = new TraderSystem(this.inventory);
  readonly skills = new SkillSystem();
  readonly bounties = new BountySystem();

  name = 'Wanderer';
  gender: CharacterGender = 'male';
  hp = 100;
  maxHp = 100;
  worldX = 32.5;
  worldY = 33.5;
  inRift = false;
  riftSeed: number | null = null;
  playTimeSec = 0;
  /** Base64 hub fog; null until first explore persist. */
  hubExplored: string | null = null;
  pendingSessionToken: string | null = null;
  /** Seconds before passive regen resumes after a hit. */
  private regenDelay = 0;
  private regenAcc = 0;

  createNew(
    name: string,
    classId: CharacterClassId,
    gender: CharacterGender = 'male',
  ): void {
    this.name = name.trim() || 'Wanderer';
    this.gender = gender;
    this.progression.initClass(classId);
    this.skills.initClass(classId);
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
    this.inventory.add('gold', 80);
    this.recalcMaxHp();
    this.hp = this.maxHp;
    this.worldX = 32.5;
    this.worldY = 33.5;
    this.inRift = false;
    this.riftSeed = null;
    this.playTimeSec = 0;
    this.hubExplored = null;
    this.pendingSessionToken = null;
    this.bounties.load(null);
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
    this.skills.load(
      data.classId,
      data.unspentSkillPoints ?? 0,
      data.skillRanks ?? {},
    );
    this.inventory.load(data.inventory, data.equipment);
    this.recalcMaxHp();
    this.hp = Math.min(data.hp, this.maxHp);
    this.worldX = data.worldX;
    this.worldY = data.worldY;
    this.inRift = data.inRift;
    this.riftSeed = data.riftSeed;
    this.playTimeSec = data.playTimeSec;
    this.hubExplored = data.hubExplored ?? null;
    this.bounties.load({
      bounty: data.bounty ?? null,
      lastKind: data.bountyLastKind ?? null,
      cooldownLeft: data.bountyCooldownLeft ?? 0,
    });
  }

  toSave(): CharacterSave {
    const bountySlice = this.bounties.toSave();
    return {
      version: 4,
      name: this.name,
      classId: this.progression.classId,
      gender: this.gender,
      level: this.progression.level,
      xp: this.progression.xp,
      unspentStatPoints: this.progression.unspentStatPoints,
      unspentSkillPoints: this.skills.unspentSkillPoints,
      skillRanks: { ...this.skills.ranks },
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
      bounty: bountySlice.bounty,
      bountyLastKind: bountySlice.lastKind,
      bountyCooldownLeft: bountySlice.cooldownLeft,
      hubExplored: this.hubExplored,
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
    const afterBarrier = this.skills.absorbDamage(
      this.combat.mitigateIncoming(raw),
    );
    const dealt = Math.max(0, Math.floor(afterBarrier));
    if (dealt <= 0) {
      gameEvents.emit(Events.PLAYER_DAMAGED, { dealt: 0, hp: this.hp });
      return 0;
    }
    this.hp = Math.max(0, this.hp - dealt);
    this.regenDelay = 5;
    this.regenAcc = 0;
    gameEvents.emit(Events.PLAYER_DAMAGED, { dealt, hp: this.hp });
    if (this.hp <= 0) gameEvents.emit(Events.PLAYER_DIED, {});
    return dealt;
  }

  /**
   * Passive HP regen — only while out of combat (after hit delay).
   * Out-of-combat rate is large (% max HP) so downtime recovers fast.
   * Call once per frame from WorldScene.
   */
  tickRegen(dt: number): void {
    if (this.hp <= 0 || this.hp >= this.maxHp) {
      this.regenAcc = 0;
      return;
    }
    this.regenDelay = Math.max(0, this.regenDelay - dt);
    // In combat (recently hit): no regen.
    if (this.regenDelay > 0) return;

    const gearSta = this.inventory.totalGearStats().stamina;
    const sta = this.progression.stats.stamina + gearSta;
    // Out of combat: strong recovery — ~4% maxHP/s + STA, more in town.
    const maxFrac = this.inRift ? 0.035 : 0.055;
    const perSec = 3 + sta * 0.28 + this.maxHp * maxFrac;
    this.regenAcc += perSec * dt;
    if (this.regenAcc < 1) return;
    const heal = Math.floor(this.regenAcc);
    this.regenAcc -= heal;
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + heal);
    const gained = this.hp - before;
    if (gained > 0) {
      gameEvents.emit(Events.PLAYER_HEALED, { amount: gained, hp: this.hp });
    }
  }

  spendSkill(nodeId: string): boolean {
    const ok = this.skills.spendOnNode(nodeId);
    if (ok) this.persist();
    return ok;
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

gameEvents.on(Events.LEVEL_UP, (p) => {
  const d = p as { skillPoint?: number };
  if (d.skillPoint && d.skillPoint > 0) {
    gameState.skills.grantSkillPoint(d.skillPoint);
  }
});
