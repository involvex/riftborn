import Phaser from 'phaser';
import { saveStore, SLOT_COUNT } from '../core/SaveStore';
import { preloadItemIcons } from '../render/ItemIcons';
import { ensureGameSprites, preloadGameSprites } from '../render/SpriteAtlas';
import { gameState } from '../systems/GameState';
import { uiFont } from '../core/UiScale';
import type { CharacterSave } from '../types/save';
import { audioBus } from '../core/AudioBus';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn('[sprites] missing asset, will use fallback:', file.key);
    });
    preloadGameSprites(this);
    preloadItemIcons(this);
  }

  create(): void {
    ensureGameSprites(this);

    if (this.isSmokeBoot()) {
      saveStore.clearAll();
      saveStore.setActiveSlot(0);
      gameState.createNew('Smoke', 'warrior', 'male');
      this.scene.start('WorldScene');
      this.scene.launch('UIScene');
      return;
    }

    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#0a0c10');

    this.add
      .text(width / 2, height * 0.12, 'RIFTBORN', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: uiFont(this, 56, 36, 72),
        color: '#e8e4d8',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.2, 'Choose a character slot', {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: uiFont(this, 18, 14, 22),
        color: '#8a9aaa',
      })
      .setOrigin(0.5);

    const slots = saveStore.listSlots();
    const gap = Math.min(220, width * 0.28);
    const startX = width / 2 - gap;
    const y = height * 0.48;

    for (let i = 0; i < SLOT_COUNT; i++) {
      this.drawSlot(startX + i * gap, y, i, slots[i] ?? null);
    }

    this.add
      .text(
        width / 2,
        height * 0.9,
        'WASD · LMB · 1/2/3 skills · R rift · B town · K tree · C attrs · I inv',
        {
          fontFamily: 'Segoe UI, sans-serif',
          fontSize: '13px',
          color: '#5a6a7a',
          align: 'center',
        },
      )
      .setOrigin(0.5);
  }

  private drawSlot(
    x: number,
    y: number,
    index: number,
    save: CharacterSave | null,
  ): void {
    const w = 190;
    const h = 200;
    const bg = this.add
      .rectangle(x, y, w, h, 0x121820, 0.95)
      .setStrokeStyle(2, save ? 0xc4a574 : 0x3a4a5a)
      .setInteractive({ useHandCursor: true });

    const title = this.add
      .text(x, y - h / 2 + 22, `Slot ${index + 1}`, {
        fontFamily: 'Georgia, serif',
        fontSize: '16px',
        color: '#8a9aaa',
      })
      .setOrigin(0.5);

    if (save) {
      const classLabel =
        save.classId.charAt(0).toUpperCase() + save.classId.slice(1);
      this.add
        .text(x, y - 28, save.name, {
          fontFamily: 'Georgia, serif',
          fontSize: '20px',
          color: '#e8e4d8',
        })
        .setOrigin(0.5);
      this.add
        .text(x, y + 2, `${classLabel} · Lv ${save.level}`, {
          fontFamily: 'Segoe UI, sans-serif',
          fontSize: '14px',
          color: '#6ec6a0',
        })
        .setOrigin(0.5);

      const play = this.add
        .text(x, y + 48, 'Continue', {
          fontFamily: 'Georgia, serif',
          fontSize: '16px',
          color: '#0a0c10',
          backgroundColor: '#c4a574',
          padding: { x: 14, y: 6 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      play.on('pointerup', () => {
        audioBus.uiClick();
        saveStore.setActiveSlot(index);
        gameState.tryLoad();
        this.scene.start('WorldScene');
        this.scene.launch('UIScene');
      });

      const del = this.add
        .text(x, y + h / 2 - 22, 'Delete', {
          fontFamily: 'Segoe UI, sans-serif',
          fontSize: '12px',
          color: '#a06060',
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      del.on('pointerup', () => {
        audioBus.uiClick();
        saveStore.clearSlot(index);
        this.scene.restart();
      });
    } else {
      this.add
        .text(x, y - 10, 'Empty', {
          fontFamily: 'Segoe UI, sans-serif',
          fontSize: '18px',
          color: '#5a6a7a',
        })
        .setOrigin(0.5);
      const create = this.add
        .text(x, y + 40, 'New Character', {
          fontFamily: 'Georgia, serif',
          fontSize: '15px',
          color: '#0a0c10',
          backgroundColor: '#6ec6a0',
          padding: { x: 12, y: 6 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      create.on('pointerup', () => {
        audioBus.uiClick();
        saveStore.setActiveSlot(index);
        this.scene.start('CharacterCreateScene');
      });
      bg.on('pointerup', () => {
        audioBus.uiClick();
        saveStore.setActiveSlot(index);
        this.scene.start('CharacterCreateScene');
      });
    }

    // keep title above bg interactively
    title.setDepth(1);
  }

  private isSmokeBoot(): boolean {
    try {
      return new URLSearchParams(window.location.search).has('smoke');
    } catch {
      return false;
    }
  }
}
