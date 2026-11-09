import { describe, expect, test } from 'bun:test';
import { isRiftBossKill, RIFT_LORD_DEF_ID } from './RiftBoss';

describe('isRiftBossKill', () => {
  test('the spawned Rift Lord clears the rift', () => {
    expect(
      isRiftBossKill({ id: 'enemy_42', defId: RIFT_LORD_DEF_ID }, 'enemy_42'),
    ).toBe(true);
  });

  test('elite fauna never clears the rift (Nightwing is isElite)', () => {
    expect(
      isRiftBossKill({ id: 'enemy_7', defId: 'ash_bat' }, 'enemy_42'),
    ).toBe(false);
    expect(
      isRiftBossKill({ id: 'enemy_8', defId: 'ash_scout' }, 'enemy_42'),
    ).toBe(false);
  });

  test('no boss spawned yet means nothing can clear', () => {
    expect(
      isRiftBossKill({ id: 'enemy_9', defId: RIFT_LORD_DEF_ID }, null),
    ).toBe(false);
    expect(isRiftBossKill({ id: 'enemy_9', defId: 'ash_bat' }, null)).toBe(
      false,
    );
  });

  test('a rift lord that was not spawned by the rift does not clear', () => {
    expect(
      isRiftBossKill({ id: 'enemy_99', defId: RIFT_LORD_DEF_ID }, 'enemy_42'),
    ).toBe(false);
  });

  test('elite packs are regular pack kills', () => {
    expect(isRiftBossKill({ id: 'enemy_5', defId: 'shade' }, 'enemy_42')).toBe(
      false,
    );
  });
});
