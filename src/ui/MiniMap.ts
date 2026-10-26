import Phaser from 'phaser';
import { MAP_CELL_COLOR, MAP_MARKER_COLOR, type MapSnapshot } from './MapModel';

const SIZE = 140;
const PAD = 3;

/**
 * Corner top-down radar. Terrain redrawn on zone change;
 * markers refreshed from snapshots.
 */
export class MiniMap {
  readonly root: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;
  private readonly frame: Phaser.GameObjects.Rectangle;
  private readonly terrain: Phaser.GameObjects.Graphics;
  private readonly marks: Phaser.GameObjects.Graphics;
  private readonly title: Phaser.GameObjects.Text;
  private lastTerrainKey = '';
  private snap: MapSnapshot | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(10_003);
    this.frame = scene.add
      .rectangle(0, 0, SIZE + 8, SIZE + 24, 0x0e1218, 0.92)
      .setStrokeStyle(1, 0x4a5568, 0.9)
      .setOrigin(0.5);
    this.terrain = scene.add.graphics();
    this.marks = scene.add.graphics();
    this.title = scene.add
      .text(0, -SIZE / 2 - 6, 'Map · M', {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '10px',
        color: '#8a9aaa',
      })
      .setOrigin(0.5, 1);
    this.root.add([this.frame, this.terrain, this.marks, this.title]);
    this.layout();
  }

  layout(): void {
    // Flush top-right corner (12px inset)
    const x = this.scene.scale.width - SIZE / 2 - 12;
    const y = SIZE / 2 + 12;
    this.root.setPosition(x, y);
  }

  /** Pixel size — used to offset rift progress HUD. */
  static readonly SIZE = SIZE;

  apply(snap: MapSnapshot): void {
    this.snap = snap;
    const key = `${snap.inRift}:${snap.width}x${snap.height}`;
    if (key !== this.lastTerrainKey) {
      this.lastTerrainKey = key;
      this.drawTerrain(snap);
    }
    this.drawMarkers(snap, false);
  }

  private drawTerrain(snap: MapSnapshot): void {
    this.terrain.clear();
    const tw = (SIZE - PAD * 2) / snap.width;
    const th = (SIZE - PAD * 2) / snap.height;
    const ox = -SIZE / 2 + PAD;
    const oy = -SIZE / 2 + PAD;
    for (let y = 0; y < snap.height; y++) {
      for (let x = 0; x < snap.width; x++) {
        const kind = snap.cells[y * snap.width + x]!;
        this.terrain.fillStyle(MAP_CELL_COLOR[kind], 1);
        this.terrain.fillRect(ox + x * tw, oy + y * th, tw + 0.5, th + 0.5);
      }
    }
  }

  private drawMarkers(snap: MapSnapshot, showMobs: boolean): void {
    this.marks.clear();
    const tw = (SIZE - PAD * 2) / snap.width;
    const th = (SIZE - PAD * 2) / snap.height;
    const ox = -SIZE / 2 + PAD;
    const oy = -SIZE / 2 + PAD;
    const toPx = (wx: number, wy: number) => ({
      px: ox + wx * tw,
      py: oy + wy * th,
    });

    for (const m of snap.markers) {
      if (m.kind === 'mob' && !showMobs) continue;
      if (m.kind === 'player') continue;
      const { px, py } = toPx(m.x, m.y);
      const r =
        m.kind === 'boss'
          ? 3.5
          : m.kind === 'portal'
            ? 3
            : m.kind === 'npc'
              ? 2.5
              : 2;
      this.marks.fillStyle(
        MAP_MARKER_COLOR[m.kind],
        m.kind === 'mob' ? 0.45 : 0.95,
      );
      this.marks.fillCircle(px, py, r);
    }

    const player = snap.markers.find((m) => m.kind === 'player');
    if (player) {
      const { px, py } = toPx(player.x, player.y);
      this.marks.fillStyle(MAP_MARKER_COLOR.player, 1);
      this.marks.fillTriangle(px, py - 4, px - 3, py + 3, px + 3, py + 3);
    }
  }

  /** Used by overlay with same palette helpers. */
  getSnapshot(): MapSnapshot | null {
    return this.snap;
  }
}
