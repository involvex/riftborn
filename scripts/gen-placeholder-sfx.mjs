/**
 * Procedural jam audio: layered SFX + seamless hub/combat loops.
 * Everything is synthesized here — no external samples, CC0-safe.
 *
 * Usage: bun run scripts/gen-placeholder-sfx.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sfxDir = join(root, 'public/assets/audio/sfx');
const musicDir = join(root, 'public/assets/audio/music');
mkdirSync(sfxDir, { recursive: true });
mkdirSync(musicDir, { recursive: true });

const SFX_SR = 44100;
const MUSIC_SR = 22050;
const TAU = Math.PI * 2;

function clampSample(n) {
  return Math.max(-1, Math.min(1, n));
}

function writeWav(path, samples, sampleRate) {
  const dataSize = samples.length * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i++) {
    buf.writeInt16LE(Math.floor(clampSample(samples[i]) * 32767), 44 + i * 2);
  }
  writeFileSync(path, buf);
}

/** Band-limited-ish waveform lookup (phase in cycles). */
function wave(type, phase, duty = 0.32) {
  const p = phase - Math.floor(phase);
  if (type === 'sine') return Math.sin(TAU * p);
  if (type === 'triangle') return 1 - 4 * Math.abs(p - 0.5);
  if (type === 'saw') return 2 * p - 1;
  if (type === 'square') return p < 0.5 ? 1 : -1;
  if (type === 'pulse') return p < duty ? 1 : -1;
  return Math.sin(TAU * p);
}

/** Attack → decay → sustain → release, all relative to note duration. */
function envAt(
  t,
  dur,
  attack = 0.004,
  decay = 0.08,
  sustain = 0.6,
  release = 0.12,
) {
  if (t < attack) return t / Math.max(1e-4, attack);
  if (t < attack + decay) {
    return 1 - (1 - sustain) * ((t - attack) / Math.max(1e-4, decay));
  }
  const relStart = Math.max(attack + decay, dur - release);
  if (t < relStart) return sustain;
  return sustain * Math.max(0, (dur - t) / Math.max(1e-4, dur - relStart));
}

function tone({
  freq,
  to = freq,
  dur,
  type = 'sine',
  vol = 0.3,
  attack,
  decay,
  sustain,
  release,
  detune = 0,
  sampleRate = SFX_SR,
}) {
  const n = Math.max(1, Math.floor(sampleRate * dur));
  const out = new Float32Array(n);
  let p1 = 0;
  let p2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const k = Math.min(1, t / Math.max(1e-4, dur));
    const f = freq + (to - freq) * k;
    p1 += f / sampleRate;
    p2 += (f * (1 + detune)) / sampleRate;
    const e = envAt(t, dur, attack, decay, sustain, release);
    const v =
      detune !== 0 ? (wave(type, p1) + wave(type, p2)) * 0.5 : wave(type, p1);
    out[i] = v * vol * e;
  }
  return out;
}

/**
 * Filtered noise burst. `hp` subtracts a slow lowpass (cheap highpass);
 * `arc` gives a whoosh shape instead of an exponential hit envelope.
 */
function noiseBurst({
  dur,
  vol = 0.25,
  cutoff = 3500,
  sweepTo = cutoff,
  hp = 0,
  attack = 0.003,
  curve = 6,
  arc = false,
  sampleRate = SFX_SR,
}) {
  const n = Math.max(1, Math.floor(sampleRate * dur));
  const out = new Float32Array(n);
  let lp = 0;
  let hpState = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const k = Math.min(1, t / Math.max(1e-4, dur));
    const fc = Math.max(
      40,
      Math.min(sampleRate * 0.45, cutoff + (sweepTo - cutoff) * k),
    );
    const a = Math.exp((-TAU * fc) / sampleRate);
    const white = Math.random() * 2 - 1;
    lp = a * lp + (1 - a) * white;
    let v = lp;
    if (hp > 0) {
      const ah = Math.exp(
        (-TAU * Math.min(hp, sampleRate * 0.45)) / sampleRate,
      );
      hpState = ah * hpState + (1 - ah) * lp;
      v = lp - hpState;
    }
    const e = arc
      ? Math.sin(Math.PI * k) ** 0.7
      : t < attack
        ? t / Math.max(1e-4, attack)
        : Math.exp((-curve * (t - attack)) / Math.max(0.01, dur - attack));
    out[i] = v * vol * e;
  }
  return out;
}

