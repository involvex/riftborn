/**
 * Warm cobble plaza prop catalog (no Phaser — unit-test safe).
 * PNGs from `bun run scripts/synth-plaza-props.mjs`.
 */

export const PLAZA_PROP_KEYS = [
  'prop_plaza_shop',
  'prop_plaza_forge',
  'prop_plaza_inn',
  'prop_plaza_obelisk',
  'prop_plaza_chest',
  'prop_plaza_chest_boss',
  'prop_plaza_npc_vendor',
  'prop_plaza_npc_crafter',
  'prop_plaza_npc_trader',
  'prop_plaza_board',
  'prop_plaza_lantern',
  'prop_plaza_well',
  'prop_plaza_crate',
  'prop_plaza_anvil',
] as const;

export type PlazaPropKey = (typeof PLAZA_PROP_KEYS)[number];

/** Building label → plaza texture. */
export const PLAZA_BUILDING_KEY: Record<string, PlazaPropKey> = {
  Shop: 'prop_plaza_shop',
  Forge: 'prop_plaza_forge',
  Inn: 'prop_plaza_inn',
};

/** NPC role → plaza figure / board texture. */
export const PLAZA_NPC_KEY: Record<string, PlazaPropKey> = {
  vendor: 'prop_plaza_npc_vendor',
  crafter: 'prop_plaza_npc_crafter',
  trader: 'prop_plaza_npc_trader',
  board: 'prop_plaza_board',
};

/** Townish decor kinds → warm plaza props (not purple void art). */
export const PLAZA_DECOR_KEY: Record<string, PlazaPropKey> = {
  lantern: 'prop_plaza_lantern',
  well: 'prop_plaza_well',
  crate: 'prop_plaza_crate',
};

/** Plaza buildings dwarf the hero; NPCs match figure height roughly. */
export function plazaArtScale(key: PlazaPropKey | string): number {
  switch (key) {
    case 'prop_plaza_shop':
    case 'prop_plaza_forge':
    case 'prop_plaza_inn':
      return 0.95;
    case 'prop_plaza_obelisk':
      return 0.85;
    case 'prop_plaza_npc_vendor':
    case 'prop_plaza_npc_crafter':
    case 'prop_plaza_npc_trader':
      return 0.72;
    case 'prop_plaza_board':
      return 0.7;
    case 'prop_plaza_chest':
    case 'prop_plaza_chest_boss':
      return 0.9;
    case 'prop_plaza_lantern':
      return 0.85;
    case 'prop_plaza_well':
      return 0.8;
    case 'prop_plaza_crate':
    case 'prop_plaza_anvil':
      return 0.85;
    default:
      return 0.75;
  }
}
