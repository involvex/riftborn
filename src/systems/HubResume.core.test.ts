import { describe, expect, test } from 'bun:test';
import type { RiftRunSave } from '../types/save';
import { hubResumeFromSave } from './HubResume';

function sampleRun(over: Partial<RiftRunSave> = {}): RiftRunSave {
  return {
    seed: 42,
    depth: 3,
    modId: 'dense',
    kills: 4,
    bossSpawned: false,
    bossDead: false,
    cleared: false,
    shiftLayer: 'ash',
    shiftEnergy: 25,
    shiftCooldownLeft: 0,
    explored: null,
    enemies: [],
    groundLoot: [],
    bossChest: null,
    nodes: [],
    skillCooldowns: [0, 0, 0, 0],
    barrierHp: 0,
    barrierLeft: 0,
    ...over,
  };
}

describe('hubResumeFromSave', () => {
  test('resumes mid-rift when riftRun is valid', () => {
    const r = hubResumeFromSave({
      inRift: true,
      worldX: 12,
      worldY: 14,
      riftSeed: 99,
      riftRun: sampleRun(),
    });
    expect(r.inRift).toBe(true);
    expect(r.riftSeed).toBe(42);
    expect(r.worldX).toBe(12);
    expect(r.worldY).toBe(14);
    expect(r.resumedRift).toBe(true);
    expect(r.riftRun?.modId).toBe('dense');
  });

  test('forces plaza when mid-rift save lacks a valid blob', () => {
    const r = hubResumeFromSave({
      inRift: true,
      worldX: 5,
      worldY: 6,
      riftRun: null,
    });
    expect(r.inRift).toBe(false);
    expect(r.riftSeed).toBeNull();
    expect(r.riftRun).toBeNull();
    expect(r.worldX).toBe(32.5);
    expect(r.worldY).toBe(33.5);
    expect(r.resumedRift).toBe(false);
  });

  test('keeps hub coords when not in rift', () => {
    const r = hubResumeFromSave({
      inRift: false,
      worldX: 30,
      worldY: 31,
    });
    expect(r.inRift).toBe(false);
    expect(r.riftSeed).toBeNull();
    expect(r.worldX).toBe(30);
    expect(r.worldY).toBe(31);
    expect(r.resumedRift).toBe(false);
  });
});
