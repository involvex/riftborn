import { describe, expect, test } from 'bun:test';
import { resolveBrowserBack } from './BrowserBack';

/**
 * Native bridge reuses resolveBrowserBack — keep the contract explicit
 * so Expo BackHandler wiring stays aligned with browser popstate (C9).
 */
describe('native back policy (shared with browser)', () => {
  test('title leave is the only exit signal', () => {
    expect(resolveBrowserBack('title')).toBe('leave');
    expect(resolveBrowserBack('playing')).not.toBe('leave');
    expect(resolveBrowserBack('paused')).not.toBe('leave');
    expect(resolveBrowserBack('overlay')).not.toBe('leave');
  });
});
