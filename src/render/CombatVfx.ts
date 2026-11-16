import Phaser from 'phaser';
import { currentGraphicsProfile } from '../core/GraphicsQuality';
import { worldToScreen } from '../core/IsoMath';

export type CombatBurstKind = 'slash' | 'hit' | 'crit' | 'burn';

const KEYS: Record<CombatBurstKind, string> = {
  slash: 'fx_fireflash',
  hit: 'fx_bloodsplat',
  crit: 'fx_shrapflash',
  burn: 'fx_fireburst',
};

let liveBursts = 0;

/** Preload converted hackcraft particle PNGs. */
export function preloadCombatVfx(scene: Phaser.Scene): void {
  const files: [string, string][] = [
    ['fx_fireflash', 'fireflash.png'],
    ['fx_fireburst', 'fireburst.png'],
    ['fx_fireball', 'fireball.png'],
    ['fx_bloodsplat', 'bloodsplat.png'],
    ['fx_plasmablast', 'plasmablast.png'],
    ['fx_plasmashot', 'plasmashot.png'],
    ['fx_shrapflash', 'shrapflash.png'],
    ['fx_thunderflash', 'thunderflash.png'],
  ];
  for (const [key, file] of files) {
    scene.load.image(key, `assets/vfx/particles/${file}`);
  }
}

/**
 * One-shot particle burst at world coords (iso → screen).
 * Falls back silently if the texture failed to load.
 */
export function playCombatBurst(
  scene: Phaser.Scene,
  worldX: number,
  worldY: number,
  kind: CombatBurstKind = 'hit',
  facing: 1 | -1 = 1,
): void {
  const profile = currentGraphicsProfile();
  const low = profile.tier === 'low';
  // Low: skip burn overdraw; keep a tiny hit so packs still read.
  if (low && kind === 'burn') return;
  if (liveBursts >= profile.particleCap) return;

  const texKey = KEYS[kind];
  if (!scene.textures.exists(texKey)) return;
  const { screenX, screenY } = worldToScreen(worldX, worldY);
  const startScale =
    low && kind === 'hit' ? 0.32 : low ? 0.42 : kind === 'crit' ? 0.68 : 0.58;
  const img = scene.add
    .image(screenX + facing * 10, screenY - 14, texKey)
    .setDepth(9_600)
    .setScale(startScale)
    .setAlpha(low && kind === 'hit' ? 0.8 : 0.95)
    .setBlendMode(Phaser.BlendModes.ADD);
  if (facing < 0) img.setFlipX(true);
  liveBursts += 1;
  // Routine hits clear fast so pack cleaves don't saturate particleCap.
  const duration =
    kind === 'slash'
      ? 190
      : kind === 'crit'
        ? 260
        : kind === 'hit'
          ? low
            ? 120
            : 180
          : 180;
  const endScale = kind === 'crit' ? 1.28 : kind === 'hit' ? 0.95 : 1.05;
  scene.tweens.add({
    targets: img,
    alpha: 0,
    scale: endScale,
    y: img.y - (kind === 'hit' ? 12 : 16),
    duration,
    ease: 'Cubic.Out',
    onComplete: () => {
      liveBursts = Math.max(0, liveBursts - 1);
      img.destroy();
    },
  });
}
