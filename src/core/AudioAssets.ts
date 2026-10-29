import type Phaser from 'phaser';
import { MUSIC_KEYS, SFX_KEYS } from './AudioBus';

/** Register SFX + music with the Phaser loader (BootScene preload). */
export function preloadAudio(scene: Phaser.Scene): void {
  const sfx: [string, string][] = [
    [SFX_KEYS.uiClick, 'assets/audio/sfx/ui-click.wav'],
    [SFX_KEYS.hit, 'assets/audio/sfx/hit.wav'],
    [SFX_KEYS.skill, 'assets/audio/sfx/skill.wav'],
    [SFX_KEYS.levelUp, 'assets/audio/sfx/level-up.wav'],
    [SFX_KEYS.death, 'assets/audio/sfx/death.wav'],
    [SFX_KEYS.loot, 'assets/audio/sfx/loot.wav'],
    [SFX_KEYS.lootMagic, 'assets/audio/sfx/loot-magic.wav'],
    [SFX_KEYS.lootRare, 'assets/audio/sfx/loot-rare.wav'],
    [SFX_KEYS.lootLegendary, 'assets/audio/sfx/loot-legendary.wav'],
    [SFX_KEYS.swing, 'assets/audio/sfx/swing.wav'],
    [SFX_KEYS.open, 'assets/audio/sfx/open.wav'],
  ];
  for (const [key, path] of sfx) {
    scene.load.audio(key, path);
  }
  scene.load.audio(MUSIC_KEYS.hub, 'assets/audio/music/hub.wav');
  scene.load.audio(MUSIC_KEYS.combat, 'assets/audio/music/combat.wav');
}
