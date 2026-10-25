import type { CharacterSave } from '../types/save';

const SAVE_KEY = 'riftborn.character.v2';
const LEGACY_KEY = 'riftborn.character.v1';

export interface SaveStore {
  load(): CharacterSave | null;
  save(data: CharacterSave): void;
  clear(): void;
}

/** LocalStorage-backed character persistence for solo play. */
export class LocalSaveStore implements SaveStore {
  load(): CharacterSave | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) {
        // Drop incompatible v1 saves — force fresh character creation.
        localStorage.removeItem(LEGACY_KEY);
        return null;
      }
      const data = JSON.parse(raw) as CharacterSave;
      if (data.version !== 2) return null;
      return data;
    } catch {
      return null;
    }
  }

  save(data: CharacterSave): void {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  }

  clear(): void {
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(LEGACY_KEY);
  }
}

export const saveStore: SaveStore = new LocalSaveStore();
