import { Events, gameEvents } from '../core/EventBus';
import type { CharacterClassId, ClassDef, PlayerStats } from '../types/game';
import classesData from '../data/classes.json';

export const MAX_LEVEL = 50;
export const STAT_POINTS_PER_LEVEL = 2;

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
  return { strength: 0, vitality: 0, intellect: 0, spirit: 0 };
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
    stats: PlayerStats,
    classId: CharacterClassId,
  ): void {
    this.level = Math.min(MAX_LEVEL, level);
    this.xp = xp;
    this.unspentStatPoints = unspent;
    this.stats = { ...stats };
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
      gameEvents.emit(Events.LEVEL_UP, {
        level: this.level,
        unspent: this.unspentStatPoints,
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

  /** Bonus damage from allocated + class primary stat (gear added elsewhere). */
  damageBonus(gearPrimary = 0): number {
    const def = this.classDef();
    const primary = this.stats[def.damageStat] + gearPrimary;
    return Math.floor(primary * 0.85) + Math.floor((this.level - 1) * 0.6);
  }

  baseMaxHp(gearVitality = 0): number {
    const def = this.classDef();
    const vit = this.stats.vitality + gearVitality;
    return 80 + vit * def.hpPerVitality + (this.level - 1) * 6;
  }
}
