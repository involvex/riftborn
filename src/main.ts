import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { CharacterCreateScene } from './scenes/CharacterCreateScene';
import { UIScene } from './scenes/UIScene';
import { WorldScene } from './scenes/WorldScene';
import { gameEvents } from './core/EventBus';
import { currentBackContext } from './core/GameNavState';
import { installHistoryBackGuard } from './core/HistoryBackGuard';

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
    autoRound: true,
  },
  fps: {
    target: 60,
    min: 30,
  },
  scene: [BootScene, CharacterCreateScene, WorldScene, UIScene],
  banner: false,
  render: {
    antialias: false,
    pixelArt: true,
    roundPixels: true,
    powerPreference: 'high-performance',
  },
});

/** Android / browser Back stays in-game until the title screen. */
installHistoryBackGuard({
  getContext: currentBackContext,
  closeOverlay: () => gameEvents.emit('nav:backCloseOverlay'),
  openPause: () => gameEvents.emit('ui:toggleMenu'),
  resume: () => gameEvents.emit('nav:backResume'),
});
