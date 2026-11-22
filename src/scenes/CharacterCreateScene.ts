import Phaser from 'phaser';
import type { CharacterClassId, CharacterGender } from '../types/game';
import { listClasses } from '../systems/ProgressionSystem';
import { gameState } from '../systems/GameState';
import { audioBus } from '../core/AudioBus';
import { uiFont, uiLayoutSpace, uiPx } from '../core/UiScale';
import {
  ensureGameSprites,
  isPaintedSprite,
  playerSpriteKey,
} from '../render/SpriteAtlas';
import { navEnterCreate } from '../core/GameNavState';
import { gameEvents } from '../core/EventBus';

const GENDERS: { id: CharacterGender; label: string }[] = [
  { id: 'male', label: 'Male' },
  { id: 'female', label: 'Female' },
  { id: 'nonbinary', label: 'Non-binary' },
];

export class CharacterCreateScene extends Phaser.Scene {
  private selected: CharacterClassId = 'warrior';
  private gender: CharacterGender = 'male';
  private nameValue = 'Wanderer';
  private typingName = false;
  private starting = false;

  private root!: Phaser.GameObjects.Container;
  private detailText!: Phaser.GameObjects.Text;
  private nameDisplay!: Phaser.GameObjects.Text;
  private nameDom: Phaser.GameObjects.DOMElement | null = null;
  private previewSprite!: Phaser.GameObjects.Sprite;
  private previewFrame!: Phaser.GameObjects.Rectangle;
  private previewX = 0;
  private previewY = 0;
  private cardFills = new Map<CharacterClassId, Phaser.GameObjects.Rectangle>();
  private genderBtns = new Map<CharacterGender, Phaser.GameObjects.Text>();
  private layoutScale = 1;
  private layoutCompact = false;

  constructor() {
    super('CharacterCreateScene');
  }

