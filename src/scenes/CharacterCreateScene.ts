import Phaser from 'phaser';
import type { CharacterClassId, CharacterGender } from '../types/game';
import { listClasses } from '../systems/ProgressionSystem';
import { gameState } from '../systems/GameState';
import { audioBus } from '../core/AudioBus';
import { uiFont, uiPad } from '../core/UiScale';
import {
  ensureGameSprites,
  isPaintedSprite,
  playerSpriteKey,
} from '../render/SpriteAtlas';

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

  private root!: Phaser.GameObjects.Container;
  private detailText!: Phaser.GameObjects.Text;
  private nameDisplay!: Phaser.GameObjects.Text;
  private previewSprite!: Phaser.GameObjects.Sprite;
  private previewFrame!: Phaser.GameObjects.Rectangle;
  private previewX = 0;
  private previewY = 0;
  private cardFills = new Map<CharacterClassId, Phaser.GameObjects.Rectangle>();
  private genderBtns = new Map<CharacterGender, Phaser.GameObjects.Text>();

  constructor() {
    super('CharacterCreateScene');
  }

  create(): void {
    ensureGameSprites(this);
    this.cameras.main.setBackgroundColor('#0a0c10');
    this.root = this.add.container(0, 0);
    this.build();

    this.scale.off('resize', this.onResize, this);
    this.scale.on('resize', this.onResize, this);

    this.input.keyboard?.off('keydown', this.onKey);
    this.input.keyboard?.on('keydown', this.onKey);
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
    this.root.destroy(true);
    this.cardFills.clear();
    this.genderBtns.clear();
    this.root = this.add.container(0, 0);
    this.build();
  }

  private build(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const pad = uiPad(this, 16);
    const contentW = Math.min(840, W - pad * 2);
    const cx = W / 2;
    const compact = H < 700;
    // Pin name + actions to the bottom so they never clip off-screen
    const footerH = compact ? 132 : 148;
    const footerTop = H - footerH;
    let y = Math.max(8, H * 0.02);
    const maxContentBottom = footerTop - 8;

    const title = this.add
      .text(cx, y, 'RIFTBORN', {
        fontFamily: 'Georgia, serif',
        fontSize: uiFont(this, compact ? 32 : 44, 22, 56),
        color: '#e8e4d8',
      })
      .setOrigin(0.5, 0);
    this.root.add(title);
    y += title.height + (compact ? 2 : 6);

    if (!compact) {
      const subtitle = this.add
        .text(cx, y, 'Create your riftwalker', {
          fontFamily: 'Segoe UI, sans-serif',
          fontSize: uiFont(this, 15, 12, 18),
          color: '#8a9aaa',
        })
        .setOrigin(0.5, 0);
      this.root.add(subtitle);
      y += subtitle.height + 10;
    }

    this.root.add(
      this.add
        .text(cx, y, 'CLASS', {
          fontFamily: 'Segoe UI, sans-serif',
          fontSize: uiFont(this, 11, 9, 13),
          color: '#6a7a8a',
        })
        .setOrigin(0.5, 0),
    );
    y += 14;

    const classes = listClasses();
    const cardH = Phaser.Math.Clamp(
      compact ? H * 0.12 : H * 0.15,
      compact ? 72 : 100,
      compact ? 100 : 130,
    );
    const cardW = Math.min(compact ? 160 : 200, (contentW - 16) / 3);
    const gap = 8;
    const rowW = classes.length * cardW + (classes.length - 1) * gap;
    const startX = cx - rowW / 2 + cardW / 2;
    const cardCy = y + cardH / 2;

    classes.forEach((cls, i) => {
      const x = startX + i * (cardW + gap);
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
          fontSize: uiFont(this, compact ? 15 : 20, 12, 22),
          color: cls.color,
        })
        .setOrigin(0.5);

      const stats = this.add
        .text(
          x,
          cardCy + cardH * 0.18,
          compact
            ? `STR ${cls.baseStats.strength} DEX ${cls.baseStats.dexterity}\nSTA ${cls.baseStats.stamina} INT ${cls.baseStats.intellect}`
            : `STR ${cls.baseStats.strength}  DEX ${cls.baseStats.dexterity}\nSTA ${cls.baseStats.stamina}  INT ${cls.baseStats.intellect}`,
          {
            fontFamily: 'Consolas, monospace',
            fontSize: uiFont(this, compact ? 10 : 12, 9, 13),
            color: '#c8c0b0',
            align: 'center',
            lineSpacing: 2,
          },
        )
        .setOrigin(0.5);

      card.on('pointerup', () => this.selectClass(cls.id));
      this.root.add([card, name, stats]);
    });
    y += cardH + (compact ? 8 : 14);

    // Details — shrink or skip preview on very short screens
    const roomLeft = maxContentBottom - y;
    const showDetails = roomLeft > 100;
    if (showDetails) {
      this.root.add(
        this.add
          .text(cx, y, 'DETAILS', {
            fontFamily: 'Segoe UI, sans-serif',
            fontSize: uiFont(this, 11, 9, 13),
            color: '#6a7a8a',
          })
          .setOrigin(0.5, 0),
      );
      y += 14;

      const blockH = Phaser.Math.Clamp(roomLeft - 50, 70, compact ? 110 : 140);
      const previewW = compact ? 72 : 100;
      const colGap = 16;
      this.previewX = cx - contentW / 2 + previewW / 2;
      this.previewY = y + blockH / 2;
      const textX = this.previewX + previewW / 2 + colGap;
      const textW = contentW - previewW - colGap;

      this.previewFrame = this.add
        .rectangle(this.previewX, this.previewY, previewW, blockH, 0x121820, 1)
        .setStrokeStyle(2, 0xc45c3a);
      const pKey = playerSpriteKey(this.gender, this.selected);
      this.previewSprite = this.add.sprite(
        this.previewX,
        this.previewY + 4,
        pKey,
      );
      this.previewSprite.setOrigin(0.5, 0.7);
      this.previewSprite.setScale(
        isPaintedSprite(pKey) ? (compact ? 0.55 : 0.75) : 2.0,
      );
      this.previewSprite.play(`${pKey}_idle`);
      this.root.add([this.previewFrame, this.previewSprite]);

      this.detailText = this.add
        .text(textX, this.previewY, '', {
          fontFamily: 'Segoe UI, sans-serif',
          fontSize: uiFont(this, compact ? 12 : 14, 11, 16),
          color: '#b8c0c8',
          align: 'left',
          wordWrap: { width: textW },
          lineSpacing: 3,
        })
        .setOrigin(0, 0.5);
      this.root.add(this.detailText);
      y += blockH + 8;
    } else {
      // Minimal detail line only
      this.detailText = this.add
        .text(cx, y, '', {
          fontFamily: 'Segoe UI, sans-serif',
          fontSize: uiFont(this, 12, 10, 14),
          color: '#b8c0c8',
          align: 'center',
        })
        .setOrigin(0.5, 0);
      this.root.add(this.detailText);
      this.previewFrame = this.add
        .rectangle(0, 0, 1, 1, 0, 0)
        .setVisible(false);
      this.previewSprite = this.add
        .sprite(0, 0, playerSpriteKey(this.gender, this.selected))
        .setVisible(false);
      y += 22;
    }

    // Gender in remaining content if space, else in footer
    const genderInFooter = y + 40 > maxContentBottom;
    if (!genderInFooter) {
      this.root.add(
        this.add
          .text(cx, y, 'GENDER', {
            fontFamily: 'Segoe UI, sans-serif',
            fontSize: uiFont(this, 11, 9, 13),
            color: '#6a7a8a',
          })
          .setOrigin(0.5, 0),
      );
      y += 14;
      this.addGenderRow(cx, y + 12, contentW, compact);
    }

    // —— Fixed footer ——
    const footerBg = this.add
      .rectangle(cx, footerTop + footerH / 2, W, footerH, 0x0a0c10, 0.94)
      .setStrokeStyle(1, 0x2a3344, 0.8);
    this.root.add(footerBg);

    let fy = footerTop + 10;
    if (genderInFooter) {
      this.addGenderRow(cx, fy + 10, contentW, true);
      fy += 36;
    }

    this.root.add(
      this.add
        .text(cx, fy, 'NAME · click to type', {
          fontFamily: 'Segoe UI, sans-serif',
          fontSize: uiFont(this, 11, 9, 12),
          color: '#6a7a8a',
        })
        .setOrigin(0.5, 0),
    );
    fy += 16;

    const nameBoxW = Math.min(280, contentW * 0.55);
    const nameBoxH = 34;
    const nameBox = this.add
      .rectangle(cx, fy + nameBoxH / 2, nameBoxW, nameBoxH, 0x1a2030, 1)
      .setStrokeStyle(1, 0xc4a574)
      .setInteractive({ useHandCursor: true });
    this.nameDisplay = this.add
      .text(cx, fy + nameBoxH / 2, this.nameValue, {
        fontFamily: 'Georgia, serif',
        fontSize: uiFont(this, 15, 13, 18),
        color: '#e8e4d8',
      })
      .setOrigin(0.5);
    nameBox.on('pointerup', () => {
      this.typingName = true;
      this.refreshNameBox();
      audioBus.uiClick();
    });
    this.root.add([nameBox, this.nameDisplay]);
    fy += nameBoxH + 10;

    const btnY = Math.min(fy + 14, H - 28);
    this.root.add(
      this.makeButton(cx - 90, btnY, 'Enter the Rift', () => {
        this.typingName = false;
        audioBus.uiClick();
        gameState.createNew(
          this.nameValue.trim() || 'Wanderer',
          this.selected,
          this.gender,
        );
        this.scene.start('WorldScene');
        this.scene.launch('UIScene');
      }),
    );
    this.root.add(
      this.makeButton(cx + 90, btnY, 'Back', () => {
        audioBus.uiClick();
        this.scene.start('BootScene');
      }),
    );

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
    const gW = Math.min(compact ? 100 : 120, (contentW - 16) / 3);
    const gGap = 8;
    const gRowW = GENDERS.length * gW + (GENDERS.length - 1) * gGap;
    const gStart = cx - gRowW / 2 + gW / 2;
    GENDERS.forEach((g, i) => {
      const x = gStart + i * (gW + gGap);
      const btn = this.add
        .text(x, gY, g.label, {
          fontFamily: 'Georgia, serif',
          fontSize: uiFont(this, compact ? 12 : 14, 11, 16),
          color: '#e8e4d8',
          backgroundColor: '#2a3344',
          padding: { x: 8, y: 6 },
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
      [
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
    this.previewSprite.setPosition(this.previewX, this.previewY + 4);
    this.previewSprite.setTexture(key);
    const compact = this.scale.height < 700;
    this.previewSprite.setScale(
      isPaintedSprite(key) ? (compact ? 0.55 : 0.75) : 2.0,
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
    const text = this.add
      .text(x, y, label, {
        fontFamily: 'Georgia, serif',
        fontSize: uiFont(this, 14, 12, 17),
        color: '#0a0c10',
        backgroundColor: '#c4a574',
        padding: { x: 14, y: 7 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    text.on('pointerover', () => text.setStyle({ backgroundColor: '#e0c890' }));
    text.on('pointerout', () => text.setStyle({ backgroundColor: '#c4a574' }));
    text.on('pointerup', onClick);
    return text;
  }

  shutdown(): void {
    this.scale.off('resize', this.onResize, this);
    this.input.keyboard?.off('keydown', this.onKey);
  }
}
