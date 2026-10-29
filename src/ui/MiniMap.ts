import Phaser from 'phaser';
import { gameEvents } from '../core/EventBus';
import { MAP_CELL_COLOR, MAP_MARKER_COLOR, type MapSnapshot } from './MapModel';
import { shouldShowTouchControls } from './TouchControls';
import { computeTouchLayout } from './TouchLayout';

const SIZE = 140;
const PAD = 3;

/**
 * Corner top-down radar. On touch: tap toggles the chrome tray
 * (BAG / CHAR / SKILLS / MAP / MENU); ☰ badge marks that affordance.
 */
export class MiniMap {
  readonly root: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;
  private readonly frame: Phaser.GameObjects.Rectangle;
  private readonly terrain: Phaser.GameObjects.Graphics;
  private readonly marks: Phaser.GameObjects.Graphics;
  private readonly title: Phaser.GameObjects.Text;
  private readonly menuBadge: Phaser.GameObjects.Container;
  private readonly hit: Phaser.GameObjects.Zone;
  private lastTerrainKey = '';
  private snap: MapSnapshot | null = null;
  private chromeLit = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(10_008);
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

    const badgeBg = scene.add
      .circle(0, 0, 12, 0x1a2230, 0.95)
      .setStrokeStyle(2, 0xc4a574, 0.95);
    const badgeLabel = scene.add
      .text(0, 0, '☰', {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '12px',
        color: '#e8e4d8',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.menuBadge = scene.add.container(SIZE / 2 - 6, -SIZE / 2 + 4, [
      badgeBg,
      badgeLabel,
    ]);
    this.menuBadge.setVisible(false);

    this.hit = scene.add
      .zone(0, 0, SIZE + 8, SIZE + 24)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.hit.on('pointerup', () => {
      if (!shouldShowTouchControls()) {
        gameEvents.emit('ui:toggleMap', {});
        return;
      }
      gameEvents.emit('ui:toggleTouchChrome', {});
    });

    this.root.add([
      this.frame,
      this.terrain,
      this.marks,
      this.title,
      this.menuBadge,
      this.hit,
    ]);

    gameEvents.on('ui:touchChrome', (p) => {
      const open = !!(p as { open?: boolean }).open;
      this.chromeLit = open;
      this.refreshBadge();
    });

    this.layout();
  }

  layout(): void {
    const sw = this.scene.scale.width;
    const touch = shouldShowTouchControls();
    const size = touch
      ? computeTouchLayout(sw, this.scene.scale.height).mapSize
      : sw < 900
        ? 100
        : sw < 1100
          ? 120
          : SIZE;
    const scale = size / SIZE;
    this.root.setScale(scale);
    this.title.setText(touch ? 'Tap · menu' : sw < 900 ? 'Map' : 'Map · M');
    this.frame.setStrokeStyle(
      1.5,
      touch && this.chromeLit ? 0xc4a574 : touch ? 0x6a8090 : 0x4a5568,
      0.95,
    );
    this.menuBadge.setVisible(touch);
    this.refreshBadge();
    const x = sw - size / 2 - 8;
    const y = size / 2 + (touch ? 8 : 8);
    this.root.setPosition(x, y);
  }

  private refreshBadge(): void {
    const touch = shouldShowTouchControls();
    this.menuBadge.setVisible(touch);
    this.menuBadge.setAlpha(this.chromeLit ? 1 : 0.9);
    this.frame.setStrokeStyle(
      1.5,
      touch && this.chromeLit ? 0xc4a574 : touch ? 0x6a8090 : 0x4a5568,
      0.95,
    );
  }

  static readonly SIZE = SIZE;

  static displaySize(scene?: {
    scale: { width: number; height: number };
  }): number {
    if (!scene) {
      return shouldShowTouchControls() ? 96 : SIZE;
    }
    const sw = scene.scale.width;
    if (shouldShowTouchControls()) {
      return computeTouchLayout(sw, scene.scale.height).mapSize;
    }
    if (sw < 900) return 100;
    if (sw < 1100) return 120;
    return SIZE;
  }

  apply(snap: MapSnapshot): void {
    this.snap = snap;
    const view = this.viewWindow(snap);
    const fogKey = snap.explored ? exploredStamp(snap.explored) : 'nofog';
    const key = `${snap.inRift}:${snap.width}x${snap.height}:${view.x0},${view.y0},${view.span}:${fogKey}`;
    // Redraw terrain when the zoom window moves a tile (touch) or map changes
    if (key !== this.lastTerrainKey) {
      this.lastTerrainKey = key;
      this.drawTerrain(snap, view);
    }
    this.drawMarkers(snap, view, false);
  }

  /** Full map on desktop; player-centered zoom on touch phones. */
  private viewWindow(snap: MapSnapshot): {
    x0: number;
    y0: number;
    span: number;
  } {
    const touch = shouldShowTouchControls();
    if (!touch) {
      return { x0: 0, y0: 0, span: Math.max(snap.width, snap.height) };
    }
    const player = snap.markers.find((m) => m.kind === 'player');
    const span = Math.min(
      Math.max(snap.width, snap.height),
      snap.inRift ? 22 : 20,
    );
    const cx = player?.x ?? snap.width / 2;
    const cy = player?.y ?? snap.height / 2;
    let x0 = Math.floor(cx - span / 2);
    let y0 = Math.floor(cy - span / 2);
    x0 = Math.max(0, Math.min(snap.width - span, x0));
    y0 = Math.max(0, Math.min(snap.height - span, y0));
    return { x0, y0, span };
  }

  private drawTerrain(
    snap: MapSnapshot,
    view: { x0: number; y0: number; span: number },
  ): void {
    this.terrain.clear();
    const tw = (SIZE - PAD * 2) / view.span;
    const th = (SIZE - PAD * 2) / view.span;
    const ox = -SIZE / 2 + PAD;
    const oy = -SIZE / 2 + PAD;
    const explored = snap.explored;
    const touch = shouldShowTouchControls();
    const x1 = Math.min(snap.width, view.x0 + view.span);
    const y1 = Math.min(snap.height, view.y0 + view.span);
    for (let y = view.y0; y < y1; y++) {
      for (let x = view.x0; x < x1; x++) {
        const i = y * snap.width + x;
        const fogged = !!(explored && !explored[i]);
        const kind = fogged ? 'fog' : snap.cells[i]!;
        this.terrain.fillStyle(
          MAP_CELL_COLOR[kind],
          fogged && touch ? 0.55 : 1,
        );
        this.terrain.fillRect(
          ox + (x - view.x0) * tw,
          oy + (y - view.y0) * th,
          tw + 0.5,
          th + 0.5,
        );
      }
    }
  }

  private drawMarkers(
    snap: MapSnapshot,
    view: { x0: number; y0: number; span: number },
    showMobs: boolean,
  ): void {
    this.marks.clear();
    const tw = (SIZE - PAD * 2) / view.span;
    const th = (SIZE - PAD * 2) / view.span;
    const ox = -SIZE / 2 + PAD;
    const oy = -SIZE / 2 + PAD;
    const explored = snap.explored;
    const toPx = (wx: number, wy: number) => ({
      px: ox + (wx - view.x0) * tw,
      py: oy + (wy - view.y0) * th,
    });
    const inView = (wx: number, wy: number) =>
      wx >= view.x0 - 1 &&
      wy >= view.y0 - 1 &&
      wx <= view.x0 + view.span + 1 &&
      wy <= view.y0 + view.span + 1;
    const isExplored = (wx: number, wy: number) => {
      if (!explored) return true;
      const x = Math.floor(wx);
      const y = Math.floor(wy);
      if (x < 0 || y < 0 || x >= snap.width || y >= snap.height) return false;
      return !!explored[y * snap.width + x];
    };

    for (const m of snap.markers) {
      if (m.kind === 'mob' && !showMobs) continue;
      if (m.kind === 'player') continue;
      if (!inView(m.x, m.y)) continue;
      if (!isExplored(m.x, m.y)) continue;
      const { px, py } = toPx(m.x, m.y);
      const r =
        m.kind === 'boss'
          ? 4
          : m.kind === 'portal'
            ? 3.5
            : m.kind === 'npc'
              ? 3
              : 2.5;
      this.marks.fillStyle(
        MAP_MARKER_COLOR[m.kind],
        m.kind === 'mob' ? 0.45 : 0.95,
      );
      this.marks.fillCircle(px, py, r);
    }

    const player = snap.markers.find((m) => m.kind === 'player');
    if (player) {
      const { px, py } = toPx(player.x, player.y);
      const big = shouldShowTouchControls();
      const s = big ? 7 : 4;
      this.marks.fillStyle(0x000000, 0.55);
      this.marks.fillCircle(px, py, big ? 6 : 3.5);
      this.marks.fillStyle(MAP_MARKER_COLOR.player, 1);
      this.marks.fillTriangle(
        px,
        py - s,
        px - s * 0.75,
        py + s * 0.65,
        px + s * 0.75,
        py + s * 0.65,
      );
    }
  }

  getSnapshot(): MapSnapshot | null {
    return this.snap;
  }
}

function exploredStamp(explored: boolean[]): string {
  let n = 0;
  for (let i = 0; i < explored.length; i++) if (explored[i]) n++;
  return String(n);
}