  create(): void {
    this.starting = false;
    navEnterCreate();
    ensureGameSprites(this);
    this.cameras.main.setBackgroundColor('#0a0c10');
    this.root = this.add.container(0, 0);
    this.build();

    this.scale.off('resize', this.onResize, this);
    this.scale.on('resize', this.onResize, this);

    this.input.keyboard?.off('keydown', this.onKey);
    this.input.keyboard?.on('keydown', this.onKey);

    const unsub = gameEvents.on('nav:backCloseOverlay', () => {
      if (this.starting) return;
      this.destroyNameDom();
      this.scene.start('BootScene');
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => unsub());
  }

  private onResize = (): void => {
    this.rebuild();
  };

  private onKey = (event: KeyboardEvent): void => {
    if (!this.typingName) return;
    event.stopPropagation();
    if (event.key === 'Escape' || event.key === 'Enter') {
      this.typingName = false;
      this.refreshNameBox();
      return;
    }
    if (event.key === 'Backspace') {
      this.nameValue = this.nameValue.slice(0, -1);
      this.refreshNameBox();
      return;
    }
    if (event.key.length === 1 && this.nameValue.length < 20) {
      if (/^[a-zA-Z0-9 _\-']$/.test(event.key)) {
        this.nameValue += event.key;
        this.refreshNameBox();
      }
    }
  };

  private rebuild(): void {
    this.typingName = false;
    this.destroyNameDom();
    this.root.destroy(true);
    this.cardFills.clear();
    this.genderBtns.clear();
    this.root = this.add.container(0, 0);
    this.build();
  }

  private destroyNameDom(): void {
    if (this.nameDom) {
      this.nameDom.destroy();
      this.nameDom = null;
    }
  }

  private syncNameFromDom(): void {
    const node = this.nameDom?.node as HTMLInputElement | undefined;
    if (node && typeof node.value === 'string') {
      this.nameValue = node.value.slice(0, 20);
    }
  }

  private startGame(): void {
    if (this.starting) return;
    this.starting = true;
    this.syncNameFromDom();
    this.typingName = false;
    audioBus.uiClick();
    gameState.createNew(
      this.nameValue.trim() || 'Wanderer',
      this.selected,
      this.gender,
    );
    this.destroyNameDom();
    this.scene.start('WorldScene');
    this.scene.launch('UIScene');
  }

  private build(): void {
    const { width: cssW, height: cssH, scale: s } = uiLayoutSpace(this);
    this.layoutScale = s;
    this.layoutCompact = cssH < 560;
    const compact = this.layoutCompact;
    const phone = cssH < 500;
    const padCss = 12;
    const contentWCss = Math.min(840, cssW - padCss * 2);
    const cx = uiPx(cssW / 2, s);
    // Footer: gender + name + actions — reserved so class cards never collide.
    const footerHCss = phone ? 150 : compact ? 158 : 168;
    const footerTopCss = cssH - footerHCss;
    let yCss = Math.max(6, cssH * 0.02);

    const title = this.add
      .text(cx, uiPx(yCss, s), 'RIFTBORN', {
        fontFamily: 'Georgia, serif',
        fontSize: uiFont(this, phone ? 26 : compact ? 30 : 40, 20, 52),
        color: '#e8e4d8',
      })
      .setOrigin(0.5, 0);
    this.root.add(title);
    yCss += title.height / s + (phone ? 2 : 6);

    if (!phone) {
      const subtitle = this.add
        .text(cx, uiPx(yCss, s), 'Create your riftwalker', {
          fontFamily: 'Segoe UI, sans-serif',
          fontSize: uiFont(this, 14, 12, 16),
          color: '#8a9aaa',
        })
        .setOrigin(0.5, 0);
      this.root.add(subtitle);
      yCss += subtitle.height / s + 8;
    }

    this.root.add(
      this.add
        .text(cx, uiPx(yCss, s), 'CLASS', {
          fontFamily: 'Segoe UI, sans-serif',
          fontSize: uiFont(this, 11, 9, 12),
          color: '#8a9aaa',
        })
        .setOrigin(0.5, 0),
    );
    yCss += 12;

    const classes = listClasses();
    const maxCardBottomCss = footerTopCss - (phone ? 28 : 36);
    const cardHCss = Phaser.Math.Clamp(
      phone ? cssH * 0.16 : compact ? cssH * 0.14 : cssH * 0.15,
      phone ? 64 : 80,
      Math.max(64, maxCardBottomCss - yCss),
    );
    const cardWCss = Math.min(
      phone ? 132 : compact ? 150 : 190,
      (contentWCss - 16) / 3,
    );
    const gapCss = 8;
    const rowWCss = classes.length * cardWCss + (classes.length - 1) * gapCss;
    const startXCss = cssW / 2 - rowWCss / 2 + cardWCss / 2;
    const cardCyCss = yCss + cardHCss / 2;

    classes.forEach((cls, i) => {
      const x = uiPx(startXCss + i * (cardWCss + gapCss), s);
      const cardCy = uiPx(cardCyCss, s);
      const cardW = uiPx(cardWCss, s);
      const cardH = uiPx(cardHCss, s);
      const card = this.add
        .rectangle(x, cardCy, cardW, cardH, 0x151a22, 1)
        .setStrokeStyle(
          2,
          Phaser.Display.Color.HexStringToColor(cls.color).color,
        )
        .setInteractive({ useHandCursor: true });
      this.cardFills.set(cls.id, card);

      const name = this.add
        .text(x, cardCy - cardH * 0.28, cls.name, {
          fontFamily: 'Georgia, serif',
          fontSize: uiFont(this, phone ? 13 : compact ? 14 : 18, 11, 20),
          color: cls.color,
        })
        .setOrigin(0.5);

      const stats = this.add
        .text(
          x,
          cardCy + cardH * 0.18,
          `STR ${cls.baseStats.strength} DEX ${cls.baseStats.dexterity}\nSTA ${cls.baseStats.stamina} INT ${cls.baseStats.intellect}`,
          {
            fontFamily: 'Consolas, monospace',
            fontSize: uiFont(this, phone ? 9 : 11, 9, 12),
            color: '#c8c0b0',
            align: 'center',
            lineSpacing: 2,
          },
        )
        .setOrigin(0.5);

      card.on('pointerup', () => this.selectClass(cls.id));
      this.root.add([card, name, stats]);
    });
    yCss += cardHCss + (phone ? 6 : 10);

    // Short phones: one bright detail line. Taller: preview + blurb.
    const roomLeftCss = footerTopCss - yCss;
    const showPreview = !phone && roomLeftCss > 96;
    if (showPreview) {
      this.root.add(
        this.add
          .text(cx, uiPx(yCss, s), 'DETAILS', {
            fontFamily: 'Segoe UI, sans-serif',
            fontSize: uiFont(this, 11, 9, 12),
            color: '#8a9aaa',
          })
          .setOrigin(0.5, 0),
      );
      yCss += 12;

      const blockHCss = Phaser.Math.Clamp(roomLeftCss - 20, 70, 120);
      const previewWCss = compact ? 72 : 96;
      const colGapCss = 14;
      this.previewX = uiPx(cssW / 2 - contentWCss / 2 + previewWCss / 2, s);
      this.previewY = uiPx(yCss + blockHCss / 2, s);
      const textX = this.previewX + uiPx(previewWCss / 2 + colGapCss, s);
      const textW = uiPx(contentWCss - previewWCss - colGapCss, s);

      this.previewFrame = this.add
        .rectangle(
          this.previewX,
          this.previewY,
          uiPx(previewWCss, s),
          uiPx(blockHCss, s),
          0x121820,
          1,
        )
        .setStrokeStyle(2, 0xc45c3a);
      const pKey = playerSpriteKey(this.gender, this.selected);
      this.previewSprite = this.add.sprite(
        this.previewX,
        this.previewY + uiPx(4, s),
        pKey,
      );
      this.previewSprite.setOrigin(0.5, 0.7);
      this.previewSprite.setScale(
        isPaintedSprite(pKey) ? (compact ? 0.5 : 0.7) * s : 2.0 * s,
      );
      this.previewSprite.play(`${pKey}_idle`);
      this.root.add([this.previewFrame, this.previewSprite]);

      this.detailText = this.add
        .text(textX, this.previewY, '', {
          fontFamily: 'Segoe UI, sans-serif',
          fontSize: uiFont(this, 13, 11, 15),
          color: '#d0d8e0',
          align: 'left',
          wordWrap: { width: textW },
          lineSpacing: 3,
        })
        .setOrigin(0, 0.5);
      this.root.add(this.detailText);
    } else {
      this.detailText = this.add
        .text(cx, uiPx(yCss, s), '', {
          fontFamily: 'Segoe UI, sans-serif',
          fontSize: uiFont(this, 12, 10, 14),
          color: '#d0d8e0',
          align: 'center',
          wordWrap: { width: uiPx(contentWCss, s) },
        })
        .setOrigin(0.5, 0);
      this.root.add(this.detailText);
      this.previewFrame = this.add
        .rectangle(0, 0, 1, 1, 0, 0)
        .setVisible(false);
      this.previewSprite = this.add
        .sprite(0, 0, playerSpriteKey(this.gender, this.selected))
        .setVisible(false);
    }

    // —— Fixed footer ——
    const footerTop = uiPx(footerTopCss, s);
    const footerH = uiPx(footerHCss, s);
    const footerBg = this.add
      .rectangle(
        cx,
        footerTop + footerH / 2,
        uiPx(cssW, s),
        footerH,
        0x0a0c10,
        0.96,
      )
      .setStrokeStyle(1, 0x2a3344, 0.85);
    this.root.add(footerBg);

    const btnY = uiPx(cssH - padCss - 20, s);
    const btnGap = uiPx(phone ? 88 : 100, s);
    this.root.add(
      this.makeButton(cx - btnGap, btnY, 'Enter the Rift', () =>
        this.startGame(),
      ),
    );
    this.root.add(
      this.makeButton(cx + btnGap, btnY, 'Back', () => {
        if (this.starting) return;
        audioBus.uiClick();
        this.destroyNameDom();
        this.scene.start('BootScene');
      }),
    );

    const nameBoxHCss = 34;
    const nameYCss = cssH - padCss - 20 - 44;
    const nameY = uiPx(nameYCss, s);
    this.root.add(
      this.add
        .text(cx, uiPx(nameYCss - nameBoxHCss / 2 - 12, s), 'NAME', {
          fontFamily: 'Segoe UI, sans-serif',
          fontSize: uiFont(this, 11, 9, 12),
          color: '#8a9aaa',
        })
        .setOrigin(0.5, 0),
    );

    // Gender sits above the name field inside the footer (never over class cards).
    this.addGenderRow(
      cx,
      uiPx(nameYCss - nameBoxHCss / 2 - 34, s),
      uiPx(contentWCss, s),
      phone || compact,
    );

    // DOM width is CSS pixels (overlay); position is game pixels.
    const nameBoxWCss = Math.min(280, contentWCss * 0.55);
    const inputEl = document.createElement('input');
    inputEl.type = 'text';
    inputEl.value = this.nameValue;
    inputEl.maxLength = 20;
    inputEl.autocomplete = 'off';
    inputEl.spellcheck = false;
    inputEl.setAttribute('enterkeyhint', 'done');
    Object.assign(inputEl.style, {
      width: `${Math.round(nameBoxWCss)}px`,
      height: `${nameBoxHCss}px`,
      fontSize: '16px',
      fontFamily: 'Georgia, serif',
      color: '#e8e4d8',
      background: '#1a2030',
      border: '1px solid #c4a574',
      borderRadius: '4px',
      textAlign: 'center',
      outline: 'none',
      padding: '0 10px',
      boxSizing: 'border-box',
    });
    inputEl.addEventListener('input', () => {
      this.nameValue = inputEl.value.slice(0, 20);
    });
    inputEl.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        this.startGame();
      }
    });
    this.nameDom = this.add.dom(cx, nameY, inputEl).setOrigin(0.5);
    this.nameDisplay = this.add
      .text(cx, nameY, this.nameValue, {
        fontFamily: 'Georgia, serif',
        fontSize: uiFont(this, 14, 12, 16),
        color: '#e8e4d8',
      })
      .setOrigin(0.5)
      .setVisible(false);

