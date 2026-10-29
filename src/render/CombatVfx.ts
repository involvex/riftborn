import Phaser from 'phaser';
import { worldToScreen } from '../core/IsoMath';

export type CombatBurstKind = 'slash' | 'hit' | 'crit' | 'burn';

const KEYS: Record<CombatBurstKind, string> = {
  slash: 'fx_fireflash',
  hit: 'fx_bloodsplat',
  crit: 'fx_shrapflash',
  burn: 'fx_fireburst',
};

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
  const texKey = KEYS[kind];
  if (!scene.textures.exists(texKey)) return;
  const { screenX, screenY } = worldToScreen(worldX, worldY);
  const img = scene.add
    .image(screenX + facing * 10, screenY - 14, texKey)
    .setDepth(9_600)
    .setScale(0.55)
    .setAlpha(0.95)
    .setBlendMode(Phaser.BlendModes.ADD);
  if (facing < 0) img.setFlipX(true);
  scene.tweens.add({
    targets: img,
    alpha: 0,
    scale: kind === 'crit' ? 1.15 : 0.95,
    y: img.y - 16,
    duration: kind === 'slash' ? 180 : 260,
    ease: 'Cubic.Out',
    onComplete: () => img.destroy(),
  });
}
