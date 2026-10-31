import { describe, expect, test } from 'bun:test';

/** Mirrors Player/Enemy attackGen stale-handler gate. */
function shouldApplyAttackComplete(
  handlerGen: number,
  currentGen: number,
): boolean {
  return handlerGen === currentGen;
}

describe('attack animation generation', () => {
  test('stale completion is ignored after a newer attack', () => {
    let attackGen = 0;
    const first = ++attackGen;
    const second = ++attackGen;
    expect(shouldApplyAttackComplete(first, attackGen)).toBe(false);
    expect(shouldApplyAttackComplete(second, attackGen)).toBe(true);
  });
});
