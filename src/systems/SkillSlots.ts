/**
 * Pure slot bookkeeping for active abilities (no Phaser).
 *
 * Slot order follows the class tree definition order — the 4th tree node
 * is bound to the 4th ability key. Passive nodes are never slotted.
 */

import skillsData from '../data/skills.json';
import type { AbilityDef, CharacterClassId, SkillNodeDef } from '../types/game';

const trees = skillsData.trees as Record<CharacterClassId, SkillNodeDef[]>;
const abilities = skillsData.abilities as Record<string, AbilityDef>;

/** How many abilities are bound to keys 1..N per class. */
export const ACTIVE_SLOTS = 4;

export function getClassTree(classId: CharacterClassId): SkillNodeDef[] {
  return trees[classId] ?? trees.warrior;
}

/** Ability ids bound to the active slots, in tree order (passives skipped). */
export function classAbilityIds(classId: CharacterClassId): string[] {
  const nodes = getClassTree(classId);
  const ids: string[] = [];
  for (const n of nodes) {
    const def = abilities[n.abilityId];
    if (def?.kind === 'passive') continue;
    if (!ids.includes(n.abilityId)) ids.push(n.abilityId);
  }
  return ids.slice(0, ACTIVE_SLOTS);
}
