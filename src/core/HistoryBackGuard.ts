import {
  resolveBrowserBack,
  type BackAction,
  type BackContext,
} from './BrowserBack';

export type HistoryBackHandlers = {
  getContext: () => BackContext;
  closeOverlay: () => void;
  openPause: () => void;
  resume: () => void;
};

/**
 * Keep a history entry so Android/browser Back does not leave the game
 * until the title screen allows it.
 */
export function installHistoryBackGuard(
  handlers: HistoryBackHandlers,
): () => void {
  const push = (): void => {
    try {
      history.pushState({ riftborn: 1 }, '', window.location.href);
    } catch {
      /* ignore */
    }
  };

  push();

  const onPop = (): void => {
    const action: BackAction = resolveBrowserBack(handlers.getContext());
    if (action === 'leave') {
      // Allow a real leave on the next Back by not re-pushing.
      return;
    }
    push();
    if (action === 'closeOverlay') handlers.closeOverlay();
    else if (action === 'openPause') handlers.openPause();
    else if (action === 'resume') handlers.resume();
  };

  window.addEventListener('popstate', onPop);
  return () => window.removeEventListener('popstate', onPop);
}
