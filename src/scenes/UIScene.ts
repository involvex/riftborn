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
import { describeGearFull } from '../systems/ItemGen';
import { getItemDef } from '../systems/InventorySystem';
import { MAX_LEVEL, STAT_POINTS_PER_LEVEL } from '../systems/ProgressionSystem';
import { resolveSetBonuses } from '../systems/SetBonus';
import { gameState } from '../systems/GameState';
import { AbilityBar } from '../ui/AbilityBar';
import { HudBars } from '../ui/HudBars';
import { InventoryPanel } from '../ui/InventoryPanel';
import { RiftProgressHud } from '../ui/RiftProgressHud';
import { ShopPanel } from '../ui/ShopPanel';
import { TraderPanel } from '../ui/TraderPanel';
import { SkillTreePanel } from '../ui/SkillTreePanel';
import { MiniMap } from '../ui/MiniMap';
import { MapOverlay } from '../ui/MapOverlay';
import type { MapSnapshot } from '../ui/MapModel';
import { HotkeyDock } from '../ui/HotkeyDock';
import { shouldShowTouchControls, TouchControls } from '../ui/TouchControls';

type MenuPage = 'root' | 'settings' | 'hotkeys';

export class UIScene extends Phaser.Scene {
  private hudBars!: HudBars;
  private hotkeyDock!: HotkeyDock;
  private touchControls!: TouchControls;
  private toastText!: Phaser.GameObjects.Text;
  private craftPanel!: Phaser.GameObjects.Container;
  private charPanel!: Phaser.GameObjects.Container;
  private menuPanel!: Phaser.GameObjects.Container;
  private menuBody!: Phaser.GameObjects.Container;
  private charBody!: Phaser.GameObjects.Text;
  private damageLayer!: Phaser.GameObjects.Container;
  private inventoryPanel!: InventoryPanel;
  private shopPanel!: ShopPanel;
  private traderPanel!: TraderPanel;
  private skillPanel!: SkillTreePanel;
  private abilityBar!: AbilityBar;
  private riftHud!: RiftProgressHud;
  private miniMap!: MiniMap;
  private mapOverlay!: MapOverlay;
  private lastMapSnap: MapSnapshot | null = null;
  private unsubs: (() => void)[] = [];
  private shopOpen = false;
  private traderOpen = false;
  private keyChar!: Phaser.Input.Keyboard.Key;
  private keyInv!: Phaser.Input.Keyboard.Key;
  private keySkills!: Phaser.Input.Keyboard.Key;
  private keyMap!: Phaser.Input.Keyboard.Key;
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

