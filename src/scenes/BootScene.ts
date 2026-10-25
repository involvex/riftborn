import Phaser from 'phaser';
import { saveStore } from '../core/SaveStore';
import { ensureGameSprites, preloadGameSprites } from '../render/SpriteAtlas';
import { gameState } from '../systems/GameState';
import { uiFont } from '../core/UiScale';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn('[sprites] missing asset, will use fallback:', file.key);
    });
    preloadGameSprites(this);
  }

  create(): void {
    ensureGameSprites(this);
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#0a0c10');

    this.add
      .text(width / 2, height * 0.26, 'RIFTBORN', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: uiFont(this, 64, 40, 80),
        color: '#e8e4d8',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.36, 'Carve power from the rifts.', {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: uiFont(this, 20, 15, 26),
        color: '#8a9aaa',
      })
      .setOrigin(0.5);

    const hasSave = !!saveStore.load();

    if (hasSave) {
      this.makeButton(width / 2, height * 0.52, 'Continue', () => {
        gameState.tryLoad();
        this.scene.start('WorldScene');
        this.scene.launch('UIScene');
      });
      this.makeButton(width / 2, height * 0.62, 'New Character', () => {
        saveStore.clear();
        this.scene.start('CharacterCreateScene');
      });
    } else {
      this.makeButton(width / 2, height * 0.55, 'Create Character', () => {
        this.scene.start('CharacterCreateScene');
      });
    }

    this.add
      .text(
        width / 2,
        height * 0.88,
        'WASD · LMB attack · E gather · F craft · C character · Space dash · R rift · P co-op',
        {
          fontFamily: 'Segoe UI, sans-serif',
          fontSize: '13px',
          color: '#5a6a7a',
          align: 'center',
        },
      )
      .setOrigin(0.5);
  }

  private makeButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
  ): Phaser.GameObjects.Text {
    const text = this.add
      .text(x, y, label, {
        fontFamily: 'Georgia, serif',
        fontSize: '22px',
        color: '#0a0c10',
        backgroundColor: '#c4a574',
        padding: { x: 22, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    text.on('pointerover', () => text.setStyle({ backgroundColor: '#e0c890' }));
    text.on('pointerout', () => text.setStyle({ backgroundColor: '#c4a574' }));
    text.on('pointerup', onClick);
    return text;
  }
}
