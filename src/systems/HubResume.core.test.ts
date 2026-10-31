import { describe, expect, test } from 'bun:test';
import { hubResumeFromSave } from './HubResume';

describe('hubResumeFromSave', () => {
  test('forces plaza when save was mid-rift', () => {
    const r = hubResumeFromSave({ inRift: true, worldX: 5, worldY: 6 });
    expect(r.inRift).toBe(false);
    expect(r.riftSeed).toBeNull();
    expect(r.worldX).toBe(32.5);
    expect(r.worldY).toBe(33.5);
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
  });
});
