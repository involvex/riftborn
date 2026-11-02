/**
 * Pure touch skill-aim state machine.
 * Hold+drag = aim; short tap = auto nearest; release on button = cancel.
 */

export type SkillAimState = {
  slot: number;
  originX: number;
  originY: number;
  pointerX: number;
  pointerY: number;
  startedAt: number;
};

export type SkillAimRelease =
  | { action: 'auto' }
  | { action: 'cancel' }
  | {
      action: 'cast';
      /** Normalized screen direction from origin (y+ down). */
      dirX: number;
      dirY: number;
      pointerX: number;
      pointerY: number;
      /** Distance from origin in screen px. */
      dragDist: number;
    };

export type SkillAimOptions = {
  /** Distance from origin before drag counts as aim (px). */
  aimThresholdPx: number;
  /** Max ms for a short tap → auto-target. */
  tapMs: number;
  /** Release within this radius of origin = cancel (px). */
  cancelRadiusPx: number;
};

export const DEFAULT_SKILL_AIM: SkillAimOptions = {
  aimThresholdPx: 28,
  tapMs: 220,
  cancelRadiusPx: 36,
};

export function beginSkillAim(
  slot: number,
  originX: number,
  originY: number,
  nowMs: number,
): SkillAimState {
  return {
    slot,
    originX,
    originY,
    pointerX: originX,
    pointerY: originY,
    startedAt: nowMs,
  };
}

export function updateSkillAim(
  state: SkillAimState,
  pointerX: number,
  pointerY: number,
): SkillAimState {
  return { ...state, pointerX, pointerY };
}

export function skillAimDragDist(state: SkillAimState): number {
  return Math.hypot(
    state.pointerX - state.originX,
    state.pointerY - state.originY,
  );
}

export function skillAimDirection(state: SkillAimState): {
  dirX: number;
  dirY: number;
} {
  const dx = state.pointerX - state.originX;
  const dy = state.pointerY - state.originY;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return { dirX: 1, dirY: 0 };
  return { dirX: dx / len, dirY: dy / len };
}

/**
 * Resolve pointer-up. Pure — no Phaser.
 */
export function resolveSkillAimRelease(
  state: SkillAimState,
  nowMs: number,
  opts: SkillAimOptions = DEFAULT_SKILL_AIM,
): SkillAimRelease {
  const dist = skillAimDragDist(state);
  const held = nowMs - state.startedAt;

  // Dragged back onto the button → cancel
  if (dist <= opts.cancelRadiusPx && held >= opts.tapMs) {
    return { action: 'cancel' };
  }

  // Short tap with little movement → auto nearest
  if (held < opts.tapMs && dist < opts.aimThresholdPx) {
    return { action: 'auto' };
  }

  // Still essentially on the button without a long hold → auto
  if (dist < opts.aimThresholdPx) {
    return { action: 'auto' };
  }

  const { dirX, dirY } = skillAimDirection(state);
  return {
    action: 'cast',
    dirX,
    dirY,
    pointerX: state.pointerX,
    pointerY: state.pointerY,
    dragDist: dist,
  };
}

/**
 * Project a screen aim direction into world deltas for facing / leap.
 * Iso screen: +X right, +Y down. World: +X SE-ish — approximate with
 * facingFromDelta-compatible deltas (dx world, dy world).
 */
export function screenDirToWorldDelta(
  dirX: number,
  dirY: number,
): { dx: number; dy: number } {
  // Inverse of typical iso (worldToScreen ≈ (wx-wy, (wx+wy)/2)):
  // screen dx ≈ wx - wy, screen dy ≈ (wx + wy) / 2
  const wx = dirY + dirX * 0.5;
  const wy = dirY - dirX * 0.5;
  const len = Math.hypot(wx, wy) || 1;
  return { dx: wx / len, dy: wy / len };
}

/** Pick best enemy for aimed cast: prefer near aim point, else along ray. */
export function pickAimedEnemyIndex(
  enemies: { x: number; y: number; alive: boolean }[],
  playerX: number,
  playerY: number,
  aimWorldX: number,
  aimWorldY: number,
  range: number,
): number {
  let best = -1;
  let bestScore = Infinity;
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i]!;
    if (!e.alive) continue;
    const dPlayer = Math.hypot(e.x - playerX, e.y - playerY);
    if (dPlayer > range) continue;
    const dAim = Math.hypot(e.x - aimWorldX, e.y - aimWorldY);
    // Prefer close to aim; slight bias toward nearer player
    const score = dAim + dPlayer * 0.15;
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}
