/** Pure copy for rift onboarding / mod clarity (O2). */

export const RIFT_GOAL_LINE = 'Kill → Boss → Exit';

/** Toast when the player first enters a rift. */
export function riftEnterToastText(opts: {
  depthLabel: string;
  modName: string;
  modBlurb: string;
  ruleName?: string;
  ruleBlurb?: string;
  /** Human biome name (e.g. Kristallhöhle) — optional loop clarity. */
  biomeName?: string;
}): string {
  const biome = opts.biomeName ? `${opts.biomeName} · ` : '';
  const rule =
    opts.ruleName && opts.ruleBlurb
      ? ` · ${opts.ruleName} — ${opts.ruleBlurb}`
      : '';
  return `${biome}Rift ${opts.depthLabel} · ${RIFT_GOAL_LINE} · ${opts.modName} — ${opts.modBlurb}${rule}`;
}

/**
 * Toast when the player shifts onto the wrong layer under a layer-lock mod.
 * Emphasizes combat is not broken — foes live only on one layer.
 */
export function veiledWrongLayerToast(opts: {
  modName: string;
  lockedLayerName: string;
  shiftLabel: string;
}): string {
  return `${opts.modName}: foes only on ${opts.lockedLayerName} — ${opts.shiftLabel} back (SHIFT not broken)`;
}

/** First-session / tutorial rift goal with the live shift bind. */
export function riftGoalHint(shiftLabel: string): string {
  return `Rift: ${RIFT_GOAL_LINE}. ${shiftLabel} opens layer gates.`;
}

/** Toast when the Rift Lord / biome boss first appears. */
export function bossPhaseToastText(opts: {
  bossName: string;
  depthLabel: string;
}): string {
  return `${opts.bossName} emerges! (${opts.depthLabel}) — beat it to open Exit`;
}

/** Toast ~800 ms before the boss hops layers. */
export function bossShiftWarnToastText(opts: {
  bossName: string;
  nextLayerName: string;
}): string {
  return `${opts.bossName} gathering… → ${opts.nextLayerName}!`;
}

/** Toast when the boss completes a layer hop. */
export function bossShiftHopToastText(opts: {
  bossName: string;
  layerName: string;
}): string {
  return `${opts.bossName} shifts to ${opts.layerName}!`;
}
