export type FirstSessionStep = 'move' | 'rift' | 'attack';

export type FirstSessionState = {
  tutorialOpen: boolean;
  smoke: boolean;
  completed: boolean;
  moved: boolean;
  inRift: boolean;
  killed: boolean;
};

export const FIRST_SESSION_KEY = 'riftborn.firstsession.v1';

export function hasCompletedFirstSession(): boolean {
  try {
    return localStorage.getItem(FIRST_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export function markFirstSessionCompleted(): void {
  try {
    localStorage.setItem(FIRST_SESSION_KEY, '1');
  } catch {
    // ignore quota / private mode
  }
}

/**
 * Pure step selection for the non-blocking first-session hint banner.
 * Returns `null` when no hint should be shown, `'done'` when the flow is
 * finished (caller may persist completion), or the current step id.
 */
export function nextFirstSessionHint(
  state: FirstSessionState,
): FirstSessionStep | 'done' | null {
  if (state.smoke || state.tutorialOpen) return null;
  if (state.completed) return 'done';
  if (state.killed) return 'done';
  if (!state.moved && !state.inRift) return 'move';
  if (!state.inRift) return 'rift';
  return 'attack';
}

export function firstSessionHintText(
  step: FirstSessionStep,
  touch: boolean,
): string {
  switch (step) {
    case 'move':
      return touch ? 'Stick - move' : 'WASD - move';
    case 'rift':
      return 'Betritt den Rift: Kills bis Boss/Exit. SHIFT oeffnet Gates.';
    case 'attack':
      return touch
        ? 'ATK - attack. Kills fuellen SHIFT-Energie.'
        : 'LMB - attack. Kills fuellen SHIFT-Energie.';
  }
}
