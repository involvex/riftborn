import { beforeEach, describe, expect, test } from 'bun:test';
import { Events, gameEvents } from '../core/EventBus';
import { ProgressionSystem } from './ProgressionSystem';

describe('ProgressionSystem spendStat', () => {
  beforeEach(() => {
    gameEvents.clear();
  });

  test('does not emit LEVEL_UP when spending attribute points', () => {
    const p = new ProgressionSystem();
    p.initClass('warrior');
    p.unspentStatPoints = 3;
    let levelUps = 0;
    let statsChanged = 0;
    gameEvents.on(Events.LEVEL_UP, () => {
      levelUps += 1;
    });
    gameEvents.on(Events.STATS_CHANGED, () => {
      statsChanged += 1;
    });

    expect(p.spendStat('strength')).toBe(true);
    expect(levelUps).toBe(0);
    expect(statsChanged).toBe(1);
    expect(p.stats.strength).toBeGreaterThan(0);
  });
});
