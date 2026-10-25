import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { CharacterCreateScene } from './scenes/CharacterCreateScene';
import { UIScene } from './scenes/UIScene';
import { WorldScene } from './scenes/WorldScene';

const parent = document.getElementById('app');

new Phaser.Game({
  type: Phaser.AUTO,
  parent: parent ?? undefined,
  backgroundColor: '#0a0c10',
  dom: {
    createContainer: true,
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: window.innerWidth,
    height: window.innerHeight,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, CharacterCreateScene, WorldScene, UIScene],
  banner: false,
  render: {
    antialias: true,
    pixelArt: false,
  },
});
