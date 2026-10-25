import { settingsStore } from './SettingsStore';

/**
 * Lightweight WebAudio beeps so settings have something real to control
 * before real assets exist.
 */
class AudioBus {
  private ctx: AudioContext | null = null;

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

  uiClick(): void {
    this.playTone(520, 0.05, 'triangle');
  }

  hit(): void {
    this.playTone(180, 0.08, 'square');
  }

  levelUp(): void {
    this.playTone(440, 0.08, 'sine');
    setTimeout(() => this.playTone(660, 0.1, 'sine'), 80);
  }

  death(): void {
    this.playTone(110, 0.25, 'sawtooth');
  }
}

export const audioBus = new AudioBus();
