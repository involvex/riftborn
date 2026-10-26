import Phaser from 'phaser';
import { gameEvents } from '../core/EventBus';
import { formatHotkey } from '../core/Hotkeys';
import { gameState } from '../systems/GameState';
import { ACTIVE_SLOTS, getAbilityDef } from '../systems/SkillSystem';
import { shouldShowTouchControls } from './TouchControls';
import { computeTouchLayout } from './TouchLayout';

/**
 * Desktop: bottom hotkey strip. Touch: round skill buttons in the
 * right-thumb combat column (see TouchLayout).
 */
export class AbilityBar {
  readonly root: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;
  private readonly slots: {
    bg: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Arc;
    name: Phaser.GameObjects.Text;
    cd: Phaser.GameObjects.Text;
    key: Phaser.GameObjects.Text;
    ring?: Phaser.GameObjects.Arc;
  }[] = [];
  private touchMode = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(10_005);
    this.touchMode = shouldShowTouchControls();
    const keys: Array<'skill1' | 'skill2' | 'skill3'> = [
      'skill1',
      'skill2',
      'skill3',
    ];
    for (let i = 0; i < ACTIVE_SLOTS; i++) {
      const slot = i;
      if (this.touchMode) {
        const ring = scene.add
          .circle(0, 0, 30, 0x121820, 0.9)
          .setStrokeStyle(2.5, 0x4a6070, 0.95)
          .setInteractive({ useHandCursor: true });
        ring.on('pointerdown', () => ring.setScale(0.92));
        ring.on('pointerup', () => {
          ring.setScale(1);
          gameEvents.emit('combat:castSkill', { slot });
        });
        ring.on('pointerout', () => ring.setScale(1));
        const name = scene.add
          .text(0, -2, '', {
            fontFamily: 'Segoe UI, sans-serif',
            fontSize: '11px',
            color: '#e8e4d8',
            fontStyle: 'bold',
            align: 'center',
          })
          .setOrigin(0.5);
        const cd = scene.add
          .text(0, 12, '', {
            fontFamily: 'Consolas, monospace',
            fontSize: '10px',
            color: '#8ab4d4',
          })
          .setOrigin(0.5);
        const key = scene.add.text(0, 0, '').setVisible(false);
        this.slots.push({ bg: ring, name, cd, key, ring });
        this.root.add([ring, name, cd]);
      } else {
        const bg = scene.add.rectangle(0, 0, 96, 52, 0x121820, 0.92);
        bg.setStrokeStyle(1, 0x4a6070, 0.9);
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerup', () => {
          gameEvents.emit('combat:castSkill', { slot });
        });
        const name = scene.add
          .text(0, -8, '', {
            fontFamily: 'Segoe UI, sans-serif',
            fontSize: '11px',
            color: '#e8e4d8',
            align: 'center',
            wordWrap: { width: 88 },
          })
          .setOrigin(0.5);
        const cd = scene.add
          .text(0, 12, '', {
            fontFamily: 'Consolas, monospace',
            fontSize: '11px',
            color: '#8ab4d4',
          })
          .setOrigin(0.5);
        const key = scene.add
          .text(40, -18, formatHotkey(keys[i]!), {
            fontFamily: 'Consolas, monospace',
            fontSize: '10px',
            color: '#6a7a8a',
          })
          .setOrigin(0.5);
        this.slots.push({ bg, name, cd, key });
        this.root.add([bg, name, cd, key]);
      }
    }
    this.layout();
    this.refresh();
  }

  layout(): void {
    const touch = shouldShowTouchControls();
    if (touch) {
      this.layoutTouch();
      return;
    }
    const sw = this.scene.scale.width;
    const sh = this.scene.scale.height;
    const compact = sw < 900;
    const gap = compact ? 5 : 8;
    const w = compact ? Math.min(78, Math.floor((sw * 0.55) / ACTIVE_SLOTS)) : 96;
    const slotH = compact ? 42 : 52;
    const total = ACTIVE_SLOTS * w + (ACTIVE_SLOTS - 1) * gap;
    // Bias right of hotkey dock on narrow screens
    const dockBand = compact ? Math.min(210, sw * 0.38) : 0;
    const cx = dockBand + (sw - dockBand) / 2;
    this.root.setPosition(cx, sh - (compact ? 34 : 44));
    const startX = -total / 2 + w / 2;
    this.slots.forEach((s, i) => {
      const x = startX + i * (w + gap);
      if (s.bg instanceof Phaser.GameObjects.Rectangle) {
        s.bg.setSize(w, slotH);
        s.bg.setPosition(x, 0);
      }
      s.name.setPosition(x, compact ? -5 : -8);
      s.name.setFontSize(compact ? 10 : 11);
      s.name.setWordWrapWidth(w - 4);
      s.cd.setPosition(x, compact ? 10 : 12);
      s.key.setVisible(true);
      s.key.setFontSize(compact ? 9 : 10);
      s.key.setPosition(x + w / 2 - 8, compact ? -16 : -18);
      s.key.setText(
        formatHotkey((['skill1', 'skill2', 'skill3'] as const)[i]!),
      );
    });
  }

  private layoutTouch(): void {
    const m = computeTouchLayout(
      this.scene.scale.width,
      this.scene.scale.height,
    );
    // Root at origin — absolute positions from layout metrics
    this.root.setPosition(0, 0);
    this.slots.forEach((s, i) => {
      const x = m.skills.x;
      const y = m.skills.y0 + i * m.skills.gap;
      if (s.ring) {
        s.ring.setRadius(m.skills.r);
        s.ring.setPosition(x, y);
      }
      s.name.setPosition(x, y - 4);
      s.name.setFontSize(m.skills.r > 28 ? '11px' : '10px');
      s.cd.setPosition(x, y + Math.round(m.skills.r * 0.42));
      s.key.setVisible(false);
    });
  }

  refresh(): void {
    const accent = classAccent(gameState.progression.classId);
    for (let i = 0; i < ACTIVE_SLOTS; i++) {
      const id = gameState.skills.slotAbilityId(i);
      const def = id ? getAbilityDef(id) : undefined;
      const rank = gameState.skills.slotRank(i);
      const cd = gameState.skills.cooldownRemaining(i);
      const slot = this.slots[i]!;
      if (!def || rank < 1) {
        slot.name.setText('—');
        slot.name.setColor('#5a6a7a');
        slot.cd.setText('');
        if (slot.ring) slot.ring.setStrokeStyle(2, 0x3a4a5a, 0.7);
        else if (slot.bg instanceof Phaser.GameObjects.Rectangle) {
          slot.bg.setStrokeStyle(1, 0x3a4a5a, 0.7);
        }
        continue;
      }
      const label = this.touchMode
        ? shortTouchName(def.name)
        : shortAbilityName(def.name);
      slot.name.setText(label);
      slot.name.setColor('#e8e4d8');
      slot.cd.setText(cd > 0 ? `${Math.ceil(cd)}` : '');
      if (slot.ring) {
        slot.ring.setStrokeStyle(2.5, cd > 0 ? 0x5a7080 : accent, 0.95);
        slot.ring.setFillStyle(cd > 0 ? 0x1a2430 : 0x1a2230, 0.9);
      } else if (slot.bg instanceof Phaser.GameObjects.Rectangle) {
        slot.bg.setStrokeStyle(1, cd > 0 ? 0x5a7080 : accent, 0.95);
      }
    }
  }
}

function shortAbilityName(name: string): string {
  if (name.length <= 12) return name;
  const parts = name.split(' ');
  return parts[parts.length - 1] ?? name;
}

/** Compact labels for round touch buttons. */
function shortTouchName(name: string): string {
  const parts = name.split(' ');
  const last = parts[parts.length - 1] ?? name;
  return last.slice(0, 4).toUpperCase();
}

function classAccent(classId: string): number {
  if (classId === 'warrior') return 0xc45c3a;
  if (classId === 'mystic') return 0x6ec6a0;
  return 0x5a8fd4;
}
