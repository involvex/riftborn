import { describe, expect, test } from 'bun:test';
import skillsData from '../data/skills.json';
import { ACTIVE_SLOTS, classAbilityIds } from './SkillSlots';
import { skillRangeKind } from './SkillRangeGate';
import { shortTouchSkillLabel } from '../ui/SkillLabels';
import type { CharacterClassId } from '../types/game';

type AbilityDefLike = {
  id: string;
  classId: string;
  name: string;
  kind: string;
  cooldown: number;
  maxRank: number;
  damageMult: number;
  chainRange?: number;
};

type TreeNodeLike = {
  id: string;
  abilityId: string;
  col: number;
  row: number;
  requires: string[];
  starter: boolean;
};

const abilities = skillsData.abilities as Record<string, AbilityDefLike>;
const trees = skillsData.trees as Record<CharacterClassId, TreeNodeLike[]>;

const CLASSES: CharacterClassId[] = ['warrior', 'mystic', 'mage'];

/** The 4th (key 4) ability per class. */
const FOURTH: Record<CharacterClassId, string> = {
  warrior: 'war_battlecry',
  mystic: 'mys_riftstep',
  mage: 'mag_chain',
};

describe('four active abilities per class', () => {
  test('ACTIVE_SLOTS is 4', () => {
    expect(ACTIVE_SLOTS).toBe(4);
  });

  for (const cls of CLASSES) {
    test(`${cls}: four starter nodes, four usable abilities`, () => {
      const tree = trees[cls]!;
      expect(tree.length).toBe(4);
      expect(classAbilityIds(cls).length).toBe(4);

      // Slot 4 is the new ability — tree order defines the slot order.
      expect(classAbilityIds(cls)[3]).toBe(FOURTH[cls]);

      const ids = tree.map((n) => n.abilityId);
      expect(new Set(ids).size).toBe(4);
      for (const node of tree) {
        expect(node.starter, `${cls}/${node.id} must start unlocked`).toBe(
          true,
        );
        expect(node.requires.length).toBe(0);
        const def = abilities[node.abilityId];
        expect(def, `${node.abilityId} def missing`).toBeDefined();
        expect(def!.classId).toBe(cls);
        expect(def!.cooldown).toBeGreaterThan(0);
        expect(def!.maxRank).toBeGreaterThanOrEqual(1);
        expect(def!.damageMult).toBeGreaterThanOrEqual(0);
        expect(['targeted', 'aoe', 'mobility']).toContain(
          skillRangeKind(def!.kind as never),
        );
      }
    });
  }

  test('the fourth abilities are distinct and class-flavoured', () => {
    const cry = abilities['war_battlecry']!;
    expect(cry.kind).toBe('buff');
    expect(cry.damageMult).toBeGreaterThan(1); // damage window, not a nerf

    const step = abilities['mys_riftstep']!;
    expect(step.kind).toBe('blink');
    expect(step.dash).toBeGreaterThan(0);

    const chain = abilities['mag_chain']!;
    expect(chain.kind).toBe('chain');
    expect(chain.chainRange).toBeGreaterThan(0);
    expect(chain.maxTargets ?? 0).toBeGreaterThanOrEqual(2);
  });

  test('every ability has a compact touch label', () => {
    for (const def of Object.values(abilities)) {
      const label = shortTouchSkillLabel(def.name);
      expect(label.length).toBeGreaterThan(0);
      expect(label).toMatch(/^[A-Z0-9]+$/);
    }
  });

  test('ability ids are unique', () => {
    const ids = Object.keys(abilities);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(abilities[id]!.id).toBe(id);
    }
  });
});
