/** Where the player is in the menu / game stack for Android/browser Back. */
export type BackContext = 'title' | 'playing' | 'paused' | 'overlay';

/** What Back should do for a given context. */
export type BackAction = 'leave' | 'openPause' | 'resume' | 'closeOverlay';

/**
 * Pure back-navigation policy.
 * Title may leave the page; elsewhere Back stays inside the game.
 */
export function resolveBrowserBack(ctx: BackContext): BackAction {
  switch (ctx) {
    case 'title':
      return 'leave';
    case 'overlay':
      return 'closeOverlay';
    case 'playing':
      return 'openPause';
    case 'paused':
      return 'resume';
  }
}