function mixInto(target, src, atSec, gain = 1, sampleRate = SFX_SR) {
  const off = Math.floor(atSec * sampleRate);
  for (let i = 0; i < src.length; i++) {
    const j = off + i;
    if (j < 0 || j >= target.length) continue;
    target[j] += src[i] * gain;
  }
}

function echo(samples, delaySec, gain, repeats, sampleRate = SFX_SR) {
  const out = new Float32Array(
    samples.length + Math.floor(delaySec * repeats * sampleRate),
  );
  out.set(samples);
  for (let r = 1; r <= repeats; r++) {
    mixInto(out, samples, delaySec * r, gain ** r, sampleRate);
  }
  return out;
}

function normalize(samples, peak) {
  let max = 0;
  for (let i = 0; i < samples.length; i++) {
    const a = Math.abs(samples[i]);
    if (a > max) max = a;
  }
  if (max > 1e-6) {
    const scale = peak / max;
    for (let i = 0; i < samples.length; i++) samples[i] *= scale;
  }
  return samples;
}

function fadeOut(samples, sec, sampleRate) {
  const n = Math.min(samples.length, Math.floor(sec * sampleRate));
  for (let i = 0; i < n; i++) {
    samples[samples.length - 1 - i] *= i / n;
  }
  return samples;
}

