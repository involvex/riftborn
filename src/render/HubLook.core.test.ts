import { describe, expect, test } from 'bun:test';
import type { PoiKind } from '../world/MapGen';
import {
  HUB_DIRT_ROAD_TINT,
  HUB_PLAZA_FLOOR_TINT,
  HUB_TOWN_ROAD_TINT,
  HUB_WILD_FLOOR_TINT,
  hubBandTint,
  hubPoiFloorTint,
} from './HubLook';

const POI_KINDS: PoiKind[] = [
  'camp',
  'ruin',
  'scout',
  'shrine',
  'warren',
  'grove',
  'watch',
  'cairn',
];

describe('HubLook', () => {
  test('plaza is warmer/lighter than wild grass wash', () => {
    const avg = (c: number) =>
      ((c >> 16) & 0xff) + ((c >> 8) & 0xff) + (c & 0xff);
    expect(avg(HUB_PLAZA_FLOOR_TINT)).toBeGreaterThan(avg(HUB_WILD_FLOOR_TINT));
  });

  test('dirt roads differ from town roads and wild', () => {
    expect(HUB_DIRT_ROAD_TINT).not.toBe(HUB_TOWN_ROAD_TINT);
    expect(HUB_DIRT_ROAD_TINT).not.toBe(HUB_WILD_FLOOR_TINT);
    expect(hubBandTint('dirtRoad').tint).toBe(HUB_DIRT_ROAD_TINT);
    expect(hubBandTint('townRoad').tint).toBe(HUB_TOWN_ROAD_TINT);
  });

  test('every POI kind has a distinct floor tint', () => {
    const seen = new Set<number>();
    for (const kind of POI_KINDS) {
      const tint = hubPoiFloorTint(kind);
      expect(tint).toBeGreaterThan(0);
      expect(seen.has(tint), `duplicate tint for ${kind}`).toBe(false);
      seen.add(tint);
    }
    expect(seen.size).toBe(POI_KINDS.length);
  });

  test('grove is greener and shrine is warmer than ruin', () => {
    const green = (c: number) => (c >> 8) & 0xff;
    const red = (c: number) => (c >> 16) & 0xff;
    expect(green(hubPoiFloorTint('grove'))).toBeGreaterThan(
      green(hubPoiFloorTint('ruin')),
    );
    expect(red(hubPoiFloorTint('shrine'))).toBeGreaterThan(
      red(hubPoiFloorTint('warren')),
    );
  });
});
