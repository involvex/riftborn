import Phaser from 'phaser';
import { Events, gameEvents } from '../core/EventBus';
import { worldDistance, worldToScreen } from '../core/IsoMath';
import type { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';
import type { AbilityDef, CharacterClassId, SkillNodeDef } from '../types/game';
import skillsData from '../data/skills.json';
import type { CombatSystem } from './CombatSystem';

const abilities = skillsData.abilities as Record<string, AbilityDef>;
const trees = skillsData.trees as Record<CharacterClassId, SkillNodeDef[]>;

export const ACTIVE_SLOTS = 3;

export function getAbilityDef(id: string): AbilityDef | undefined {
  return abilities[id];
}

export function getClassTree(classId: CharacterClassId): SkillNodeDef[] {
  return trees[classId] ?? trees.warrior;
}

export function classAbilityIds(classId: CharacterClassId): string[] {
  const nodes = getClassTree(classId);
  const ids: string[] = [];
  for (const n of nodes) {
    if (!ids.includes(n.abilityId)) ids.push(n.abilityId);
  }
  return ids.slice(0, ACTIVE_SLOTS);
}

export type SkillCastContext = {
  player: Player;
  enemies: Enemy[];
  combat: CombatSystem;
  walkCheck: ((x: number, y: number) => boolean) | null;
  onKill: (enemy: Enemy) => void;
  /** From equipped gear + set bonuses (percent). */
  gearSkillPower?: number;
};

export type SkillCastResult = {
  ok: boolean;
  reason?: string;
  abilityName?: string;
  vfx?: AbilityDef['kind'];
  origin?: { x: number; y: number };
  target?: { x: number; y: number };
  /** World-tile range for VFX scaling (bolt / nova rings). */
  range?: number;
};

/**
 * Active abilities (3 per class) + skill-point ranks.
 * Slot order follows the class tree definition order.
 */
export class SkillSystem {
  unspentSkillPoints = 0;
  ranks: Record<string, number> = {};
  private classId: CharacterClassId = 'warrior';
  private readonly cooldownLeft = [0, 0, 0];
  private damageBuffUntil = 0;
  private damageBuffMult = 1;
  private barrierHp = 0;
  private barrierUntil = 0;
  private now = 0;

  load(
    classId: CharacterClassId,
    unspent: number,
    ranks: Record<string, number> | undefined,
  ): void {
    this.classId = classId;
    this.unspentSkillPoints = Math.max(0, unspent);
    this.ranks = { ...(ranks ?? {}) };
    this.ensureStarter();
    this.cooldownLeft.fill(0);
    this.damageBuffUntil = 0;
    this.damageBuffMult = 1;
    this.barrierHp = 0;
    this.barrierUntil = 0;
  }

  initClass(classId: CharacterClassId): void {
    this.classId = classId;
    this.unspentSkillPoints = 0;
    this.ranks = {};
    this.ensureStarter();
    this.cooldownLeft.fill(0);
    this.damageBuffUntil = 0;
    this.damageBuffMult = 1;
    this.barrierHp = 0;
    this.barrierUntil = 0;
  }

  private ensureStarter(): void {
    for (const node of getClassTree(this.classId)) {
      if (!node.starter) continue;
      const cur = this.ranks[node.abilityId] ?? 0;
      if (cur < 1) this.ranks[node.abilityId] = 1;
    }
  }

  tick(dt: number): void {
    this.now += dt;
    for (let i = 0; i < this.cooldownLeft.length; i++) {
      this.cooldownLeft[i] = Math.max(0, this.cooldownLeft[i] - dt);
    }
    if (this.now >= this.barrierUntil) this.barrierHp = 0;
  }

  slotAbilityId(slot: number): string | null {
    const ids = classAbilityIds(this.classId);
    return ids[slot] ?? null;
  }

  slotRank(slot: number): number {
    const id = this.slotAbilityId(slot);
    if (!id) return 0;
    return this.ranks[id] ?? 0;
  }

  cooldownRemaining(slot: number): number {
    return this.cooldownLeft[slot] ?? 0;
  }

  damageMultiplier(): number {
    if (this.now < this.damageBuffUntil) return this.damageBuffMult;
    return 1;
  }

  /** Shrine / world blessing — timed damage buff (stacks by refresh). */
  applyShrineBuff(
    mult = 1.4,
    durationSec = 45,
  ): {
    mult: number;
    duration: number;
  } {
    this.damageBuffMult = Math.max(this.damageBuffMult, mult);
    this.damageBuffUntil = this.now + durationSec;
    return { mult, duration: durationSec };
  }

  shrineBuffRemaining(): number {
    return Math.max(0, this.damageBuffUntil - this.now);
  }

  absorbDamage(raw: number): number {
    if (this.barrierHp <= 0 || this.now >= this.barrierUntil) return raw;
    const absorbed = Math.min(this.barrierHp, raw);
    this.barrierHp -= absorbed;
    return raw - absorbed;
  }

  nodeUnlocked(node: SkillNodeDef): boolean {
    for (const req of node.requires) {
      const parent = getClassTree(this.classId).find((n) => n.id === req);
      if (!parent) return false;
      if ((this.ranks[parent.abilityId] ?? 0) < 1) return false;
    }
    return true;
  }

  canSpendOn(nodeId: string): boolean {
    if (this.unspentSkillPoints < 1) return false;
    const node = getClassTree(this.classId).find((n) => n.id === nodeId);
    if (!node) return false;
    if (!this.nodeUnlocked(node)) return false;
    const def = getAbilityDef(node.abilityId);
    if (!def) return false;
    const rank = this.ranks[node.abilityId] ?? 0;
    return rank < def.maxRank;
  }

  spendOnNode(nodeId: string): boolean {
    if (!this.canSpendOn(nodeId)) return false;
    const node = getClassTree(this.classId).find((n) => n.id === nodeId)!;
    this.ranks[node.abilityId] = (this.ranks[node.abilityId] ?? 0) + 1;
    this.unspentSkillPoints -= 1;
    gameEvents.emit(Events.SKILL_CHANGED, {
      ranks: { ...this.ranks },
      unspent: this.unspentSkillPoints,
    });
    return true;
  }

  grantSkillPoint(amount = 1): void {
    if (amount <= 0) return;
    this.unspentSkillPoints += amount;
    gameEvents.emit(Events.SKILL_CHANGED, {
      ranks: { ...this.ranks },
      unspent: this.unspentSkillPoints,
    });
  }

  cast(slot: number, ctx: SkillCastContext): SkillCastResult {
    if (slot < 0 || slot >= ACTIVE_SLOTS) {
      return { ok: false, reason: 'Bad slot' };
    }
    const abilityId = this.slotAbilityId(slot);
    if (!abilityId) return { ok: false, reason: 'No ability' };
    const def = getAbilityDef(abilityId);
    if (!def) return { ok: false, reason: 'Missing def' };
    const rank = this.ranks[abilityId] ?? 0;
    if (rank < 1) {
      return { ok: false, reason: 'Locked — spend a skill point (K)' };
    }
    if (this.cooldownLeft[slot] > 0) {
      return {
        ok: false,
        reason: `Cooldown ${this.cooldownLeft[slot].toFixed(1)}s`,
      };
    }

    const mult = def.damageMult + def.rankBonus * (rank - 1);
    const gearSkill = 1 + (ctx.gearSkillPower ?? 0) / 100;
    const base = Math.max(
      1,
      Math.floor(
        ctx.combat.playerAttackDamage() *
          this.damageMultiplier() *
          mult *
          gearSkill,
      ),
    );
    const range = def.range ?? 2;
    const px = ctx.player.worldX;
    const py = ctx.player.worldY;

    const hitEnemy = (enemy: Enemy, dmg: number): void => {
      const { screenX, screenY } = worldToScreen(enemy.worldX, enemy.worldY);
      ctx.combat.emitDamageNumber(screenX, screenY - 18, dmg, 'enemy');
      const killed = enemy.applyDamage(dmg);
      if (killed) ctx.onKill(enemy);
    };

    const nearestInRange = (r: number): Enemy | null => {
      let best: Enemy | null = null;
      let bestD = Infinity;
      for (const e of ctx.enemies) {
        if (!e.alive) continue;
        const d = worldDistance({ x: px, y: py }, { x: e.worldX, y: e.worldY });
        if (d <= r && d < bestD) {
          bestD = d;
          best = e;
        }
      }
      return best;
    };

    const enemiesInRange = (r: number, cap: number): Enemy[] => {
      const list = ctx.enemies
        .filter((e) => e.alive)
        .map((e) => ({
          e,
          d: worldDistance({ x: px, y: py }, { x: e.worldX, y: e.worldY }),
        }))
        .filter((x) => x.d <= r)
        .sort((a, b) => a.d - b.d);
      return list.slice(0, cap).map((x) => x.e);
    };

    const moveBy = (dist: number): void => {
      const facing = ctx.player.getFacing();
      let nx = px + facing * dist * 0.75;
      let ny = py + dist * 0.35;
      if (ctx.walkCheck && !ctx.walkCheck(nx, ny)) {
        nx = px + facing * dist * 0.5;
        ny = py;
        if (ctx.walkCheck && !ctx.walkCheck(nx, ny)) return;
      }
      ctx.player.worldX = Phaser.Math.Clamp(nx, 0.5, ctx.player.maxX);
      ctx.player.worldY = Phaser.Math.Clamp(ny, 0.5, ctx.player.maxY);
      ctx.player.syncScreen();
    };

    let targetPos: { x: number; y: number } | undefined;

    switch (def.kind) {
      case 'cleave':
      case 'slow_nova':
      case 'pulse': {
        const targets = enemiesInRange(range, def.maxTargets ?? 6);
        for (const e of targets) {
          hitEnemy(e, base);
          if (
            (def.kind === 'slow_nova' || def.kind === 'pulse') &&
            def.slow &&
            def.duration
          ) {
            e.applySlow(def.slow, def.duration + (rank - 1) * 0.4);
          }
        }
        break;
      }
      case 'strike': {
        const target = nearestInRange(range);
        if (!target) return { ok: false, reason: 'No target in range' };
        hitEnemy(target, base);
        if (def.stun) target.applyStun(def.stun + (rank - 1) * 0.25);
        ctx.player.faceToward(target.worldX, target.worldY);
        targetPos = { x: target.worldX, y: target.worldY };
        break;
      }
      case 'bolt': {
        const target = nearestInRange(range);
        if (!target) return { ok: false, reason: 'No target in range' };
        hitEnemy(target, base);
        ctx.player.faceToward(target.worldX, target.worldY);
        targetPos = { x: target.worldX, y: target.worldY };
        break;
      }
      case 'leap': {
        moveBy(def.dash ?? 3.4);
        const after = enemiesInRange(range, def.maxTargets ?? 5);
        for (const e of after) hitEnemy(e, Math.floor(base * 1.05));
        break;
      }
      case 'dash_strike':
      case 'blink': {
        moveBy(def.dash ?? 2);
        const after = enemiesInRange(range, def.maxTargets ?? 3);
        for (const e of after) hitEnemy(e, base);
        break;
      }
      case 'buff': {
        this.damageBuffMult = mult;
        this.damageBuffUntil = this.now + (def.duration ?? 5) + (rank - 1);
        break;
      }
      case 'barrier': {
        const hp = (def.barrierHp ?? 30) + (def.rankBarrier ?? 15) * (rank - 1);
        this.barrierHp = hp;
        this.barrierUntil = this.now + (def.duration ?? 6);
        break;
      }
      default:
        return { ok: false, reason: 'Unknown ability' };
    }

    const cd = Math.max(1, def.cooldown - (rank - 1) * 0.35);
    this.cooldownLeft[slot] = cd;
    ctx.player.playAttack();
    gameEvents.emit(Events.SKILL_CAST, { slot, abilityId, name: def.name });
    return {
      ok: true,
      abilityName: def.name,
      vfx: def.kind,
      origin: { x: ctx.player.worldX, y: ctx.player.worldY },
      target: targetPos,
      range: def.range,
    };
  }
}
