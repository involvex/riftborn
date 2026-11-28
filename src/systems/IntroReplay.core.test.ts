import { beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import {
  FIRST_SESSION_KEY,
  TUTORIAL_STORAGE_KEY,
  hasTutorialSeenFlag,
  markTutorialSeenFlag,
  resetIntroProgress,
} from './IntroReplay';
import {
  hasCompletedFirstSession,
  markFirstSessionCompleted,
} from './FirstSession';

function installMemoryLocalStorage(): void {
  const store = new Map<string, string>();
  const api = {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
    key(i: number) {
      return [...store.keys()][i] ?? null;
    },
    get length() {
      return store.size;
    },
  };
  Object.defineProperty(globalThis, 'localStorage', {
    value: api,
    configurable: true,
  });
}

describe('resetIntroProgress', () => {
  beforeAll(() => {
    installMemoryLocalStorage();
  });

  beforeEach(() => {
    localStorage.removeItem(TUTORIAL_STORAGE_KEY);
    localStorage.removeItem(FIRST_SESSION_KEY);
  });

  test('clears tutorial and first-session keys', () => {
    markTutorialSeenFlag();
    markFirstSessionCompleted();
    expect(hasTutorialSeenFlag()).toBe(true);
    expect(hasCompletedFirstSession()).toBe(true);

    resetIntroProgress();

    expect(hasTutorialSeenFlag()).toBe(false);
    expect(hasCompletedFirstSession()).toBe(false);
    expect(localStorage.getItem(TUTORIAL_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(FIRST_SESSION_KEY)).toBeNull();
  });
});
