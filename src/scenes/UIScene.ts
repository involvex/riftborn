import Phaser from 'phaser';
import { Events, gameEvents } from '../core/EventBus';
import { audioBus } from '../core/AudioBus';
import {
  formatHotkey,
  HOTKEY_LABELS,
  keyCodeFromSetting,
} from '../core/Hotkeys';
import {
  settingsStore,
  type HotkeyAction,
  DEFAULT_HOTKEYS,
} from '../core/SettingsStore';
import { listRecipes } from '../systems/CraftingSystem';
import { describeGear } from '../systems/ItemGen';
import { getItemDef } from '../systems/InventorySystem';
import { MAX_LEVEL, xpForLevel } from '../systems/ProgressionSystem';
import { resolveSetBonuses } from '../systems/SetBonus';
import { gameState } from '../systems/GameState';
import { InventoryPanel } from '../ui/InventoryPanel';
import { uiFont } from '../core/UiScale';

type MenuPage = 'root' | 'settings' | 'hotkeys';

export class UIScene extends Phaser.Scene {
  private hpText!: Phaser.GameObjects.Text;
  private xpText!: Phaser.GameObjects.Text;
  private hudHint!: Phaser.GameObjects.Text;
  private toastText!: Phaser.GameObjects.Text;
  private craftPanel!: Phaser.GameObjects.Container;
  private charPanel!: Phaser.GameObjects.Container;
  private menuPanel!: Phaser.GameObjects.Container;
  private menuBody!: Phaser.GameObjects.Container;
  private charBody!: Phaser.GameObjects.Text;
  private damageLayer!: Phaser.GameObjects.Container;
  private inventoryPanel!: InventoryPanel;
  private unsubs: (() => void)[] = [];
  private keyChar!: Phaser.Input.Keyboard.Key;
  private keyInv!: Phaser.Input.Keyboard.Key;
  private keyTool!: Phaser.Input.Keyboard.Key;
  private keyMenu!: Phaser.Input.Keyboard.Key;
  private gearKeys: Phaser.Input.Keyboard.Key[] = [];
  private charOpen = false;
  private craftOpen = false;
  private menuOpen = false;
  private menuPage: MenuPage = 'root';
  private awaitingRebind: HotkeyAction | null = null;
  private rebindHint!: Phaser.GameObjects.Text;

  constructor() {
    super('UIScene');
  }

  create(): void {
    this.bindHotkeys();

    this.hpText = this.add
      .text(16, 12, '', {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: uiFont(this, 18, 14, 22),
        color: '#e8e4d8',
      })
      .setScrollFactor(0)
      .setDepth(10_000);

    this.xpText = this.add
      .text(16, 40, '', {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: uiFont(this, 15, 12, 18),
        color: '#8ab4d4',
      })
      .setScrollFactor(0)
      .setDepth(10_000);

    this.hudHint = this.add
      .text(16, 68, '', {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: uiFont(this, 13, 11, 16),
        color: '#6a7a8a',
      })
      .setScrollFactor(0)
      .setDepth(10_000);

    this.toastText = this.add
      .text(this.scale.width / 2, 80, '', {
        fontFamily: 'Georgia, serif',
        fontSize: '18px',
        color: '#f0e6d0',
        backgroundColor: '#00000088',
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10_001)
      .setAlpha(0);

    this.damageLayer = this.add.container(0, 0).setDepth(10_002);
    this.inventoryPanel = new InventoryPanel(this);
    this.buildCraftPanel();
    this.buildCharPanel();
    this.buildMenuPanel();
    this.refresh();

    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (!this.awaitingRebind) return;
      event.preventDefault();
      event.stopPropagation();
      const action = this.awaitingRebind;
      let name = event.key.toUpperCase();
      if (event.code === 'Space') name = 'SPACE';
      if (event.key === 'Escape') name = 'ESC';
      if (event.key === '3') name = 'THREE';
      if (name.length === 1 || ['SPACE', 'ESC', 'THREE'].includes(name)) {
        settingsStore.setHotkey(action, name);
        gameEvents.emit(Events.SETTINGS_CHANGED);
        this.awaitingRebind = null;
        this.rebindHint.setText(
          `Bound ${HOTKEY_LABELS[action]} → ${formatHotkey(action)}`,
        );
        this.renderMenuPage();
        audioBus.uiClick();
      }
    });

