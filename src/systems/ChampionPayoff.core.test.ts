import { describe, expect, test } from 'bun:test';
import {
  CHAMPION_BARRIER_HP,
  CHAMPION_BARRIER_SEC,
  CHAMPION_BUFF_MULT,
  CHAMPION_BUFF_SEC,
} from '../world/ChampionRoom';

/** Pure gate: payoff applies once per champion kill. */
export function shouldGrantChampionPayoff(opts: {
  isChampion: boolean;
  alreadyGranted: boolean;
}): boolean {
  return opts.isChampion && !opts.alreadyGranted;
}

describe('ChampionPayoff', () => {
  test('buff + barrier are this-run scale (not permanent)', () => {
    expect(CHAMPION_BUFF_MULT).toBeGreaterThan(1);
    expect(CHAMPION_BUFF_MULT).toBeLessThan(2);
    expect(CHAMPION_BUFF_SEC).toBeGreaterThan(10);
    expect(CHAMPION_BARRIER_HP).toBeGreaterThan(0);
    expect(CHAMPION_BARRIER_SEC).toBeGreaterThan(0);
  });

  test('payoff grants only on champion kill once', () => {
    expect(
      shouldGrantChampionPayoff({ isChampion: true, alreadyGranted: false }),
    ).toBe(true);
    expect(
      shouldGrantChampionPayoff({ isChampion: true, alreadyGranted: true }),
    ).toBe(false);
    expect(
      shouldGrantChampionPayoff({ isChampion: false, alreadyGranted: false }),
    ).toBe(false);
  });
});
