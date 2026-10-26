import Phaser from 'phaser';
import { depthFromWorld, worldToScreen } from '../core/IsoMath';
import { ensureGameSprites, isPaintedSprite } from '../render/SpriteAtlas';
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
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly bar: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    id: string,
    defId: string,
    worldX: number,
    worldY: number,
  ) {
    ensureGameSprites(scene);
    this.id = id;
    this.defId = defId;
    this.worldX = worldX;
    this.worldY = worldY;
    const def = getNodeDef(defId);
    this.maxHp = def?.hp ?? 30;
    this.hp = this.maxHp;
    const tex = defId.includes('tree')
      ? 'spr_tree'
      : defId.includes('bush')
        ? 'spr_tree'
        : 'spr_vein';
    this.sprite = scene.add.sprite(0, -4, tex);
    this.sprite.setOrigin(0.5, 0.85);
    const bush = defId.includes('bush');
    this.sprite.setScale(
      isPaintedSprite(tex) ? (bush ? 0.42 : 0.7) : bush ? 0.7 : 1.25,
    );
    if (bush) this.sprite.setTint(0x6a9a4a);
    this.bar = scene.add.graphics();
    this.body = scene.add.container(0, 0, [this.sprite, this.bar]);
    this.redraw();
    this.syncScreen();
  }

  redraw(): void {
    this.bar.clear();
    if (this.depleted) {
      this.sprite.setVisible(false);
      return;
    }
    this.sprite.setVisible(true);
    if (this.hp < this.maxHp) {
      const w = 28;
      const ratio = this.hp / this.maxHp;
      this.bar.fillStyle(0x1a1a1a, 0.8);
      this.bar.fillRect(-w / 2, -40, w, 4);
      this.bar.fillStyle(0x6ecf7a, 1);
      this.bar.fillRect(-w / 2, -40, w * ratio, 4);
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
    this.sprite.setTint(0xffffff);
    this.sprite.scene.time.delayedCall(50, () => {
      if (!this.depleted) this.sprite.clearTint();
    });
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
