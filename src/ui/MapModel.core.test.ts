import { describe, expect, test } from 'bun:test';
import { buildMapMarkers, MAP_MARKER_COLOR } from './MapModel';

const base = {
  inRift: true,
  width: 20,
  height: 20,
  player: { x: 2, y: 2, facing: 1 },
  npcs: [] as { x: number; y: number; name?: string }[],
  chests: [] as { x: number; y: number; looted: boolean }[],
  portal: null as { x: number; y: number } | null,
};

describe('MapModel champion markers', () => {
  test('living champion gets a champion marker, not a plain elite', () => {
    const markers = buildMapMarkers({
      ...base,
      enemies: [
        {
          x: 10.5,
          y: 12.5,
          alive: true,
          elite: true,
          boss: false,
          champion: true,
        },
        {
          x: 8,
          y: 8,
          alive: true,
          elite: true,
          boss: false,
          champion: false,
        },
      ],
    });
    const champs = markers.filter((m) => m.kind === 'champion');
    const elites = markers.filter((m) => m.kind === 'elite');
    expect(champs).toHaveLength(1);
    expect(champs[0]!.x).toBe(10.5);
    expect(champs[0]!.label).toBe('Elite');
    expect(elites).toHaveLength(1);
    expect(MAP_MARKER_COLOR.champion).not.toBe(MAP_MARKER_COLOR.elite);
  });

  test('dead champion leaves no marker', () => {
    const markers = buildMapMarkers({
      ...base,
      enemies: [
        {
          x: 10,
          y: 10,
          alive: false,
          elite: true,
          boss: false,
          champion: true,
        },
      ],
    });
    expect(markers.some((m) => m.kind === 'champion')).toBe(false);
  });
});
