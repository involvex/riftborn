import type { CharacterSave } from '../types/save';

const SAVE_KEY = 'riftborn.character.v4';
const LEGACY_KEYS = [
  'riftborn.character.v3',
  'riftborn.character.v2',
  'riftborn.character.v1',
];

export interface SaveStore {
  load(): CharacterSave | null;
  save(data: CharacterSave): void;
  clear(): void;
}

type LegacySave = Omit<
  CharacterSave,
  'version' | 'unspentSkillPoints' | 'skillRanks' | 'gender'
> & {
  version: number;
  gender?: CharacterSave['gender'];
  unspentSkillPoints?: number;
  skillRanks?: Record<string, number>;
};

/** LocalStorage-backed character persistence for solo play. */
export class LocalSaveStore implements SaveStore {
  load(): CharacterSave | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const data = JSON.parse(raw) as CharacterSave;
        if (data.version === 4) return data;
      }
      for (const key of LEGACY_KEYS) {
        const legacy = localStorage.getItem(key);
        if (!legacy) continue;
        const old = JSON.parse(legacy) as LegacySave;
        const migrated = this.migrate(old);
        this.save(migrated);
        localStorage.removeItem(key);
        return migrated;
      }
      return null;
    } catch {
      return null;
    }
  }

  private migrate(old: LegacySave): CharacterSave {
    const level = old.level ?? 1;
    return {
      version: 4,
      name: old.name,
      classId: old.classId,
      gender: old.gender ?? 'male',
      level,
      xp: old.xp ?? 0,
      unspentStatPoints: old.unspentStatPoints ?? 0,
      // Retroactive skill points for existing characters
      unspentSkillPoints: old.unspentSkillPoints ?? Math.floor(level / 5),
      skillRanks: old.skillRanks ?? {},
      stats: old.stats,
      hp: old.hp,
      maxHp: old.maxHp,
      inventory: old.inventory,
      equipment: old.equipment,
      worldX: old.worldX,
      worldY: old.worldY,
      inRift: old.inRift,
      riftSeed: old.riftSeed,
      playTimeSec: old.playTimeSec,
    };
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
