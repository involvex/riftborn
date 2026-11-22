/**
 * Pure Battle Cry vs Ember Shrine merge — never shorten a longer window.
 */

export function mergeDamageBuff(opts: {
  remaining: number;
  currentMult: number;
  nextMult: number;
  nextDuration: number;
}): { mult: number; duration: number } {
  const remaining = Math.max(0, opts.remaining);
  const mult = Math.max(remaining > 0 ? opts.currentMult : 1, opts.nextMult);
  const duration =
    opts.nextDuration >= remaining ? opts.nextDuration : remaining;
  return { mult, duration };
}
