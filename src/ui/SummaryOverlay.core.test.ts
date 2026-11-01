import { describe, expect, test } from 'bun:test';
import { formatPlayTime } from './SummaryOverlay';

describe('formatPlayTime', () => {
  test('formats minutes and seconds', () => {
    expect(formatPlayTime(0)).toBe('0:00');
    expect(formatPlayTime(65)).toBe('1:05');
    expect(formatPlayTime(600)).toBe('10:00');
  });
});
