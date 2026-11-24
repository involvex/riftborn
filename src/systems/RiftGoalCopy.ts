/** Pure copy for rift onboarding / mod clarity (O2). */

export const RIFT_GOAL_LINE = 'Kill → Boss → Exit';

/**
 * Short toast on rift entry. Biome, depth, and Kill → Boss → Exit live on
 * the rift HUD so this line is only the mod (and depth rule, when any).
 */
export function riftEnterToastText(opts: {
  depthLabel?: string;
  modName: string;
  modBlurb: string;
  ruleName?: string;
  ruleBlurb?: string;
  biomeName?: string;
}): string {
  const rule =
    opts.ruleName && opts.ruleBlurb
      ? ` · ${opts.ruleName} — ${opts.ruleBlurb}`
      : '';
  return `${opts.modName} — ${opts.modBlurb}${rule}`;
}

export function shortBiomeName(name: string | undefined): string {
  if (!name) return 'Rift';
  if (name.includes('Krypt')) return 'Crypt';
  if (name.includes('Kristall') || name.toLowerCase().includes('crystal')) {
    return 'Crystal';
  }
  if (name.includes('Salz') || name.toLowerCase().includes('salt')) {
    return 'Salt';
  }
  if (
    name.toLowerCase().includes('wald') ||
    name.toLowerCase().includes('wood')
  ) {
    return 'Woods';
  }
  return name.slice(0, 8);
}

function shortRule(name: string): string {
  if (name.includes('Hardened')) return 'Hard';
  if (name.includes('Relentless')) return 'Relent';
  if (name.includes('Apex')) return 'Apex';
  return name.slice(0, 6);
}

function shortMod(name: string): string {
  if (name.includes('Dense')) return 'Dense';
  if (name.includes('Glass')) return 'Glass';
  if (name.includes('Gilded')) return 'Gold';
  if (name.includes('Veil')) return 'Veil';
  if (name.includes('Swift')) return 'Swift';
  return name.slice(0, 6);
}

/** Live contract under the rift meter: biome, depth, kills, mod. */
export function riftHudLabel(opts: {
  biomeName?: string;
  depth: number;
  kills: number;
  goal: number;
  phase: 'fill' | 'boss' | 'exit';
  modName?: string;
  ruleName?: string;
  /** Optional spur champion still alive. */
  championAlive?: boolean;
}): string {
  const head = `${shortBiomeName(opts.biomeName)} D${opts.depth}`;
  const mod =
    opts.modName && opts.modName !== 'Calm Rift' ? shortMod(opts.modName) : '';
  const rule = opts.ruleName ? shortRule(opts.ruleName) : '';
  const elite = opts.championAlive ? 'Elite' : '';
  const tail = [mod, rule, elite].filter(Boolean);
  if (opts.phase === 'boss') return [head, 'Boss', ...tail].join('\n');
  if (opts.phase === 'exit') return [head, 'Exit', ...tail].join('\n');
  return [head, `${opts.kills}/${opts.goal}`, ...tail].join('\n');
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
