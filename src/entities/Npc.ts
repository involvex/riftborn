import Phaser from 'phaser';
import { depthFromWorld, worldToScreen } from '../core/IsoMath';
import type { NpcRole } from '../world/MapGen';

const ROLE_COLOR: Record<NpcRole, number> = {
  vendor: 0xc4a574,
  crafter: 0x6ec6a0,
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
    const g = scene.add.graphics();
    // Simple iso figure
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(0, 6, 22, 10);
    g.fillStyle(color, 1);
    g.fillEllipse(0, 0, 18, 12);
    g.fillStyle(0xd8c4a0, 1);
    g.fillCircle(0, -12, 7);
    g.lineStyle(2, 0x1a1410, 0.8);
    g.strokeEllipse(0, 0, 18, 12);

    const label = scene.add
      .text(0, -28, name, {
        fontFamily: 'Georgia, serif',
        fontSize: '12px',
        color: '#e8e4d8',
        stroke: '#0a0c10',
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    const job =
      role === 'vendor' ? 'Armorer · E to trade' : 'Crafter · E to craft';
    this.prompt = scene.add
      .text(0, 18, job, {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '10px',
        color: '#8a9aaa',
      })
      .setOrigin(0.5)
      .setAlpha(0.35);

    this.body = scene.add.container(0, 0, [g, label, this.prompt]);
    this.syncScreen();
  }

  setNear(near: boolean): void {
    this.prompt.setAlpha(near ? 1 : 0.35);
    this.prompt.setColor(near ? '#ffe08a' : '#8a9aaa');
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
