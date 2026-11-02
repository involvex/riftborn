import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { CharacterCreateScene } from './scenes/CharacterCreateScene';
import { UIScene } from './scenes/UIScene';
import { WorldScene } from './scenes/WorldScene';
import { gameEvents } from './core/EventBus';
import { currentBackContext } from './core/GameNavState';
import { installHistoryBackGuard } from './core/HistoryBackGuard';
import {
  applyGraphicsProfile,
  currentGraphicsProfile,
} from './core/GraphicsQuality';

const parent = document.getElementById('app');
const bootProfile = currentGraphicsProfile();
const bootW = Math.max(
  320,
  Math.floor(window.innerWidth * bootProfile.renderScale),
);
const bootH = Math.max(
  180,
  Math.floor(window.innerHeight * bootProfile.renderScale),
);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: parent ?? undefined,
  backgroundColor: '#0a0c10',
  dom: {
    createContainer: true,
  },
  scale: {
    // NONE — GraphicsQuality owns buffer size + CSS stretch on mobile.
    mode: Phaser.Scale.NONE,
    width: bootW,
    height: bootH,
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

applyGraphicsProfile(game);

/** Android / browser Back stays in-game until the title screen. */
installHistoryBackGuard({
  getContext: currentBackContext,
  closeOverlay: () => gameEvents.emit('nav:backCloseOverlay'),
  openPause: () => gameEvents.emit('ui:toggleMenu'),
  resume: () => gameEvents.emit('nav:backResume'),
});
