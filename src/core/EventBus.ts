type Handler = (payload: unknown) => void;

/**
 * Tiny typed-ish event bus so systems stay decoupled from Phaser scenes.
 */
export class EventBus {
  private readonly listeners = new Map<string, Set<Handler>>();

  on(event: string, handler: Handler): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(handler);
    return () => {
      set?.delete(handler);
    };
  }

  emit(event: string, payload?: unknown): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const handler of set) {
      handler(payload);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const gameEvents = new EventBus();

export const Events = {
  PLAYER_MOVED: 'player:moved',
  ITEM_ADDED: 'item:added',
  ITEM_REMOVED: 'item:removed',
  JUNK_SOLD: 'shop:junkSold',
  EQUIP_CHANGED: 'equip:changed',
  PLAYER_DAMAGED: 'player:damaged',
  PLAYER_HEALED: 'player:healed',
  ENEMY_DIED: 'enemy:died',
  NODE_DEPLETED: 'node:depleted',
  XP_GAINED: 'xp:gained',
  LEVEL_UP: 'level:up',
  CRAFT_SUCCESS: 'craft:success',
  SAVE_WRITTEN: 'save:written',
  RIFT_ENTERED: 'rift:entered',
  RIFT_CLEARED: 'rift:cleared',
  PLAYER_DIED: 'player:died',
  DAMAGE_NUMBER: 'combat:damageNumber',
  SESSION_REWARDS: 'net:sessionRewards',
  SETTINGS_CHANGED: 'settings:changed',
  SKILL_CHANGED: 'skill:changed',
  SKILL_CAST: 'skill:cast',
  RIFT_PROGRESS: 'rift:progress',
} as const;
