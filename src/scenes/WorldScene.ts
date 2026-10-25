import Phaser from 'phaser';
import { depthFromWorld, worldDistance, worldToScreen } from '../core/IsoMath';
import { Events, gameEvents } from '../core/EventBus';
import { Enemy } from '../entities/Enemy';
import { Player } from '../entities/Player';
import { ResourceNode } from '../entities/ResourceNode';
import { describeGear } from '../systems/ItemGen';
import { gameState } from '../systems/GameState';
import { generateHub, type ZoneLayout } from '../world/MapGen';
import {
  generateDungeon,
  isWalkable,
  type DungeonMap,
} from '../world/DungeonGen';
import { netClient } from '../net/NetClient';
import { bindAction } from '../core/Hotkeys';
import { audioBus } from '../core/AudioBus';
import { settingsStore } from '../core/SettingsStore';

const HUB_SIZE = 24;

export class WorldScene extends Phaser.Scene {
  private player!: Player;
  private nodes: ResourceNode[] = [];
  private enemies: Enemy[] = [];
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private keyE!: Phaser.Input.Keyboard.Key;
  private keyF!: Phaser.Input.Keyboard.Key;
  private keyR!: Phaser.Input.Keyboard.Key;
  private keySpace!: Phaser.Input.Keyboard.Key;
  private keyP!: Phaser.Input.Keyboard.Key;
  private tiles!: Phaser.GameObjects.Graphics;
  private portalMarker: Phaser.GameObjects.Container | null = null;
  private benchMarker: Phaser.GameObjects.Container | null = null;
  private saveTimer = 0;
  private shakeUntil = 0;
  private nearBench = false;
  private riftCleared = false;
  private enemySeq = 0;
  private nodeSeq = 0;
  private dungeon: DungeonMap | null = null;
  private remoteGhosts = new Map<string, Phaser.GameObjects.Container>();
  private unsubNet: (() => void) | null = null;

  constructor() {
    super('WorldScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#12161c');
    this.tiles = this.add.graphics();

    this.player = new Player(
      this,
      gameState.worldX || 8,
      gameState.worldY || 8,
    );

    this.loadZone(gameState.inRift);
    this.setupInput();
    this.cameras.main.startFollow(this.player.body, true, 0.12, 0.12);
    this.cameras.main.setZoom(1.1);

    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
  }

  private cleanup(): void {
    this.unsubNet?.();
    this.unsubNet = null;
    this.player?.destroy();
    for (const n of this.nodes) n.destroy();
    for (const e of this.enemies) e.destroy();
    this.nodes = [];
    this.enemies = [];
    for (const g of this.remoteGhosts.values()) g.destroy(true);
    this.remoteGhosts.clear();
  }

