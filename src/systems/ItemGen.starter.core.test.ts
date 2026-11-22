import { describe, expect, test } from 'bun:test';
import { createStarterLoadout } from './ItemGen';
import { classSetId, setChaseStatus } from './SetChase';
import type { EquipmentSlots } from '../types/save';

describe('createStarterLoadout', () => {
  test('each class starts with weapon + one set chest only', () => {
    for (const cls of ['warrior', 'mystic', 'mage'] as const) {
      const kit = createStarterLoadout(cls, 10);
      expect(kit.weapon.slot).toBe('weapon');
      expect(kit.armor.slot).toBe('chest');
      expect(kit.armor.setId).toBe(classSetId(cls));
      expect(kit.weapon.setId).toBeNull();
    }
  });

  test('thin kit leaves set chase alive (need Hat)', () => {
    const kit = createStarterLoadout('mystic', 10);
    const eq: EquipmentSlots = {
      weapon: kit.weapon,
      hat: null,
      chest: kit.armor,
      legs: null,
      feet: null,
      tool: null,
    };
    const status = setChaseStatus('ashen', eq);
    expect(status?.owned).toBe(1);
    expect(status?.line).toBe('Ashen 1/4 · need Hat');
  });
});
