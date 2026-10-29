import type Phaser from 'phaser';
import { settingsStore } from './SettingsStore';

/** Keys loaded in BootScene (`public/assets/audio/…`). */
export const SFX_KEYS = {
  uiClick: 'sfx-ui-click',
  hit: 'sfx-hit',
  skill: 'sfx-skill',
  levelUp: 'sfx-level-up',
  death: 'sfx-death',
  loot: 'sfx-loot',
  lootMagic: 'sfx-loot-magic',
  lootRare: 'sfx-loot-rare',
  lootLegendary: 'sfx-loot-legendary',
  swing: 'sfx-swing',
  open: 'sfx-open',
} as const;

export const MUSIC_KEYS = {
  hub: 'music-hub',
  combat: 'music-combat',
} as const;

type MusicTrack = keyof typeof MUSIC_KEYS;

/**
 * SFX + music bus. Prefers Phaser-loaded audio files when a scene is
 * bound; falls back to WebAudio beeps so settings still work without
 * assets.
 */
class AudioBus {
  private ctx: AudioContext | null = null;
  private scene: Phaser.Scene | null = null;
  private music: Phaser.Sound.BaseSound | null = null;
  private musicTrack: MusicTrack | null = null;

  /** Call from BootScene (or any scene with the audio cache). */
  bind(scene: Phaser.Scene): void {
    this.scene = scene;
  }

  private ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  playTone(
    freq: number,
    durationSec: number,
    type: OscillatorType = 'square',
  ): void {
    const gainAmt = settingsStore.sfxGain();
    if (gainAmt <= 0.001) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = 0.0001;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    gain.gain.exponentialRampToValueAtTime(0.15 * gainAmt, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);
    osc.start(now);
    osc.stop(now + durationSec + 0.02);
  }

  private playSfx(key: string, fallback: () => void): void {
    const gainAmt = settingsStore.sfxGain();
    if (gainAmt <= 0.001) return;
    const scene = this.scene;
    if (scene?.cache?.audio?.exists(key)) {
      try {
        scene.sound.play(key, { volume: gainAmt });
        return;
      } catch {
        // fall through to beep
      }
    }
    fallback();
  }

  uiClick(): void {
    this.playSfx(SFX_KEYS.uiClick, () => this.playTone(520, 0.05, 'triangle'));
  }

  hit(): void {
    this.playSfx(SFX_KEYS.hit, () => this.playTone(180, 0.08, 'square'));
  }

  swing(): void {
    this.playSfx(SFX_KEYS.swing, () => this.playTone(220, 0.06, 'sawtooth'));
  }

  open(): void {
    this.playSfx(SFX_KEYS.open, () => this.playTone(300, 0.08, 'triangle'));
  }

  skill(): void {
    this.playSfx(SFX_KEYS.skill, () => {
      this.playTone(320, 0.07, 'sawtooth');
      setTimeout(() => this.playTone(480, 0.06, 'triangle'), 40);
    });
  }

  levelUp(): void {
    this.playSfx(SFX_KEYS.levelUp, () => {
      this.playTone(440, 0.08, 'sine');
      setTimeout(() => this.playTone(660, 0.1, 'sine'), 80);
    });
  }

  death(): void {
    this.playSfx(SFX_KEYS.death, () => {
      this.playTone(110, 0.28, 'sawtooth');
      setTimeout(() => this.playTone(70, 0.35, 'triangle'), 90);
    });
  }

  /** Gear / chest drop sting — pitch rises with rarity weight. */
  loot(rarity: 'common' | 'magic' | 'rare' | 'legendary' = 'common'): void {
    const key =
      rarity === 'legendary'
        ? SFX_KEYS.lootLegendary
        : rarity === 'rare'
          ? SFX_KEYS.lootRare
          : rarity === 'magic'
            ? SFX_KEYS.lootMagic
            : SFX_KEYS.loot;
    this.playSfx(key, () => {
      const base =
        rarity === 'legendary'
          ? 620
          : rarity === 'rare'
            ? 520
            : rarity === 'magic'
              ? 440
              : 360;
      this.playTone(base, 0.06, 'sine');
      setTimeout(() => this.playTone(base * 1.35, 0.09, 'triangle'), 45);
      if (rarity === 'rare' || rarity === 'legendary') {
        setTimeout(() => this.playTone(base * 1.7, 0.1, 'sine'), 100);
      }
    });
  }

  musicGain(): number {
    const s = settingsStore.get();
    if (s.mute) return 0;
    return s.masterVolume * s.musicVolume;
  }

  /** Crossfade / swap hub vs combat loops. */
  playMusic(track: MusicTrack): void {
    const scene = this.scene;
    if (!scene) return;
    const key = MUSIC_KEYS[track];
    if (!scene.cache.audio.exists(key)) return;
    if (this.musicTrack === track && this.music?.isPlaying) {
      this.applyMusicVolume();
      return;
    }
    this.stopMusic();
    const vol = this.musicGain();
    if (vol <= 0.001) {
      this.musicTrack = track;
      return;
    }
    try {
      this.music = scene.sound.add(key, { loop: true, volume: vol });
      this.music.play();
      this.musicTrack = track;
    } catch {
      this.music = null;
      this.musicTrack = null;
    }
  }

  applyMusicVolume(): void {
    if (!this.music) return;
    const vol = this.musicGain();
    if ('setVolume' in this.music) {
      (this.music as Phaser.Sound.WebAudioSound).setVolume(vol);
    }
    if (vol <= 0.001 && this.music.isPlaying) this.music.pause();
    else if (vol > 0.001 && this.music.isPaused) this.music.resume();
  }

  stopMusic(): void {
    if (this.music) {
      this.music.stop();
      this.music.destroy();
      this.music = null;
    }
    this.musicTrack = null;
  }
}

export const audioBus = new AudioBus();
