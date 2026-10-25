import Phaser from 'phaser';
import { depthFromWorld, worldToScreen } from '../core/IsoMath';
import { getNodeDef } from '../systems/GatheringSystem';

export class ResourceNode {
  readonly id: string;
  readonly defId: string;
  worldX: number;
  worldY: number;
  hp: number;
  maxHp: number;
  depleted = false;
  readonly body: Phaser.GameObjects.Container;
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly bar: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    id: string,
    defId: string,
    worldX: number,
    worldY: number,
  ) {
    this.id = id;
    this.defId = defId;
    this.worldX = worldX;
    this.worldY = worldY;
    const def = getNodeDef(defId);
    this.maxHp = def?.hp ?? 30;
    this.hp = this.maxHp;
    this.gfx = scene.add.graphics();
    this.bar = scene.add.graphics();
    this.body = scene.add.container(0, 0, [this.gfx, this.bar]);
    this.redraw();
    this.syncScreen();
  }

  private color(): number {
    const def = getNodeDef(this.defId);
    return Phaser.Display.Color.HexStringToColor(def?.color ?? '#2E5A3C').color;
  }

  redraw(): void {
    this.gfx.clear();
    if (this.depleted) return;
    const c = this.color();
    if (this.defId.includes('tree')) {
      this.gfx.fillStyle(0x4a3020, 1);
      this.gfx.fillRect(-4, -4, 8, 14);
      this.gfx.fillStyle(c, 1);
      this.gfx.fillCircle(0, -14, 16);
    } else {
      this.gfx.fillStyle(c, 1);
      this.gfx.fillTriangle(0, -18, -14, 8, 14, 8);
      this.gfx.fillStyle(0x6ec6ff, 0.7);
      this.gfx.fillCircle(0, -4, 4);
    }
    this.bar.clear();
    if (this.hp < this.maxHp) {
      const w = 28;
      const ratio = this.hp / this.maxHp;
      this.bar.fillStyle(0x1a1a1a, 0.8);
      this.bar.fillRect(-w / 2, -34, w, 4);
      this.bar.fillStyle(0x6ecf7a, 1);
      this.bar.fillRect(-w / 2, -34, w * ratio, 4);
    }
  }

  syncScreen(): void {
    const { screenX, screenY } = worldToScreen(this.worldX, this.worldY);
    this.body.setPosition(screenX, screenY);
    this.body.setDepth(depthFromWorld(this.worldX, this.worldY));
  }

  applyDamage(amount: number): boolean {
    if (this.depleted) return false;
    this.hp -= amount;
    this.redraw();
    if (this.hp <= 0) {
      this.depleted = true;
      this.redraw();
      return true;
    }
    return false;
  }

  destroy(): void {
    this.body.destroy(true);
  }
}