    this.unsubs.push(
      gameEvents.on(Events.ITEM_ADDED, () => {
        this.refresh();
        if (this.inventoryPanel.open) this.inventoryPanel.refresh();
      }),
      gameEvents.on(Events.ITEM_REMOVED, () => {
        this.refresh();
        if (this.inventoryPanel.open) this.inventoryPanel.refresh();
      }),
      gameEvents.on(Events.EQUIP_CHANGED, () => {
        gameState.recalcMaxHp();
        this.refresh();
        if (this.inventoryPanel.open) this.inventoryPanel.refresh();
      }),
      gameEvents.on(Events.XP_GAINED, () => this.refresh()),
      gameEvents.on(Events.LEVEL_UP, (p) => {
        const payload = p as { level: number; unspent?: number };
        audioBus.levelUp();
        this.toast(
          payload.unspent
            ? `Level ${payload.level}! +stat points (press ${formatHotkey('character')})`
            : `Level ${payload.level}!`,
        );
        gameState.recalcMaxHp();
        this.refresh();
      }),
      gameEvents.on(Events.PLAYER_DAMAGED, () => this.refresh()),
      gameEvents.on(Events.CRAFT_SUCCESS, () => {
        this.toast('Crafted!');
        this.refresh();
        this.hideCraft();
      }),
      gameEvents.on(Events.DAMAGE_NUMBER, (p) => {
        if (!settingsStore.get().showDamageNumbers) return;
        const d = p as {
          screenX: number;
          screenY: number;
          amount: number;
          kind: string;
        };
        this.spawnDamageNumber(d.screenX, d.screenY, d.amount, d.kind);
      }),
      gameEvents.on('ui:toast', (p) => {
        const d = p as { text: string };
        this.toast(d.text);
      }),
      gameEvents.on('ui:openCraft', () => this.showCraft()),
      gameEvents.on(Events.RIFT_ENTERED, () =>
        this.toast('Procedural rift dungeon opened'),
      ),
      gameEvents.on(Events.RIFT_CLEARED, (p) => {
        const d = p as { cleared: boolean };
        this.toast(d.cleared ? 'Rift rewards claimed' : 'Left the Rift');
        this.refresh();
      }),
      gameEvents.on(Events.PLAYER_DIED, () => {
        this.toast('You fall… waking at camp.');
        this.refresh();
      }),
      gameEvents.on(Events.SETTINGS_CHANGED, () => this.bindHotkeys()),
    );

