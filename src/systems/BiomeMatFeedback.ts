/**
 * Toast copy for biome material drops (crafting sink feedback).
 * Pure so unit tests cover first-hint vs later-drop wording.
 */

export type BiomeMatFeedbackState = {
  /** Craft-bench hint already shown this session. */
  benchHintShown: boolean;
};

export type BiomeMatToastOpts = {
  itemName: string;
  qty: number;
  touch: boolean;
  /** Desktop craft key label (default F). */
  craftKey?: string;
  state: BiomeMatFeedbackState;
};

export type BiomeMatToastResult = {
  text: string;
  state: BiomeMatFeedbackState;
};

export function biomeMatDropToast(
  opts: BiomeMatToastOpts,
): BiomeMatToastResult {
  const { itemName, qty, touch, craftKey = 'F', state } = opts;
  const loot = `+${qty} ${itemName}`;
  if (state.benchHintShown) {
    return { text: loot, state };
  }
  const hint = touch
    ? 'Craft at Bench / Werkbank'
    : `Press ${craftKey} for the craft bench`;
  return {
    text: `${loot} — ${hint}`,
    state: { benchHintShown: true },
  };
}
