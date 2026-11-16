/**
 * Hub atmosphere palette — plaza glow, road contrast, POI floor washes.
 * Shared hub tile sheets need tints to read as places, not one grass grid.
 */

import type { PoiKind } from '../world/MapGen';

/** Warm cobble wash on plaza stone. */
export const HUB_PLAZA_FLOOR_TINT = 0xece0cc;
/** Slightly cooler apron around the square. */
export const HUB_PLAZA_APRON_TINT = 0xd8ccb8;
/** Town paths still on stone. */
export const HUB_TOWN_ROAD_TINT = 0xe4d8c4;
/** Dirt roads outside town — ochre vs green wild. */
export const HUB_DIRT_ROAD_TINT = 0xecc898;

/** Soft green wash on wilderness floor tiles. */
export const HUB_WILD_FLOOR_TINT = 0xb8dcac;
/** Soft transition wash between town and fringe. */
export const HUB_TRANSITION_FLOOR_TINT = 0xd0e0bc;

/** Plaza border accent (gold dust). */
export const HUB_PLAZA_EDGE_COLOR = 0xd4a860;
export const HUB_PLAZA_EDGE_ALPHA = 0.28;
export const HUB_PLAZA_EDGE_RADIUS = 5.5;

/** Sparse warm interior glow on plaza tiles. */
export const HUB_PLAZA_GLOW_EVERY = 3;
export const HUB_PLAZA_GLOW_COLOR = 0xf0d090;
export const HUB_PLAZA_GLOW_ALPHA = 0.1;
export const HUB_PLAZA_GLOW_RADIUS = 7;

/** Dirt-road edge stroke outside town. */
export const HUB_DIRT_ROAD_EDGE = 0xc4a060;
export const HUB_DIRT_ROAD_EDGE_ALPHA = 0.22;

/** Floor multiply tint so each POI reads as its own patch. */
export function hubPoiFloorTint(kind: PoiKind): number {
  switch (kind) {
    case 'grove':
      return 0xa8e090;
    case 'shrine':
      return 0xf2d090;
    case 'warren':
      return 0xc4b8a4;
    case 'ruin':
      return 0xb8b0a4;
    case 'cairn':
      return 0xd0c8b8;
    case 'watch':
      return 0xd8d0bc;
    case 'camp':
      return 0xe8c890;
    case 'scout':
      return 0xdcc8a8;
    default:
      return 0xd0d0c8;
  }
}

export type HubBandTint = {
  fallback: number;
  tint: number;
};

export function hubBandTint(
  band: 'plaza' | 'apron' | 'townRoad' | 'dirtRoad' | 'transition' | 'wild',
): HubBandTint {
  switch (band) {
    case 'plaza':
      return { fallback: 0x6a6460, tint: HUB_PLAZA_FLOOR_TINT };
    case 'apron':
      return { fallback: 0x5a5448, tint: HUB_PLAZA_APRON_TINT };
    case 'townRoad':
      return { fallback: 0x6a6460, tint: HUB_TOWN_ROAD_TINT };
    case 'dirtRoad':
      return { fallback: 0xb8a080, tint: HUB_DIRT_ROAD_TINT };
    case 'transition':
      return { fallback: 0xd0dcc0, tint: HUB_TRANSITION_FLOOR_TINT };
    case 'wild':
      return { fallback: 0xb8d0a0, tint: HUB_WILD_FLOOR_TINT };
  }
}
