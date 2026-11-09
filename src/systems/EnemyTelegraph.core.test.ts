import { describe, expect, it } from 'bun:test';
import {
  enemyTelegraphKind,
  enemyTelegraphStyle,
  telegraphCap,
  type EnemyTelegraphKind,
  type EnemyTelegraphPhase,
} from './EnemyTelegraph';

const KINDS: EnemyTelegraphKind[] = ['pounce', 'wail', 'shot', 'rush'];
const PHASES: EnemyTelegraphPhase[] = ['windup', 'impact'];

describe('enemyTelegraphKind', () => {
  it('maps each rift special foe to one cue', () => {
    expect(enemyTelegraphKind('enemy_shadow_wolf')).toBe('pounce');
    expect(enemyTelegraphKind('enemy_rift_wraith')).toBe('wail');
    expect(enemyTelegraphKind('enemy_bone_archer')).toBe('shot');
    expect(enemyTelegraphKind('enemy_rift_goblin')).toBe('rush');
  });

  it('returns null for regular foes', () => {
    expect(enemyTelegraphKind('shade')).toBeNull();
    expect(enemyTelegraphKind('ash_scamp')).toBeNull();
  });
});

describe('enemyTelegraphStyle', () => {
  it('defines a readable style for every kind/phase', () => {
    for (const kind of KINDS) {
      for (const phase of PHASES) {
        const style = enemyTelegraphStyle(kind, phase);
        expect(style.radius).toBeGreaterThan(0);
        expect(style.durationMs).toBeGreaterThan(0);
        expect(style.color).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('uses a large ground ring for the wraith wail', () => {
    const windup = enemyTelegraphStyle('wail', 'windup');
    expect(windup.shape).toBe('ring');
    expect(windup.radius).toBeGreaterThanOrEqual(3);
  });

  it('keeps pounce and rush cues tight', () => {
    expect(enemyTelegraphStyle('pounce', 'windup').radius).toBeLessThan(1);
    expect(enemyTelegraphStyle('rush', 'windup').radius).toBeLessThan(1);
  });
});

describe('telegraphCap', () => {
  it('trims concurrent cues on low tier', () => {
    expect(telegraphCap({ tier: 'low' })).toBeLessThan(
      telegraphCap({ tier: 'high' }),
    );
  });
});
