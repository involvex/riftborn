import Phaser from 'phaser';
import { saveStore, SLOT_COUNT } from '../core/SaveStore';
import { preloadAudio } from '../core/AudioAssets';
import { preloadItemIcons } from '../render/ItemIcons';
import { ensureGameSprites, preloadGameSprites } from '../render/SpriteAtlas';
import { preloadCombatVfx } from '../render/CombatVfx';
import { applyWorldArtFilters, preloadWorldArt } from '../render/WorldArt';
import { gameState } from '../systems/GameState';
import { uiFont } from '../core/UiScale';
import type { CharacterSave } from '../types/save';
import { audioBus } from '../core/AudioBus';
import { firstEmptySlot, titleActions } from '../core/TitleFlow';
import { settingsStore } from '../core/SettingsStore';
import { Events, gameEvents } from '../core/EventBus';

type BootView = 'title' | 'slots' | 'settings';

export class BootScene extends Phaser.Scene {
  private view: BootView = 'title';
  private root!: Phaser.GameObjects.Container;
  private settingsBody!: Phaser.GameObjects.Container;

  constructor() {
    super('BootScene');
  }

  preload(): void {
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn('[assets] missing, will use fallback:', file.key);
    });
    preloadGameSprites(this);
    preloadCombatVfx(this);
    preloadItemIcons(this);
    preloadWorldArt(this);
    preloadAudio(this);
  }

  create(): void {
    ensureGameSprites(this);
    applyWorldArtFilters(this);
    audioBus.bind(this);
    audioBus.playMusic('hub');

    if (this.isSmokeBoot()) {
      saveStore.clearAll();
      saveStore.setActiveSlot(0);
      gameState.createNew('Smoke', 'warrior', 'male');
      this.scene.start('WorldScene');
      this.scene.launch('UIScene');
      return;
    }

    this.cameras.main.setBackgroundColor('#0a0c10');
    this.view = 'title';
    this.root = this.add.container(0, 0);
    this.render();
    this.scale.off('resize', this.onResize, this);
    this.scale.on('resize', this.onResize, this);
  }

  private onResize = (): void => {
    this.render();
  };

  private clearRoot(): void {
    this.root.removeAll(true);
  }

  private render(): void {
    this.clearRoot();
    if (this.view === 'title') this.drawTitle();
    else if (this.view === 'slots') this.drawSlots();
    else this.drawSettings();
  }

  private drawTitle(): void {
    const { width, height } = this.scale;
    const title = this.add
      .text(width / 2, height * 0.22, 'RIFTBORN', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: uiFont(this, 56, 36, 72),
        color: '#e8e4d8',
      })
      .setOrigin(0.5);
    const sub = this.add
      .text(width / 2, height * 0.32, 'Hub · wilderness · rifts', {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: uiFont(this, 18, 14, 22),
        color: '#8a9aaa',
      })
      .setOrigin(0.5);
    this.root.add([title, sub]);

    const hasSave = saveStore.hasAnySave();
    const actions = titleActions(hasSave);
    const labels: Record<(typeof actions)[number], string> = {
      newGame: 'New Game',
      continue: 'Continue',
      settings: 'Settings',
    };
    let y = height * 0.48;
    for (const action of actions) {
      const btn = this.makeButton(width / 2, y, labels[action], () => {
        if (action === 'newGame') this.onNewGame();
        else if (action === 'continue') this.onContinue();
        else {
          this.view = 'settings';
          this.render();
        }
      });
      this.root.add(btn);
      y += 56;
    }

    const hint = this.add
      .text(
        width / 2,
        height * 0.9,
        'WASD · LMB · 1/2/3 · M map · R rift · B town',
        {
          fontFamily: 'Segoe UI, sans-serif',
          fontSize: '13px',
          color: '#5a6a7a',
          align: 'center',
        },
      )
      .setOrigin(0.5);
    this.root.add(hint);
  }

  private onNewGame(): void {
    const empty = firstEmptySlot(saveStore.listSlots());
    if (empty === null) {
      this.view = 'slots';
      this.render();
      this.toastHint('All slots full — delete one, then New Game');
      return;
    }
    saveStore.setActiveSlot(empty);
    this.scene.start('CharacterCreateScene');
  }

  private onContinue(): void {
    const slots = saveStore.listSlots();
    const filled = slots
      .map((s, i) => (s ? i : -1))
      .filter((i) => i >= 0);
    if (filled.length === 0) return;
    if (filled.length === 1) {
      this.bootSlot(filled[0]!);
      return;
    }
    this.view = 'slots';
    this.render();
  }

  private bootSlot(index: number): void {
    saveStore.setActiveSlot(index);
    gameState.tryLoad();
    this.scene.start('WorldScene');
    this.scene.launch('UIScene');
  }

  private drawSlots(): void {
    const { width, height } = this.scale;
    const heading = this.add
      .text(width / 2, height * 0.12, 'RIFTBORN', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: uiFont(this, 42, 28, 56),
        color: '#e8e4d8',
      })
      .setOrigin(0.5);
    const sub = this.add
      .text(width / 2, height * 0.2, 'Choose a character slot', {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: uiFont(this, 18, 14, 22),
        color: '#8a9aaa',
      })
      .setOrigin(0.5);
    this.root.add([heading, sub]);

    const slots = saveStore.listSlots();
    const gap = Math.min(220, width * 0.28);
    const startX = width / 2 - gap;
    const y = height * 0.48;
    for (let i = 0; i < SLOT_COUNT; i++) {
      this.drawSlot(startX + i * gap, y, i, slots[i] ?? null);
    }

    const back = this.makeButton(width / 2, height * 0.86, 'Back', () => {
      this.view = 'title';
      this.render();
    });
    this.root.add(back);
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

    this.root.add([bg, title]);

    if (save) {
      const classLabel =
        save.classId.charAt(0).toUpperCase() + save.classId.slice(1);
      const name = this.add
        .text(x, y - 28, save.name, {
          fontFamily: 'Georgia, serif',
          fontSize: '20px',
          color: '#e8e4d8',
        })
        .setOrigin(0.5);
      const meta = this.add
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
        this.bootSlot(index);
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
        this.render();
      });
      this.root.add([name, meta, play, del]);
    } else {
      const empty = this.add
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
      const goCreate = () => {
        audioBus.uiClick();
        saveStore.setActiveSlot(index);
        this.scene.start('CharacterCreateScene');
      };
      create.on('pointerup', goCreate);
      bg.on('pointerup', goCreate);
      this.root.add([empty, create]);
    }
  }

  private drawSettings(): void {
    const { width, height } = this.scale;
    const heading = this.add
      .text(width / 2, height * 0.12, 'Settings', {
        fontFamily: 'Georgia, serif',
        fontSize: uiFont(this, 36, 24, 48),
        color: '#e8e4d8',
      })
      .setOrigin(0.5);
    this.root.add(heading);
    this.settingsBody = this.add.container(width / 2, height * 0.42);
    this.root.add(this.settingsBody);
    this.renderTitleSettings();
    const back = this.makeButton(width / 2, height * 0.88, 'Back', () => {
      this.view = 'title';
      this.render();
    });
    this.root.add(back);
  }

  private renderTitleSettings(): void {
    this.settingsBody.removeAll(true);
    const s = settingsStore.get();
    const rows: { label: string; onClick: () => void }[] = [
      {
        label: `Master vol: ${Math.round(s.masterVolume * 100)}%`,
        onClick: () => {
          const next = (s.masterVolume + 0.1) % 1.1;
          settingsStore.save({
            masterVolume: Math.min(1, Number(next.toFixed(1))),
          });
          gameEvents.emit(Events.SETTINGS_CHANGED);
          this.renderTitleSettings();
        },
      },
      {
        label: `SFX vol: ${Math.round(s.sfxVolume * 100)}%`,
        onClick: () => {
          const next = (s.sfxVolume + 0.1) % 1.1;
          settingsStore.save({
            sfxVolume: Math.min(1, Number(next.toFixed(1))),
          });
          gameEvents.emit(Events.SETTINGS_CHANGED);
          this.renderTitleSettings();
        },
      },
      {
        label: `Music vol: ${Math.round(s.musicVolume * 100)}%`,
        onClick: () => {
          const next = (s.musicVolume + 0.1) % 1.1;
          settingsStore.save({
            musicVolume: Math.min(1, Number(next.toFixed(1))),
          });
          gameEvents.emit(Events.SETTINGS_CHANGED);
          this.renderTitleSettings();
        },
      },
      {
        label: `Screen shake: ${s.screenShake ? 'ON' : 'OFF'}`,
        onClick: () => {
          settingsStore.save({ screenShake: !s.screenShake });
          gameEvents.emit(Events.SETTINGS_CHANGED);
          this.renderTitleSettings();
        },
      },
      {
        label: `Damage numbers: ${s.showDamageNumbers ? 'ON' : 'OFF'}`,
        onClick: () => {
          settingsStore.save({
            showDamageNumbers: !s.showDamageNumbers,
          });
          gameEvents.emit(Events.SETTINGS_CHANGED);
          this.renderTitleSettings();
        },
      },
    ];
    let y = -120;
    for (const row of rows) {
      const btn = this.makeButton(0, y, row.label, row.onClick);
      this.settingsBody.add(btn);
      y += 48;
    }
  }

  private makeButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
  ): Phaser.GameObjects.Text {
    const btn = this.add
      .text(x, y, label, {
        fontFamily: 'Georgia, serif',
        fontSize: '20px',
        color: '#0a0c10',
        backgroundColor: '#c4a574',
        padding: { x: 18, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setStyle({ backgroundColor: '#e0c890' }));
    btn.on('pointerout', () => btn.setStyle({ backgroundColor: '#c4a574' }));
    btn.on('pointerup', () => {
      audioBus.uiClick();
      onClick();
    });
    return btn;
  }

  private toastHint(text: string): void {
    const { width, height } = this.scale;
    const t = this.add
      .text(width / 2, height * 0.78, text, {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '14px',
        color: '#e8c070',
        backgroundColor: '#000000aa',
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0.5);
    this.root.add(t);
    this.tweens.add({
      targets: t,
      alpha: 0,
      delay: 2200,
      duration: 400,
      onComplete: () => t.destroy(),
    });
  }

  private isSmokeBoot(): boolean {
    try {
      return new URLSearchParams(window.location.search).has('smoke');
    } catch {
      return false;
    }
  }
}
