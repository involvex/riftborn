import { describe, expect, test } from 'bun:test';
import {
  PLAZA_BUILDING_KEY,
  PLAZA_DECOR_KEY,
  PLAZA_NPC_KEY,
  PLAZA_PROP_KEYS,
  plazaArtScale,
} from './PlazaArt';

describe('plaza prop catalog', () => {
  test('ships shop / forge / inn / npc / chest / obelisk keys', () => {
    expect(PLAZA_PROP_KEYS).toContain('prop_plaza_shop');
    expect(PLAZA_PROP_KEYS).toContain('prop_plaza_forge');
    expect(PLAZA_PROP_KEYS).toContain('prop_plaza_inn');
    expect(PLAZA_PROP_KEYS).toContain('prop_plaza_obelisk');
    expect(PLAZA_PROP_KEYS).toContain('prop_plaza_chest');
    expect(PLAZA_PROP_KEYS).toContain('prop_plaza_npc_vendor');
    expect(PLAZA_PROP_KEYS).toContain('prop_plaza_board');
  });

  test('maps building labels and NPC roles', () => {
    expect(PLAZA_BUILDING_KEY.Shop).toBe('prop_plaza_shop');
    expect(PLAZA_BUILDING_KEY.Forge).toBe('prop_plaza_forge');
    expect(PLAZA_BUILDING_KEY.Inn).toBe('prop_plaza_inn');
    expect(PLAZA_NPC_KEY.vendor).toBe('prop_plaza_npc_vendor');
    expect(PLAZA_NPC_KEY.board).toBe('prop_plaza_board');
    expect(PLAZA_DECOR_KEY.lantern).toBe('prop_plaza_lantern');
  });

  test('buildings scale larger than lanterns', () => {
    expect(plazaArtScale('prop_plaza_shop')).toBeGreaterThan(
      plazaArtScale('prop_plaza_lantern'),
    );
  });
});