    this.selectClass(this.selected, false);
    this.selectGender(this.gender, false);
    this.refreshNameBox();
  }

  private addGenderRow(
    cx: number,
    gY: number,
    contentW: number,
    compact: boolean,
  ): void {
    const s = this.layoutScale;
    const gW = Math.min(
      uiPx(compact ? 92 : 110, s),
      Math.floor((contentW - uiPx(12, s)) / 3),
    );
    const gGap = uiPx(6, s);
    const gRowW = GENDERS.length * gW + (GENDERS.length - 1) * gGap;
    const gStart = cx - gRowW / 2 + gW / 2;
    GENDERS.forEach((g, i) => {
      const x = gStart + i * (gW + gGap);
      const btn = this.add
        .text(x, gY, g.label, {
          fontFamily: 'Georgia, serif',
          fontSize: uiFont(this, compact ? 11 : 13, 10, 14),
          color: '#e8e4d8',
          backgroundColor: '#2a3344',
          padding: { x: uiPx(6, s), y: uiPx(5, s) },
          fixedWidth: gW,
          align: 'center',
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      btn.on('pointerup', () => this.selectGender(g.id));
      this.genderBtns.set(g.id, btn);
      this.root.add(btn);
    });
  }

  private refreshNameBox(): void {
    if (!this.nameDisplay) return;
    const shown = this.nameValue.length > 0 ? this.nameValue : 'Wanderer';
    this.nameDisplay.setText(this.typingName ? `${shown}|` : shown);
    this.nameDisplay.setColor(this.typingName ? '#ffe08a' : '#e8e4d8');
  }

  private classAccent(): number {
    return this.selected === 'warrior'
      ? 0xc45c3a
      : this.selected === 'mage'
        ? 0x5a8fd4
        : 0x6ec6a0;
  }

  private selectClass(id: CharacterClassId, playSound = true): void {
    this.selected = id;
    if (playSound) audioBus.uiClick();
    for (const [cid, card] of this.cardFills) {
      card.setFillStyle(cid === id ? 0x1e2836 : 0x151a22, 1);
    }
    const cls = listClasses().find((c) => c.id === id);
    if (!cls || !this.detailText) return;
    const setName =
      id === 'warrior' ? 'Bone' : id === 'mage' ? 'Riftbound' : 'Ashen';
    this.detailText.setText(
      this.layoutCompact
        ? `${cls.blurb} · ${cls.damageStat.toUpperCase()} · ${setName}`
        : [
            cls.name,
            cls.blurb,
            `Primary: ${cls.damageStat.toUpperCase()} · Starter ${setName} set`,
          ].join('\n'),
    );
    this.previewFrame?.setStrokeStyle(2, this.classAccent());
    this.drawPreview();
  }

  private selectGender(id: CharacterGender, playSound = true): void {
    this.gender = id;
    if (playSound) audioBus.uiClick();
    for (const [gid, btn] of this.genderBtns) {
      const on = gid === id;
      btn.setStyle({
        backgroundColor: on ? '#c4a574' : '#2a3344',
        color: on ? '#0a0c10' : '#e8e4d8',
      });
    }
    this.drawPreview();
  }

  private drawPreview(): void {
    if (!this.previewSprite?.visible) return;
    const key = playerSpriteKey(this.gender, this.selected);
    const s = this.layoutScale;
    this.previewSprite.setPosition(this.previewX, this.previewY + uiPx(4, s));
    this.previewSprite.setTexture(key);
    this.previewSprite.setScale(
      isPaintedSprite(key) ? (this.layoutCompact ? 0.5 : 0.7) * s : 2.0 * s,
    );
    this.previewSprite.play(`${key}_idle`, true);
    if (isPaintedSprite(key)) {
      this.previewSprite.clearTint();
      return;
    }
    const accent = this.classAccent();
    this.previewSprite.setTint(
      Phaser.Display.Color.GetColor(
        Math.min(255, ((accent >> 16) & 0xff) + 50),
        Math.min(255, ((accent >> 8) & 0xff) + 40),
        Math.min(255, (accent & 0xff) + 30),
      ),
    );
  }

  private makeButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
  ): Phaser.GameObjects.Text {
    const s = this.layoutScale;
    const text = this.add
      .text(x, y, label, {
        fontFamily: 'Georgia, serif',
        fontSize: uiFont(this, 13, 11, 15),
        color: '#0a0c10',
        backgroundColor: '#c4a574',
        padding: { x: uiPx(12, s), y: uiPx(7, s) },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(20);
    text.on('pointerover', () => text.setStyle({ backgroundColor: '#e0c890' }));
    text.on('pointerout', () => text.setStyle({ backgroundColor: '#c4a574' }));
    text.on('pointerdown', () => {
      text.setStyle({ backgroundColor: '#a89060' });
    });
    text.on('pointerup', () => {
      text.setStyle({ backgroundColor: '#c4a574' });
      onClick();
    });
    return text;
  }

  shutdown(): void {
    this.scale.off('resize', this.onResize, this);
    this.input.keyboard?.off('keydown', this.onKey);
    this.destroyNameDom();
  }
}
