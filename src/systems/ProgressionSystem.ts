import { Events, gameEvents } from '../core/EventBus';
import type { CharacterClassId, ClassDef, PlayerStats } from '../types/game';
import classesData from '../data/classes.json';

export const MAX_LEVEL = 50;
/** Attribute points granted each level-up (spend on STR/DEX/STA/INT). */
export const STAT_POINTS_PER_LEVEL = 3;
/** Skill point every N levels (spend in skill tree). */
export const SKILL_POINT_EVERY_LEVELS = 5;

const classes = classesData as Record<CharacterClassId, ClassDef>;

export function getClassDef(id: CharacterClassId): ClassDef {
  return classes[id] ?? classes.warrior;
}

export function listClasses(): ClassDef[] {
  return Object.values(classes);
}

/** Flat-ish XP curve up to level 50. */
export function xpForLevel(level: number): number {
  return 40 + 25 * Math.max(0, level - 1) + Math.floor(level * level * 0.35);
}

export function emptyStats(): PlayerStats {
  return { strength: 0, dexterity: 0, stamina: 0, intellect: 0 };
}

/** Migrate legacy vitality/spirit saves into stamina/dexterity. */
export function normalizeStats(raw: Record<string, number>): PlayerStats {
  return {
    strength: raw.strength ?? 0,
    dexterity: raw.dexterity ?? raw.spirit ?? 0,
    stamina: raw.stamina ?? raw.vitality ?? 0,
    intellect: raw.intellect ?? 0,
  };
}

export class ProgressionSystem {
  level = 1;
  xp = 0;
  unspentStatPoints = 0;
  stats: PlayerStats = emptyStats();
  classId: CharacterClassId = 'warrior';

  load(
    level: number,
    xp: number,
    unspent: number,
    stats: PlayerStats | Record<string, number>,
    classId: CharacterClassId,
  ): void {
    this.level = Math.min(MAX_LEVEL, level);
    this.xp = xp;
    this.unspentStatPoints = unspent;
    this.stats = normalizeStats(stats as Record<string, number>);
    this.classId = classId;
  }

  initClass(classId: CharacterClassId): void {
    const def = getClassDef(classId);
    this.classId = classId;
    this.level = 1;
    this.xp = 0;
    this.unspentStatPoints = 0;
    this.stats = { ...def.baseStats };
  }

  addXp(amount: number): void {
    if (amount <= 0 || this.level >= MAX_LEVEL) return;
    this.xp += amount;
    gameEvents.emit(Events.XP_GAINED, {
      amount,
      xp: this.xp,
      level: this.level,
    });
    while (this.level < MAX_LEVEL && this.xp >= xpForLevel(this.level)) {
      this.xp -= xpForLevel(this.level);
      this.level += 1;
      this.unspentStatPoints += STAT_POINTS_PER_LEVEL;
      const skillPoint = this.level % SKILL_POINT_EVERY_LEVELS === 0 ? 1 : 0;
      gameEvents.emit(Events.LEVEL_UP, {
        level: this.level,
        unspent: this.unspentStatPoints,
        skillPoint,
      });
    }
    if (this.level >= MAX_LEVEL) this.xp = 0;
  }

  spendStat(stat: keyof PlayerStats, amount = 1): boolean {
    if (amount <= 0 || this.unspentStatPoints < amount) return false;
    this.stats[stat] += amount;
    this.unspentStatPoints -= amount;
    gameEvents.emit(Events.LEVEL_UP, {
      level: this.level,
      unspent: this.unspentStatPoints,
      spent: stat,
    });
    return true;
  }

  classDef(): ClassDef {
    return getClassDef(this.classId);
  }

  damageBonus(gearPrimary = 0): number {
    const def = this.classDef();
    const primary = this.stats[def.damageStat] + gearPrimary;
    return Math.floor(primary * 0.85) + Math.floor((this.level - 1) * 0.6);
  }

  baseMaxHp(gearStamina = 0): number {
    const def = this.classDef();
    const sta = this.stats.stamina + gearStamina;
    return 80 + sta * def.hpPerStamina + (this.level - 1) * 6;
  }

  /** Move speed multiplier from DEX. */
  moveSpeedMult(): number {
    return 1 + this.stats.dexterity * 0.015;
  }

  /** Attack cooldown seconds (lower with DEX). */
  attackCooldown(): number {
    return Math.max(0.2, 0.38 - this.stats.dexterity * 0.008);
  }
}
