import type { CharacterSave } from '../types/save';

export const SLOT_COUNT = 3;

const META_KEY = 'riftborn.slots.meta.v1';
const LEGACY_SINGLE = 'riftborn.character.v4';
const LEGACY_KEYS = [
  LEGACY_SINGLE,
  'riftborn.character.v3',
  'riftborn.character.v2',
  'riftborn.character.v1',
];

function slotKey(index: number): string {
  return `riftborn.slot.${index}.v4`;
}

type SlotMeta = { activeSlot: number };

type LegacySave = Omit<
  CharacterSave,
  'version' | 'unspentSkillPoints' | 'skillRanks' | 'gender'
> & {
  version: number;
  gender?: CharacterSave['gender'];
  unspentSkillPoints?: number;
  skillRanks?: Record<string, number>;
};

function readMeta(): SlotMeta {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (raw) {
      const m = JSON.parse(raw) as SlotMeta;
      if (
        typeof m.activeSlot === 'number' &&
        m.activeSlot >= 0 &&
        m.activeSlot < SLOT_COUNT
      ) {
        return m;
      }
    }
  } catch {
    /* ignore */
  }
  return { activeSlot: 0 };
}

function writeMeta(meta: SlotMeta): void {
  localStorage.setItem(META_KEY, JSON.stringify(meta));
}

function migrateLegacy(old: LegacySave): CharacterSave {
  const level = old.level ?? 1;
  return {
    version: 4,
    name: old.name,
    classId: old.classId,
    gender: old.gender ?? 'male',
    level,
    xp: old.xp ?? 0,
    unspentStatPoints: old.unspentStatPoints ?? 0,
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
    bounty: null,
    bountyLastKind: null,
    bountyCooldownLeft: 0,
    hubExplored: null,
  };
}

/** Pull pre-slot saves into slot 0 once. */
function migrateSingleIntoSlots(): void {
  if (localStorage.getItem(slotKey(0))) return;
  for (const key of LEGACY_KEYS) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      const old = JSON.parse(raw) as LegacySave | CharacterSave;
      const data =
        old.version === 4
          ? (old as CharacterSave)
          : migrateLegacy(old as LegacySave);
      localStorage.setItem(slotKey(0), JSON.stringify(data));
      writeMeta({ activeSlot: 0 });
      localStorage.removeItem(key);
      return;
    } catch {
      /* try next */
    }
  }
}

export interface SaveStore {
  load(): CharacterSave | null;
  save(data: CharacterSave): void;
  clear(): void;
  getActiveSlot(): number;
  setActiveSlot(index: number): void;
  loadSlot(index: number): CharacterSave | null;
  saveSlot(index: number, data: CharacterSave): void;
  clearSlot(index: number): void;
  listSlots(): (CharacterSave | null)[];
  hasAnySave(): boolean;
}

/** LocalStorage-backed multi-slot character persistence. */
export class LocalSaveStore implements SaveStore {
  constructor() {
    migrateSingleIntoSlots();
  }

  getActiveSlot(): number {
    return readMeta().activeSlot;
  }

  setActiveSlot(index: number): void {
    const i = Math.max(0, Math.min(SLOT_COUNT - 1, index));
    writeMeta({ activeSlot: i });
  }

  loadSlot(index: number): CharacterSave | null {
    try {
      const raw = localStorage.getItem(slotKey(index));
      if (!raw) return null;
      const data = JSON.parse(raw) as CharacterSave;
      if (data.version === 4) return data;
      return null;
    } catch {
      return null;
    }
  }

  saveSlot(index: number, data: CharacterSave): void {
    localStorage.setItem(slotKey(index), JSON.stringify(data));
  }

  clearSlot(index: number): void {
    localStorage.removeItem(slotKey(index));
  }

  listSlots(): (CharacterSave | null)[] {
    return Array.from({ length: SLOT_COUNT }, (_, i) => this.loadSlot(i));
  }

  hasAnySave(): boolean {
    return this.listSlots().some((s) => !!s);
  }

  load(): CharacterSave | null {
    migrateSingleIntoSlots();
    return this.loadSlot(this.getActiveSlot());
  }

  save(data: CharacterSave): void {
    this.saveSlot(this.getActiveSlot(), data);
  }

  clear(): void {
    this.clearSlot(this.getActiveSlot());
    for (const key of LEGACY_KEYS) localStorage.removeItem(key);
  }

  /** Wipe every slot (smoke / nuclear reset). */
  clearAll(): void {
    for (let i = 0; i < SLOT_COUNT; i++) this.clearSlot(i);
    for (const key of LEGACY_KEYS) localStorage.removeItem(key);
    writeMeta({ activeSlot: 0 });
  }
}

export const saveStore: LocalSaveStore = new LocalSaveStore();
