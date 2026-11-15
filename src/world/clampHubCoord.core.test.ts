import { describe, expect, test } from 'bun:test';
import { clampHubCoord, HUB_SIZE } from './MapGen';

describe('clampHubCoord', () => {
  test('keeps plaza spawn inside hub', () => {
    expect(clampHubCoord(32.5)).toBe(32.5);
  });

  test('clamps past the old 24-tile wall into the full hub', () => {
    expect(clampHubCoord(40)).toBe(40);
    expect(clampHubCoord(HUB_SIZE - 0.5)).toBe(HUB_SIZE - 0.5);
  });

  test('clamps outside the hub edge', () => {
    expect(clampHubCoord(-1)).toBe(0.5);
    expect(clampHubCoord(HUB_SIZE + 5)).toBe(HUB_SIZE - 0.5);
  });
});
