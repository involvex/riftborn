import { describe, expect, test } from 'bun:test';
import {
  COOP_PROTOTYPE,
  coopConnectingToast,
  coopJoinBlockedReason,
  coopLeftToast,
  coopRiftBlockedReason,
  coopWelcomeToast,
} from './CoopGate';

describe('CoopGate', () => {
  test('prototype flag is on for the jam build', () => {
    expect(COOP_PROTOTYPE).toBe(true);
  });

  test('blocks join while in a rift', () => {
    expect(coopJoinBlockedReason(true)).toMatch(/rift/i);
    expect(coopJoinBlockedReason(false)).toBeNull();
  });

  test('blocks rift while connected', () => {
    expect(coopRiftBlockedReason(true)).toMatch(/co-op/i);
    expect(coopRiftBlockedReason(false)).toBeNull();
  });

  test('welcome toast names the hub sandbox', () => {
    expect(coopWelcomeToast(true)).toContain('prototype');
    expect(coopWelcomeToast(false)).toContain('hub sandbox');
    expect(coopWelcomeToast(true)).toContain('64');
  });

  test('leave/connect toasts stay hub-prototype clear', () => {
    expect(coopLeftToast()).toMatch(/hub sandbox/i);
    expect(coopConnectingToast('ws://localhost:8787')).toMatch(/hub co-op/i);
    expect(coopConnectingToast('ws://localhost:8787')).toContain(
      'ws://localhost:8787',
    );
  });
});