function noteFreq(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

/** Crossfade the render tail into the head so the loop has no click. */
function makeLoop(samples, loopSec, sampleRate, fadeSec) {
  const n = Math.floor(loopSec * sampleRate);
  const f = Math.floor(fadeSec * sampleRate);
  const out = new Float32Array(n);
  out.set(samples.subarray(0, n));
  for (let i = 0; i < f; i++) {
    const k = i / f;
    out[i] = samples[i] * k + samples[n + i] * (1 - k);
  }
  return out;
}

function bell(freq, dur, vol, sampleRate = SFX_SR) {
  const n = Math.max(1, Math.floor(sampleRate * dur));
  const out = new Float32Array(n);
  mixInto(
    out,
    tone({
      freq,
      dur,
      type: 'sine',
      vol,
      attack: 0.002,
      decay: dur * 0.5,
      sustain: 0.15,
      release: dur * 0.4,
      sampleRate,
    }),
    0,
    1,
    sampleRate,
  );
  mixInto(
    out,
    tone({
      freq: freq * 2.01,
      dur: dur * 0.7,
      type: 'sine',
      vol: vol * 0.35,
      attack: 0.002,
      decay: dur * 0.4,
      sustain: 0.1,
      release: dur * 0.3,
      sampleRate,
    }),
    0,
    1,
    sampleRate,
  );
  return out;
}

// ---------------------------------------------------------------------------
// SFX
// ---------------------------------------------------------------------------

const sfx = {};

sfx['ui-click'] = (() => {
  const out = new Float32Array(Math.floor(0.07 * SFX_SR));
  mixInto(
    out,
    tone({
      freq: 1180,
      to: 900,
      dur: 0.05,
      type: 'sine',
      vol: 0.5,
      attack: 0.002,
      decay: 0.015,
      sustain: 0.2,
      release: 0.03,
    }),
    0,
  );
  mixInto(out, noiseBurst({ dur: 0.02, vol: 0.1, cutoff: 7000, hp: 2500 }), 0);
  return out;
})();

sfx.hit = (() => {
  const out = new Float32Array(Math.floor(0.22 * SFX_SR));
  mixInto(
    out,
    tone({
      freq: 155,
      to: 62,
      dur: 0.18,
      type: 'sine',
      vol: 0.6,
      attack: 0.001,
      decay: 0.05,
      sustain: 0.22,
      release: 0.12,
    }),
    0,
  );
  mixInto(
    out,
    tone({
      freq: 320,
      to: 140,
      dur: 0.09,
      type: 'triangle',
      vol: 0.2,
      attack: 0.001,
      decay: 0.03,
      sustain: 0.15,
      release: 0.06,
    }),
    0,
  );
  mixInto(
    out,
    noiseBurst({
      dur: 0.14,
      vol: 0.28,
      cutoff: 2400,
      sweepTo: 600,
      hp: 250,
      curve: 9,
    }),
    0.004,
  );
  return out;
})();

sfx.skill = (() => {
  const out = new Float32Array(Math.floor(0.55 * SFX_SR));
  mixInto(
    out,
    tone({
      freq: 220,
      to: 880,
      dur: 0.32,
      type: 'saw',
      vol: 0.24,
      attack: 0.02,
      decay: 0.1,
      sustain: 0.55,
      release: 0.16,
      detune: 0.004,
    }),
    0,
  );
  mixInto(
    out,
    tone({
      freq: 660,
      to: 1760,
      dur: 0.28,
      type: 'sine',
      vol: 0.14,
      attack: 0.01,
      decay: 0.08,
      sustain: 0.35,
      release: 0.14,
    }),
    0.04,
  );
  mixInto(
    out,
    noiseBurst({
      dur: 0.3,
      vol: 0.12,
      cutoff: 1200,
      sweepTo: 5200,
      arc: true,
    }),
    0,
  );
  return echo(out, 0.065, 0.22, 2);
})();

sfx['level-up'] = (() => {
  const notes = [69, 72, 76, 81];
  const out = new Float32Array(Math.floor(1.1 * SFX_SR));
  notes.forEach((m, i) => {
    const at = i * 0.085;
    mixInto(
      out,
      tone({
        freq: noteFreq(m),
        dur: 0.42,
        type: 'sine',
        vol: 0.24,
        attack: 0.004,
        decay: 0.12,
        sustain: 0.3,
        release: 0.22,
        detune: 0.003,
      }),
      at,
    );
    mixInto(
      out,
      tone({
        freq: noteFreq(m + 12),
        dur: 0.3,
        type: 'triangle',
        vol: 0.08,
        attack: 0.004,
        decay: 0.1,
        sustain: 0.2,
        release: 0.16,
      }),
      at,
    );
  });
  return echo(out, 0.11, 0.24, 3);
})();

sfx.death = (() => {
  const out = new Float32Array(Math.floor(1.05 * SFX_SR));
  mixInto(
    out,
    tone({
      freq: 220,
      to: 52,
      dur: 0.9,
      type: 'saw',
      vol: 0.3,
      attack: 0.01,
      decay: 0.2,
      sustain: 0.4,
      release: 0.3,
    }),
    0,
  );
  mixInto(
    out,
    tone({
      freq: 110,
      to: 40,
      dur: 1,
      type: 'sine',
      vol: 0.25,
      attack: 0.02,
      decay: 0.3,
      sustain: 0.35,
      release: 0.35,
    }),
    0,
  );
  mixInto(
    out,
    noiseBurst({
      dur: 0.8,
      vol: 0.16,
      cutoff: 900,
      sweepTo: 180,
      curve: 3,
    }),
    0.02,
  );
  return out;
})();

sfx.loot = (() => {
  const out = new Float32Array(Math.floor(0.4 * SFX_SR));
  mixInto(out, bell(1046, 0.22, 0.28), 0);
  mixInto(out, bell(1568, 0.18, 0.18), 0.06);
  return echo(out, 0.07, 0.2, 2);
})();

sfx['loot-magic'] = (() => {
  const out = new Float32Array(Math.floor(0.55 * SFX_SR));
  [880, 1108, 1318].forEach((f, i) => {
    mixInto(out, bell(f, 0.22, 0.24), i * 0.055);
  });
  return echo(out, 0.08, 0.22, 2);
})();

sfx['loot-rare'] = (() => {
  const out = new Float32Array(Math.floor(0.8 * SFX_SR));
  [784, 988, 1175, 1568].forEach((f, i) => {
    mixInto(out, bell(f, 0.3, 0.22), i * 0.06);
  });
  return echo(out, 0.1, 0.24, 3);
})();

sfx['loot-legendary'] = (() => {
  const out = new Float32Array(Math.floor(1.2 * SFX_SR));
  [659, 784, 988, 1319, 1568].forEach((f, i) => {
    mixInto(out, bell(f, 0.4, 0.22), i * 0.07);
    mixInto(out, bell(f * 2, 0.22, 0.07), i * 0.07 + 0.01);
  });
  return echo(out, 0.13, 0.26, 3);
})();

sfx.swing = (() => {
  const out = new Float32Array(Math.floor(0.26 * SFX_SR));
  mixInto(
    out,
    noiseBurst({
      dur: 0.24,
      vol: 0.34,
      cutoff: 900,
      sweepTo: 6500,
      hp: 350,
      arc: true,
    }),
    0,
  );
  mixInto(
    out,
    tone({
      freq: 210,
      to: 90,
      dur: 0.1,
      type: 'triangle',
      vol: 0.12,
      attack: 0.002,
      decay: 0.04,
      sustain: 0.2,
      release: 0.06,
    }),
    0,
  );
  return out;
})();

sfx.open = (() => {
  const out = new Float32Array(Math.floor(0.4 * SFX_SR));
  mixInto(
    out,
    tone({
      freq: 190,
      to: 118,
      dur: 0.28,
      type: 'triangle',
      vol: 0.32,
      attack: 0.002,
      decay: 0.08,
      sustain: 0.2,
      release: 0.16,
    }),
    0,
  );
  mixInto(
    out,
    tone({
      freq: 340,
      to: 250,
      dur: 0.2,
      type: 'saw',
      vol: 0.06,
      attack: 0.01,
      decay: 0.06,
      sustain: 0.3,
      release: 0.1,
    }),
    0.03,
  );
  mixInto(out, noiseBurst({ dur: 0.06, vol: 0.12, cutoff: 3200, hp: 800 }), 0);
  return out;
})();

for (const [name, samples] of Object.entries(sfx)) {
  // SFX peak stays under music-safe headroom; short fade kills tail clicks.
  normalize(samples, 0.7);
  fadeOut(samples, 0.008, SFX_SR);
  const path = join(sfxDir, `${name}.wav`);
  writeWav(path, samples, SFX_SR);
  console.log('wrote', path);
}

// ---------------------------------------------------------------------------
// Music (seamless loops)
// ---------------------------------------------------------------------------

/** Calm hub theme: Am – F – C – G pad, sub bass, sparse arpeggio. */
function renderHub() {
  const loopSec = 12;
  const barSec = 3;
  const fadeSec = 1.1;
  const sr = MUSIC_SR;
  const out = new Float32Array(Math.floor((loopSec + fadeSec) * sr));
  const bars = [
    { start: 0, root: 45, triad: [57, 60, 64] }, // Am
    { start: 3, root: 41, triad: [53, 57, 60] }, // F
    { start: 6, root: 48, triad: [60, 64, 67] }, // C
    { start: 9, root: 43, triad: [55, 59, 62] }, // G
  ];
  for (const bar of bars) {
    for (const m of bar.triad) {
      mixInto(
        out,
        tone({
          freq: noteFreq(m),
          dur: barSec,
          type: 'sine',
          vol: 0.1,
          attack: 0.7,
          decay: 0.8,
          sustain: 0.72,
          release: 1.2,
          detune: 0.0015,
          sampleRate: sr,
        }),
        bar.start,
        1,
        sr,
      );
    }
    mixInto(
      out,
      tone({
        freq: noteFreq(bar.root - 12),
        dur: barSec,
        type: 'triangle',
        vol: 0.2,
        attack: 0.12,
        decay: 1,
        sustain: 0.5,
        release: 1,
        sampleRate: sr,
      }),
      bar.start,
      1,
      sr,
    );
    const pattern = [0, 1, 2, 1];
    pattern.forEach((step, i) => {
      const m = bar.triad[step] + 12;
      mixInto(
        out,
        tone({
          freq: noteFreq(m),
          dur: 0.7,
          type: 'triangle',
          vol: 0.06,
          attack: 0.012,
          decay: 0.24,
          sustain: 0.18,
          release: 0.35,
          sampleRate: sr,
        }),
        bar.start + i * 0.75,
        1,
        sr,
      );
    });
  }
  normalize(out, 0.42);
  return makeLoop(out, loopSec, sr, fadeSec);
}

/** Combat theme: Dm – Bb – Gm – A with pulsed bass, kick, snare and hats. */
function renderCombat() {
  const loopSec = 12;
  const barSec = 3;
  const fadeSec = 0.9;
  const sr = MUSIC_SR;
  const out = new Float32Array(Math.floor((loopSec + fadeSec) * sr));
  const bars = [
    { start: 0, root: 38, triad: [50, 53, 57] }, // Dm
    { start: 3, root: 34, triad: [46, 50, 53] }, // Bb
    { start: 6, root: 31, triad: [43, 46, 50] }, // Gm
    { start: 9, root: 33, triad: [45, 49, 52] }, // A
  ];
  for (const bar of bars) {
    for (const m of bar.triad) {
      mixInto(
        out,
        tone({
          freq: noteFreq(m),
          dur: barSec,
          type: 'saw',
          vol: 0.035,
          attack: 0.2,
          decay: 0.6,
          sustain: 0.45,
          release: 0.6,
          detune: 0.003,
          sampleRate: sr,
        }),
        bar.start,
        1,
        sr,
      );
    }
    // Eighth-note bass pulse with accents.
    for (let i = 0; i < 12; i++) {
      const at = bar.start + i * 0.25;
      const accent = i % 4 === 0 ? 1 : i % 2 === 0 ? 0.7 : 0.5;
      mixInto(
        out,
        tone({
          freq: noteFreq(bar.root),
          dur: 0.24,
          type: 'saw',
          vol: 0.14 * accent,
          attack: 0.004,
          decay: 0.08,
          sustain: 0.3,
          release: 0.12,
          sampleRate: sr,
        }),
        at,
        1,
        sr,
      );
      mixInto(
        out,
        tone({
          freq: noteFreq(bar.root - 12),
          dur: 0.26,
          type: 'sine',
          vol: 0.2 * accent,
          attack: 0.004,
          decay: 0.1,
          sustain: 0.35,
          release: 0.12,
          sampleRate: sr,
        }),
        at,
        1,
        sr,
      );
    }
    // Kick on every beat, snare on 2 and 4, hats on off-beats.
    for (let beat = 0; beat < 6; beat++) {
      const at = bar.start + beat * 0.5;
      mixInto(
        out,
        tone({
          freq: 110,
          to: 45,
          dur: 0.2,
          type: 'sine',
          vol: beat % 2 === 0 ? 0.6 : 0.4,
          attack: 0.001,
          decay: 0.05,
          sustain: 0.2,
          release: 0.12,
          sampleRate: sr,
        }),
        at,
        1,
        sr,
      );
      if (beat % 2 === 1) {
        mixInto(
          out,
          noiseBurst({
            dur: 0.14,
            vol: 0.24,
            cutoff: 2600,
            hp: 600,
            curve: 8,
            sampleRate: sr,
          }),
          at,
          1,
          sr,
        );
      }
      mixInto(
        out,
        noiseBurst({
          dur: 0.04,
          vol: 0.1,
          cutoff: 9000,
          hp: 5000,
          curve: 14,
          sampleRate: sr,
        }),
        at + 0.25,
        1,
        sr,
      );
    }
    // Sparse lead stabs at bar midpoint.
    mixInto(
      out,
      tone({
        freq: noteFreq(bar.triad[0] + 24),
        dur: 0.4,
        type: 'pulse',
        vol: 0.07,
        attack: 0.01,
        decay: 0.12,
        sustain: 0.25,
        release: 0.2,
        sampleRate: sr,
      }),
      bar.start + 1.5,
      1,
      sr,
    );
  }
  normalize(out, 0.48);
  return makeLoop(out, loopSec, sr, fadeSec);
}

writeWav(join(musicDir, 'hub.wav'), renderHub(), MUSIC_SR);
writeWav(join(musicDir, 'combat.wav'), renderCombat(), MUSIC_SR);
console.log('wrote music loops');
