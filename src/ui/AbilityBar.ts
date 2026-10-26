import Phaser from 'phaser';
import { gameEvents } from '../core/EventBus';
import { formatHotkey } from '../core/Hotkeys';
import { gameState } from '../systems/GameState';
import { ACTIVE_SLOTS, getAbilityDef } from '../systems/SkillSystem';

/**
 * Bottom ability strip (PC hotkeys 1–3). Same buttons can later double as
 * mobile touch targets for cast / I / C / K HUD.
 */
export class AbilityBar {
  readonly root: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;
  private readonly slots: {
    bg: Phaser.GameObjects.Rectangle;
    name: Phaser.GameObjects.Text;
    cd: Phaser.GameObjects.Text;
    key: Phaser.GameObjects.Text;
  }[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(10_005);
    const keys: Array<'skill1' | 'skill2' | 'skill3'> = [
      'skill1',
      'skill2',
      'skill3',
    ];
    for (let i = 0; i < ACTIVE_SLOTS; i++) {
      const bg = scene.add.rectangle(0, 0, 96, 52, 0x121820, 0.92);
      bg.setStrokeStyle(1, 0x4a6070, 0.9);
      bg.setInteractive({ useHandCursor: true });
      const slot = i;
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
    this.layout();
    this.refresh();
  }

  layout(): void {
    const gap = 8;
    const w = 96;
    const total = ACTIVE_SLOTS * w + (ACTIVE_SLOTS - 1) * gap;
    const startX = -total / 2 + w / 2;
    const y = this.scene.scale.height - 44;
    this.root.setPosition(this.scene.scale.width / 2, y);
    this.slots.forEach((s, i) => {
      const x = startX + i * (w + gap);
      s.bg.setPosition(x, 0);
      s.name.setPosition(x, -8);
      s.cd.setPosition(x, 12);
      s.key.setPosition(x + 38, -18);
      s.key.setText(
        formatHotkey((['skill1', 'skill2', 'skill3'] as const)[i]!),
      );
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
        slot.name.setText('Locked');
        slot.name.setColor('#5a6a7a');
        slot.cd.setText('—');
        slot.bg.setStrokeStyle(1, 0x3a4a5a, 0.7);
        continue;
      }
      slot.name.setText(shortAbilityName(def.name));
      slot.name.setColor('#e8e4d8');
      slot.cd.setText(cd > 0 ? `${cd.toFixed(1)}s` : `R${rank}`);
      slot.bg.setStrokeStyle(1, cd > 0 ? 0x5a7080 : accent, 0.95);
    }
  }
}

function shortAbilityName(name: string): string {
  // Fit bottom bar: "War Leap" → keep; longer names trim last word if needed
  if (name.length <= 12) return name;
  const parts = name.split(' ');
  return parts[parts.length - 1] ?? name;
}

function classAccent(classId: string): number {
  if (classId === 'warrior') return 0xc45c3a;
  if (classId === 'mystic') return 0x6ec6a0;
  return 0x5a8fd4;
}
