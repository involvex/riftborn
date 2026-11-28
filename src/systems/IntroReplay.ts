/**
 * Settings → Replay intro: clear first-run gates so the modal can show again.
 * Pure localStorage helpers (no Phaser) for unit tests + UIScene.
 */
import { FIRST_SESSION_KEY, clearFirstSessionCompleted } from './FirstSession';

export const TUTORIAL_STORAGE_KEY = 'riftborn.tutorial.v2';

export function clearTutorialSeen(): void {
  try {
    localStorage.removeItem(TUTORIAL_STORAGE_KEY);
  } catch {
    // ignore quota / private mode
  }
}

export function hasTutorialSeenFlag(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function markTutorialSeenFlag(): void {
  try {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, '1');
  } catch {
    // ignore quota / private mode
  }
}

/** Clear tutorial + first-session keys (Settings Replay intro). */
export function resetIntroProgress(): void {
  clearTutorialSeen();
  clearFirstSessionCompleted();
}

export { FIRST_SESSION_KEY, clearFirstSessionCompleted };
