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

  test('war charge replaces bash; both forks can stack', () => {
    expect(classAbilityIds('warrior', { war_charge: 1 })).toEqual([
      'war_leap',
      'war_cleave',
      'war_charge',
      'war_battlecry',
    ]);
    expect(classAbilityIds('warrior', { war_whirl: 1, war_charge: 1 })).toEqual(
      ['war_leap', 'war_whirl', 'war_charge', 'war_battlecry'],
    );
  });

  test('mage meteor replaces nova', () => {
    const ids = classAbilityIds('mage', { mag_meteor: 1 });
    expect(ids).toContain('mag_meteor');
    expect(ids).not.toContain('mag_nova');
  });

  test('mage spark replaces bolt; both forks can stack', () => {
    expect(classAbilityIds('mage', { mag_spark: 1 })).toEqual([
      'mag_spark',
      'mag_nova',
      'mag_barrier',
      'mag_chain',
    ]);
    const both = classAbilityIds('mage', { mag_meteor: 1, mag_spark: 1 });
    expect(both).toEqual([
      'mag_spark',
      'mag_meteor',
      'mag_barrier',
      'mag_chain',
    ]);
  });

  test('mystic echo replaces rift slash; lance still swaps seal', () => {
    expect(classAbilityIds('mystic', { mys_echo: 1 })).toEqual([
      'mys_pulse',
      'mys_echo',
      'mys_seal',
      'mys_riftstep',
    ]);
    expect(classAbilityIds('mystic', { mys_lance: 1, mys_echo: 1 })).toEqual([
      'mys_pulse',
      'mys_echo',
      'mys_lance',
      'mys_riftstep',
    ]);
  });
});