    this.hudBars = new HudBars(this);
    this.hotkeyDock = new HotkeyDock(this);
    this.touchControls = new TouchControls(this);
    const touchOn = shouldShowTouchControls();
    this.touchControls.setEnabled(touchOn);
    this.hotkeyDock.setVisible(!touchOn);

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
    this.shopPanel = new ShopPanel(this);
    this.traderPanel = new TraderPanel(this);
    this.skillPanel = new SkillTreePanel(this);
    this.abilityBar = new AbilityBar(this);
    this.riftHud = new RiftProgressHud(this);
    this.miniMap = new MiniMap(this);
    this.mapOverlay = new MapOverlay(this);
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
      if (event.key === '1') name = 'ONE';
      if (event.key === '2') name = 'TWO';
      if (event.key === '3') name = 'THREE';
      if (
        name.length === 1 ||
        ['SPACE', 'ESC', 'ONE', 'TWO', 'THREE'].includes(name)
      ) {
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
        const payload = p as {
          level: number;
          unspent?: number;
          skillPoint?: number;
        };
        audioBus.levelUp();
        const bits: string[] = [`Level ${payload.level}!`];
        if (payload.unspent) {
          bits.push(
            `+${STAT_POINTS_PER_LEVEL} attrs (${formatHotkey('character')})`,
          );
        }
        if (payload.skillPoint) {
          bits.push(`+1 skill (${formatHotkey('skills')})`);
        }
        this.toast(bits.join(' '));
        gameState.recalcMaxHp();
        gameState.persist();
        this.refresh();
        if (this.skillPanel.open) this.skillPanel.refresh();
        if (this.charOpen) this.refreshCharBody();
      }),
      gameEvents.on(Events.SKILL_CHANGED, () => {
        this.refresh();
        this.abilityBar.refresh();
        if (this.skillPanel.open) this.skillPanel.refresh();
      }),
      gameEvents.on(Events.SKILL_CAST, () => this.abilityBar.refresh()),
      gameEvents.on(Events.PLAYER_DAMAGED, () => this.refresh()),
      gameEvents.on(Events.PLAYER_HEALED, () => this.refresh()),
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
      gameEvents.on(Events.JUNK_SOLD, (p) => {
        const d = p as {
          item: { name: string; rarity: string };
          gold: number;
          auto?: boolean;
        };
        if (d.auto) {
          this.toast(`Auto-sold junk ${d.item.name} · +${d.gold}g`);
        }
        this.refresh();
        if (this.inventoryPanel.open) this.inventoryPanel.refresh();
        if (this.shopOpen) this.shopPanel.refresh();
      }),
      gameEvents.on('ui:openCraft', () => {
        this.hideShop();
        this.hideTrader();
        this.showCraft();
      }),
      gameEvents.on('ui:openShop', () => {
        this.hideCraft();
        this.hideTrader();
        this.hideChar();
        this.skillPanel.hide();
        this.inventoryPanel.hide();
        this.showShop();
      }),
      gameEvents.on('ui:openTrader', () => {
        this.hideCraft();
        this.hideShop();
        this.hideChar();
        this.skillPanel.hide();
        this.inventoryPanel.hide();
        this.showTrader();
      }),
      gameEvents.on(Events.RIFT_ENTERED, () => {
        this.toast('Procedural rift dungeon opened');
        this.riftHud.show();
      }),
      gameEvents.on(Events.RIFT_CLEARED, (p) => {
        const d = p as { cleared: boolean };
        this.toast(d.cleared ? 'Rift rewards claimed' : 'Left the Rift');
        this.riftHud.hide();
        this.refresh();
      }),
      gameEvents.on(Events.RIFT_PROGRESS, (p) => {
        const d = p as {
          active?: boolean;
          kills?: number;
          goal?: number;
          phase?: 'fill' | 'boss' | 'exit';
          depth?: number;
          modName?: string;
        };
        if (!d.active) {
          this.riftHud.hide();
          return;
        }
        this.riftHud.show();
        this.riftHud.setProgress(
          d.kills ?? 0,
          d.goal ?? 1,
          d.phase ?? 'fill',
          d.depth ?? 1,
          d.modName,
        );
      }),
      gameEvents.on(Events.PLAYER_DIED, () => {
        this.refresh();
      }),
      gameEvents.on(Events.BOUNTY_CHANGED, () => this.refresh()),
      gameEvents.on(Events.BOUNTY_COMPLETE, (p) => {
        const d = p as {
          bounty: { label: string; rewardGold: number; rewardXp: number };
        };
        const b = d.bounty;
        gameState.inventory.add('gold', b.rewardGold);
        gameState.progression.addXp(b.rewardXp);
        gameState.persist();
        audioBus.loot('rare');
        this.toast(
          `Bounty complete — ${b.label} · +${b.rewardGold}g +${b.rewardXp} XP`,
        );
        this.refresh();
      }),
      gameEvents.on(Events.SETTINGS_CHANGED, () => {
        this.bindHotkeys();
        this.hotkeyDock.refresh();
      }),
      gameEvents.on('ui:mapSnapshot', (p) => {
        const snap = p as MapSnapshot;
        this.lastMapSnap = snap;
        this.miniMap.apply(snap);
        this.mapOverlay.apply(snap);
      }),
      gameEvents.on('ui:openInventory', () => {
        this.hideCraft();
        this.hideShop();
        this.hideTrader();
        this.hideChar();
        this.skillPanel.hide();
        this.mapOverlay.hide();
        this.inventoryPanel.toggle();
      }),
      gameEvents.on('ui:toggleMap', () => {
        this.mapOverlay.toggle(this.lastMapSnap);
      }),
      gameEvents.on('ui:toggleMenu', () => {
        if (this.menuOpen) this.hideMenu();
        else this.showMenu();
      }),
    );

    this.scale.on('resize', () => {
      this.toastText.setX(this.scale.width / 2);
      this.hudBars.layout();
      this.hotkeyDock.layout();
      this.hotkeyDock.refresh();
      // Touch pads first so AbilityBar / MiniMap share metrics
      this.touchControls.layout();
      this.abilityBar.layout();
      this.miniMap.layout();
      this.riftHud.layout();
      if (this.inventoryPanel.open) this.inventoryPanel.layout();
      if (this.shopPanel.open) this.shopPanel.layout();
      if (this.traderPanel.open) this.traderPanel.layout();
      if (this.skillPanel.open) this.skillPanel.layout();
      if (this.mapOverlay.open) this.mapOverlay.layout();
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
    this.keySkills = this.input.keyboard.addKey(
      keyCodeFromSetting(settingsStore.get().hotkeys.skills),
    );
    this.keyTool = this.input.keyboard.addKey(
      keyCodeFromSetting(settingsStore.get().hotkeys.equipTool),
    );
    this.keyMenu = this.input.keyboard.addKey(
      keyCodeFromSetting(settingsStore.get().hotkeys.menu),
    );
    this.keyMap = this.input.keyboard.addKey(
      keyCodeFromSetting(settingsStore.get().hotkeys.map),
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
    const bg = this.add.rectangle(0, 0, 560, 520, 0x0e1218, 0.96);
    bg.setStrokeStyle(1, 0x4db6ff, 0.6);
    const title = this.add
      .text(0, -235, 'Character', {
        fontFamily: 'Georgia, serif',
        fontSize: '22px',
        color: '#e8e4d8',
      })
      .setOrigin(0.5);

    this.charBody = this.add
      .text(-250, -200, '', {
        fontFamily: 'Consolas, monospace',
        fontSize: '12px',
        color: '#c8c0b0',
        lineSpacing: 3,
        wordWrap: { width: 340 },
      })
      .setOrigin(0, 0);

    const statBtns: Phaser.GameObjects.GameObject[] = [];
    const stats = ['strength', 'dexterity', 'stamina', 'intellect'] as const;
    stats.forEach((stat, i) => {
      const btn = this.add
        .text(200, -120 + i * 36, `+ ${stat.slice(0, 3).toUpperCase()}`, {
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
      .text(0, 235, `Close (${formatHotkey('character')})`, {
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
      this.menuButton(
        110,
        `Auto-sell junk: ${s.autoSellJunk ? 'ON' : 'OFF'}`,
        () => {
          settingsStore.save({ autoSellJunk: !s.autoSellJunk });
          gameEvents.emit(Events.SETTINGS_CHANGED);
          this.renderMenuPage();
        },
      );
      this.menuButton(160, 'Hotkeys…', () => {
        this.menuPage = 'hotkeys';
        this.renderMenuPage();
      });
      this.menuButton(210, 'Back', () => {
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
    this.skillPanel.hide();
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
      `Level ${p.level}/${MAX_LEVEL}   Attr pts: ${p.unspentStatPoints}   Skill pts: ${gameState.skills.unspentSkillPoints}`,
      '',
      `STR ${p.stats.strength} (+${gear.strength} gear)`,
      `DEX ${p.stats.dexterity} (+${gear.dexterity} gear)`,
      `STA ${p.stats.stamina} (+${gear.stamina} gear)`,
      `INT ${p.stats.intellect} (+${gear.intellect} gear)`,
      '',
      `Weapon DMG ${gameState.inventory.weaponDamage()}   Attack ~ ${gameState.combat.playerAttackDamage()}`,
      `Skill power +${gear.skillPower}%   (from gear / sets)`,
      `Armor ${gear.armor}  ·  shown here & on item hover`,
      `Skills: ${formatHotkey('skills')} tree · ${formatHotkey('skill1')}/${formatHotkey('skill2')}/${formatHotkey('skill3')} cast`,
      '',
      'Equipment:',
      `  WPN  ${eq.weapon ? describeGearFull(eq.weapon) : '—'}`,
      `  HAT  ${eq.hat ? describeGearFull(eq.hat) : '—'}`,
      `  CHT  ${eq.chest ? describeGearFull(eq.chest) : '—'}`,
      `  LEG  ${eq.legs ? describeGearFull(eq.legs) : '—'}`,
      `  FET  ${eq.feet ? describeGearFull(eq.feet) : '—'}`,
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

  private showShop(): void {
    if (this.menuOpen) return;
    this.mapOverlay.hide();
    this.shopPanel.show();
    this.shopOpen = true;
    this.toast('Mira’s shop — spend gold on gear');
  }

  private hideShop(): void {
    this.shopPanel.hide();
    this.shopOpen = false;
  }

  private showTrader(): void {
    if (this.menuOpen) return;
    this.mapOverlay.hide();
    this.traderPanel.show();
    this.traderOpen = true;
    this.toast('Nix — mats, tonics, patch-up');
  }

  private hideTrader(): void {
    this.traderPanel.hide();
    this.traderOpen = false;
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
    this.hudBars.refresh();
    this.hotkeyDock.refresh();
    this.abilityBar.refresh();
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
    this.abilityBar.refresh();
    if (this.awaitingRebind) return;

    if (Phaser.Input.Keyboard.JustDown(this.keyMenu)) {
      if (this.mapOverlay.open) {
        this.mapOverlay.hide();
        return;
      }
      if (this.inventoryPanel.open) {
        this.inventoryPanel.hide();
        return;
      }
      if (this.skillPanel.open) {
        this.skillPanel.hide();
        return;
      }
      if (this.shopOpen) {
        this.hideShop();
        return;
      }
      if (this.traderOpen) {
        this.hideTrader();
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

    if (Phaser.Input.Keyboard.JustDown(this.keyMap)) {
      this.mapOverlay.toggle(this.lastMapSnap);
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keyInv)) {
      this.hideCraft();
      this.hideShop();
      this.hideTrader();
      this.hideChar();
      this.skillPanel.hide();
      this.mapOverlay.hide();
      this.inventoryPanel.toggle();
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keySkills)) {
      this.hideCraft();
      this.hideShop();
      this.hideTrader();
      this.hideChar();
      this.inventoryPanel.hide();
      this.mapOverlay.hide();
      this.skillPanel.toggle();
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keyChar)) {
      this.inventoryPanel.hide();
      this.skillPanel.hide();
      this.hideShop();
      this.hideTrader();
      this.mapOverlay.hide();
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
    if (
      !gameState.inventory.canEquipGear(
        slot.item,
        gameState.progression.classId,
      )
    ) {
      this.toast('Wrong class for that gear');
      return;
    }
    if (
      gameState.inventory.equipGear(
        slot.item.uid,
        gameState.progression.classId,
      )
    ) {
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
