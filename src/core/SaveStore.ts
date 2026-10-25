import type { CharacterSave } from '../types/save';

const SAVE_KEY = 'riftborn.character.v3';
const LEGACY_KEYS = ['riftborn.character.v2', 'riftborn.character.v1'];

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
      if (raw) {
        const data = JSON.parse(raw) as CharacterSave;
        if (data.version === 3) return data;
      }
      // Migrate v2 → v3
      const v2 = localStorage.getItem('riftborn.character.v2');
      if (v2) {
        const old = JSON.parse(v2) as Omit<
          CharacterSave,
          'gender' | 'version'
        > & {
          version: 2;
        };
        const migrated: CharacterSave = {
          ...old,
          version: 3,
          gender: 'male',
        };
        this.save(migrated);
        localStorage.removeItem('riftborn.character.v2');
        return migrated;
      }
      for (const key of LEGACY_KEYS) localStorage.removeItem(key);
      return null;
    } catch {
      return null;
    }
  }

  save(data: CharacterSave): void {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  }

  clear(): void {
    localStorage.removeItem(SAVE_KEY);
    for (const key of LEGACY_KEYS) localStorage.removeItem(key);
  }
}

export const saveStore: SaveStore = new LocalSaveStore();
