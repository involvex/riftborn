export type HotkeyAction =
  | 'gather'
  | 'craft'
  | 'character'
  | 'inventory'
  | 'skills'
  | 'skill1'
  | 'skill2'
  | 'skill3'
  | 'skill4'
  | 'portal'
  | 'town'
  | 'dash'
  | 'coop'
  | 'menu'
  | 'equipTool'
  | 'map'
  | 'shift';

export type HotkeyMap = Record<HotkeyAction, string>;

/** Auto = Medium on touch / coarse devices, High on desktop. */
export type GraphicsQualitySetting = 'auto' | 'high' | 'medium' | 'low';

export type GameSettings = {
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  mute: boolean;
  showDamageNumbers: boolean;
  /** 0 / 0.5 / 1 — camera shake intensity (Off / Low / Full). */
  shakeStrength: number;
  /**
   * Skip full-screen camera flashes and crit white frames
   * (photosensitivity). Beams / tint / shake still run.
   */
  reduceFlashing: boolean;
  /** Auto-convert common gear drops to gold. */
  autoSellJunk: boolean;
  /** Touch pad vibration via navigator.vibrate when available. */
  haptics: boolean;
  /** 0 / 0.5 / 1 — ash/shadow transition intensity. */
  shiftFxIntensity: number;
  /**
   * Render/VFX budget. Auto picks Medium on phones (readable HUD);
   * Low remains the FPS escape hatch. Override in Settings.
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
  skill4: 'FOUR',
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
  shakeStrength: 1,
  reduceFlashing: false,
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

/** Same cycle as Shift FX: Full → Off → Low → Full. */
export function cycleShakeStrength(current: number): number {
  return cycleShiftFxIntensity(current);
}

export function shakeStrengthLabel(v: number): string {
  return shiftFxIntensityLabel(v);
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function parseGraphicsQuality(v: unknown): GraphicsQualitySetting {
  if (v === 'high' || v === 'medium' || v === 'low' || v === 'auto') {
    return v;
  }
  return DEFAULT_SETTINGS.graphicsQuality;
}

/**
 * Resolve shake strength from a raw settings blob.
 * Migrates legacy `screenShake: false` → 0, `true` / missing → 1.
 */
export function parseShakeStrength(raw: {
  shakeStrength?: unknown;
  screenShake?: unknown;
}): number {
  if (
    typeof raw.shakeStrength === 'number' &&
    Number.isFinite(raw.shakeStrength)
  ) {
    return clamp01(raw.shakeStrength);
  }
  if (raw.screenShake === false) return 0;
  if (raw.screenShake === true) return 1;
  return DEFAULT_SETTINGS.shakeStrength;
}

export class SettingsStore {
  private data: GameSettings = structuredClone(DEFAULT_SETTINGS);

  load(): GameSettings {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return this.data;
      const parsed = JSON.parse(raw) as Partial<GameSettings> & {
        screenShake?: boolean;
      };
      this.data = {
        masterVolume: clamp01(
          parsed.masterVolume ?? DEFAULT_SETTINGS.masterVolume,
        ),
        sfxVolume: clamp01(parsed.sfxVolume ?? DEFAULT_SETTINGS.sfxVolume),
        musicVolume: clamp01(
          parsed.musicVolume ?? DEFAULT_SETTINGS.musicVolume,
        ),
        mute: parsed.mute ?? DEFAULT_SETTINGS.mute,
        showDamageNumbers:
          parsed.showDamageNumbers ?? DEFAULT_SETTINGS.showDamageNumbers,
        shakeStrength: parseShakeStrength(parsed),
        reduceFlashing:
          parsed.reduceFlashing ?? DEFAULT_SETTINGS.reduceFlashing,
        autoSellJunk: parsed.autoSellJunk ?? DEFAULT_SETTINGS.autoSellJunk,
        haptics: parsed.haptics ?? DEFAULT_SETTINGS.haptics,
        shiftFxIntensity: clamp01(
          parsed.shiftFxIntensity ?? DEFAULT_SETTINGS.shiftFxIntensity,
        ),
        graphicsQuality: parseGraphicsQuality(parsed.graphicsQuality),
        hotkeys: {
          ...DEFAULT_HOTKEYS,
          ...(parsed.hotkeys ?? {}),
        },
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