  private setupInput(): void {
    if (!this.input.keyboard) return;
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D') as typeof this.wasd;
    this.rebindActionKeys();

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) this.tryAttack();
    });

    gameEvents.on(Events.SETTINGS_CHANGED, () => this.rebindActionKeys());
  }

  /** Re-read hotkeys from settings (after ESC menu changes). */
  rebindActionKeys(): void {
    if (!this.input.keyboard) return;
    this.keyE = bindAction(this.input.keyboard, 'gather');
    this.keyF = bindAction(this.input.keyboard, 'craft');
    this.keyR = bindAction(this.input.keyboard, 'portal');
    this.keySpace = bindAction(this.input.keyboard, 'dash');
    this.keyP = bindAction(this.input.keyboard, 'coop');
  }

  private loadZone(rift: boolean): void {
    if (rift) {
      const seed = gameState.riftSeed ?? Date.now();
      this.dungeon = generateDungeon(seed);
      this.player.maxX = this.dungeon.width - 1.5;
      this.player.maxY = this.dungeon.height - 1.5;
      this.player.walkCheck = (x, y) =>
        this.dungeon ? isWalkable(this.dungeon, x, y) : true;
      this.drawDungeonTiles(this.dungeon);
      const spawn = this.dungeon.layout.spawn;
      if (spawn) {
        this.player.worldX = spawn.x;
        this.player.worldY = spawn.y;
        gameState.worldX = spawn.x;
        gameState.worldY = spawn.y;
      }
      this.spawnFromLayout(this.dungeon.layout);
    } else {
      this.dungeon = null;
      this.player.maxX = HUB_SIZE - 0.5;
      this.player.maxY = HUB_SIZE - 0.5;
      this.player.walkCheck = null;
      this.drawHubTiles();
      this.spawnFromLayout(generateHub(42));
    }
    this.player.syncScreen();
  }

  private spawnFromLayout(layout: ZoneLayout): void {
    for (const n of this.nodes) n.destroy();
    for (const e of this.enemies) e.destroy();
    this.nodes = [];
    this.enemies = [];
    this.portalMarker?.destroy(true);
    this.benchMarker?.destroy(true);
    this.riftCleared = false;

    for (const n of layout.nodes) {
      this.nodes.push(
        new ResourceNode(this, `node_${this.nodeSeq++}`, n.defId, n.x, n.y),
      );
    }

    for (const pack of layout.packs) {
      for (let i = 0; i < pack.count; i++) {
        const ox = (Math.random() - 0.5) * 2.2;
        const oy = (Math.random() - 0.5) * 2.2;
        this.enemies.push(
          new Enemy(
            this,
            `enemy_${this.enemySeq++}`,
            pack.enemyId,
            pack.x + ox,
            pack.y + oy,
          ),
        );
      }
    }

    if (layout.elite) {
      this.enemies.push(
        new Enemy(
          this,
          `enemy_${this.enemySeq++}`,
          'rift_lord',
          layout.elite.x,
          layout.elite.y,
        ),
      );
    }

    if (layout.portal) {
      this.portalMarker = this.makeMarker(
        layout.portal.x,
        layout.portal.y,
        0x4db6ff,
        gameState.inRift ? 'Exit' : 'Rift',
      );
    }
    this.benchMarker = this.makeMarker(
      layout.bench.x,
      layout.bench.y,
      0xc4a574,
      'Bench',
    );
  }

  private makeMarker(
    wx: number,
    wy: number,
    color: number,
    label: string,
  ): Phaser.GameObjects.Container {
    const { screenX, screenY } = worldToScreen(wx, wy);
    const g = this.add.graphics();
    g.fillStyle(color, 0.35);
    g.fillEllipse(0, 0, 40, 20);
    g.lineStyle(2, color, 0.9);
    g.strokeEllipse(0, 0, 40, 20);
    const t = this.add
      .text(0, -22, label, {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '11px',
        color: '#e8e4d8',
      })
      .setOrigin(0.5);
    const c = this.add.container(screenX, screenY, [g, t]);
    c.setDepth(depthFromWorld(wx, wy) - 1);
    c.setData('wx', wx);
    c.setData('wy', wy);
    return c;
  }

  private drawHubTiles(): void {
    this.tiles.clear();
    for (let y = 0; y < HUB_SIZE; y++) {
      for (let x = 0; x < HUB_SIZE; x++) {
        this.drawIsoTile(x, y, (x + y) % 2 === 0 ? 0x1e2a22 : 0x18241c);
      }
    }
    this.tiles.setDepth(-1000);
  }

  private drawDungeonTiles(map: DungeonMap): void {
    this.tiles.clear();
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        if (map.cells[y][x] !== 1) continue;
        const shade = (x + y) % 2 === 0 ? 0x1a2430 : 0x15202a;
        this.drawIsoTile(x, y, shade);
        if (Math.random() > 0.94) {
          const { screenX, screenY } = worldToScreen(x, y);
          this.tiles.fillStyle(0x2a5070, 0.35);
          this.tiles.fillCircle(screenX, screenY, 4);
        }
      }
    }
    this.tiles.setDepth(-1000);
  }

  private drawIsoTile(x: number, y: number, color: number): void {
    const { screenX, screenY } = worldToScreen(x, y);
    this.tiles.fillStyle(color, 1);
    this.tiles.beginPath();
    this.tiles.moveTo(screenX, screenY - 16);
    this.tiles.lineTo(screenX + 32, screenY);
    this.tiles.lineTo(screenX, screenY + 16);
    this.tiles.lineTo(screenX - 32, screenY);
    this.tiles.closePath();
    this.tiles.fillPath();
  }

  update(_time: number, delta: number): void {
    const dt = Math.min(0.05, delta / 1000);
    gameState.playTimeSec += dt;
    this.player.tick(dt);

    let dx = 0;
    let dy = 0;
    if (this.wasd.A.isDown || this.cursors.left?.isDown) dx -= 1;
    if (this.wasd.D.isDown || this.cursors.right?.isDown) dx += 1;
    if (this.wasd.W.isDown || this.cursors.up?.isDown) dy -= 1;
    if (this.wasd.S.isDown || this.cursors.down?.isDown) dy += 1;

    if (!netClient.connected) {
      this.player.move(dx, dy, dt);
    } else {
      netClient.sendInput({
        dx,
        dy,
        attack: false,
        gather: false,
        skill: false,
      });
    }

    if (Phaser.Input.Keyboard.JustDown(this.keyE)) this.tryGather();
    if (Phaser.Input.Keyboard.JustDown(this.keyF)) this.tryCraftNearby();
    if (Phaser.Input.Keyboard.JustDown(this.keyR)) this.tryPortal();
    if (Phaser.Input.Keyboard.JustDown(this.keySpace)) this.tryDash(dx, dy);
    if (Phaser.Input.Keyboard.JustDown(this.keyP)) this.toggleCoop();

    this.updateEnemies(dt);
    this.updateBenchProximity();
    this.checkRiftClear();

    this.saveTimer += dt;
    if (this.saveTimer > 8) {
      this.saveTimer = 0;
      gameState.persist();
    }

    if (this.time.now < this.shakeUntil) {
      this.cameras.main.shake(40, 0.004);
    }
  }

  private updateEnemies(dt: number): void {
    if (netClient.connected) return;
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const result = enemy.update(dt, this.player.worldX, this.player.worldY);
      if (result.hitPlayer) {
        const dealt = gameState.takeDamage(result.damage);
        const { screenX, screenY } = worldToScreen(
          this.player.worldX,
          this.player.worldY,
        );
        if (settingsStore.get().showDamageNumbers) {
          gameState.combat.emitDamageNumber(
            screenX,
            screenY - 20,
            dealt,
            'player',
          );
        }
        audioBus.hit();
        this.shakeUntil = this.time.now + 120;
        if (gameState.hp <= 0) this.onPlayerDeath();
      }
    }
  }

  private onPlayerDeath(): void {
    audioBus.death();
    gameState.hp = Math.floor(gameState.maxHp * 0.5);
    if (gameState.inRift) {
      gameState.inRift = false;
      gameState.riftSeed = null;
      gameState.worldX = 8;
      gameState.worldY = 8;
      this.player.worldX = 8;
      this.player.worldY = 8;
      this.loadZone(false);
    } else {
      gameState.worldX = 8;
      gameState.worldY = 8;
      this.player.worldX = 8;
      this.player.worldY = 8;
      this.player.syncScreen();
    }
    gameState.persist();
    gameEvents.emit(Events.PLAYER_DIED, {});
  }

  private tryAttack(): void {
    if (this.player.attackCooldown > 0) return;
    this.player.attackCooldown = 0.35;
    const range = gameState.inventory.weaponRange();
    const dmg = gameState.combat.playerAttackDamage();
    let hit = false;
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const dist = worldDistance(
        { x: this.player.worldX, y: this.player.worldY },
        { x: enemy.worldX, y: enemy.worldY },
      );
      if (dist > range) continue;
      hit = true;
      const { screenX, screenY } = worldToScreen(enemy.worldX, enemy.worldY);
      gameState.combat.emitDamageNumber(screenX, screenY - 18, dmg, 'enemy');
      const killed = enemy.applyDamage(dmg);
      if (killed) {
        gameState.combat.grantKillRewards(enemy.def.xp, enemy.def.lootTable, {
          elite: enemy.def.isElite,
          onGear: (g) => gameEvents.emit('ui:toast', { text: describeGear(g) }),
        });
        gameState.persist();
        this.shakeUntil = this.time.now + 80;
      }
    }
    if (hit) this.flashSwing();
    if (netClient.connected) {
      netClient.sendInput({
        dx: 0,
        dy: 0,
        attack: true,
        gather: false,
        skill: false,
      });
    }
  }

  private flashSwing(): void {
    const g = this.add.graphics();
    const { screenX, screenY } = worldToScreen(
      this.player.worldX,
      this.player.worldY,
    );
    g.lineStyle(2, 0xe8e4d8, 0.7);
    g.strokeCircle(screenX, screenY, 28);
    g.setDepth(9999);
    this.tweens.add({
      targets: g,
      alpha: 0,
      duration: 180,
      onComplete: () => g.destroy(),
    });
  }

  private tryGather(): void {
    const dmg = gameState.gathering.gatherDamagePerHit();
    for (const node of this.nodes) {
      if (node.depleted) continue;
      const dist = worldDistance(
        { x: this.player.worldX, y: this.player.worldY },
        { x: node.worldX, y: node.worldY },
      );
      if (dist > this.player.gatherRange) continue;
      const depleted = node.applyDamage(dmg);
      if (depleted) gameState.gathering.grantNodeDrops(node.defId);
      return;
    }
  }

  private tryCraftNearby(): void {
    if (!this.nearBench) {
      gameEvents.emit('ui:toast', { text: 'Move closer to the Bench' });
      return;
    }
    gameEvents.emit('ui:openCraft', {});
  }

  private tryPortal(): void {
    if (!this.portalMarker) return;
    const wx = this.portalMarker.getData('wx') as number;
    const wy = this.portalMarker.getData('wy') as number;
    const dist = worldDistance(
      { x: this.player.worldX, y: this.player.worldY },
      { x: wx, y: wy },
    );
    if (dist > 1.8) {
      gameEvents.emit('ui:toast', { text: 'Get closer to the Rift portal' });
      return;
    }
    if (!gameState.inRift) {
      gameState.inRift = true;
      gameState.riftSeed = (Date.now() ^ (Math.random() * 1e9)) >>> 0;
      this.loadZone(true);
      gameEvents.emit(Events.RIFT_ENTERED, { seed: gameState.riftSeed });
    } else {
      const bonusXp = this.riftCleared ? 50 : 12;
      gameState.progression.addXp(bonusXp);
      if (this.riftCleared) {
        gameState.inventory.add('rift_shard', 1);
        gameState.inventory.add('gold', 20);
      }
      gameState.inRift = false;
      gameState.riftSeed = null;
      gameState.worldX = 18;
      gameState.worldY = 6;
      this.player.worldX = 18;
      this.player.worldY = 6;
      this.loadZone(false);
      gameEvents.emit(Events.RIFT_CLEARED, { cleared: this.riftCleared });
    }
    gameState.persist();
  }

  private tryDash(dx: number, dy: number): void {
    if (this.player.skillCooldown > 0) return;
    this.player.skillCooldown = 2.5;
    let mx = dx;
    let my = dy;
    if (mx === 0 && my === 0) {
      mx = 1;
      my = 0;
    }
    const len = Math.hypot(mx, my) || 1;
    const nx = this.player.worldX + (mx / len) * 2.2;
    const ny = this.player.worldY + (my / len) * 2.2;
    if (!this.player.walkCheck || this.player.walkCheck(nx, ny)) {
      this.player.worldX = Phaser.Math.Clamp(nx, 0.5, this.player.maxX);
      this.player.worldY = Phaser.Math.Clamp(ny, 0.5, this.player.maxY);
      this.player.syncScreen();
    }

    const dmg = Math.floor(gameState.combat.playerAttackDamage() * 0.6);
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const dist = worldDistance(
        { x: this.player.worldX, y: this.player.worldY },
        { x: enemy.worldX, y: enemy.worldY },
      );
      if (dist > 1.6) continue;
      const { screenX, screenY } = worldToScreen(enemy.worldX, enemy.worldY);
      gameState.combat.emitDamageNumber(screenX, screenY - 18, dmg, 'enemy');
      if (enemy.applyDamage(dmg)) {
        gameState.combat.grantKillRewards(enemy.def.xp, enemy.def.lootTable, {
          elite: enemy.def.isElite,
          onGear: (g) => gameEvents.emit('ui:toast', { text: describeGear(g) }),
        });
        gameState.persist();
      }
    }
    this.cameras.main.flash(80, 110, 160, 200, false, undefined, this);
  }

  private updateBenchProximity(): void {
    if (!this.benchMarker) {
      this.nearBench = false;
      return;
    }
    const wx = this.benchMarker.getData('wx') as number;
    const wy = this.benchMarker.getData('wy') as number;
    this.nearBench =
      worldDistance(
        { x: this.player.worldX, y: this.player.worldY },
        { x: wx, y: wy },
      ) < 1.8;
  }

  private checkRiftClear(): void {
    if (!gameState.inRift || this.riftCleared) return;
    const anyAlive = this.enemies.some((e) => e.alive);
    if (!anyAlive && this.enemies.length > 0) {
      this.riftCleared = true;
      gameEvents.emit('ui:toast', {
        text: 'Dungeon cleared! Find the Exit portal.',
      });
      this.cameras.main.flash(200, 80, 160, 220, false, undefined, this);
    }
  }

  private toggleCoop(): void {
    if (netClient.connected) {
      netClient.requestLeave();
      netClient.disconnect();
      this.unsubNet?.();
      this.unsubNet = null;
      for (const g of this.remoteGhosts.values()) g.destroy(true);
      this.remoteGhosts.clear();
      gameEvents.emit('ui:toast', { text: 'Left co-op session' });
      return;
    }
    this.unsubNet = netClient.onMessage((msg) => {
      if (msg.type === 'welcome') {
        gameEvents.emit('ui:toast', {
          text: msg.host ? 'Hosting co-op session' : 'Joined co-op session',
        });
      }
      if (msg.type === 'error') {
        gameEvents.emit('ui:toast', { text: msg.message });
      }
      if (msg.type === 'state') {
        this.applyNetState(msg.players);
      }
      if (msg.type === 'session_rewards') {
        gameEvents.emit('ui:toast', {
          text: `Session rewards: +${msg.xp} XP`,
        });
      }
    });
    void netClient.resolveUrl().then((url) => {
      netClient.connect(url);
      gameEvents.emit('ui:toast', { text: `Connecting to ${url} …` });
    });
  }

  private applyNetState(
    players: { id: string; name: string; x: number; y: number }[],
  ): void {
    const seen = new Set<string>();
    for (const p of players) {
      if (p.id === netClient.playerId) {
        this.player.worldX = p.x;
        this.player.worldY = p.y;
        this.player.syncScreen();
        continue;
      }
      seen.add(p.id);
      let ghost = this.remoteGhosts.get(p.id);
      if (!ghost) {
        const g = this.add.graphics();
        g.fillStyle(0x6ec6ff, 0.85);
        g.fillEllipse(0, 0, 20, 12);
        const label = this.add
          .text(0, -20, p.name, {
            fontSize: '11px',
            color: '#a8d8ff',
            fontFamily: 'Segoe UI, sans-serif',
          })
          .setOrigin(0.5);
        ghost = this.add.container(0, 0, [g, label]);
        this.remoteGhosts.set(p.id, ghost);
      }
      const { screenX, screenY } = worldToScreen(p.x, p.y);
      ghost.setPosition(screenX, screenY);
      ghost.setDepth(depthFromWorld(p.x, p.y));
    }
    for (const [id, ghost] of this.remoteGhosts) {
      if (!seen.has(id)) {
        ghost.destroy(true);
        this.remoteGhosts.delete(id);
      }
    }
  }
}
