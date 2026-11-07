import { describe, expect, test } from 'bun:test';
import { enemySpriteKey } from './SpriteAtlas';

describe('SpriteAtlas enemySpriteKey', () => {
  test('existing enemy mappings', () => {
    expect(enemySpriteKey('shade')).toBe('spr_shade');
    expect(enemySpriteKey('crawler')).toBe('spr_crawler');
    expect(enemySpriteKey('wisp')).toBe('spr_wisp');
    expect(enemySpriteKey('rift_lord')).toBe('spr_rift_lord');
    expect(enemySpriteKey('ash_scamp')).toBe('spr_shade');
    expect(enemySpriteKey('ash_bat')).toBe('spr_bat');
  });

  test('new enemy mappings', () => {
    expect(enemySpriteKey('enemy_rift_goblin')).toBe('spr_enemy_rift_goblin');
    expect(enemySpriteKey('enemy_shadow_wolf')).toBe('spr_enemy_shadow_wolf');
    expect(enemySpriteKey('enemy_bone_archer')).toBe('spr_enemy_bone_archer');
    expect(enemySpriteKey('enemy_rift_wraith')).toBe('spr_enemy_rift_wraith');
  });
});
