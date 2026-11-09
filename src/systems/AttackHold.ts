/**
 * Pure helpers for hold-to-repeat basic attack (no Phaser).
 */

export type AttackHoldGate = {
  held: boolean;
  uiBlocked: boolean;
};

/** True when a held basic-attack input should keep trying to fire. */
export function canRepeatBasicAttack(gate: AttackHoldGate): boolean {
  return gate.held && !gate.uiBlocked;
}

/**
 * Desktop LMB should not start a world attack when the pointer is over
 * HUD/interactive UI (AbilityBar, menus, panels rendered in UI scenes).
 */
export function shouldStartDesktopAttack(opts: {
  touchControlsActive: boolean;
  leftButtonDown: boolean;
  pointerOverUi: boolean;
}): boolean {
  if (opts.touchControlsActive) return false;
  if (!opts.leftButtonDown) return false;
  if (opts.pointerOverUi) return false;
  return true;
}
