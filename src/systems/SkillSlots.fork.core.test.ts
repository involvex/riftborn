import { describe, expect, test } from 'bun:test';
import { classAbilityIds } from './SkillSlots';

describe('classAbilityIds forks', () => {
  test('default bar is the four starters', () => {
    expect(classAbilityIds('warrior')).toEqual([
      'war_leap',
      'war_cleave',
      'war_bash',
      'war_battlecry',
    ]);
  });

  test('whirlwind replaces cleave when ranked', () => {
    expect(classAbilityIds('warrior', { war_whirl: 1 })).toEqual([
      'war_leap',
      'war_whirl',
      'war_bash',
      'war_battlecry',
    ]);
  });

  test('mage meteor replaces nova', () => {
    const ids = classAbilityIds('mage', { mag_meteor: 1 });
    expect(ids).toContain('mag_meteor');
    expect(ids).not.toContain('mag_nova');
  });
});
