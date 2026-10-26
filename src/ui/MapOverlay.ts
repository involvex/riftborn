import Phaser from 'phaser';
import { audioBus } from '../core/AudioBus';
import { formatHotkey } from '../core/Hotkeys';
import { uiFont, uiPanelSize } from '../core/UiScale';
import { MAP_CELL_COLOR, MAP_MARKER_COLOR, type MapSnapshot } from './MapModel';

const LEGEND: { kind: keyof typeof MAP_MARKER_COLOR; label: string }[] = [
  { kind: 'player', label: 'You' },
  { kind: 'npc', label: 'NPC' },
  { kind: 'poi', label: 'POI' },
  { kind: 'chest', label: 'Chest' },
  { kind: 'elite', label: 'Elite' },
  { kind: 'boss', label: 'Boss' },
  { kind: 'portal', label: 'Portal' },
];

/** Full-screen top-down map (toggle M). */
export class MapOverlay {
  readonly root: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly title: Phaser.GameObjects.Text;
  private readonly terrain: Phaser.GameObjects.Graphics;
  private readonly marks: Phaser.GameObjects.Graphics;
  private readonly legend: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text;
  private mapW = 420;
  private mapH = 420;
  open = false;
  private snap: MapSnapshot | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(10_040);
    this.bg = scene.add.rectangle(0, 0, 520, 560, 0x0e1218, 0.97);
    this.bg.setStrokeStyle(2, 0xc4a574, 0.85);
    this.title = scene.add
      .text(0, 0, 'World Map', {
        fontFamily: 'Georgia, serif',
        fontSize: '22px',
        color: '#e8e4d8',
      })
      .setOrigin(0.5);
    this.terrain = scene.add.graphics();
    this.marks = scene.add.graphics();
    this.legend = scene.add
      .text(0, 0, '', {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '12px',
        color: '#8a9aaa',
        align: 'center',
      })
      .setOrigin(0.5);
    this.hint = scene.add
      .text(0, 0, '', {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '13px',
        color: '#8a9aaa',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.hint.on('pointerup', () => this.hide());
    this.root.add([
      this.bg,
      this.title,
      this.terrain,
      this.marks,
      this.legend,
      this.hint,
    ]);
    this.root.setVisible(false);
    this.layout();
  }

  layout(): void {
    const { w, h } = uiPanelSize(this.scene, 0.88, 0.88, 560, 620);
    this.bg.setSize(w, h);
    this.title.setPosition(0, -h / 2 + 26);
    this.title.setStyle({ fontSize: uiFont(this.scene, 22, 16, 26) });
    this.mapW = Math.min(w - 48, h - 140);
    this.mapH = this.mapW;
    this.legend.setPosition(0, h / 2 - 72);
    this.hint.setPosition(0, h / 2 - 28);
    this.hint.setText(`Close (${formatHotkey('map')} / Esc)`);
    this.root.setPosition(
      this.scene.scale.width / 2,
      this.scene.scale.height / 2,
    );
    if (this.snap) this.redraw(this.snap);
  }

  show(snap: MapSnapshot | null): void {
    if (snap) this.snap = snap;
    this.layout();
    this.root.setVisible(true);
    this.open = true;
    audioBus.uiClick();
  }

  hide(): void {
    this.root.setVisible(false);
    this.open = false;
  }

  toggle(snap: MapSnapshot | null): void {
    if (this.open) this.hide();
    else this.show(snap);
  }

  apply(snap: MapSnapshot): void {
    this.snap = snap;
    if (this.open) this.redraw(snap);
  }

  private redraw(snap: MapSnapshot): void {
    this.terrain.clear();
    this.marks.clear();
    const tw = this.mapW / snap.width;
    const th = this.mapH / snap.height;
    const ox = -this.mapW / 2;
    const oy = -this.mapH / 2 + 8;

    for (let y = 0; y < snap.height; y++) {
      for (let x = 0; x < snap.width; x++) {
        const kind = snap.cells[y * snap.width + x]!;
        this.terrain.fillStyle(MAP_CELL_COLOR[kind], 1);
        this.terrain.fillRect(ox + x * tw, oy + y * th, tw + 0.4, th + 0.4);
      }
    }

    this.terrain.lineStyle(1, 0x4a5568, 0.6);
    this.terrain.strokeRect(ox, oy, this.mapW, this.mapH);

    for (const m of snap.markers) {
      if (m.kind === 'player') continue;
      const px = ox + m.x * tw;
      const py = oy + m.y * th;
      const alpha = m.kind === 'mob' ? 0.4 : 1;
      const r =
        m.kind === 'boss'
          ? Math.max(4, tw * 0.45)
          : m.kind === 'portal'
            ? Math.max(3.5, tw * 0.4)
            : Math.max(2.5, tw * 0.28);
      this.marks.fillStyle(MAP_MARKER_COLOR[m.kind], alpha);
      this.marks.fillCircle(px, py, r);
    }

    const player = snap.markers.find((m) => m.kind === 'player');
    if (player) {
      const px = ox + player.x * tw;
      const py = oy + player.y * th;
      const s = Math.max(5, tw * 0.55);
      this.marks.fillStyle(MAP_MARKER_COLOR.player, 1);
      this.marks.fillTriangle(
        px,
        py - s,
        px - s * 0.7,
        py + s * 0.6,
        px + s * 0.7,
        py + s * 0.6,
      );
    }

    this.title.setText(snap.inRift ? 'Rift Map' : 'Hub Map');
    this.legend.setText(
      LEGEND.map((l) => l.label).join('  ·  ') +
        (snap.inRift ? '  ·  mobs' : ''),
    );
  }
}
