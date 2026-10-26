import Phaser from 'phaser';
import {
  depthFromWorld,
  snapToTile,
  worldDistance,
  worldToScreen,
} from '../core/IsoMath';
import { Events, gameEvents } from '../core/EventBus';
import { Enemy } from '../entities/Enemy';
import { Npc } from '../entities/Npc';
import { Player } from '../entities/Player';
import { ResourceNode } from '../entities/ResourceNode';
import { describeGear } from '../systems/ItemGen';
import { gameState } from '../systems/GameState';
import {
  generateHub,
  inPlaza,
  type HubDecor,
  type WildernessPoi,
  type ZoneLayout,
} from '../world/MapGen';
import {
  generateDungeon,
  isWalkable,
  type DungeonMap,
} from '../world/DungeonGen';
import { netClient } from '../net/NetClient';
import { bindAction } from '../core/Hotkeys';
import { audioBus } from '../core/AudioBus';
import { settingsStore } from '../core/SettingsStore';

const DEFAULT_HUB_SIZE = 36;
const TOWN_SPAWN = { x: 17.5, y: 18.5 };

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
  private keyTown!: Phaser.Input.Keyboard.Key;
  private keySpace!: Phaser.Input.Keyboard.Key;
  private keyP!: Phaser.Input.Keyboard.Key;
  private keySkill1!: Phaser.Input.Keyboard.Key;
  private keySkill2!: Phaser.Input.Keyboard.Key;
  private keySkill3!: Phaser.Input.Keyboard.Key;
  private tiles!: Phaser.GameObjects.Graphics;
  private portalMarker: Phaser.GameObjects.Container | null = null;
  private benchMarker: Phaser.GameObjects.Container | null = null;
  private npcs: Npc[] = [];
  private decor: Phaser.GameObjects.Container[] = [];
  private nearNpc: Npc | null = null;
  private saveTimer = 0;
  private shakeUntil = 0;
  private nearBench = false;
  private riftCleared = false;
  private riftKills = 0;
  private riftKillGoal = 18;
  private riftBossSpawned = false;
  private riftBossDead = false;
  private bossAnchor: { x: number; y: number } | null = null;
  private hubLayout: ZoneLayout | null = null;
  private hubSize = DEFAULT_HUB_SIZE;
  private wildernessPois: WildernessPoi[] = [];
  private announcedPois = new Set<string>();
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
    gameEvents.on('combat:castSkill', (p) => {
      const d = p as { slot: number };
      this.tryCastSkill(d.slot);
    });
  }

  /** Re-read hotkeys from settings (after ESC menu changes). */
  rebindActionKeys(): void {
    if (!this.input.keyboard) return;
    this.keyE = bindAction(this.input.keyboard, 'gather');
    this.keyF = bindAction(this.input.keyboard, 'craft');
    this.keyR = bindAction(this.input.keyboard, 'portal');
    this.keyTown = bindAction(this.input.keyboard, 'town');
    this.keySpace = bindAction(this.input.keyboard, 'dash');
    this.keyP = bindAction(this.input.keyboard, 'coop');
    this.keySkill1 = bindAction(this.input.keyboard, 'skill1');
    this.keySkill2 = bindAction(this.input.keyboard, 'skill2');
    this.keySkill3 = bindAction(this.input.keyboard, 'skill3');
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
      this.hubLayout = generateHub(42);
      this.hubSize = this.hubLayout.size ?? DEFAULT_HUB_SIZE;
      this.player.maxX = this.hubSize - 0.5;
      this.player.maxY = this.hubSize - 0.5;
      this.player.walkCheck = null;
      this.drawHubTiles();
      const hubSpawn = this.hubLayout.spawn ?? TOWN_SPAWN;
      const inBounds =
        gameState.worldX > 1 &&
        gameState.worldX < this.hubSize - 1 &&
        gameState.worldY > 1 &&
        gameState.worldY < this.hubSize - 1;
      // Old saves may sit outside the new plaza — pull them home
      const useSaved = inBounds && inPlaza(gameState.worldX, gameState.worldY);
      const snapped = snapToTile(
        useSaved ? gameState.worldX : hubSpawn.x,
        useSaved ? gameState.worldY : hubSpawn.y,
      );
      this.player.worldX = snapped.x;
      this.player.worldY = snapped.y;
      gameState.worldX = snapped.x;
      gameState.worldY = snapped.y;
      this.spawnFromLayout(this.hubLayout);
    }
    this.player.syncScreen();
  }

  private spawnFromLayout(layout: ZoneLayout): void {
    for (const n of this.nodes) n.destroy();
    for (const e of this.enemies) e.destroy();
    for (const n of this.npcs) n.destroy();
    for (const d of this.decor) d.destroy(true);
    this.nodes = [];
    this.enemies = [];
    this.npcs = [];
    this.decor = [];
    this.nearNpc = null;
    this.portalMarker?.destroy(true);
    this.portalMarker = null;
    this.benchMarker?.destroy(true);
    this.benchMarker = null;
    this.riftCleared = false;
    this.riftKills = 0;
    this.riftBossSpawned = false;
    this.riftBossDead = false;
    this.riftKillGoal = layout.killGoal ?? 18;
    this.bossAnchor = layout.elite ? { ...layout.elite } : null;

    for (const n of layout.nodes) {
      const p = snapToTile(n.x, n.y);
      this.nodes.push(
        new ResourceNode(this, `node_${this.nodeSeq++}`, n.defId, p.x, p.y),
      );
    }

    // Hub fringe + rifts both use packs; plaza never hosts enemies.
    for (const pack of layout.packs) {
      if (!gameState.inRift && inPlaza(pack.x, pack.y)) continue;
      for (let i = 0; i < pack.count; i++) {
        const ox = (Math.random() - 0.5) * 1.8;
        const oy = (Math.random() - 0.5) * 1.8;
        const p = snapToTile(pack.x + ox, pack.y + oy);
        if (!gameState.inRift && inPlaza(p.x, p.y)) continue;
        const elitePack = gameState.inRift && Math.random() < 0.14;
        this.enemies.push(
          new Enemy(this, `enemy_${this.enemySeq++}`, pack.enemyId, p.x, p.y, {
            elitePack,
            levelScale: gameState.progression.level,
          }),
        );
      }
    }

    if (layout.portal) {
      const p = snapToTile(layout.portal.x, layout.portal.y);
      this.portalMarker = gameState.inRift
        ? this.makeMarker(p.x, p.y, 0x4db6ff, 'Exit · R')
        : this.makeObelisk(p.x, p.y);
    }

    if (!gameState.inRift) {
      const b = snapToTile(layout.bench.x, layout.bench.y);
      this.benchMarker = this.makeMarker(b.x, b.y, 0xc4a574, 'Forge');
      for (const n of layout.npcs ?? []) {
        const p = snapToTile(n.x, n.y);
        this.npcs.push(new Npc(this, n.id, n.role, n.name, p.x, p.y));
      }
      this.makeBuilding(15.5, 15.5, 0x3a3028, 'Shop');
      this.makeBuilding(19.5, 15.5, 0x2a3a32, 'Forge');
      this.makeBuilding(17.5, 20.5, 0x2a2838, 'Inn');
      for (const d of layout.decor ?? []) this.makeHubDecor(d);
      this.wildernessPois = layout.pois ?? [];
      this.announcedPois.clear();
      for (const poi of this.wildernessPois) this.makePoiMarker(poi);
    } else {
      this.wildernessPois = [];
      this.announcedPois.clear();
    }

    this.emitRiftProgress();
  }

  private makePoiMarker(poi: WildernessPoi): void {
    const p = snapToTile(poi.x, poi.y);
    const { screenX, screenY } = worldToScreen(p.x, p.y);
    const accent = poi.kind === 'camp' ? 0xc45c3a : 0x6a80a0;
    const g = this.add.graphics();
    g.lineStyle(2, accent, 0.55);
    g.strokeEllipse(0, 2, 52, 24);
    const subtitle = poi.kind === 'camp' ? 'Bandit camp' : 'Ancient ruin';
    const title = this.add
      .text(0, -36, poi.name, {
        fontFamily: 'Georgia, serif',
        fontSize: '13px',
        color: poi.kind === 'camp' ? '#e8b090' : '#b8c8e0',
        stroke: '#0a0c10',
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    const sub = this.add
      .text(0, -20, subtitle, {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '10px',
        color: '#8a9aaa',
        stroke: '#0a0c10',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    const c = this.add.container(screenX, screenY, [g, title, sub]);
    c.setDepth(depthFromWorld(p.x, p.y) + 50);
    this.decor.push(c);
  }

  private updatePoiProximity(): void {
    if (gameState.inRift || this.wildernessPois.length === 0) return;
    for (const poi of this.wildernessPois) {
      const dist = worldDistance(
        { x: this.player.worldX, y: this.player.worldY },
        { x: poi.x, y: poi.y },
      );
      if (dist > poi.radius + 1.2) {
        this.announcedPois.delete(`left_${poi.id}`);
        continue;
      }
      if (this.announcedPois.has(poi.id)) continue;
      this.announcedPois.add(poi.id);
      const tip =
        poi.kind === 'camp'
          ? `${poi.name} — mid-tier bandits ahead`
          : `${poi.name} — stronger foes & richer veins`;
      gameEvents.emit('ui:toast', { text: tip });
    }
  }

  private makeHubDecor(d: HubDecor): void {
    const p = snapToTile(d.x, d.y);
    const { screenX, screenY } = worldToScreen(p.x, p.y);
    const g = this.add.graphics();
    switch (d.kind) {
      case 'lantern':
        g.fillStyle(0x1a1410, 0.9);
        g.fillRect(-2, -18, 4, 16);
        g.fillStyle(0xe6c35c, 0.95);
        g.fillCircle(0, -22, 5);
        g.fillStyle(0xfff0c0, 0.25);
        g.fillCircle(0, -22, 12);
        break;
      case 'well':
        g.fillStyle(0x000000, 0.3);
        g.fillEllipse(0, 4, 36, 14);
        g.fillStyle(0x4a5058, 1);
        g.fillEllipse(0, 0, 30, 12);
        g.fillStyle(0x2a4058, 1);
        g.fillEllipse(0, -2, 18, 8);
        g.lineStyle(2, 0xc4a574, 0.5);
        g.strokeEllipse(0, 0, 30, 12);
        break;
      case 'stall':
        g.fillStyle(0x5a4030, 0.95);
        g.fillRect(-16, -8, 32, 12);
        g.fillStyle(0xa05040, 0.9);
        g.fillTriangle(-18, -8, 18, -8, 0, -22);
        break;
      case 'crate':
        g.fillStyle(0x6a5038, 1);
        g.fillRect(-8, -10, 16, 12);
        g.lineStyle(1, 0x3a2818, 0.8);
        g.strokeRect(-8, -10, 16, 12);
        break;
      case 'rock':
        g.fillStyle(0x4a4e52, 1);
        g.fillEllipse(0, 0, 18, 10);
        g.fillStyle(0x5a6064, 1);
        g.fillEllipse(-2, -3, 10, 7);
        break;
      case 'bush':
        g.fillStyle(0x2a4a28, 1);
        g.fillCircle(-4, -2, 7);
        g.fillCircle(4, -2, 7);
        g.fillCircle(0, -6, 6);
        break;
      case 'tent':
        g.fillStyle(0x000000, 0.3);
        g.fillEllipse(0, 6, 28, 10);
        g.fillStyle(0x6a4a30, 1);
        g.fillTriangle(-16, 4, 16, 4, 0, -28);
        g.fillStyle(0x8a6040, 1);
        g.fillTriangle(-10, 4, 10, 4, 0, -22);
        g.lineStyle(1, 0x3a2818, 0.7);
        g.strokeTriangle(-16, 4, 16, 4, 0, -28);
        break;
      case 'campfire':
        g.fillStyle(0x3a2a18, 1);
        g.fillEllipse(0, 2, 16, 8);
        g.fillStyle(0xe07030, 0.95);
        g.fillCircle(0, -4, 5);
        g.fillStyle(0xffc060, 0.9);
        g.fillCircle(0, -8, 3);
        g.fillStyle(0xfff0a0, 0.2);
        g.fillCircle(0, -6, 14);
        break;
      case 'pillar':
        g.fillStyle(0x000000, 0.3);
        g.fillEllipse(0, 4, 14, 6);
        g.fillStyle(0x5a6570, 1);
        g.fillRect(-5, -36, 10, 38);
        g.fillStyle(0x7a8590, 1);
        g.fillRect(-7, -40, 14, 6);
        g.lineStyle(1, 0x2a3038, 0.8);
        g.strokeRect(-5, -36, 10, 38);
        break;
      case 'rubble':
        g.fillStyle(0x4a5058, 1);
        g.fillEllipse(-4, 0, 12, 7);
        g.fillEllipse(5, 1, 10, 6);
        g.fillStyle(0x6a7080, 1);
        g.fillEllipse(0, -3, 8, 5);
        break;
      default:
        break;
    }
    const c = this.add.container(screenX, screenY, [g]);
    c.setDepth(depthFromWorld(p.x, p.y) - 20);
    this.decor.push(c);
  }

  private makeBuilding(
    wx: number,
    wy: number,
    color: number,
    label: string,
  ): void {
    const p = snapToTile(wx, wy);
    const { screenX, screenY } = worldToScreen(p.x, p.y);
    const g = this.add.graphics();
    g.fillStyle(color, 0.88);
    g.fillRect(-22, -40, 44, 36);
    g.fillStyle(0x1a1410, 0.92);
    g.fillTriangle(-26, -40, 26, -40, 0, -58);
    g.lineStyle(1, 0xc4a574, 0.4);
    g.strokeRect(-22, -40, 44, 36);
    const t = this.add
      .text(0, -48, label, {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '10px',
        color: '#c8c0b0',
        stroke: '#0a0c10',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    const c = this.add.container(screenX, screenY, [g, t]);
    // Slightly behind foot depth so player/NPC draw in front when overlapping
    c.setDepth(depthFromWorld(p.x, p.y) - 40);
    this.decor.push(c);
  }

  /** Town rift opener — tall obelisk players use with R. */
  private makeObelisk(wx: number, wy: number): Phaser.GameObjects.Container {
    const { screenX, screenY } = worldToScreen(wx, wy);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(0, 4, 28, 12);
    g.fillStyle(0x2a4060, 1);
    g.fillRect(-8, -52, 16, 54);
    g.fillStyle(0x4db6ff, 0.95);
    g.fillTriangle(-10, -52, 10, -52, 0, -72);
    g.lineStyle(2, 0x8ec8ff, 0.9);
    g.strokeRect(-8, -52, 16, 54);
    const t = this.add
      .text(0, -82, 'Rift Obelisk · R', {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '11px',
        color: '#b8d8ff',
        stroke: '#0a0c10',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    const c = this.add.container(screenX, screenY, [g, t]);
    c.setDepth(depthFromWorld(wx, wy));
    c.setData('wx', wx);
    c.setData('wy', wy);
    return c;
  }

  private makeMarker(
    wx: number,
    wy: number,
    color: number,
    label: string,
  ): Phaser.GameObjects.Container {
    const p = snapToTile(wx, wy);
    const { screenX, screenY } = worldToScreen(p.x, p.y);
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
        stroke: '#0a0c10',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    const c = this.add.container(screenX, screenY, [g, t]);
    c.setDepth(depthFromWorld(p.x, p.y));
    c.setData('wx', p.x);
    c.setData('wy', p.y);
    return c;
  }

  private drawHubTiles(): void {
    this.tiles.clear();
    const size = this.hubSize;
    const pathSet = new Set(
      (this.hubLayout?.paths ?? []).map((p) => `${p.x},${p.y}`),
    );
    const pois = this.hubLayout?.pois ?? [];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const onPath = pathSet.has(`${x},${y}`);
        const plaza = inPlaza(x, y);
        const poi = pois.find(
          (p) => Math.hypot(x + 0.5 - p.x, y + 0.5 - p.y) <= p.radius,
        );
        let base: number;
        if (plaza) {
          base = (x + y) % 2 === 0 ? 0x4a463c : 0x3e3a32;
        } else if (poi?.kind === 'camp') {
          base = (x + y) % 2 === 0 ? 0x3a3228 : 0x322a22;
        } else if (poi?.kind === 'ruin') {
          base = (x + y) % 2 === 0 ? 0x2a323c : 0x222830;
        } else if (onPath) {
          base = (x + y) % 2 === 0 ? 0x3a3830 : 0x322e28;
        } else {
          const edge = x < 3 || y < 3 || x > size - 4 || y > size - 4;
          base = edge
            ? (x + y) % 2 === 0
              ? 0x1a2218
              : 0x141c14
            : (x + y) % 2 === 0
              ? 0x243028
              : 0x1c2620;
        }
        this.drawIsoTile(x, y, base);
        if (plaza && (x === 14 || x === 21 || y === 14 || y === 21)) {
          const { screenX, screenY } = worldToScreen(x, y);
          this.tiles.fillStyle(0xc4a574, 0.12);
          this.tiles.fillCircle(screenX, screenY, 4);
        }
      }
    }
    this.tiles.setDepth(-1000);
  }

  private drawDungeonTiles(map: DungeonMap): void {
    this.tiles.clear();
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        if (map.cells[y][x] !== 1) continue;
        const shade = (x + y) % 2 === 0 ? 0x1c2836 : 0x16202c;
        this.drawIsoTile(x, y, shade);
        if (Math.random() > 0.94) {
          const { screenX, screenY } = worldToScreen(x, y);
          this.tiles.fillStyle(0x3a6088, 0.4);
          this.tiles.fillCircle(screenX, screenY, 3);
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
    // Soft edge so the grid reads like a Sanctuary floor, not flat UI
    this.tiles.lineStyle(1, 0x000000, 0.22);
    this.tiles.strokePath();
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

    gameState.skills.tick(dt);

    if (Phaser.Input.Keyboard.JustDown(this.keyE)) this.tryInteract();
    if (Phaser.Input.Keyboard.JustDown(this.keyF)) this.tryCraftNearby();
    if (Phaser.Input.Keyboard.JustDown(this.keyR)) this.tryPortal();
    if (Phaser.Input.Keyboard.JustDown(this.keyTown)) this.returnToTown();
    if (Phaser.Input.Keyboard.JustDown(this.keySpace)) this.tryDash(dx, dy);
    if (Phaser.Input.Keyboard.JustDown(this.keyP)) this.toggleCoop();
    if (Phaser.Input.Keyboard.JustDown(this.keySkill1)) this.tryCastSkill(0);
    if (Phaser.Input.Keyboard.JustDown(this.keySkill2)) this.tryCastSkill(1);
    if (Phaser.Input.Keyboard.JustDown(this.keySkill3)) this.tryCastSkill(2);

    this.updateEnemies(dt);
    this.updateNpcProximity();
    this.updatePoiProximity();

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
      this.returnToTown(false, true);
      gameEvents.emit('ui:toast', { text: 'You fall… waking in town.' });
    } else {
      this.player.worldX = TOWN_SPAWN.x;
      this.player.worldY = TOWN_SPAWN.y;
      gameState.worldX = TOWN_SPAWN.x;
      gameState.worldY = TOWN_SPAWN.y;
      this.player.syncScreen();
      gameState.persist();
    }
    gameEvents.emit(Events.PLAYER_DIED, {});
  }

  /** Always available (B): leave rift / reset to plaza. */
  private returnToTown(reward = false, silent = false): void {
    const wasRift = gameState.inRift;
    if (wasRift && reward && this.riftCleared) {
      gameState.progression.addXp(50);
      gameState.inventory.add('rift_shard', 1);
      gameState.inventory.add('gold', 20);
    } else if (wasRift && !silent) {
      gameState.progression.addXp(8);
    }
    gameState.inRift = false;
    gameState.riftSeed = null;
    gameState.worldX = TOWN_SPAWN.x;
    gameState.worldY = TOWN_SPAWN.y;
    this.player.worldX = TOWN_SPAWN.x;
    this.player.worldY = TOWN_SPAWN.y;
    this.loadZone(false);
    gameState.persist();
    if (wasRift) {
      gameEvents.emit(Events.RIFT_CLEARED, {
        cleared: reward && this.riftCleared,
      });
      if (!silent) {
        gameEvents.emit('ui:toast', {
          text:
            reward && this.riftCleared
              ? 'Rift cleared — back in town'
              : 'Returned to town',
        });
      }
    } else if (!silent) {
      gameEvents.emit('ui:toast', { text: 'Already in town' });
    }
    this.emitRiftProgress();
  }

  private tryAttack(): void {
    if (this.player.attackCooldown > 0) return;
    this.player.attackCooldown = gameState.progression.attackCooldown();

    // Aim at nearest enemy in range, else toward click in world-ish screen space
    const pointer = this.input.activePointer;
    let aimX = this.player.worldX + 1;
    let aimY = this.player.worldY;
    let best = Infinity;
    const range = gameState.inventory.weaponRange();
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const dist = worldDistance(
        { x: this.player.worldX, y: this.player.worldY },
        { x: enemy.worldX, y: enemy.worldY },
      );
      if (dist <= range && dist < best) {
        best = dist;
        aimX = enemy.worldX;
        aimY = enemy.worldY;
      }
    }
    if (best === Infinity) {
      // Screen click right of player → face SE-ish
      const { screenX } = worldToScreen(this.player.worldX, this.player.worldY);
      aimX = this.player.worldX + (pointer.worldX >= screenX ? 1 : -1);
    }
    this.player.faceToward(aimX, aimY);
    this.player.playAttack();

    const dmg = Math.max(
      1,
      Math.floor(
        gameState.combat.playerAttackDamage() *
          gameState.skills.damageMultiplier(),
      ),
    );
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
      if (killed) this.onEnemyKilled(enemy);
    }
    if (hit) audioBus.hit();
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

  private onEnemyKilled(enemy: Enemy): void {
    const tier = Math.min(
      4,
      Math.max(
        1,
        (enemy.def.lootTier ?? 2) +
          (enemy.elitePack ? 1 : 0) +
          (enemy.isBoss ? 1 : 0),
      ),
    ) as 1 | 2 | 3 | 4;
    gameState.combat.grantKillRewards(enemy.def.xp, enemy.def.lootTable, {
      elite: enemy.awardsEliteLoot,
      lootTier: tier,
      onGear: (g) => gameEvents.emit('ui:toast', { text: describeGear(g) }),
    });
    gameState.persist();
    this.shakeUntil = this.time.now + 80;
    if (!gameState.inRift) return;

    if (enemy.isBoss) {
      this.riftBossDead = true;
      this.riftCleared = true;
      this.openExitPortal();
      gameEvents.emit('ui:toast', {
        text: 'Boss slain! Exit portal opened · R to leave · B town',
      });
      this.cameras.main.flash(220, 80, 160, 220, false, undefined, this);
      this.emitRiftProgress();
      return;
    }

    this.riftKills += 1;
    this.emitRiftProgress();
    if (!this.riftBossSpawned && this.riftKills >= this.riftKillGoal) {
      this.spawnRiftBoss();
    }
  }

  private spawnRiftBoss(): void {
    if (this.riftBossSpawned || !gameState.inRift) return;
    this.riftBossSpawned = true;
    const anchor = this.bossAnchor ?? {
      x: this.player.worldX + 2,
      y: this.player.worldY,
    };
    const p = snapToTile(anchor.x, anchor.y);
    this.enemies.push(
      new Enemy(this, `enemy_${this.enemySeq++}`, 'rift_lord', p.x, p.y, {
        boss: true,
        levelScale: gameState.progression.level + 2,
      }),
    );
    gameEvents.emit('ui:toast', {
      text: 'The Rift tears open — a Rift Lord emerges!',
    });
    this.cameras.main.flash(160, 120, 40, 80, false, undefined, this);
    this.emitRiftProgress();
  }

  private openExitPortal(): void {
    this.portalMarker?.destroy(true);
    const p = snapToTile(this.player.worldX, this.player.worldY - 1.5);
    this.portalMarker = this.makeMarker(p.x, p.y, 0x4db6ff, 'Exit · R');
  }

  private emitRiftProgress(): void {
    if (!gameState.inRift) {
      gameEvents.emit(Events.RIFT_PROGRESS, { active: false });
      return;
    }
    const phase = this.riftBossDead
      ? 'exit'
      : this.riftBossSpawned
        ? 'boss'
        : 'fill';
    gameEvents.emit(Events.RIFT_PROGRESS, {
      active: true,
      kills: this.riftKills,
      goal: this.riftKillGoal,
      phase,
    });
  }

  private tryCastSkill(slot: number): void {
    const result = gameState.skills.cast(slot, {
      player: this.player,
      enemies: this.enemies,
      combat: gameState.combat,
      walkCheck: this.player.walkCheck,
      gearSkillPower: gameState.inventory.totalGearStats().skillPower,
      onKill: (enemy) => this.onEnemyKilled(enemy),
    });
    if (!result.ok) {
      if (result.reason) gameEvents.emit('ui:toast', { text: result.reason });
      return;
    }
    audioBus.skill();
    gameState.worldX = this.player.worldX;
    gameState.worldY = this.player.worldY;
    if (netClient.connected) {
      netClient.sendInput({
        dx: 0,
        dy: 0,
        attack: false,
        gather: false,
        skill: true,
      });
    }
  }

  private tryInteract(): void {
    if (this.nearNpc) {
      if (this.nearNpc.role === 'vendor') {
        gameEvents.emit('ui:openShop', {});
        return;
      }
      if (this.nearNpc.role === 'crafter') {
        gameEvents.emit('ui:openCraft', {});
        return;
      }
    }
    if (this.nearBench) {
      gameEvents.emit('ui:openCraft', {});
      return;
    }
    this.tryGather();
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
    gameEvents.emit('ui:toast', {
      text: 'Talk to Mira (shop) or Bram (forge) · E near them',
    });
  }

  private tryCraftNearby(): void {
    if (this.nearNpc?.role === 'crafter' || this.nearBench) {
      gameEvents.emit('ui:openCraft', {});
      return;
    }
    gameEvents.emit('ui:toast', { text: 'Move closer to Bram or the Forge' });
  }

  private tryPortal(): void {
    if (!this.portalMarker) {
      if (gameState.inRift && !this.riftBossDead) {
        gameEvents.emit('ui:toast', {
          text: 'Fill the rift bar, slay the boss — then an Exit opens (or press B)',
        });
      }
      return;
    }
    const wx = this.portalMarker.getData('wx') as number;
    const wy = this.portalMarker.getData('wy') as number;
    const dist = worldDistance(
      { x: this.player.worldX, y: this.player.worldY },
      { x: wx, y: wy },
    );
    if (dist > 2.0) {
      gameEvents.emit('ui:toast', {
        text: gameState.inRift
          ? 'Get closer to the Exit portal'
          : 'Get closer to the Rift Obelisk',
      });
      return;
    }
    if (!gameState.inRift) {
      gameState.inRift = true;
      gameState.riftSeed = (Date.now() ^ (Math.random() * 1e9)) >>> 0;
      this.loadZone(true);
      gameEvents.emit(Events.RIFT_ENTERED, { seed: gameState.riftSeed });
      gameEvents.emit('ui:toast', {
        text: 'Rift opened — kill foes to fill the bar · B returns to town',
      });
      this.emitRiftProgress();
    } else if (this.riftBossDead) {
      this.returnToTown(true);
    } else {
      gameEvents.emit('ui:toast', {
        text: 'Defeat the boss to open the Exit (B abandons)',
      });
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
      if (enemy.applyDamage(dmg)) this.onEnemyKilled(enemy);
    }
    this.cameras.main.flash(80, 110, 160, 200, false, undefined, this);
  }

  private updateNpcProximity(): void {
    this.nearNpc = null;
    let best = 1.9;
    for (const npc of this.npcs) {
      const dist = worldDistance(
        { x: this.player.worldX, y: this.player.worldY },
        { x: npc.worldX, y: npc.worldY },
      );
      const near = dist < 1.9;
      npc.setNear(near);
      if (near && dist < best) {
        best = dist;
        this.nearNpc = npc;
      }
    }
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
