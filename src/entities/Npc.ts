import Phaser from 'phaser';
import { figureDrawScale, FIGURE_CONTENT_PX } from '../core/FigureScale';
import { depthFromWorld, worldToScreen } from '../core/IsoMath';
import { hasArt } from '../render/WorldArt';
import { PLAZA_NPC_KEY, plazaArtScale } from '../render/PlazaArt';
import type { NpcRole } from '../world/MapGen';

/** Hub NPC graphics were ~30px tall at scale 1; match figure height. */
const NPC_NATIVE_H = 30;

const ROLE_COLOR: Record<NpcRole, number> = {
  vendor: 0xc4a574,
  crafter: 0x6ec6a0,
  board: 0xd4a020,
  trader: 0x8ab4d4,
};

/** Hub townsperson — talk with E when close. */
export class Npc {
  readonly id: string;
  readonly role: NpcRole;
  readonly name: string;
  worldX: number;
  worldY: number;
  readonly body: Phaser.GameObjects.Container;
  private readonly prompt: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    id: string,
    role: NpcRole,
    name: string,
    worldX: number,
    worldY: number,
  ) {
    this.id = id;
    this.role = role;
    this.name = name;
    this.worldX = worldX;
    this.worldY = worldY;

    const color = ROLE_COLOR[role];
    const artKey = PLAZA_NPC_KEY[role];
    let figure: Phaser.GameObjects.GameObject;
    let labelY: number;
    let promptY: number;

    if (artKey && hasArt(scene, artKey)) {
      const figScale = plazaArtScale(artKey);
      figure = scene.add
        .image(0, 4, artKey)
        .setOrigin(0.5, 1)
        .setScale(figScale);
      labelY = role === 'board' ? -52 * figScale : -58 * figScale;
      promptY = 6;
    } else if (role === 'board') {
      const g = scene.add.graphics();
      drawNoticeBoard(g, color);
      figure = g;
      const fig = figureDrawScale() * (FIGURE_CONTENT_PX / NPC_NATIVE_H);
      const figScale = Math.min(1.15, fig * 0.85);
      g.setScale(figScale);
      labelY = -38 * figScale - 4;
      promptY = 10 * figScale;
    } else {
      const g = scene.add.graphics();
      g.fillStyle(0x000000, 0.35);
      g.fillEllipse(0, 8, 20, 10);
      g.fillStyle(0x2a2218, 1);
      g.fillEllipse(0, 4, 14, 8);
      g.fillStyle(color, 1);
      g.fillTriangle(-10, 2, 10, 2, 0, -16);
      g.fillStyle(0xd8c4a0, 1);
      g.fillCircle(0, -18, 6);
      g.fillStyle(color, 0.85);
      g.fillEllipse(0, -12, 12, 5);
      g.lineStyle(1, 0x1a1410, 0.7);
      g.strokeCircle(0, -18, 6);
      figure = g;
      const fig = figureDrawScale() * (FIGURE_CONTENT_PX / NPC_NATIVE_H);
      g.setScale(fig);
      labelY = -12 * fig - 8;
      promptY = 8 * fig;
    }

    const label = scene.add
      .text(0, labelY, name, {
        fontFamily: 'Georgia, serif',
        fontSize: '12px',
        color: '#e8e4d8',
        stroke: '#0a0c10',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setVisible(false);

    const job =
      role === 'vendor'
        ? 'E · shop'
        : role === 'crafter'
          ? 'E · craft'
          : role === 'board'
            ? 'E · bounties'
            : 'E · trade / repair';
    this.prompt = scene.add
      .text(0, promptY, job, {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '10px',
        color: '#ffe08a',
        backgroundColor: '#0a0c10aa',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setVisible(false);

    this.body = scene.add.container(0, 0, [figure, label, this.prompt]);
    this.syncScreen();
  }

  setNear(near: boolean): void {
    // Hide name + hint unless in range — stops plaza label pile-up on phones.
    this.prompt.setVisible(near);
    const label = this.body.list.find(
      (c): c is Phaser.GameObjects.Text =>
        c instanceof Phaser.GameObjects.Text && c !== this.prompt,
    );
    label?.setVisible(near);
  }

  syncScreen(): void {
    const { screenX, screenY } = worldToScreen(this.worldX, this.worldY);
    this.body.setPosition(screenX, screenY);
    this.body.setDepth(depthFromWorld(this.worldX, this.worldY));
  }

  destroy(): void {
    this.body.destroy(true);
  }
}

/** Wooden notice board — not a person (avoids Inn+NPC house stack look). */
function drawNoticeBoard(g: Phaser.GameObjects.Graphics, accent: number): void {
  g.fillStyle(0x000000, 0.35);
  g.fillEllipse(0, 8, 28, 12);
  g.fillStyle(0x4a3420, 1);
  g.fillRect(-14, -28, 4, 34);
  g.fillRect(10, -28, 4, 34);
  g.fillStyle(0x6a4a28, 1);
  g.fillRect(-18, -36, 36, 26);
  g.fillStyle(0x8a6840, 1);
  g.fillRect(-16, -34, 32, 22);
  g.fillStyle(0xe8e0c8, 0.95);
  g.fillRect(-12, -30, 10, 12);
  g.fillRect(-1, -28, 12, 10);
  g.fillRect(4, -32, 8, 8);
  g.lineStyle(1, accent, 0.85);
  g.strokeRect(-18, -36, 36, 26);
  g.fillStyle(accent, 1);
  g.fillCircle(-7, -28, 2);
  g.fillCircle(5, -26, 2);
}
