import type { BackContext } from './BrowserBack';

type NavPhase = 'title' | 'create' | 'play';

let phase: NavPhase = 'title';
let paused = false;
let overlay = false;

/** Boot / title screen (Back may leave the page). */
export function navEnterTitle(): void {
  phase = 'title';
  paused = false;
  overlay = false;
}

/** Character create — Back returns to title, does not leave. */
export function navEnterCreate(): void {
  phase = 'create';
  paused = false;
  overlay = false;
}

/** In-world play (World + UI scenes). */
export function navEnterPlay(): void {
  phase = 'play';
  paused = false;
  overlay = false;
}

export function navSetPaused(v: boolean): void {
  paused = v;
}

export function navSetOverlay(v: boolean): void {
  overlay = v;
}

/** Pure-ish snapshot for HistoryBackGuard / tests. */
export function currentBackContext(): BackContext {
  if (phase === 'title') return overlay ? 'overlay' : 'title';
  if (phase === 'create') return 'overlay';
  if (overlay) return 'overlay';
  if (paused) return 'paused';
  return 'playing';
}

/** Test helper. */
export function navResetForTests(): void {
  phase = 'title';
  paused = false;
  overlay = false;
}
