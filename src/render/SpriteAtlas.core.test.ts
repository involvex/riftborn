import { describe, expect, test } from 'bun:test';
import { enemySpriteKey } from './SpriteAtlas';

describe('SpriteAtlas enemySpriteKey', () => {
  test('existing enemy mappings', () => {
    expect(enemySpriteKey('shade')).toBe('spr_shade');
    expect(enemySpriteKey('crawler')).toBe('spr_crawler');
    expect(enemySpriteKey('wisp')).toBe('spr_wisp');
    expect(enemySpriteKey('rift_lord')).toBe('spr_rift_lord');
    expect(enemySpriteKey('ash_scamp')).toBe('spr_shade');
    expect(enemySpriteKey('ash_scout')).toBe('spr_ash_scout');
    expect(enemySpriteKey('ash_bat')).toBe('spr_bat');
    expect(enemySpriteKey('ash_bramble')).toBe('spr_ash_bramble');
  });

  test('new enemy mappings', () => {
    expect(enemySpriteKey('enemy_rift_goblin')).toBe('spr_enemy_rift_goblin');
    expect(enemySpriteKey('enemy_shadow_wolf')).toBe('spr_enemy_shadow_wolf');
    expect(enemySpriteKey('enemy_bone_archer')).toBe('spr_enemy_bone_archer');
    expect(enemySpriteKey('enemy_rift_wraith')).toBe('spr_enemy_rift_wraith');
    expect(enemySpriteKey('crystal_lord')).toBe('spr_crystal_lord');
    expect(enemySpriteKey('grove_alpha')).toBe('spr_grove_alpha');
    expect(enemySpriteKey('salt_warden')).toBe('spr_salt_warden');
    expect(enemySpriteKey('rift_mender')).toBe('spr_rift_mender');
  });
});
