/**
 * Generate short PCM WAV placeholders for jam audio wiring.
 * Replace with ChipTone / sfxr / BeepBox exports when ready.
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

const SR = 22050;

function clampSample(n) {
  return Math.max(-1, Math.min(1, n));
}

function writeWav(path, samples) {
  const dataSize = samples.length * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.floor(clampSample(samples[i]) * 32767);
    buf.writeInt16LE(s, 44 + i * 2);
  }
  writeFileSync(path, buf);
}

function tone(freq, durSec, type = 'square', vol = 0.35) {
  const n = Math.floor(SR * durSec);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = Math.exp(-t * (3.2 / Math.max(0.04, durSec)));
    const phase = 2 * Math.PI * freq * t;
    let v;
    if (type === 'sine') v = Math.sin(phase);
    else if (type === 'triangle') {
      const p = (t * freq) % 1;
      v = 1 - 4 * Math.abs(p - 0.5);
    } else if (type === 'saw') {
      v = 2 * ((t * freq) % 1) - 1;
    } else {
      v = Math.sin(phase) >= 0 ? 1 : -1;
    }
    out[i] = v * vol * env;
  }
  return out;
}

function noise(durSec, vol = 0.25) {
  const n = Math.floor(SR * durSec);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = Math.exp(-t * (4 / Math.max(0.03, durSec)));
    out[i] = (Math.random() * 2 - 1) * vol * env;
  }
  return out;
}

function concat(...parts) {
  let len = 0;
  for (const p of parts) len += p.length;
  const out = new Float32Array(len);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function mix(a, b, gainB = 1) {
  const n = Math.max(a.length, b.length);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = (a[i] ?? 0) + (b[i] ?? 0) * gainB;
  }
  return out;
}

const sfx = {
  'ui-click': tone(520, 0.05, 'triangle', 0.28),
  hit: mix(tone(180, 0.09, 'square', 0.32), noise(0.06, 0.18)),
  skill: concat(tone(320, 0.07, 'saw', 0.28), tone(480, 0.06, 'triangle', 0.3)),
  'level-up': concat(
    tone(440, 0.08, 'sine', 0.3),
    tone(660, 0.1, 'sine', 0.28),
  ),
  death: concat(tone(110, 0.28, 'saw', 0.35), tone(70, 0.35, 'triangle', 0.3)),
  loot: concat(
    tone(360, 0.06, 'sine', 0.28),
    tone(486, 0.09, 'triangle', 0.26),
  ),
  'loot-magic': concat(
    tone(440, 0.06, 'sine', 0.28),
    tone(594, 0.09, 'triangle', 0.26),
  ),
  'loot-rare': concat(
    tone(520, 0.06, 'sine', 0.3),
    tone(702, 0.09, 'triangle', 0.28),
    tone(884, 0.1, 'sine', 0.24),
  ),
  'loot-legendary': concat(
    tone(620, 0.06, 'sine', 0.32),
    tone(837, 0.09, 'triangle', 0.3),
    tone(1054, 0.12, 'sine', 0.26),
  ),
  swing: mix(tone(220, 0.07, 'saw', 0.22), noise(0.05, 0.12)),
  open: tone(300, 0.08, 'triangle', 0.26),
};

for (const [name, samples] of Object.entries(sfx)) {
  const path = join(sfxDir, `${name}.wav`);
  writeWav(path, samples);
  console.log('wrote', path);
}

/** Soft looping drone for hub / combat placeholders. */
function drone(freqs, durSec, vol = 0.12) {
  const n = Math.floor(SR * durSec);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const fade = Math.min(1, t / 0.4) * Math.min(1, (durSec - t) / 0.4);
    let v = 0;
    for (const f of freqs) v += Math.sin(2 * Math.PI * f * t);
    out[i] = (v / freqs.length) * vol * fade;
  }
  return out;
}

writeWav(join(musicDir, 'hub.wav'), drone([110, 165, 220], 8, 0.1));
writeWav(join(musicDir, 'combat.wav'), drone([98, 147, 196, 247], 6, 0.11));
console.log('wrote music placeholders');
