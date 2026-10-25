import Phaser from 'phaser';
import type { CharacterClassId } from '../types/game';
import { listClasses } from '../systems/ProgressionSystem';
import { gameState } from '../systems/GameState';
import { audioBus } from '../core/AudioBus';

export class CharacterCreateScene extends Phaser.Scene {
  private selected: CharacterClassId = 'warrior';
  private nameValue = 'Wanderer';
  private detailText!: Phaser.GameObjects.Text;
  private nameInput!: Phaser.GameObjects.DOMElement;
  private cardFills = new Map<CharacterClassId, Phaser.GameObjects.Rectangle>();

  constructor() {
    super('CharacterCreateScene');
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#0a0c10');

    this.add
      .text(width / 2, 48, 'RIFTBORN', {
        fontFamily: 'Georgia, serif',
        fontSize: '42px',
        color: '#e8e4d8',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 92, 'Choose your path into the rifts', {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '16px',
        color: '#8a9aaa',
      })
      .setOrigin(0.5);

    const classes = listClasses();
    classes.forEach((cls, i) => {
      const x = width / 2 + (i - 1) * 200;
      const y = height * 0.36;
      const card = this.add
        .rectangle(x, y, 170, 150, 0x151a22, 0.95)
        .setStrokeStyle(
          2,
          Phaser.Display.Color.HexStringToColor(cls.color).color,
        )
        .setInteractive({ useHandCursor: true });
      this.cardFills.set(cls.id, card);

      this.add
        .text(x, y - 40, cls.name, {
          fontFamily: 'Georgia, serif',
          fontSize: '22px',
          color: cls.color,
        })
        .setOrigin(0.5);
      this.add
        .text(
          x,
          y + 10,
          `STR ${cls.baseStats.strength}  VIT ${cls.baseStats.vitality}\nINT ${cls.baseStats.intellect}  SPI ${cls.baseStats.spirit}`,
          {
            fontFamily: 'Consolas, monospace',
            fontSize: '12px',
            color: '#c8c0b0',
            align: 'center',
          },
        )
        .setOrigin(0.5);

      card.on('pointerup', () => this.selectClass(cls.id));
    });

    this.detailText = this.add
      .text(width / 2, height * 0.54, '', {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '15px',
        color: '#b0b8c0',
        align: 'center',
        wordWrap: { width: 520 },
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.62, 'Character name', {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '13px',
        color: '#8a9aaa',
      })
      .setOrigin(0.5);

    this.nameInput = this.add
      .dom(width / 2, height * 0.68)
      .createFromHTML(
        `<input type="text" id="riftborn-name" maxlength="20" value="Wanderer"
          placeholder="Enter a name"
          style="width:240px;padding:10px 14px;font-size:18px;font-family:Georgia,serif;
          color:#e8e4d8;background:#1a2030;border:1px solid #c4a574;border-radius:4px;
          text-align:center;outline:none;" />`,
      )
      .setOrigin(0.5);

    const inputEl = this.nameInput.getChildByID(
      'riftborn-name',
    ) as HTMLInputElement | null;
    inputEl?.addEventListener('input', () => {
      this.nameValue = (inputEl.value || '').slice(0, 20);
    });
    inputEl?.addEventListener('keydown', (ev) => {
      // Keep Phaser from eating typing
      ev.stopPropagation();
    });
    // Focus so players can type immediately
    this.time.delayedCall(100, () => inputEl?.focus());

    this.makeButton(width / 2, height * 0.8, 'Enter the Rift', () => {
      const typed =
        (
          this.nameInput.getChildByID(
            'riftborn-name',
          ) as HTMLInputElement | null
        )?.value ?? this.nameValue;
      this.nameValue = typed.trim().slice(0, 20) || 'Wanderer';
      audioBus.uiClick();
      gameState.createNew(this.nameValue, this.selected);
      this.scene.start('WorldScene');
      this.scene.launch('UIScene');
    });

    this.makeButton(width / 2, height * 0.9, 'Back', () => {
      audioBus.uiClick();
      this.scene.start('BootScene');
    });

    this.selectClass('warrior');
  }

  private selectClass(id: CharacterClassId): void {
    this.selected = id;
    audioBus.uiClick();
    for (const [cid, card] of this.cardFills) {
      card.setFillStyle(cid === id ? 0x1e2836 : 0x151a22, 0.95);
    }
    const cls = listClasses().find((c) => c.id === id);
    if (!cls) return;
    const setName =
      id === 'warrior' ? 'Bone' : id === 'mage' ? 'Riftbound' : 'Ashen';
    this.detailText.setText(
      `${cls.name} — ${cls.blurb}\nPrimary damage: ${cls.damageStat.toUpperCase()}\nStarts with Recruit's ${setName} armor set + weapon + hatchet`,
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
        fontSize: '20px',
        color: '#0a0c10',
        backgroundColor: '#c4a574',
        padding: { x: 18, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    text.on('pointerover', () => text.setStyle({ backgroundColor: '#e0c890' }));
    text.on('pointerout', () => text.setStyle({ backgroundColor: '#c4a574' }));
    text.on('pointerup', onClick);
    return text;
  }
}