    this.scale.on('resize', () => {
      this.toastText.setX(this.scale.width / 2);
      this.hpText.setFontSize(uiFont(this, 18, 14, 22));
      this.xpText.setFontSize(uiFont(this, 15, 12, 18));
      this.hudHint.setFontSize(uiFont(this, 13, 11, 16));
      if (this.inventoryPanel.open) this.inventoryPanel.layout();
    });
  }

  private bindHotkeys(): void {
    if (!this.input.keyboard) return;
    this.keyChar = this.input.keyboard.addKey(
      keyCodeFromSetting(settingsStore.get().hotkeys.character),
    );
    this.keyInv = this.input.keyboard.addKey(
      keyCodeFromSetting(settingsStore.get().hotkeys.inventory),
    );
    this.keyTool = this.input.keyboard.addKey(
      keyCodeFromSetting(settingsStore.get().hotkeys.equipTool),
    );
    this.keyMenu = this.input.keyboard.addKey(
      keyCodeFromSetting(settingsStore.get().hotkeys.menu),
    );
    this.gearKeys = [
      this.input.keyboard.addKey('FOUR'),
      this.input.keyboard.addKey('FIVE'),
      this.input.keyboard.addKey('SIX'),
      this.input.keyboard.addKey('SEVEN'),
      this.input.keyboard.addKey('EIGHT'),
      this.input.keyboard.addKey('NINE'),
    ];
  }

  private buildCraftPanel(): void {
    const bg = this.add.rectangle(0, 0, 320, 260, 0x0e1218, 0.94);
    bg.setStrokeStyle(1, 0xc4a574, 0.7);
    const title = this.add
      .text(0, -110, 'Crafting Bench', {
        fontFamily: 'Georgia, serif',
        fontSize: '20px',
        color: '#e8e4d8',
      })
      .setOrigin(0.5);

    const rows: Phaser.GameObjects.GameObject[] = [bg, title];
    listRecipes().forEach((recipe, i) => {
      const y = -60 + i * 48;
      const label = `${recipe.name}  (${recipe.ingredients
        .map(
          (ing) => `${ing.qty} ${getItemDef(ing.itemId)?.name ?? ing.itemId}`,
        )
        .join(', ')})`;
      const btn = this.add
        .text(0, y, label, {
          fontFamily: 'Segoe UI, sans-serif',
          fontSize: '13px',
          color: '#0a0c10',
          backgroundColor: '#c4a574',
          padding: { x: 10, y: 6 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      btn.on('pointerup', () => {
        if (!gameState.crafting.craft(recipe.id, gameState.progression.level)) {
          this.toast('Missing materials or inventory full');
        }
        gameState.persist();
        this.refresh();
      });
      rows.push(btn);
    });

    const close = this.add
      .text(0, 110, 'Close (Esc)', {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '14px',
        color: '#8a9aaa',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    close.on('pointerup', () => this.hideCraft());
    rows.push(close);

    this.craftPanel = this.add
      .container(this.scale.width / 2, this.scale.height / 2, rows)
      .setScrollFactor(0)
      .setDepth(10_010)
      .setVisible(false);
  }

  private buildCharPanel(): void {
    const bg = this.add.rectangle(0, 0, 520, 420, 0x0e1218, 0.96);
    bg.setStrokeStyle(1, 0x4db6ff, 0.6);
    const title = this.add
      .text(0, -185, 'Character', {
        fontFamily: 'Georgia, serif',
        fontSize: '22px',
        color: '#e8e4d8',
      })
      .setOrigin(0.5);

    this.charBody = this.add
      .text(-230, -150, '', {
        fontFamily: 'Consolas, monospace',
        fontSize: '13px',
        color: '#c8c0b0',
        lineSpacing: 4,
      })
      .setOrigin(0, 0);

    const statBtns: Phaser.GameObjects.GameObject[] = [];
    const stats = ['strength', 'dexterity', 'stamina', 'intellect'] as const;
    stats.forEach((stat, i) => {
      const btn = this.add
        .text(160, -80 + i * 36, `+ ${stat.slice(0, 3).toUpperCase()}`, {
          fontFamily: 'Segoe UI, sans-serif',
          fontSize: '14px',
          color: '#0a0c10',
          backgroundColor: '#6ec6ff',
          padding: { x: 10, y: 6 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      btn.on('pointerup', () => {
        if (!gameState.spendStat(stat)) {
          this.toast('No unspent points');
        } else {
          audioBus.uiClick();
          this.toast(`+1 ${stat}`);
          this.refreshCharBody();
          this.refresh();
        }
      });
      statBtns.push(btn);
    });

    const close = this.add
      .text(0, 185, 'Close', {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '14px',
        color: '#8a9aaa',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    close.on('pointerup', () => this.hideChar());

    this.charPanel = this.add
      .container(this.scale.width / 2, this.scale.height / 2, [
        bg,
        title,
        this.charBody,
        ...statBtns,
        close,
      ])
      .setScrollFactor(0)
      .setDepth(10_020)
      .setVisible(false);
  }

  private buildMenuPanel(): void {
    const bg = this.add.rectangle(0, 0, 420, 460, 0x0e1218, 0.97);
    bg.setStrokeStyle(1, 0xc4a574, 0.75);
    const title = this.add
      .text(0, -200, 'Paused', {
        fontFamily: 'Georgia, serif',
        fontSize: '26px',
        color: '#e8e4d8',
      })
      .setOrigin(0.5);

    this.menuBody = this.add.container(0, 0);
    this.rebindHint = this.add
      .text(0, 200, '', {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '13px',
        color: '#6ec6ff',
      })
      .setOrigin(0.5);

    this.menuPanel = this.add
      .container(this.scale.width / 2, this.scale.height / 2, [
        bg,
        title,
        this.menuBody,
        this.rebindHint,
      ])
      .setScrollFactor(0)
      .setDepth(10_030)
      .setVisible(false);

    this.renderMenuPage();
  }

  private clearMenuBody(): void {
    this.menuBody.removeAll(true);
  }

  private menuButton(
    y: number,
    label: string,
    onClick: () => void,
  ): Phaser.GameObjects.Text {
    const btn = this.add
      .text(0, y, label, {
        fontFamily: 'Georgia, serif',
        fontSize: '18px',
        color: '#0a0c10',
        backgroundColor: '#c4a574',
        padding: { x: 16, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setStyle({ backgroundColor: '#e0c890' }));
    btn.on('pointerout', () => btn.setStyle({ backgroundColor: '#c4a574' }));
    btn.on('pointerup', () => {
      audioBus.uiClick();
      onClick();
    });
    this.menuBody.add(btn);
    return btn;
  }

  private renderMenuPage(): void {
    this.clearMenuBody();
    this.awaitingRebind = null;
    this.rebindHint.setText('');
    const title = this.menuPanel.list[1] as Phaser.GameObjects.Text;

    if (this.menuPage === 'root') {
      title.setText('Paused');
      this.menuButton(-120, 'Resume', () => this.hideMenu());
      this.menuButton(-60, 'Settings', () => {
        this.menuPage = 'settings';
        this.renderMenuPage();
      });
      this.menuButton(0, 'Save game', () => {
        gameState.persist();
        this.toast('Game saved');
      });
      this.menuButton(60, 'Quit to title', () => {
        gameState.persist();
        this.hideMenu();
        this.scene.stop('WorldScene');
        this.scene.stop('UIScene');
        this.scene.start('BootScene');
      });
      return;
    }

    if (this.menuPage === 'settings') {
      title.setText('Settings');
      const s = settingsStore.get();
      this.menuButton(
        -140,
        `Master vol: ${Math.round(s.masterVolume * 100)}%`,
        () => {
          const next = (s.masterVolume + 0.1) % 1.1;
          settingsStore.save({
            masterVolume: Math.min(1, Number(next.toFixed(1))),
          });
          gameEvents.emit(Events.SETTINGS_CHANGED);
          this.renderMenuPage();
        },
      );
      this.menuButton(-90, `SFX vol: ${Math.round(s.sfxVolume * 100)}%`, () => {
        const next = (s.sfxVolume + 0.1) % 1.1;
        settingsStore.save({ sfxVolume: Math.min(1, Number(next.toFixed(1))) });
        gameEvents.emit(Events.SETTINGS_CHANGED);
        audioBus.uiClick();
        this.renderMenuPage();
      });
      this.menuButton(
        -40,
        `Music vol: ${Math.round(s.musicVolume * 100)}%`,
        () => {
          const next = (s.musicVolume + 0.1) % 1.1;
          settingsStore.save({
            musicVolume: Math.min(1, Number(next.toFixed(1))),
          });
          gameEvents.emit(Events.SETTINGS_CHANGED);
          this.renderMenuPage();
        },
      );
      this.menuButton(10, `Mute: ${s.mute ? 'ON' : 'OFF'}`, () => {
        settingsStore.save({ mute: !s.mute });
        gameEvents.emit(Events.SETTINGS_CHANGED);
        this.renderMenuPage();
      });
      this.menuButton(
        60,
        `Damage numbers: ${s.showDamageNumbers ? 'ON' : 'OFF'}`,
        () => {
          settingsStore.save({ showDamageNumbers: !s.showDamageNumbers });
          gameEvents.emit(Events.SETTINGS_CHANGED);
          this.renderMenuPage();
        },
      );
      this.menuButton(110, 'Hotkeys…', () => {
        this.menuPage = 'hotkeys';
        this.renderMenuPage();
      });
      this.menuButton(160, 'Back', () => {
        this.menuPage = 'root';
        this.renderMenuPage();
      });
      return;
    }

    // hotkeys
    title.setText('Hotkeys');
    const actions = Object.keys(DEFAULT_HOTKEYS) as HotkeyAction[];
    actions.forEach((action, i) => {
      const y = -170 + i * 32;
      const label = `${HOTKEY_LABELS[action]}: [${formatHotkey(action)}]`;
      this.menuButton(y, label, () => {
        this.awaitingRebind = action;
        this.rebindHint.setText(`Press a key for ${HOTKEY_LABELS[action]}…`);
      });
    });
    this.menuButton(140, 'Reset defaults', () => {
      settingsStore.reset();
      gameEvents.emit(Events.SETTINGS_CHANGED);
      this.renderMenuPage();
    });
    this.menuButton(180, 'Back', () => {
      this.menuPage = 'settings';
      this.renderMenuPage();
    });
  }

  private showMenu(): void {
    this.hideCraft();
    this.hideChar();
    this.inventoryPanel.hide();
    this.menuPage = 'root';
    this.renderMenuPage();
    this.menuPanel.setPosition(this.scale.width / 2, this.scale.height / 2);
    this.menuPanel.setVisible(true);
    this.menuOpen = true;
    this.scene.pause('WorldScene');
  }

  private hideMenu(): void {
    this.menuPanel.setVisible(false);
    this.menuOpen = false;
    this.awaitingRebind = null;
    this.rebindHint.setText('');
    this.scene.resume('WorldScene');
  }

  private refreshCharBody(): void {
    const p = gameState.progression;
    const gear = gameState.inventory.totalGearStats();
    const eq = gameState.inventory.equipment;
    const sets = resolveSetBonuses(eq);
    const genderLabel =
      gameState.gender === 'female'
        ? 'Female'
        : gameState.gender === 'nonbinary'
          ? 'Non-binary'
          : 'Male';
    const lines = [
      `${gameState.name}  ·  ${p.classDef().name}  ·  ${genderLabel}`,
      `Level ${p.level}/${MAX_LEVEL}   Unspent: ${p.unspentStatPoints}`,
      '',
      `STR ${p.stats.strength} (+${gear.strength} gear)`,
      `DEX ${p.stats.dexterity} (+${gear.dexterity} gear)`,
      `STA ${p.stats.stamina} (+${gear.stamina} gear)`,
      `INT ${p.stats.intellect} (+${gear.intellect} gear)`,
      '',
      `Armor ${gear.armor}   Weapon DMG ${gameState.inventory.weaponDamage()}`,
      `Attack power ~ ${gameState.combat.playerAttackDamage()}`,
      '',
      'Equipment:',
      `  WPN  ${eq.weapon ? describeGear(eq.weapon) : '—'}`,
      `  HAT  ${eq.hat ? eq.hat.name : '—'}`,
      `  CHT  ${eq.chest ? eq.chest.name : '—'}`,
      `  LEG  ${eq.legs ? eq.legs.name : '—'}`,
      `  FET  ${eq.feet ? eq.feet.name : '—'}`,
      `  TOOL ${eq.tool ? (getItemDef(eq.tool)?.name ?? eq.tool) : '—'}`,
      '',
      'Set bonuses:',
    ];
    if (sets.length === 0) lines.push('  (none)');
    for (const s of sets) {
      lines.push(`  ${s.name} (${s.pieces}/4)`);
      for (const l of s.labels) lines.push(`    ${l}`);
    }
    this.charBody.setText(lines.join('\n'));
  }

  private showCraft(): void {
    if (this.menuOpen) return;
    this.craftPanel.setPosition(this.scale.width / 2, this.scale.height / 2);
    this.craftPanel.setVisible(true);
    this.craftOpen = true;
  }

  private hideCraft(): void {
    this.craftPanel.setVisible(false);
    this.craftOpen = false;
  }

  private showChar(): void {
    if (this.menuOpen) return;
    this.charPanel.setPosition(this.scale.width / 2, this.scale.height / 2);
    this.refreshCharBody();
    this.charPanel.setVisible(true);
    this.charOpen = true;
  }

  private hideChar(): void {
    this.charPanel.setVisible(false);
    this.charOpen = false;
  }

  private refresh(): void {
    const need = xpForLevel(gameState.progression.level);
    const cls = gameState.progression.classDef().name;
    const armorOn = [
      gameState.inventory.equipment.hat,
      gameState.inventory.equipment.chest,
      gameState.inventory.equipment.legs,
      gameState.inventory.equipment.feet,
    ].filter(Boolean).length;
    this.hpText.setText(
      `HP ${Math.ceil(gameState.hp)}/${gameState.maxHp}   ${gameState.name} (${cls})`,
    );
    const xpLine =
      gameState.progression.level >= MAX_LEVEL
        ? `Lv ${MAX_LEVEL} MAX`
        : `Lv ${gameState.progression.level}/${MAX_LEVEL}  XP ${gameState.progression.xp}/${need}`;
    this.xpText.setText(
      `${xpLine}` +
        (gameState.progression.unspentStatPoints
          ? `  ★${gameState.progression.unspentStatPoints} pts`
          : '') +
        (gameState.inRift ? '   [DUNGEON]' : '') +
        `   Armor ${armorOn}/4` +
        `   Bag ${gameState.inventory.slots.length}/${gameState.inventory.capacity}`,
    );
    this.hudHint.setText(
      `${formatHotkey('inventory')} Inventory · ${formatHotkey('character')} Character · Esc Menu`,
    );
  }

  private toast(text: string): void {
    this.toastText.setText(text);
    this.toastText.setAlpha(1);
    this.tweens.killTweensOf(this.toastText);
    this.tweens.add({
      targets: this.toastText,
      alpha: 0,
      delay: 1800,
      duration: 500,
    });
  }

  private spawnDamageNumber(
    x: number,
    y: number,
    amount: number,
    kind: string,
  ): void {
    const color = kind === 'player' ? '#ff6b6b' : '#ffe08a';
    const t = this.add
      .text(x, y, String(amount), {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '16px',
        color,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.damageLayer.add(t);
    this.tweens.add({
      targets: t,
      y: y - 28,
      alpha: 0,
      duration: 600,
      onComplete: () => t.destroy(),
    });
  }

  update(): void {
    if (!this.keyMenu) return;
    if (this.awaitingRebind) return;

    if (Phaser.Input.Keyboard.JustDown(this.keyMenu)) {
      if (this.inventoryPanel.open) {
        this.inventoryPanel.hide();
        return;
      }
      if (this.craftOpen) {
        this.hideCraft();
        return;
      }
      if (this.charOpen) {
        this.hideChar();
        return;
      }
      if (this.menuOpen) {
        if (this.menuPage !== 'root') {
          this.menuPage = this.menuPage === 'hotkeys' ? 'settings' : 'root';
          this.renderMenuPage();
        } else {
          this.hideMenu();
        }
      } else {
        this.showMenu();
      }
      return;
    }

    if (this.menuOpen) return;

    if (Phaser.Input.Keyboard.JustDown(this.keyInv)) {
      this.hideCraft();
      this.hideChar();
      this.inventoryPanel.toggle();
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keyChar)) {
      this.inventoryPanel.hide();
      if (this.charOpen) this.hideChar();
      else this.showChar();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keyTool)) {
      const tool = gameState.inventory.equipment.tool;
      if (tool) {
        this.toast(`Tool already equipped: ${getItemDef(tool)?.name ?? tool}`);
        return;
      }
      for (const slot of gameState.inventory.slots) {
        if (slot.kind !== 'stack') continue;
        const def = getItemDef(slot.itemId);
        if (def?.kind === 'tool') {
          gameState.inventory.equipTool(slot.itemId);
          gameState.persist();
          this.refresh();
          this.toast(`Equipped ${def.name}`);
          return;
        }
      }
      this.toast('No tool in inventory');
    }
    this.gearKeys.forEach((key, i) => {
      if (Phaser.Input.Keyboard.JustDown(key)) this.equipGearAt(i);
    });
  }

  private equipGearAt(index: number): void {
    const gearSlots = gameState.inventory.slots.filter(
      (s) => s.kind === 'gear',
    );
    const slot = gearSlots[index];
    if (!slot || slot.kind !== 'gear') {
      this.toast('No gear in that slot');
      return;
    }
    if (gameState.inventory.equipGear(slot.item.uid)) {
      gameState.recalcMaxHp();
      gameState.persist();
      this.refresh();
      this.refreshCharBody();
      this.toast(`Equipped ${slot.item.name}`);
    } else {
      this.toast('Cannot equip (inventory full?)');
    }
  }

  shutdown(): void {
    for (const u of this.unsubs) u();
    this.unsubs = [];
  }
}
