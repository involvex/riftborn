import {
  resolveBrowserBack,
  type BackAction,
  type BackContext,
} from './BrowserBack';
import type { HistoryBackHandlers } from './HistoryBackGuard';

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (msg: string) => void };
  }
}

function postToNative(action: BackAction | 'handled'): void {
  try {
    window.ReactNativeWebView?.postMessage(
      JSON.stringify({
        type: 'riftborn:backResult',
        action: action === 'leave' ? 'leave' : 'handled',
      }),
    );
  } catch {
    /* ignore */
  }
}

function applyBack(
  handlers: HistoryBackHandlers,
  ctx: BackContext,
): BackAction {
  const action = resolveBrowserBack(ctx);
  if (action === 'leave') return action;
  if (action === 'closeOverlay') handlers.closeOverlay();
  else if (action === 'openPause') handlers.openPause();
  else if (action === 'resume') handlers.resume();
  return action;
}

/**
 * Expo / RN WebView Back: CustomEvent from injectJavaScript, or
 * postMessage `{ type: 'riftborn:back' }`. Uses the same policy as
 * HistoryBackGuard; replies with leave so the shell can exitApp.
 */
export function installNativeBackBridge(
  handlers: HistoryBackHandlers,
): () => void {
  const onNative = (): void => {
    const action = applyBack(handlers, handlers.getContext());
    postToNative(action);
  };

  const onWindowMessage = (ev: MessageEvent): void => {
    let data: unknown = ev.data;
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch {
        return;
      }
    }
    if (
      data &&
      typeof data === 'object' &&
      (data as { type?: string }).type === 'riftborn:back'
    ) {
      onNative();
    }
  };

  const onDocMessage = (ev: Event): void => {
    const detail = (ev as CustomEvent).detail;
    if (
      detail?.type === 'riftborn:back' ||
      ev.type === 'riftborn-native-back'
    ) {
      onNative();
    }
  };

  window.addEventListener('riftborn-native-back', onNative as EventListener);
  window.addEventListener('message', onWindowMessage);
  document.addEventListener('message', onDocMessage as EventListener);

  return () => {
    window.removeEventListener(
      'riftborn-native-back',
      onNative as EventListener,
    );
    window.removeEventListener('message', onWindowMessage);
    document.removeEventListener('message', onDocMessage as EventListener);
  };
}
