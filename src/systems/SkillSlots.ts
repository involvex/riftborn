/**
 * Pure slot bookkeeping for active abilities (no Phaser).
 *
 * Slot order follows the class tree definition order — the 4th tree node
 * is bound to the 4th ability key.
 */

import skillsData from '../data/skills.json';
import type { CharacterClassId, SkillNodeDef } from '../types/game';

const trees = skillsData.trees as Record<CharacterClassId, SkillNodeDef[]>;

/** How many abilities are bound to keys 1..N per class. */
export const ACTIVE_SLOTS = 4;

export function getClassTree(classId: CharacterClassId): SkillNodeDef[] {
  return trees[classId] ?? trees.warrior;
}

/** Ability ids bound to the active slots, in tree order. */
export function classAbilityIds(classId: CharacterClassId): string[] {
  const nodes = getClassTree(classId);
  const ids: string[] = [];
  for (const n of nodes) {
    if (!ids.includes(n.abilityId)) ids.push(n.abilityId);
  }
  return ids.slice(0, ACTIVE_SLOTS);
}
