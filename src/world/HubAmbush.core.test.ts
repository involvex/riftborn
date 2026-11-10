import { describe, expect, test } from 'bun:test';
import { generateHub, PLAZA } from './MapGen';
import { shouldTriggerAmbush } from './Ambush';

describe('hub ambush POI', () => {
  test('the hub defines exactly one ambush, tied to a real POI', () => {
    const hub = generateHub(42);
    const ambushes = hub.ambushes ?? [];
    expect(ambushes.length).toBe(1);
    const ambush = ambushes[0]!;
    expect(ambush.count).toBeGreaterThan(0);
    expect(ambush.radius).toBeGreaterThan(1);

    // It belongs to an existing named POI.
    const poi = hub.pois?.find((p) => p.id === ambush.id);
    expect(poi, 'ambush id matches a POI').toBeDefined();
    expect(poi!.kind).toBe('ambush');

    // The ambush waits near its POI (player standing there triggers it).
    expect(
      shouldTriggerAmbush({
        ambush,
        playerX: poi!.x,
        playerY: poi!.y,
        fired: false,
      }),
    ).toBe(true);
  });

  test('the ambush stays far outside the town safe zone', () => {
    const hub = generateHub(42);
    const ambush = (hub.ambushes ?? [])[0]!;
    const distToPlaza = Math.max(
      Math.abs(ambush.x - PLAZA.x0),
      Math.abs(ambush.x - PLAZA.x1),
      Math.abs(ambush.y - PLAZA.y0),
      Math.abs(ambush.y - PLAZA.y1),
    );
    expect(distToPlaza).toBeGreaterThan(10);
  });

  test('the ambush is deterministic across seeds', () => {
    const a = generateHub(42).ambushes ?? [];
    const b = generateHub(7).ambushes ?? [];
    expect(a.length).toBe(b.length);
    expect(a[0]?.id).toBe(b[0]?.id);
    expect(a[0]?.x).toBe(b[0]?.x);
    expect(a[0]?.y).toBe(b[0]?.y);
  });
});
