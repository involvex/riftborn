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

/**
 * Ability ids bound to the active slots, in tree order (passives skipped).
 * When a fork node is ranked (`ranks[fork] >= 1`), it replaces its target.
 */
export function classAbilityIds(
  classId: CharacterClassId,
  ranks: Record<string, number> = {},
): string[] {
  const nodes = getClassTree(classId);
  const ids: string[] = [];
  for (const n of nodes) {
    const def = abilities[n.abilityId];
    if (def?.kind === 'passive') continue;
    if (n.replacesAbilityId) continue; // forks applied below
    if (!ids.includes(n.abilityId)) ids.push(n.abilityId);
  }
  for (const n of nodes) {
    if (!n.replacesAbilityId) continue;
    if ((ranks[n.abilityId] ?? 0) < 1) continue;
    const idx = ids.indexOf(n.replacesAbilityId);
    if (idx >= 0) ids[idx] = n.abilityId;
  }
  return ids.slice(0, ACTIVE_SLOTS);
}

/** K-panel / HUD readout for whether a tree node is on the hotbar. */
export type SkillNodeBarStatus = {
  passive: boolean;
  /** Currently bound to 1–4. */
  onBar: boolean;
  /** 0–3 when this node (or its fork) owns a slot. */
  slotIndex: number | null;
  /** Fork target name when this node is a fork. */
  replacesName: string | null;
  /** Active fork name when this starter was swapped off the bar. */
  replacedByName: string | null;
  /** Compact status under the rank line. */
  badge: string;
  /** Longer hover / detail line. */
  detailLine: string;
};

function abilityName(id: string): string {
  return abilities[id]?.name ?? id;
}

/**
 * Resolve bar / fork status for one skill-tree node (pure).
 */
export function skillNodeBarStatus(
  node: SkillNodeDef,
  classId: CharacterClassId,
  ranks: Record<string, number> = {},
): SkillNodeBarStatus {
  const def = abilities[node.abilityId];
  if (def?.kind === 'passive') {
    return {
      passive: true,
      onBar: false,
      slotIndex: null,
      replacesName: null,
      replacedByName: null,
      badge: 'PASSIVE',
      detailLine: 'Passive — not on the hotbar.',
    };
  }

  const bar = classAbilityIds(classId, ranks);
  const onBar = bar.includes(node.abilityId);
  const slotIndex = onBar ? bar.indexOf(node.abilityId) : null;
  const key = slotIndex !== null ? String(slotIndex + 1) : null;

  const replacesName = node.replacesAbilityId
    ? abilityName(node.replacesAbilityId)
    : null;

  const activeFork = getClassTree(classId).find(
    (n) =>
      n.replacesAbilityId === node.abilityId && (ranks[n.abilityId] ?? 0) >= 1,
  );
  const replacedByName = activeFork ? abilityName(activeFork.abilityId) : null;

  if (node.replacesAbilityId) {
    const forkRanked = (ranks[node.abilityId] ?? 0) >= 1;
    if (forkRanked && onBar && key) {
      return {
        passive: false,
        onBar: true,
        slotIndex,
        replacesName,
        replacedByName: null,
        badge: `ON ${key}`,
        detailLine: `On bar key ${key} · replaces ${replacesName}.`,
      };
    }
    return {
      passive: false,
      onBar: false,
      slotIndex: (() => {
        const base = classAbilityIds(classId, {});
        const i = node.replacesAbilityId
          ? base.indexOf(node.replacesAbilityId)
          : -1;
        return i >= 0 ? i : null;
      })(),
      replacesName,
      replacedByName: null,
      badge: 'FORK',
      detailLine: `Fork · unlock to replace ${replacesName} on the bar.`,
    };
  }

  if (replacedByName) {
    const forkSlot = bar.indexOf(activeFork!.abilityId);
    const forkKey = forkSlot >= 0 ? String(forkSlot + 1) : '?';
    return {
      passive: false,
      onBar: false,
      slotIndex: forkSlot >= 0 ? forkSlot : null,
      replacesName: null,
      replacedByName,
      badge: `→ ${replacedByName.split(' ').pop() ?? replacedByName}`,
      detailLine: `Off bar — ${replacedByName} is on key ${forkKey}.`,
    };
  }

  if (onBar && key) {
    return {
      passive: false,
      onBar: true,
      slotIndex,
      replacesName: null,
      replacedByName: null,
      badge: `ON ${key}`,
      detailLine: `On bar key ${key}.`,
    };
  }

  return {
    passive: false,
    onBar: false,
    slotIndex: null,
    replacesName: null,
    replacedByName: null,
    badge: '',
    detailLine: '',
  };
}

/** Short names for the current 1–4 bar (K panel header). */
export function activeBarSummary(
  classId: CharacterClassId,
  ranks: Record<string, number> = {},
): string {
  return classAbilityIds(classId, ranks)
    .map((id, i) => `${i + 1}:${abilityName(id).split(' ').pop() ?? id}`)
    .join(' · ');
}
