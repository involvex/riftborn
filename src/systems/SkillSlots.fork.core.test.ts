import { describe, expect, test } from 'bun:test';
import {
  activeBarSummary,
  classAbilityIds,
  getClassTree,
  skillNodeBarStatus,
} from './SkillSlots';

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

describe('skillNodeBarStatus', () => {
  test('War Charge on bar replaces Shield Bash', () => {
    const charge = getClassTree('warrior').find((n) => n.id === 'w_charge')!;
    const status = skillNodeBarStatus(charge, 'warrior', { war_charge: 1 });
    expect(status.onBar).toBe(true);
    expect(status.slotIndex).toBe(2);
    expect(status.badge).toBe('ON 3');
    expect(status.replacesName).toBe('Shield Bash');
    expect(status.detailLine).toContain('replaces Shield Bash');
  });

  test('Shield Bash shows off-bar when Charge is ranked', () => {
    const bash = getClassTree('warrior').find((n) => n.id === 'w_bash')!;
    const status = skillNodeBarStatus(bash, 'warrior', { war_charge: 1 });
    expect(status.onBar).toBe(false);
    expect(status.replacedByName).toBe('War Charge');
    expect(status.badge).toContain('Charge');
    expect(status.detailLine).toContain('Off bar');
  });

  test('unranked fork stays FORK until spent', () => {
    const echo = getClassTree('mystic').find((n) => n.id === 'm_echo')!;
    const status = skillNodeBarStatus(echo, 'mystic', {});
    expect(status.onBar).toBe(false);
    expect(status.badge).toBe('FORK');
    expect(status.replacesName).toBe('Rift Slash');
  });

  test('bar summary lists short names for current 1–4', () => {
    expect(activeBarSummary('warrior', { war_whirl: 1, war_charge: 1 })).toBe(
      '1:Leap · 2:Whirlwind · 3:Charge · 4:Cry',
    );
  });
});
