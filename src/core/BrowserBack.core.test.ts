import { describe, expect, test } from 'bun:test';
import { resolveBrowserBack } from './BrowserBack';

describe('resolveBrowserBack', () => {
  test('title may leave the page', () => {
    expect(resolveBrowserBack('title')).toBe('leave');
  });

  test('overlay closes first', () => {
    expect(resolveBrowserBack('overlay')).toBe('closeOverlay');
  });

  test('playing opens pause', () => {
    expect(resolveBrowserBack('playing')).toBe('openPause');
  });

  test('paused resumes', () => {
    expect(resolveBrowserBack('paused')).toBe('resume');
  });
});
