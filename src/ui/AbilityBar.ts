import Phaser from 'phaser';
import { gameEvents } from '../core/EventBus';
import { formatHotkey } from '../core/Hotkeys';
import { gameState } from '../systems/GameState';
import { ACTIVE_SLOTS, getAbilityDef } from '../systems/SkillSystem';
import {
  beginSkillAim,
  resolveSkillAimRelease,
  skillAimDragDist,
  updateSkillAim,
  type SkillAimState,
} from '../systems/SkillAim';
import { shouldShowTouchControls } from './TouchControls';
import { computeTouchLayout } from './TouchLayout';

/**
 * Desktop: bottom hotkey strip. Touch: round skill buttons with
 * hold-drag aim (preview line) + short-tap auto-target.
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
    cx: number;
    cy: number;
    r: number;
  }[] = [];
  private touchMode = false;
  private aimState: SkillAimState | null = null;
  private aimPointerId: number | null = null;
  private aimPreview!: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    // Below TouchControls ATK/E (10006) so primary buttons win on overlap;
    // above world / minimap chrome for skill taps.
    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(10_005);
    this.aimPreview = scene.add.graphics().setScrollFactor(0).setDepth(10_007);
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
        ring.on('pointerdown', (p: Phaser.Input.Pointer) => {
          ring.setScale(0.92);
          this.startAim(slot, ring.x, ring.y, p);
        });
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
        this.slots.push({ bg: ring, name, cd, key, ring, cx: 0, cy: 0, r: 30 });
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
        this.slots.push({ bg, name, cd, key, cx: 0, cy: 0, r: 0 });
        this.root.add([bg, name, cd, key]);
      }
    }

    if (this.touchMode) {
      scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
        if (this.aimPointerId !== p.id || !this.aimState) return;
        this.aimState = updateSkillAim(this.aimState, p.x, p.y);
        this.drawAimPreview();
      });
      const end = (p: Phaser.Input.Pointer) => {
        if (this.aimPointerId !== p.id || !this.aimState) return;
        this.finishAim(p.x, p.y);
      };
      scene.input.on('pointerup', end);
      scene.input.on('pointerupoutside', end);
    }

    this.layout();
    this.refresh();
  }

  private startAim(
    slot: number,
    ox: number,
    oy: number,
    p: Phaser.Input.Pointer,
  ): void {
    this.aimPointerId = p.id;
    this.aimState = beginSkillAim(slot, ox, oy, this.scene.time.now);
    this.aimState = updateSkillAim(this.aimState, p.x, p.y);
    this.drawAimPreview();
  }

  private finishAim(x: number, y: number): void {
    const state = this.aimState;
    const slotInfo = state ? this.slots[state.slot] : null;
    if (slotInfo?.ring) slotInfo.ring.setScale(1);
    this.aimPointerId = null;
    this.aimPreview.clear();
    if (!state) return;
    const updated = updateSkillAim(state, x, y);
    const result = resolveSkillAimRelease(updated, this.scene.time.now);
    this.aimState = null;
    if (result.action === 'cancel') return;
    if (result.action === 'auto') {
      gameEvents.emit('combat:castSkill', { slot: updated.slot });
      return;
    }
    gameEvents.emit('combat:castSkill', {
      slot: updated.slot,
      aimScreen: {
        originX: updated.originX,
        originY: updated.originY,
        pointerX: result.pointerX,
        pointerY: result.pointerY,
        dirX: result.dirX,
        dirY: result.dirY,
      },
    });
  }

  private drawAimPreview(): void {
    this.aimPreview.clear();
    if (!this.aimState) return;
    const dist = skillAimDragDist(this.aimState);
    if (dist < 12) return;
    const { originX, originY, pointerX, pointerY } = this.aimState;
    const cancel = dist <= 36;
    this.aimPreview.lineStyle(3, cancel ? 0xc45c3a : 0x6ec6ff, 0.9);
    this.aimPreview.lineBetween(originX, originY, pointerX, pointerY);
    this.aimPreview.fillStyle(cancel ? 0xc45c3a : 0x6ec6ff, 0.35);
    this.aimPreview.fillCircle(pointerX, pointerY, cancel ? 18 : 22);
    this.aimPreview.lineStyle(2, cancel ? 0xc45c3a : 0xe8e4d8, 0.85);
    this.aimPreview.strokeCircle(pointerX, pointerY, cancel ? 18 : 22);
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
    const w = compact
      ? Math.min(78, Math.floor((sw * 0.55) / ACTIVE_SLOTS))
      : 96;
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
      s.cx = x;
      s.cy = 0;
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
    this.root.setPosition(0, 0);
    this.slots.forEach((s, i) => {
      const slot = m.skillSlots[i];
      if (!slot) return;
      const { x, y, r } = slot;
      s.cx = x;
      s.cy = y;
      s.r = r;
      if (s.ring) {
        s.ring.setRadius(r);
        s.ring.setPosition(x, y);
      }
      s.name.setPosition(x, y - 4);
      s.name.setFontSize(r > 26 ? '11px' : '9px');
      s.cd.setPosition(x, y + Math.round(r * 0.42));
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
  const known: Record<string, string> = {
    'War Leap': 'LEAP',
    Strike: 'STRIKE',
    'Shield Bash': 'BASH',
    'Spirit Pulse': 'PULSE',
    'Rift Slash': 'SLASH',
    'Ward Seal': 'SEAL',
    'Arc Bolt': 'BOLT',
    Nova: 'NOVA',
    Barrier: 'WARD',
    'Arc Barrier': 'WARD',
  };
  if (known[name]) return known[name]!;
  const parts = name.split(' ');
  const last = parts[parts.length - 1] ?? name;
  return last.slice(0, 5).toUpperCase();
}

function classAccent(classId: string): number {
  if (classId === 'warrior') return 0xc45c3a;
  if (classId === 'mystic') return 0x6ec6a0;
  return 0x5a8fd4;
}
