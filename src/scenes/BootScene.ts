import Phaser from 'phaser';
import { saveStore, SLOT_COUNT } from '../core/SaveStore';
import { preloadAudio } from '../core/AudioAssets';
import { preloadItemIcons } from '../render/ItemIcons';
import { ensureGameSprites, preloadGameSprites } from '../render/SpriteAtlas';
import { preloadCombatVfx } from '../render/CombatVfx';
import { applyWorldArtFilters, preloadWorldArt } from '../render/WorldArt';
import { gameState } from '../systems/GameState';
import { uiFont, uiLayoutSpace, uiPx } from '../core/UiScale';
import type { CharacterSave } from '../types/save';
import { audioBus } from '../core/AudioBus';
import { firstEmptySlot, titleActions } from '../core/TitleFlow';
import {
  cycleGraphicsQuality,
  graphicsQualityLabel,
  refreshGraphicsProfile,
} from '../core/GraphicsQuality';
import {
  cycleShiftFxIntensity,
  settingsStore,
  shiftFxIntensityLabel,
} from '../core/SettingsStore';
import { Events, gameEvents } from '../core/EventBus';
import { navEnterTitle, navSetOverlay } from '../core/GameNavState';
import {
  addMenuBackdrop,
  addMenuCrest,
  preloadMenuBackdrop,
} from '../ui/MenuBackdrop';

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
    preloadMenuBackdrop(this);
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
    navEnterTitle();
    this.view = 'title';
    this.root = this.add.container(0, 0);
    this.render();
    this.scale.off('resize', this.onResize, this);
    this.scale.on('resize', this.onResize, this);

    const unsub = gameEvents.on('nav:backCloseOverlay', () => {
      if (this.view === 'title') return;
      this.view = 'title';
      this.render();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => unsub());
  }

  private onResize = (): void => {
    // WebView orientation / graphics resize can leave camera bounds stale.
    this.cameras.main.setSize(this.scale.width, this.scale.height);
    this.cameras.main.setScroll(0, 0);
    this.cameras.main.setZoom(1);
    this.render();
  };

  private clearRoot(): void {
    this.root.removeAll(true);
  }

  private render(): void {
    this.clearRoot();
    navSetOverlay(this.view !== 'title');
    const bg = addMenuBackdrop(this);
    if (bg) this.root.add(bg);
    if (this.view === 'title') this.drawTitle();
    else if (this.view === 'slots') this.drawSlots();
    else this.drawSettings();
  }

  private drawTitle(): void {
    const { width: cssW, height: cssH, scale: s } = uiLayoutSpace(this);
    // Short landscape phones: pull the stack up and tighten gaps so
    // Settings is never clipped by the bottom edge.
    const compact = cssH < 520;
    const cx = uiPx(cssW / 2, s);
    const title = this.add
      .text(cx, uiPx(cssH * (compact ? 0.1 : 0.14), s), 'RIFTBORN', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: uiFont(this, compact ? 32 : 52, 22, 64),
        color: '#e8e4d8',
      })
      .setOrigin(0.5);
    const sub = this.add
      .text(
        cx,
        uiPx(cssH * (compact ? 0.2 : 0.24), s),
        'SHIFT between Asche & Schatten',
        {
          fontFamily: 'Segoe UI, sans-serif',
          fontSize: uiFont(this, 16, 12, 18),
          color: '#8a9aaa',
        },
      )
      .setOrigin(0.5);
    this.root.add([title, sub]);

    const hasSave = saveStore.hasAnySave();
    const actions = titleActions(hasSave);
    const labels: Record<(typeof actions)[number], string> = {
      newGame: 'New Game',
      continue: 'Continue',
      settings: 'Settings',
    };
    const gap = uiPx(compact ? Math.max(32, Math.floor(cssH * 0.09)) : 56, s);
    // Crest sits between subtitle and the button stack.
    const subFrac = compact ? 0.2 : 0.24;
    const btnStartFrac = compact ? 0.5 : 0.52;
    const crestYCss = (cssH * subFrac + cssH * btnStartFrac) / 2;
    // Use most of the subtitle→button gap so the crest reads clearly.
    const crestMaxH = uiPx(
      Math.max(72, cssH * (btnStartFrac - subFrac) * 0.92),
      s,
    );
    const crest = addMenuCrest(this, cx, uiPx(crestYCss, s), crestMaxH);
    if (crest) this.root.add(crest);

    let y = uiPx(cssH * btnStartFrac, s);
    for (const action of actions) {
      const btn = this.makeButton(cx, y, labels[action], () => {
        if (action === 'newGame') this.onNewGame();
        else if (action === 'continue') this.onContinue();
        else {
          this.view = 'settings';
          this.render();
        }
      });
      this.root.add(btn);
      y += gap;
    }

    if (!compact) {
      const hint = this.add
        .text(
          cx,
          uiPx(cssH * 0.9, s),
          'WASD · LMB · Q shift · 1/2/3 · M map · R rift · B town',
          {
            fontFamily: 'Segoe UI, sans-serif',
            fontSize: uiFont(this, 13, 11, 14),
            color: '#5a6a7a',
            align: 'center',
          },
        )
        .setOrigin(0.5);
      this.root.add(hint);
    }
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
    const filled = slots.map((s, i) => (s ? i : -1)).filter((i) => i >= 0);
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
    const { width: cssW, height: cssH, scale: s } = uiLayoutSpace(this);
    const compact = cssH < 520;
    const cx = uiPx(cssW / 2, s);
    const heading = this.add
      .text(cx, uiPx(cssH * (compact ? 0.08 : 0.1), s), 'RIFTBORN', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: uiFont(this, compact ? 28 : 36, 20, 48),
        color: '#e8e4d8',
      })
      .setOrigin(0.5);
    const sub = this.add
      .text(
        cx,
        uiPx(cssH * (compact ? 0.16 : 0.18), s),
        'Choose a character slot',
        {
          fontFamily: 'Segoe UI, sans-serif',
          fontSize: uiFont(this, compact ? 13 : 16, 12, 18),
          color: '#8a9aaa',
        },
      )
      .setOrigin(0.5);
    this.root.add([heading, sub]);

    const slots = saveStore.listSlots();
    // Keep cards inside the CSS width with margins; shrink on short phones.
    const cardWCss = Math.min(compact ? 148 : 170, (cssW - 36) / 3);
    const cardHCss = compact
      ? Math.min(148, cssH * 0.48)
      : Math.min(180, cssH * 0.42);
    const gapCss = cardWCss + Math.max(8, (cssW - 3 * cardWCss) / 4);
    const startXCss = cssW / 2 - gapCss;
    const yCss = compact ? cssH * 0.46 : cssH * 0.48;
    for (let i = 0; i < SLOT_COUNT; i++) {
      this.drawSlot(
        uiPx(startXCss + i * gapCss, s),
        uiPx(yCss, s),
        i,
        slots[i] ?? null,
        uiPx(cardWCss, s),
        uiPx(cardHCss, s),
        s,
      );
    }

    const backYCss = Math.min(
      cssH - 28,
      yCss + cardHCss / 2 + (compact ? 36 : 44),
    );
    const back = this.makeButton(cx, uiPx(backYCss, s), 'Back', () => {
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
    w: number,
    h: number,
    s: number,
  ): void {
    const bg = this.add
      .rectangle(x, y, w, h, 0x121820, 0.95)
      .setStrokeStyle(2, save ? 0xc4a574 : 0x3a4a5a)
      .setInteractive({ useHandCursor: true });

    const title = this.add
      .text(x, y - h / 2 + uiPx(16, s), `Slot ${index + 1}`, {
        fontFamily: 'Georgia, serif',
        fontSize: `${uiPx(13, s)}px`,
        color: '#8a9aaa',
      })
      .setOrigin(0.5);

    this.root.add([bg, title]);

    if (save) {
      const classLabel =
        save.classId.charAt(0).toUpperCase() + save.classId.slice(1);
      const name = this.add
        .text(x, y - uiPx(22, s), save.name, {
          fontFamily: 'Georgia, serif',
          fontSize: `${uiPx(16, s)}px`,
          color: '#e8e4d8',
        })
        .setOrigin(0.5);
      const meta = this.add
        .text(x, y + uiPx(2, s), `${classLabel} · Lv ${save.level}`, {
          fontFamily: 'Segoe UI, sans-serif',
          fontSize: `${uiPx(12, s)}px`,
          color: '#6ec6a0',
        })
        .setOrigin(0.5);
      const play = this.add
        .text(x, y + uiPx(36, s), 'Continue', {
          fontFamily: 'Georgia, serif',
          fontSize: `${uiPx(13, s)}px`,
          color: '#0a0c10',
          backgroundColor: '#c4a574',
          padding: { x: uiPx(10, s), y: uiPx(5, s) },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      play.on('pointerup', () => {
        audioBus.uiClick();
        this.bootSlot(index);
      });
      const del = this.add
        .text(x, y + h / 2 - uiPx(16, s), 'Delete', {
          fontFamily: 'Segoe UI, sans-serif',
          fontSize: `${uiPx(11, s)}px`,
          color: '#c08080',
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
        .text(x, y - uiPx(8, s), 'Empty', {
          fontFamily: 'Segoe UI, sans-serif',
          fontSize: `${uiPx(14, s)}px`,
          color: '#5a6a7a',
        })
        .setOrigin(0.5);
      const create = this.add
        .text(x, y + uiPx(28, s), 'New Character', {
          fontFamily: 'Georgia, serif',
          fontSize: `${uiPx(12, s)}px`,
          color: '#0a0c10',
          backgroundColor: '#6ec6a0',
          padding: { x: uiPx(10, s), y: uiPx(5, s) },
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
    const { width: cssW, height: cssH, scale: s } = uiLayoutSpace(this);
    const compact = cssH < 520;
    const cx = uiPx(cssW / 2, s);
    const heading = this.add
      .text(cx, uiPx(cssH * (compact ? 0.08 : 0.1), s), 'Settings', {
        fontFamily: 'Georgia, serif',
        fontSize: uiFont(this, compact ? 26 : 36, 20, 48),
        color: '#e8e4d8',
      })
      .setOrigin(0.5);
    this.root.add(heading);
    this.settingsBody = this.add.container(0, 0);
    this.root.add(this.settingsBody);
    this.renderTitleSettings();
    const backY = uiPx(Math.min(cssH - 24, cssH * 0.92), s);
    const back = this.makeButton(cx, backY, 'Back', () => {
      this.view = 'title';
      this.render();
    });
    this.root.add(back);
  }

  private renderTitleSettings(): void {
    this.settingsBody.removeAll(true);
    const { width: cssW, height: cssH, scale: s } = uiLayoutSpace(this);
    const compact = cssH < 520;
    const store = settingsStore.get();
    const rows: { label: string; onClick: () => void }[] = [
      {
        label: `Master vol: ${Math.round(store.masterVolume * 100)}%`,
        onClick: () => {
          const next = (store.masterVolume + 0.1) % 1.1;
          settingsStore.save({
            masterVolume: Math.min(1, Number(next.toFixed(1))),
          });
          gameEvents.emit(Events.SETTINGS_CHANGED);
          this.renderTitleSettings();
        },
      },
      {
        label: `SFX vol: ${Math.round(store.sfxVolume * 100)}%`,
        onClick: () => {
          const next = (store.sfxVolume + 0.1) % 1.1;
          settingsStore.save({
            sfxVolume: Math.min(1, Number(next.toFixed(1))),
          });
          gameEvents.emit(Events.SETTINGS_CHANGED);
          this.renderTitleSettings();
        },
      },
      {
        label: `Music vol: ${Math.round(store.musicVolume * 100)}%`,
        onClick: () => {
          const next = (store.musicVolume + 0.1) % 1.1;
          settingsStore.save({
            musicVolume: Math.min(1, Number(next.toFixed(1))),
          });
          gameEvents.emit(Events.SETTINGS_CHANGED);
          this.renderTitleSettings();
        },
      },
      {
        label: `Screen shake: ${store.screenShake ? 'ON' : 'OFF'}`,
        onClick: () => {
          settingsStore.save({ screenShake: !store.screenShake });
          gameEvents.emit(Events.SETTINGS_CHANGED);
          this.renderTitleSettings();
        },
      },
      {
        label: `Damage numbers: ${store.showDamageNumbers ? 'ON' : 'OFF'}`,
        onClick: () => {
          settingsStore.save({
            showDamageNumbers: !store.showDamageNumbers,
          });
          gameEvents.emit(Events.SETTINGS_CHANGED);
          this.renderTitleSettings();
        },
      },
      {
        label: `Haptics: ${store.haptics ? 'ON' : 'OFF'}`,
        onClick: () => {
          settingsStore.save({ haptics: !store.haptics });
          gameEvents.emit(Events.SETTINGS_CHANGED);
          this.renderTitleSettings();
        },
      },
      {
        label: `Shift FX: ${shiftFxIntensityLabel(store.shiftFxIntensity)}`,
        onClick: () => {
          settingsStore.save({
            shiftFxIntensity: cycleShiftFxIntensity(store.shiftFxIntensity),
          });
          gameEvents.emit(Events.SETTINGS_CHANGED);
          this.renderTitleSettings();
        },
      },
      {
        label: `Graphics: ${graphicsQualityLabel(store.graphicsQuality)}`,
        onClick: () => {
          settingsStore.save({
            graphicsQuality: cycleGraphicsQuality(store.graphicsQuality),
          });
          refreshGraphicsProfile();
          gameEvents.emit(Events.SETTINGS_CHANGED);
          this.renderTitleSettings();
        },
      },
    ];

    const topCss = cssH * (compact ? 0.16 : 0.18);
    const bottomCss = cssH * 0.86;
    const bandCss = Math.max(120, bottomCss - topCss);
    const cols = compact ? 2 : 1;
    const perCol = Math.ceil(rows.length / cols);
    const rowStepCss = Math.min(
      compact ? 36 : 44,
      bandCss / Math.max(1, perCol),
    );
    const colGapCss = compact ? Math.min(220, cssW * 0.42) : 0;
    const originXCss = cssW / 2 - ((cols - 1) * colGapCss) / 2;

    rows.forEach((row, i) => {
      const col = cols === 1 ? 0 : Math.floor(i / perCol);
      const rowIdx = cols === 1 ? i : i % perCol;
      const x = uiPx(originXCss + col * colGapCss, s);
      const y = uiPx(topCss + rowIdx * rowStepCss + rowStepCss * 0.35, s);
      const btn = this.makeButton(x, y, row.label, row.onClick);
      this.settingsBody.add(btn);
    });
  }

  private makeButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
  ): Phaser.GameObjects.Text {
    const { height: cssH, scale: s } = uiLayoutSpace(this);
    const compact = cssH < 520;
    const btn = this.add
      .text(x, y, label, {
        fontFamily: 'Georgia, serif',
        fontSize: uiFont(this, compact ? 14 : 18, 12, 20),
        color: '#0a0c10',
        backgroundColor: '#c4a574',
        padding: {
          x: uiPx(compact ? 12 : 16, s),
          y: uiPx(compact ? 6 : 9, s),
        },
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
        fontFamily: 'Spectral, Georgia, serif',
        fontSize: '15px',
        color: '#e8c070',
        backgroundColor: '#000000aa',
        padding: { x: 12, y: 7 },
        wordWrap: { width: Math.round(width * 0.72) },
        align: 'center',
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

  /**
   * Agent / Playwright hub smoke (`/?smoke=1`) skips the title screen
   * and boots a fresh warrior in the hub. Do not change playwright.config.
   */
  private isSmokeBoot(): boolean {
    try {
      const q = new URLSearchParams(window.location.search);
      return q.has('smoke') || q.get('skipTitle') === '1';
    } catch {
      return false;
    }
  }
}
