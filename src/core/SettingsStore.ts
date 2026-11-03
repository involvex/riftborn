export type HotkeyAction =
  | 'gather'
  | 'craft'
  | 'character'
  | 'inventory'
  | 'skills'
  | 'skill1'
  | 'skill2'
  | 'skill3'
  | 'portal'
  | 'town'
  | 'dash'
  | 'coop'
  | 'menu'
  | 'equipTool'
  | 'map'
  | 'shift';

export type HotkeyMap = Record<HotkeyAction, string>;

/** Auto = Low on touch / coarse devices, High on desktop. */
export type GraphicsQualitySetting = 'auto' | 'high' | 'low';

export type GameSettings = {
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  mute: boolean;
  showDamageNumbers: boolean;
  /** Camera shake on hits / crits / boss. */
  screenShake: boolean;
  /** Auto-convert common gear drops to gold. */
  autoSellJunk: boolean;
  /** Touch pad vibration via navigator.vibrate when available. */
  haptics: boolean;
  /** 0 / 0.5 / 1 — ash/shadow transition intensity. */
  shiftFxIntensity: number;
  /**
   * Render/VFX budget. Auto picks Low on phones so WebView stays
   * near 60 fps; override in Settings.
   */
  graphicsQuality: GraphicsQualitySetting;
  hotkeys: HotkeyMap;
};

const SETTINGS_KEY = 'riftborn.settings.v1';

export const DEFAULT_HOTKEYS: HotkeyMap = {
  gather: 'E',
  craft: 'F',
  character: 'C',
  inventory: 'I',
  skills: 'K',
  skill1: 'ONE',
  skill2: 'TWO',
  skill3: 'THREE',
  portal: 'R',
  town: 'B',
  dash: 'SPACE',
  coop: 'P',
  menu: 'ESC',
  equipTool: 'T',
  map: 'M',
  shift: 'Q',
};

export const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 0.8,
  sfxVolume: 0.85,
  musicVolume: 0.5,
  mute: false,
  showDamageNumbers: true,
  screenShake: true,
  autoSellJunk: false,
  haptics: true,
  shiftFxIntensity: 1,
  graphicsQuality: 'auto',
  hotkeys: { ...DEFAULT_HOTKEYS },
};

export function cycleShiftFxIntensity(current: number): number {
  if (current >= 0.99) return 0;
  if (current >= 0.4) return 1;
  return 0.5;
}

export function shiftFxIntensityLabel(v: number): string {
  if (v >= 0.99) return 'Full';
  if (v >= 0.4) return 'Low';
  return 'Off';
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function parseGraphicsQuality(v: unknown): GraphicsQualitySetting {
  if (v === 'high' || v === 'low' || v === 'auto') return v;
  return DEFAULT_SETTINGS.graphicsQuality;
}

export class SettingsStore {
  private data: GameSettings = structuredClone(DEFAULT_SETTINGS);

  load(): GameSettings {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return this.data;
      const parsed = JSON.parse(raw) as Partial<GameSettings>;
      this.data = {
        ...DEFAULT_SETTINGS,
        ...parsed,
        hotkeys: {
          ...DEFAULT_HOTKEYS,
          ...(parsed.hotkeys ?? {}),
        },
        masterVolume: clamp01(
          parsed.masterVolume ?? DEFAULT_SETTINGS.masterVolume,
        ),
        sfxVolume: clamp01(parsed.sfxVolume ?? DEFAULT_SETTINGS.sfxVolume),
        musicVolume: clamp01(
          parsed.musicVolume ?? DEFAULT_SETTINGS.musicVolume,
        ),
        showDamageNumbers:
          parsed.showDamageNumbers ?? DEFAULT_SETTINGS.showDamageNumbers,
        screenShake: parsed.screenShake ?? DEFAULT_SETTINGS.screenShake,
        autoSellJunk: parsed.autoSellJunk ?? DEFAULT_SETTINGS.autoSellJunk,
        haptics: parsed.haptics ?? DEFAULT_SETTINGS.haptics,
        shiftFxIntensity: clamp01(
          parsed.shiftFxIntensity ?? DEFAULT_SETTINGS.shiftFxIntensity,
        ),
        graphicsQuality: parseGraphicsQuality(parsed.graphicsQuality),
      };
    } catch {
      this.data = structuredClone(DEFAULT_SETTINGS);
    }
    return this.data;
  }

  get(): GameSettings {
    return this.data;
  }

  save(partial: Partial<GameSettings>): GameSettings {
    this.data = {
      ...this.data,
      ...partial,
      hotkeys: {
        ...this.data.hotkeys,
        ...(partial.hotkeys ?? {}),
      },
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.data));
    return this.data;
  }

  setHotkey(action: HotkeyAction, key: string): void {
    this.save({ hotkeys: { ...this.data.hotkeys, [action]: key } });
  }

  reset(): GameSettings {
    this.data = structuredClone(DEFAULT_SETTINGS);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.data));
    return this.data;
  }

  /** Effective SFX gain 0..1 */
  sfxGain(): number {
    if (this.data.mute) return 0;
    return this.data.masterVolume * this.data.sfxVolume;
  }
}

export const settingsStore = new SettingsStore();
settingsStore.load();
