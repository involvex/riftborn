import Phaser from 'phaser';
import {
  depthFromWorld,
  snapToTile,
  worldDistance,
  worldToScreen,
} from '../core/IsoMath';
import { FIGURE_COLLISION_RADIUS, footprintFits } from '../core/FigureScale';
import { getAppliedCameraZoom } from '../core/GraphicsQuality';
import { shouldTriggerAmbush } from '../world/Ambush';
import { Events, gameEvents } from '../core/EventBus';
import {
  clearRiftbornDebug,
  installRiftbornDebug,
} from '../debug/RiftbornDebug';
import {
  DECOR_CULL_PAD,
  isScreenPointVisible,
  TILE_CULL_PAD,
} from '../core/ViewCull';
import { Enemy } from '../entities/Enemy';
import { GroundLoot } from '../entities/GroundLoot';
import { LootChest } from '../entities/LootChest';
import { Npc } from '../entities/Npc';
import { Player } from '../entities/Player';
import { ResourceNode } from '../entities/ResourceNode';
import { describeGear, gearDropChance, rollGearDrop } from '../systems/ItemGen';
import {
  rarityCss,
  rarityPhaser,
  rarityWantsBurst,
  rarityWantsCameraFlash,
} from '../systems/RarityVisual';
import { setChaseDropBias, setChaseStatus } from '../systems/SetChase';
import { gameState } from '../systems/GameState';
import {
  ASSIST_RANGE,
  directionTo,
  pickNearestEnemyIndex,
} from '../systems/AutoTarget';
import {
  canRepeatBasicAttack,
  shouldStartDesktopAttack,
} from '../systems/AttackHold';
import {
  generateHub,
  HUB_SIZE,
  HUB_SPAWN,
  inPlaza,
  nearTown,
  PLAZA,
  type HubDecor,
  type PoiKind,
  type WildernessPoi,
  type ZoneLayout,
} from '../world/MapGen';
import { isDungeonFloorEdge } from '../world/HubOptics';
import { findPoiNear, hubPoiFloorOverride } from '../world/HubPoiFloors';
import {
  HUB_DIRT_ROAD_EDGE,
  HUB_DIRT_ROAD_EDGE_ALPHA,
  HUB_PLAZA_EDGE_ALPHA,
  HUB_PLAZA_EDGE_COLOR,
  HUB_PLAZA_EDGE_RADIUS,
  HUB_PLAZA_GLOW_ALPHA,
  HUB_PLAZA_GLOW_COLOR,
  HUB_PLAZA_GLOW_EVERY,
  HUB_PLAZA_GLOW_RADIUS,
  hubBandTint,
  hubPoiFloorTint,
} from '../render/HubLook';
import type {
  CharacterClassId,
  GearInstance,
  GearRarity,
  LootTier,
} from '../types/game';
import {
  findDiagonalCorridorCell,
  generateDungeon,
  type DungeonMap,
} from '../world/DungeonGen';
import { isWalkableOnLayer } from '../world/ShiftGateMap';
import { netClient } from '../net/NetClient';
import { bindAction, formatHotkey } from '../core/Hotkeys';
import { audioBus } from '../core/AudioBus';
import { settingsStore } from '../core/SettingsStore';
import { getItemDef } from '../systems/InventorySystem';
import {
  biomeMatDropToast,
  type BiomeMatFeedbackState,
} from '../systems/BiomeMatFeedback';
import { playSkillVfx } from '../render/SkillVfx';
import { playCombatBurst } from '../render/CombatVfx';
import { playPortalReveal, playZoneWash } from '../render/PortalFx';
import { pickExitPortalPoint } from '../render/PortalPlacement';
import { screenDirToWorldDelta } from '../systems/SkillAim';
import type { SkillAimHint } from '../systems/SkillSystem';
import { shouldShowRangeHint } from '../systems/SkillRangeGate';
import { isRiftBossKill } from '../systems/RiftBoss';
import {
  basicAttackHitstopKind,
  basicAttackShakeKind,
  combatHitstopMs,
  combatShakeParams,
  isCombatCrit,
  type CombatHitstopKind,
  type CombatShakeKind,
} from '../render/CombatFeel';
import classesData from '../data/classes.json';
import {
  clampLootTier,
  depthRuleFor,
  earlyBiomeBossDmgMult,
  earlyBiomeBossHpMult,
  riftDepthFromLevel,
  riftDepthLabel,
  riftLootTierBump,
  riftPackBonus,
  type DepthRule,
} from '../systems/RiftDepth';
import {
  getRiftModifier,
  riftModLayerLock,
  rollRiftModifierForDepth,
  type RiftModifier,
} from '../systems/RiftModifiers';
import {
  cloneGearInstance,
  sanitizeRiftEnemies,
} from '../systems/RiftRunPersist';
import type { RiftRunSave } from '../types/save';
import {
  bossPhaseToastText,
  riftEnterToastText,
  veiledWrongLayerToast,
} from '../systems/RiftGoalCopy';
import {
  coopJoinBlockedReason,
  coopRiftBlockedReason,
  coopWelcomeToast,
} from '../systems/CoopGate';
import {
  buildMapMarkers,
  buildMapSnapshot,
  type MapCellKind,
  type MapSnapshot,
} from '../ui/MapModel';
import { mergeExplored, packExplored, unpackExplored } from '../ui/MapFog';
import { shouldShowTouchControls } from '../ui/TouchControls';
import {
  applyWorldArtFilters,
  DECOR_PROP_KEY,
  hasArt,
  propArtScale,
  TILE_ART_SCALE,
} from '../render/WorldArt';
import { biomeLook, type BiomeLook } from '../render/BiomeLook';
import {
  arenaRingAlpha,
  arenaRingColor,
  bossArenaEdgeAlpha,
  bossArenaFloorTint,
  bossArenaSpeckEvery,
  dungeonBossRoom,
  tileInArenaRoom,
  type ArenaPhase,
  type ArenaRoom,
} from '../render/BossArenaLook';
import { ShiftSystem } from '../systems/ShiftSystem';
import { BossShiftBrain } from '../systems/BossShift';
import {
  BOSS_VOLLEY_SPREAD,
  bossSignatureKind,
  bossSignaturePunishToast,
  bossSignatureTelegraph,
  bossSignatureWarnToast,
  volleyAimPoint,
} from '../systems/BossSignature';
import { cancelShiftTransition, playShiftTransition } from '../render/ShiftFx';
import { shiftShakeParams } from '../render/ShiftFeel';
import { playEnemyTelegraph } from '../render/EnemyTelegraphVfx';
import {
  blendTint,
  layerOverlayAlpha,
  layerPropTint,
  layerTileTint,
} from '../render/ShiftVisual';
import { SHIFT_LAYERS, type ShiftLayerId } from '../data/shiftLayers';
import {
  shiftFailToastText,
  shiftLayerColor,
  shiftReadyToastText,
  shiftTransitionText,
  shouldAnnounceShiftReady,
} from '../systems/ShiftFeedback';
import {
  advanceEnemyShot,
  createEnemyShot,
  type EnemyShot,
} from '../systems/EnemyRanged';
import {
  resolveInteractAction,
  type InteractCandidate,
  type ResolvedInteract,
} from '../systems/InteractResolve';

const DEFAULT_HUB_SIZE = HUB_SIZE;
const TOWN_SPAWN = { ...HUB_SPAWN };
const FOG_REVEAL_R = 5;

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
  private keySkill4!: Phaser.Input.Keyboard.Key;
  private keyShift!: Phaser.Input.Keyboard.Key;
  private readonly shiftSystem = new ShiftSystem(gameEvents);
  private readonly bossShift = new BossShiftBrain();
  private shiftOverlay: Phaser.GameObjects.Rectangle | null = null;
  private shiftFxIntensity = settingsStore.get().shiftFxIntensity;
  private shiftHudAcc = 0;
  private shiftWasReady = false;
  private shiftReadyAnnounced = false;
  /** Floor diamonds (fallback when tile art missing). */
  private tiles!: Phaser.GameObjects.Graphics;
  /** Painted floor tile sprites (cleared on zone reload). */
  private tileSprites: Phaser.GameObjects.Image[] = [];
  private portalMarker: Phaser.GameObjects.Container | null = null;
  /** Blocks double portal / B while fade swap runs. */
  private zoneBusy = false;
  private benchMarker: Phaser.GameObjects.Container | null = null;
  private npcs: Npc[] = [];
  private decor: Phaser.GameObjects.Container[] = [];
  private nearNpc: Npc | null = null;
  private saveTimer = 0;
  private nearBench = false;
  private riftCleared = false;
  private riftKills = 0;
  private riftKillGoal = 18;
  private riftBossSpawned = false;
  private riftBossDead = false;
  /** Entity id of the Rift Lord this rift spawned (elite fauna excluded). */
  private riftBossId: string | null = null;
  /** Boss def for the current biome (reskinned variants). */
  private riftBossDefId = 'rift_lord';
  private riftDepth = 1;
  /** Kills since last death / spawn (shown on death screen). */
  private lifeKills = 0;
  private deathPending = false;
  private riftMod: RiftModifier = getRiftModifier('none');
  private depthRule: DepthRule = depthRuleFor(1);
  /** Active rift biome palette (null in hub). */
  private biomeLookActive: BiomeLook | null = null;
  private bossAnchor: { x: number; y: number } | null = null;
  /** Last-room bounds for arena wash / ring. */
  private bossArenaRoom: ArenaRoom | null = null;
  private bossArenaOverlay: Phaser.GameObjects.Graphics | null = null;
  private hubLayout: ZoneLayout | null = null;
  /** POI ambushes already triggered this visit. */
  private ambushFired = new Set<string>();
  private hubSize = DEFAULT_HUB_SIZE;
  private wildernessPois: WildernessPoi[] = [];
  private announcedPois = new Set<string>();
  private chests: LootChest[] = [];
  private groundLoot: GroundLoot[] = [];
  private shrineReadyAt = 0;
  private enemySeq = 0;
  private nodeSeq = 0;
  private chestSeq = 0;
  private lootSeq = 0;
  private dungeon: DungeonMap | null = null;
  /** Session flag: craft-bench hint shown on first biome-mat toast. */
  private biomeMatFeedback: BiomeMatFeedbackState = {
    benchHintShown: false,
  };
  /** Wall-clock ms — skip sim briefly for hitstop juice. */
  private hitstopUntil = 0;
  private enemyShots: {
    shot: EnemyShot;
    graphic: Phaser.GameObjects.Graphics;
  }[] = [];
  private remoteGhosts = new Map<string, Phaser.GameObjects.Container>();
  private unsubNet: (() => void) | null = null;
  private mapEmitAcc = 0;
  private proxAcc = 0;
  private corpseAcc = 0;
  private touchDx = 0;
  private touchDy = 0;
  private attackHeld = false;
  private assistChase = false;
  private onWindowBlur = (): void => {
    this.clearAttackHold();
  };
  private lastNearGate = false;
  private lastRangeHintAt = Number.NEGATIVE_INFINITY;
  private inputUnsubs: (() => void)[] = [];
  /** Cached terrain for minimap — rebuilt only on zone change. */
  private mapCells: MapCellKind[] | null = null;
  private mapW = 0;
  private mapH = 0;
  private explored: boolean[] = [];
  private exploredDirty = true;
  private webglCanvas: HTMLCanvasElement | null = null;
  private onWebglLost: ((e: Event) => void) | null = null;
  private onWebglRestored: ((e: Event) => void) | null = null;
  private updateErrorAt = 0;
  private tileCullAcc = 0;

  constructor() {
    super('WorldScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#12161c');
    audioBus.bind(this);
    applyWorldArtFilters(this);
    this.tiles = this.add.graphics().setDepth(-1000);

    this.player = new Player(
      this,
      gameState.worldX || 8,
      gameState.worldY || 8,
    );

    this.loadZone(gameState.inRift);
    if (gameState.pendingRiftResumeToast) {
      gameState.pendingRiftResumeToast = false;
      gameEvents.emit('ui:toast', {
        text: `Rift resumed · ${riftDepthLabel(this.riftDepth)} · ${this.riftMod.name}`,
      });
    }
    this.setupInput();
    this.bindWebglRecovery();
    // Tighter follow on touch — soft lerp reads as input lag
    const camLerp = shouldShowTouchControls() ? 0.28 : 0.14;
    this.cameras.main.startFollow(this.player.body, true, camLerp, camLerp);
    // Low buffer downscale pairs with a matching zoom so FOV stays desktop-like.
    this.cameras.main.setZoom(getAppliedCameraZoom(1.1));
    this.publishDebugApi();

    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
  }

  /** Live snapshots for Cursor agents & Playwright (`window.__RIFTBORN`). */
  private publishDebugApi(): void {
    installRiftbornDebug({
      getSource: () => ({
        hubSize: this.hubSize,
        inRift: gameState.inRift,
        player: { x: this.player.worldX, y: this.player.worldY },
        enemies: this.enemies.map((e) => ({
          id: e.id,
          defId: e.def.id,
          x: e.worldX,
          y: e.worldY,
          alive: e.alive,
          hp: e.hp,
          maxHp: e.maxHp,
        })),
        pois: this.wildernessPois.map((p) => ({
          id: p.id,
          kind: p.kind,
          name: p.name,
          x: p.x,
          y: p.y,
          radius: p.radius,
        })),
        chests: this.chests.map((c) => ({
          id: c.id,
          x: c.worldX,
          y: c.worldY,
          looted: c.looted,
          lootTier: c.lootTier,
        })),
        shift: {
          enabled: this.shiftSystem.enabled,
          layer: this.shiftSystem.layer,
          energy: this.shiftSystem.energy,
        },
      }),
      enterRift: () => this.debugEnterRift(),
      gotoDiagonalCorridor: () => this.debugGotoDiagonalCorridor(),
      walkDiagonalCorridor: (steps?: number) =>
        this.debugWalkDiagonalCorridor(steps ?? 45),
      spawnLootNearPlayer: () => this.debugSpawnLootNearPlayer(),
      gotoNearestHostile: () => this.debugGotoNearestHostile(),
      gotoEnemy: (id: string) => this.debugGotoEnemy(id),
      interactHint: () => this.lastInteractHint,
      setShiftLayer: (layer) => this.shiftSystem.forceLayer(layer),
      showTutorial: () => gameEvents.emit('ui:showTutorial', {}),
      dismissTutorial: () => gameEvents.emit('ui:dismissTutorial', {}),
    });
  }

  private lastInteractHint: {
    label: string;
    dimmed: boolean;
    kind: string;
  } = { label: 'E', dimmed: true, kind: 'none' };

  /** Agent / Playwright — drop loot at the player's feet for E-label shots. */
  private debugSpawnLootNearPlayer(): boolean {
    const gear = rollGearDrop(gameState.progression.level, {
      forClass: gameState.progression.classId,
      lootTier: 2,
    });
    this.spawnGearDrop(this.player.worldX, this.player.worldY, gear);
    this.refreshInteractHint();
    return true;
  }

  /** Warp ~2 tiles from a foe (screenshot stance), fallback onto its tile. */
  private warpNear(best: Enemy): void {
    const dx = this.player.worldX - best.worldX;
    const dy = this.player.worldY - best.worldY;
    const len = Math.hypot(dx, dy) || 1;
    const tx = best.worldX + (dx / len) * 2.2;
    const ty = best.worldY + (dy / len) * 2.2;
    const snapped = snapToTile(tx, ty);
    if (this.player.walkCheck?.(snapped.x, snapped.y)) {
      this.player.worldX = snapped.x;
      this.player.worldY = snapped.y;
    } else {
      this.player.worldX = best.worldX;
      this.player.worldY = best.worldY;
    }
    this.player.syncScreen();
    this.revealFogAroundPlayer();
    this.emitMapSnapshot();
  }

  /** Agent / Playwright — warp next to a specific living foe by id. */
  private debugGotoEnemy(id: string): boolean {
    const target = this.enemies.find((e) => e.alive && e.id === id);
    if (!target) return false;
    this.warpNear(target);
    return true;
  }

  /** Agent / Playwright — warp ~2 tiles from the nearest living foe for rift screenshots. */
  private debugGotoNearestHostile(): boolean {
    if (!gameState.inRift) return false;
    let best: Enemy | null = null;
    let bestD = Infinity;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const d = worldDistance(
        { x: this.player.worldX, y: this.player.worldY },
        { x: e.worldX, y: e.worldY },
      );
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    if (!best) return false;
    this.warpNear(best);
    return true;
  }

  /** Agent / Playwright helper — skip walking to the obelisk. */
  private debugEnterRift(): boolean {
    if (gameState.inRift) return true;
    if (coopRiftBlockedReason(netClient.connected)) return false;
    gameState.inRift = true;
    gameState.riftRun = null;
    gameState.pendingRiftResumeToast = false;
    // Prefer a seed known to have narrow diagonal corridors (M1e screenshots).
    gameState.riftSeed = 99;
    this.loadZone(true);
    gameEvents.emit(Events.RIFT_ENTERED, {
      seed: gameState.riftSeed,
      depth: this.riftDepth,
    });
    this.emitRiftProgress();
    return true;
  }

  /** Warp player onto a stair-step corridor for width screenshots. */
  private debugGotoDiagonalCorridor(): boolean {
    if (!gameState.inRift || !this.dungeon) return false;
    const cell = findDiagonalCorridorCell(this.dungeon);
    if (!cell) return false;
    this.player.worldX = cell.x + 0.5;
    this.player.worldY = cell.y + 0.5;
    this.player.syncScreen();
    this.revealFogAroundPlayer();
    this.emitMapSnapshot();
    return true;
  }

  /**
   * Scripted diagonal walk along a stair corridor (M1f pass screenshot).
   * Uses real Player.move / slideMove. Returns tiles traveled.
   */
  private debugWalkDiagonalCorridor(steps: number): number {
    if (!gameState.inRift || !this.dungeon) return 0;
    if (!this.debugGotoDiagonalCorridor()) return 0;
    const startX = this.player.worldX;
    const startY = this.player.worldY;
    const dt = 1 / 30;
    for (let i = 0; i < steps; i++) {
      this.player.move(1, 1, dt);
      this.revealFogAroundPlayer();
    }
    this.player.syncScreen();
    this.emitMapSnapshot();
    this.emitShiftHud();
    return Math.hypot(this.player.worldX - startX, this.player.worldY - startY);
  }

  private cleanup(): void {
    clearRiftbornDebug();
    cancelShiftTransition();
    this.resetCameraFx();
    this.unsubNet?.();
    this.unsubNet = null;
    for (const u of this.inputUnsubs) u();
    this.inputUnsubs = [];
    this.unbindWebglRecovery();
    this.shiftOverlay?.destroy();
    this.shiftOverlay = null;
    this.player?.destroy();
    this.clearEnemyShots();
    for (const n of this.nodes) n.destroy();
    for (const e of this.enemies) e.destroy();
    for (const c of this.chests) c.destroy();
    for (const l of this.groundLoot) l.destroy();
    this.nodes = [];
    this.enemies = [];
    this.chests = [];
    this.groundLoot = [];
    for (const g of this.remoteGhosts.values()) g.destroy(true);
    this.remoteGhosts.clear();
  }

  private resetCameraFx(): void {
    try {
      const cam = this.cameras?.main as unknown as {
        resetFX?: () => void;
        flashEffect?: { isRunning?: boolean; reset?: () => void };
        fadeEffect?: { isRunning?: boolean; reset?: () => void };
      };
      if (cam?.flashEffect?.isRunning) cam.flashEffect.reset?.();
      if (cam?.fadeEffect?.isRunning) cam.fadeEffect.reset?.();
    } catch {
      /* ignore — camera may be unavailable during teardown */
    }
  }

  private safeCameraFlash(
    duration: number,
    red: number,
    green: number,
    blue: number,
    force = false,
  ): void {
    try {
      // Prevent a stuck/stacked flash from permanently tinting the world.
      this.resetCameraFx();
      this.cameras.main.flash(
        duration,
        red,
        green,
        blue,
        force,
        undefined,
        this,
      );
    } catch (err) {
      console.warn('[WorldScene] camera flash failed', err);
      this.resetCameraFx();
    }
  }

  private bindWebglRecovery(): void {
    try {
      const canvas = this.game?.canvas as HTMLCanvasElement | undefined;
      if (!canvas || this.webglCanvas === canvas) return;
      this.unbindWebglRecovery();
      this.webglCanvas = canvas;
      this.onWebglLost = (e: Event) => {
        e.preventDefault();
        console.warn('[WorldScene] webglcontextlost');
        cancelShiftTransition();
        this.resetCameraFx();
        gameEvents.emit('ui:toast', {
          text: 'Graphics context lost — recovering…',
        });
      };
      this.onWebglRestored = () => {
        console.warn('[WorldScene] webglcontextrestored');
        this.resetCameraFx();
        gameEvents.emit('ui:toast', { text: 'Graphics restored' });
      };
      canvas.addEventListener('webglcontextlost', this.onWebglLost, false);
      canvas.addEventListener(
        'webglcontextrestored',
        this.onWebglRestored,
        false,
      );
    } catch (err) {
      console.warn('[WorldScene] webgl recovery bind failed', err);
    }
  }

  private unbindWebglRecovery(): void {
    if (!this.webglCanvas) return;
    try {
      if (this.onWebglLost) {
        this.webglCanvas.removeEventListener(
          'webglcontextlost',
          this.onWebglLost,
          false,
        );
      }
      if (this.onWebglRestored) {
        this.webglCanvas.removeEventListener(
          'webglcontextrestored',
          this.onWebglRestored,
          false,
        );
      }
    } catch {
      /* ignore */
    }
    this.webglCanvas = null;
    this.onWebglLost = null;
    this.onWebglRestored = null;
  }

  private setupInput(): void {
    if (!this.input.keyboard) return;
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D') as typeof this.wasd;
    this.rebindActionKeys();

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Touch mode uses ATK button — avoid double-fire from UI taps
      if (
        !shouldStartDesktopAttack({
          touchControlsActive: shouldShowTouchControls(),
          leftButtonDown: pointer.leftButtonDown(),
          pointerOverUi: this.isPointerOverUi(pointer),
        })
      ) {
        return;
      }
      if (this.tryClickLoot(pointer.worldX, pointer.worldY)) return;
      this.startBasicAttackHold();
    });
    const releaseAttack = () => this.clearAttackHold();
    this.input.on('pointerup', releaseAttack);
    this.input.on('pointerupoutside', releaseAttack);
    this.input.on('pointercancel', releaseAttack);
    if (typeof window !== 'undefined') {
      window.addEventListener('blur', this.onWindowBlur);
    }
    this.events.on(Phaser.Scenes.Events.PAUSE, this.onWindowBlur);

    this.inputUnsubs.push(
      gameEvents.on(Events.SETTINGS_CHANGED, () => {
        this.rebindActionKeys();
        audioBus.applyMusicVolume();
        this.shiftFxIntensity = settingsStore.get().shiftFxIntensity;
        this.cameras.main.setZoom(getAppliedCameraZoom(1.1));
      }),
      gameEvents.on('combat:castSkill', (p) => {
        const d = p as {
          slot: number;
          aimScreen?: {
            originX: number;
            originY: number;
            pointerX: number;
            pointerY: number;
            dirX: number;
            dirY: number;
          };
        };
        this.tryCastSkill(d.slot, d.aimScreen);
      }),
      gameEvents.on('input:move', (p) => {
        const d = p as { dx: number; dy: number };
        this.touchDx = d.dx;
        this.touchDy = d.dy;
      }),
      gameEvents.on('combat:attackDown', () => this.startBasicAttackHold()),
      gameEvents.on('combat:attackUp', () => this.clearAttackHold()),
      gameEvents.on('combat:attack', () => this.tryAttack()),
      gameEvents.on('ui:interact', () => this.tryInteract()),
      gameEvents.on('combat:dash', () => {
        this.tryDash(this.touchDx || 0, this.touchDy || 0);
      }),
      gameEvents.on(Events.RESOLVE_DEATH, () => this.finishDeath()),
      // Modals/overlays pause or block combat; don't keep repeating.
      gameEvents.on('ui:openInventory', () => this.clearAttackHold()),
      gameEvents.on('ui:openCharacter', () => this.clearAttackHold()),
      gameEvents.on('ui:openSkills', () => this.clearAttackHold()),
      gameEvents.on('ui:toggleMenu', () => this.clearAttackHold()),
      gameEvents.on('ui:toggleMap', () => this.clearAttackHold()),
      gameEvents.on(Events.SHIFT_CHANGED, (p) => {
        const d = p as { layer: ShiftLayerId };
        this.applyShiftVisuals(d.layer);
        playShiftTransition(this, d.layer, this.shiftFxIntensity);
        const punch = shiftShakeParams(this.shiftFxIntensity);
        this.triggerHitShake(punch.ms, punch.intensity);
        this.emitShiftHud();
        // Layer-locked mods: tell the player why nothing is hittable.
        const lock = gameState.inRift ? riftModLayerLock(this.riftMod) : null;
        if (lock && d.layer !== lock) {
          const shiftLabel = shouldShowTouchControls()
            ? 'SHIFT'
            : formatHotkey('shift');
          gameEvents.emit('ui:toast', {
            text: veiledWrongLayerToast({
              modName: this.riftMod.name,
              lockedLayerName: SHIFT_LAYERS[lock].name,
              shiftLabel,
            }),
          });
        }
      }),
      gameEvents.on('combat:shift', () => this.tryPlayerShift()),
      gameEvents.on('ui:returnToTown', () => this.returnToTown()),
      gameEvents.on('ui:toggleCoop', () => this.toggleCoop()),
    );
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
    this.keySkill4 = bindAction(this.input.keyboard, 'skill4');
    this.keyShift = bindAction(this.input.keyboard, 'shift');
  }

  private loadZone(rift: boolean): void {
    cancelShiftTransition();
    this.clearEnemyShots();
    for (const l of this.groundLoot) l.destroy();
    this.groundLoot = [];
    this.mapCells = null;
    this.mapW = 0;
    this.mapH = 0;
    this.explored = [];
    this.exploredDirty = true;
    this.shiftSystem.reset();
    this.shiftSystem.setEnabled(rift);
    this.shiftWasReady = false;
    this.shiftReadyAnnounced = false;
    // Ambushes re-arm on every zone change (hub visits).
    this.ambushFired.clear();
    this.bossShift.reset();
    audioBus.playMusic(rift ? 'combat' : 'hub');
    if (rift) {
      const resume =
        gameState.riftRun && gameState.pendingRiftResumeToast
          ? gameState.riftRun
          : null;
      const seed = resume?.seed ?? gameState.riftSeed ?? Date.now();
      gameState.riftSeed = seed;
      this.riftDepth =
        resume?.depth ?? riftDepthFromLevel(gameState.progression.level);
      this.riftMod = resume
        ? getRiftModifier(resume.modId)
        : rollRiftModifierForDepth(this.riftDepth);
      this.depthRule = depthRuleFor(this.riftDepth);
      this.dungeon = generateDungeon(seed, this.riftDepth);
      this.biomeLookActive = biomeLook(this.dungeon.biome.id);
      this.cameras.main.setBackgroundColor(this.biomeLookActive.background);
      this.player.maxX = this.dungeon.width - 1.5;
      this.player.maxY = this.dungeon.height - 1.5;
      this.player.walkCheck = (x, y) => {
        if (!this.dungeon) return true;
        const layer = this.shiftSystem.layer;
        const cells = this.dungeon.cells;
        const gates = this.dungeon.layerGates;
        return footprintFits(
          (px, py) => isWalkableOnLayer(cells, gates, px, py, layer),
          x,
          y,
          FIGURE_COLLISION_RADIUS,
        );
      };
      this.drawDungeonTiles(this.dungeon);
      if (resume) {
        const snapped = snapToTile(gameState.worldX, gameState.worldY);
        this.player.worldX = snapped.x;
        this.player.worldY = snapped.y;
        gameState.worldX = snapped.x;
        gameState.worldY = snapped.y;
        this.spawnFromLayout(this.dungeon.layout, {
          skipPacks: true,
          skipNodes: true,
        });
        this.applyRiftRun(resume);
      } else {
        const spawn = this.dungeon.layout.spawn;
        if (spawn) {
          this.player.worldX = spawn.x;
          this.player.worldY = spawn.y;
          gameState.worldX = spawn.x;
          gameState.worldY = spawn.y;
        }
        this.spawnFromLayout(this.dungeon.layout);
        this.syncRiftRunToState();
      }
    } else {
      this.dungeon = null;
      this.riftMod = getRiftModifier('none');
      this.depthRule = depthRuleFor(1);
      this.biomeLookActive = null;
      this.clearBossArenaOverlay();
      this.cameras.main.setBackgroundColor('#12161c');
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
      gameState.riftRun = null;
    }
    this.player.syncScreen();
    this.applyShiftVisuals(this.shiftSystem.layer);
    this.emitShiftHud();
    this.emitMapSnapshot();
    this.tileCullAcc = 0;
    this.cullWorldSprites();
    // Touch town affordance — only outside the hub.
    gameEvents.emit('ui:townButton', { visible: rift });
  }

  private emitShiftHud(): void {
    const canShift = this.shiftSystem.canShift();
    if (
      gameState.inRift &&
      shouldAnnounceShiftReady(
        this.shiftWasReady,
        canShift,
        this.shiftReadyAnnounced,
      )
    ) {
      this.shiftReadyAnnounced = true;
      const shiftLabel = shouldShowTouchControls()
        ? 'SHIFT'
        : formatHotkey('shift');
      gameEvents.emit('ui:toast', {
        text: shiftReadyToastText(shiftLabel),
      });
    }
    this.shiftWasReady = canShift;
    gameEvents.emit('ui:shiftHud', {
      active: gameState.inRift,
      layer: this.shiftSystem.layer,
      energy: this.shiftSystem.energy,
      cooldownLeft: this.shiftSystem.cooldownLeft,
      canShift,
      nearGate: this.playerNearShiftGate(),
    });
  }

  /** True when a layer gate is within ~1.5 tiles of the player. */
  private playerNearShiftGate(): boolean {
    if (!this.dungeon) return false;
    const px = Math.floor(this.player.worldX);
    const py = Math.floor(this.player.worldY);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (this.dungeon.layerGates[py + dy]?.[px + dx]) return true;
      }
    }
    return false;
  }

  private tryPlayerShift(): void {
    if (!gameState.inRift) return;
    const previous = this.shiftSystem.layer;
    const shiftLabel = shouldShowTouchControls()
      ? 'SHIFT'
      : formatHotkey('shift');
    if (!this.shiftSystem.tryShift()) {
      const reason = this.shiftSystem.cooldownLeft > 0 ? 'cooldown' : 'energy';
      gameEvents.emit('ui:toast', {
        text: shiftFailToastText(reason, shiftLabel),
      });
      return;
    }
    const layer = this.shiftSystem.layer;
    gameEvents.emit('ui:toast', {
      text: shiftTransitionText(previous, layer),
      color: shiftLayerColor(layer),
    });
  }

  private syncEnemyShiftLayers(layer: ShiftLayerId): void {
    for (const e of this.enemies) e.syncShiftLayer(layer);
  }

  private applyShiftVisuals(layer: ShiftLayerId): void {
    this.syncEnemyShiftLayers(layer);
    const i = this.shiftFxIntensity;
    const tileTint = layerTileTint(layer, i);
    for (const s of this.tileSprites) {
      const gate = s.getData('gate') as ShiftLayerId | null;
      const floorTint =
        (s.getData('baseTint') as number | undefined) ?? 0xffffff;
      if (gate) {
        // Keep gate identity visible under layer wash.
        const base = gate === 'ash' ? 0xc8e8ff : 0x7ad4e8;
        s.setTint(blendTint(base, tileTint, 0.35 * i));
      } else if (tileTint === 0xffffff) {
        // Ash / hub: keep road/wild floor contrast from placeFloorTile.
        s.setTint(floorTint);
      } else {
        s.setTint(blendTint(floorTint, tileTint, Math.min(1, 0.75 * i)));
      }
    }
    const washProp = layerPropTint(layer, i);
    for (const d of this.decor) {
      const baseProp =
        (d.getData('biomePropTint') as number | undefined) ?? 0xffffff;
      d.iterate((obj: Phaser.GameObjects.GameObject) => {
        const img = obj as Phaser.GameObjects.Image;
        if (typeof img.setTint !== 'function') return;
        if (washProp === 0xffffff) {
          img.setTint(baseProp);
        } else {
          img.setTint(blendTint(baseProp, washProp, Math.min(1, 0.75 * i)));
        }
      });
    }
    const alpha = layerOverlayAlpha(layer, i);
    const wash = SHIFT_LAYERS[layer].tileTint;
    if (!this.shiftOverlay) {
      this.shiftOverlay = this.add
        .rectangle(
          this.scale.width / 2,
          this.scale.height / 2,
          this.scale.width * 2,
          this.scale.height * 2,
          wash,
          0,
        )
        .setScrollFactor(0)
        .setDepth(-500)
        .setVisible(true);
    }
    this.shiftOverlay.setFillStyle(wash, alpha);
    const ashBg = this.biomeLookActive?.background ?? '#12161c';
    this.cameras.main.setBackgroundColor(
      layer === 'shadow' ? '#12101c' : ashBg,
    );
  }

  private spawnFromLayout(
    layout: ZoneLayout,
    opts: { skipPacks?: boolean; skipNodes?: boolean } = {},
  ): void {
    for (const n of this.nodes) n.destroy();
    for (const e of this.enemies) e.destroy();
    for (const c of this.chests) c.destroy();
    for (const n of this.npcs) n.destroy();
    for (const d of this.decor) d.destroy(true);
    this.nodes = [];
    this.enemies = [];
    this.chests = [];
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
    this.riftBossId = null;
    this.riftBossDefId = layout.bossId ?? 'rift_lord';
    this.riftKillGoal = layout.killGoal ?? 18;
    this.bossAnchor = layout.elite ? { ...layout.elite } : null;
    this.shrineReadyAt = 0;

    if (!opts.skipNodes) {
      for (const n of layout.nodes) {
        const p = snapToTile(n.x, n.y);
        this.nodes.push(
          new ResourceNode(this, `node_${this.nodeSeq++}`, n.defId, p.x, p.y),
        );
      }
    }

    // Hub fringe + rifts both use packs; plaza never hosts enemies.
    // Rift packs are already footprint-reachable (RiftEnemyPlacement) —
    // keep them on their tile; hub still jitters around the pack center.
    // Resume path skips packs and restores living foes from riftRun.
    if (!opts.skipPacks) {
      for (const pack of layout.packs) {
        if (!gameState.inRift && inPlaza(pack.x, pack.y)) continue;
        // Support foes stay lone priority targets — mods never clone them.
        const isSupport = pack.enemyId === 'rift_mender';
        const count =
          pack.count +
          (gameState.inRift && !isSupport
            ? this.riftMod.packCountBonus + this.depthRule.packCountBonus
            : 0);
        for (let i = 0; i < count; i++) {
          let p = snapToTile(pack.x, pack.y);
          if (!gameState.inRift) {
            const ox = (Math.random() - 0.5) * 1.8;
            const oy = (Math.random() - 0.5) * 1.8;
            p = snapToTile(pack.x + ox, pack.y + oy);
            if (inPlaza(p.x, p.y)) continue;
          } else if (i > 0) {
            // Extra mod bonus foes: nudge within the same floor tile family
            const ox = (Math.random() - 0.5) * 0.6;
            const oy = (Math.random() - 0.5) * 0.6;
            const cand = snapToTile(pack.x + ox, pack.y + oy);
            if (this.player.walkCheck?.(cand.x, cand.y)) p = cand;
          }
          const eliteChance = gameState.inRift
            ? riftPackBonus(this.riftDepth).eliteChance
            : 0.14;
          const elitePack = Math.random() < eliteChance;
          const enemy = new Enemy(
            this,
            `enemy_${this.enemySeq++}`,
            pack.enemyId,
            p.x,
            p.y,
            {
              elitePack: gameState.inRift ? elitePack : false,
              levelScale: gameState.progression.level,
              hpMult: gameState.inRift
                ? this.riftMod.hpMult * this.depthRule.hpMult
                : 1,
              dmgMult: gameState.inRift
                ? this.riftMod.dmgMult * this.depthRule.dmgMult
                : 1,
              speedMult: gameState.inRift
                ? this.riftMod.speedMult * this.depthRule.speedMult
                : 1,
            },
          );
          const layerLock = gameState.inRift
            ? riftModLayerLock(this.riftMod)
            : null;
          if (layerLock) enemy.setCombatLayer(layerLock);
          enemy.maxBound = gameState.inRift
            ? (this.dungeon?.width ?? 22) - 1.5
            : this.hubSize - 0.5;
          if (gameState.inRift) {
            enemy.syncShiftLayer(this.shiftSystem.layer);
          }
          this.enemies.push(enemy);
        }
      }
    }

    for (const ch of layout.chests ?? []) {
      const p = snapToTile(ch.x, ch.y);
      this.chests.push(
        new LootChest(
          this,
          ch.id || `chest_${this.chestSeq++}`,
          p.x,
          p.y,
          ch.lootTier,
        ),
      );
    }

    if (layout.portal) {
      const p = snapToTile(layout.portal.x, layout.portal.y);
      this.portalMarker = gameState.inRift
        ? this.makeExitPortal(p.x, p.y)
        : this.makeObelisk(p.x, p.y);
    }

    if (!gameState.inRift) {
      const b = snapToTile(layout.bench.x, layout.bench.y);
      this.benchMarker = this.makeCraftSpot(b.x, b.y);
      for (const n of layout.npcs ?? []) {
        const p = snapToTile(n.x, n.y);
        this.npcs.push(new Npc(this, n.id, n.role, n.name, p.x, p.y));
      }
      // North row buildings; NPCs stand one tile south (iso front).
      this.makeBuilding(29.5, 29.5, 0x3a3028, 'Shop');
      this.makeBuilding(35.5, 29.5, 0x2a3a32, 'Forge');
      // Inn east of the board — never share the board tile.
      this.makeBuilding(35.5, 35.5, 0x2a2838, 'Inn');
      for (const d of layout.decor ?? []) this.makeHubDecor(d);
      this.wildernessPois = layout.pois ?? [];
      this.announcedPois.clear();
      for (const poi of this.wildernessPois) this.makePoiMarker(poi);
    } else {
      for (const d of layout.decor ?? []) this.makeHubDecor(d);
      this.wildernessPois = [];
      this.announcedPois.clear();
    }

    this.emitRiftProgress();
  }

  private poiStyle(kind: PoiKind): {
    accent: number;
    subtitle: string;
    titleColor: string;
    tip: string;
  } {
    switch (kind) {
      case 'camp':
        return {
          accent: 0xc45c3a,
          subtitle: 'Bandit camp · chest',
          titleColor: '#e8b090',
          tip: 'mid-tier bandits & a stash chest',
        };
      case 'scout':
        return {
          accent: 0xc4a040,
          subtitle: 'Elite scout · magic loot',
          titleColor: '#e8d080',
          tip: 'lone elite, always drops magic gear',
        };
      case 'shrine':
        return {
          accent: 0xe07040,
          subtitle: 'Blessing · E · timed buff',
          titleColor: '#f0a878',
          tip: 'touch the altar (E) for a timed damage blessing',
        };
      case 'warren':
        return {
          accent: 0x8a7a60,
          subtitle: 'Crawler dens · chest',
          titleColor: '#c8b898',
          tip: 'rift serpents guard a chest',
        };
      case 'grove':
        return {
          accent: 0x50a060,
          subtitle: 'Hornet grove · chest',
          titleColor: '#a8d0a0',
          tip: 'ash hornets & a grove chest',
        };
      case 'watch':
        return {
          accent: 0x708090,
          subtitle: 'Lookout · chest',
          titleColor: '#b0c0d0',
          tip: 'watchers on the ridge — loot nearby',
        };
      case 'cairn':
        return {
          accent: 0x6a6080,
          subtitle: 'Burial mound · Nightwing',
          titleColor: '#c0b0d0',
          tip: 'a Nightwing roosts over the cairn chest',
        };
      case 'ruin':
      default:
        return {
          accent: 0x6a80a0,
          subtitle: 'Ancient ruin · chest',
          titleColor: '#b8c8e0',
          tip: 'stronger foes, veins & a chest',
        };
    }
  }

  private makePoiMarker(poi: WildernessPoi): void {
    const p = snapToTile(poi.x, poi.y);
    const { screenX, screenY } = worldToScreen(p.x, p.y);
    const style = this.poiStyle(poi.kind);
    const g = this.add.graphics();
    g.lineStyle(2, style.accent, 0.55);
    g.strokeEllipse(0, 2, 52, 24);
    const title = this.add
      .text(0, -36, poi.name, {
        fontFamily: 'Georgia, serif',
        fontSize: '13px',
        color: style.titleColor,
        stroke: '#0a0c10',
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    const sub = this.add
      .text(0, -20, style.subtitle, {
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
      const style = this.poiStyle(poi.kind);
      gameEvents.emit('ui:toast', {
        text: `${poi.name} — ${style.tip}`,
      });
    }
  }

  private makeHubDecor(d: HubDecor): void {
    const p = snapToTile(d.x, d.y);
    const { screenX, screenY } = worldToScreen(p.x, p.y);
    const propKey = DECOR_PROP_KEY[d.kind];
    // Near-town keeps warm procedural props — painted lanterns/wells/crates/
    // rocks are purple void art that fights the cobble square.
    const townish =
      nearTown(Math.floor(p.x), Math.floor(p.y), 8) &&
      (d.kind === 'lantern' ||
        d.kind === 'pillar' ||
        d.kind === 'well' ||
        d.kind === 'crate' ||
        d.kind === 'rock');
    if (propKey && hasArt(this, propKey) && !townish) {
      const img = this.add
        .image(0, 0, propKey)
        .setOrigin(0.5, 1)
        .setScale(propArtScale(d.kind));
      const propTint = this.biomeLookActive?.propTint ?? 0xffffff;
      if (propTint !== 0xffffff) img.setTint(propTint);
      const c = this.add.container(screenX, screenY, [img]);
      c.setDepth(depthFromWorld(p.x, p.y) - 20);
      c.setData('biomePropTint', propTint);
      this.decor.push(c);
      return;
    }
    const g = this.add.graphics();
    switch (d.kind) {
      case 'lantern': {
        const plazaLamp = inPlaza(Math.floor(p.x), Math.floor(p.y));
        g.fillStyle(0x1a1410, 0.9);
        g.fillRect(-2, -18, 4, 16);
        g.fillStyle(0xe6c35c, 0.95);
        g.fillCircle(0, -22, 5);
        g.fillStyle(0xfff0c0, plazaLamp ? 0.38 : 0.25);
        g.fillCircle(0, -22, plazaLamp ? 18 : 12);
        if (plazaLamp) {
          g.fillStyle(0xffe080, 0.12);
          g.fillCircle(0, -22, 28);
        }
        break;
      }
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
      case 'altar':
        g.fillStyle(0x000000, 0.35);
        g.fillEllipse(0, 6, 32, 12);
        g.fillStyle(0x4a3a30, 1);
        g.fillRect(-14, -6, 28, 12);
        g.fillStyle(0x6a5040, 1);
        g.fillRect(-10, -14, 20, 10);
        g.fillStyle(0xe07040, 0.95);
        g.fillCircle(0, -20, 5);
        g.fillStyle(0xffc080, 0.35);
        g.fillCircle(0, -20, 14);
        g.lineStyle(1, 0xc4a574, 0.6);
        g.strokeRect(-14, -6, 28, 12);
        break;
      case 'totem':
        g.fillStyle(0x000000, 0.3);
        g.fillEllipse(0, 4, 16, 8);
        g.fillStyle(0x5a4030, 1);
        g.fillRect(-4, -28, 8, 30);
        g.fillStyle(0x8a6040, 1);
        g.fillTriangle(-10, -20, 10, -20, 0, -36);
        g.fillStyle(0xc45c3a, 0.9);
        g.fillCircle(0, -24, 3);
        break;
      case 'rubble':
        g.fillStyle(0x4a5058, 1);
        g.fillEllipse(-4, 0, 12, 7);
        g.fillEllipse(5, 1, 10, 6);
        g.fillStyle(0x6a7080, 1);
        g.fillEllipse(0, -3, 8, 5);
        break;
      case 'tree':
        g.fillStyle(0x2a1a10, 1);
        g.fillRect(-3, -28, 6, 28);
        g.fillStyle(0x1a3a1a, 1);
        g.fillCircle(0, -34, 14);
        break;
      case 'crystal_vein':
        g.fillStyle(0x3a2a48, 1);
        g.fillEllipse(0, 2, 16, 8);
        g.fillStyle(0x6a50c0, 0.95);
        g.fillTriangle(-4, 0, 4, 0, 0, -18);
        g.fillStyle(0xa090ff, 0.7);
        g.fillTriangle(2, 0, 8, 0, 5, -12);
        break;
      default:
        break;
    }
    const c = this.add.container(screenX, screenY, [g]);
    c.setDepth(depthFromWorld(p.x, p.y) - 20);
    c.setData('biomePropTint', this.biomeLookActive?.propTint ?? 0xffffff);
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
    const roof =
      label === 'Forge' ? 0x3a2820 : label === 'Inn' ? 0x2a2438 : 0x2a2218;
    const side = ((color >> 1) & 0x7f7f7f) | 0x101010;
    const trim = 0xc4a574;
    // ~2× old stub — buildings must dwarf the player / bush props.
    g.fillStyle(0x000000, 0.38);
    g.fillEllipse(0, 16, 92, 28);
    g.fillStyle(0x4a4034, 0.95);
    g.fillEllipse(0, 10, 82, 22);
    // Side wall (iso depth)
    g.fillStyle(side, 1);
    g.fillRect(14, -70, 36, 68);
    // Front wall
    g.fillStyle(color, 1);
    g.fillRect(-44, -70, 60, 68);
    g.lineStyle(1, 0x1a1410, 0.28);
    for (let i = 0; i < 6; i++) {
      g.lineBetween(-40, -58 + i * 10, 12, -58 + i * 10);
    }
    // Door + stoop
    g.fillStyle(0x1a1410, 0.95);
    g.fillRect(-14, -28, 18, 28);
    g.fillStyle(trim, 0.5);
    g.fillRect(-10, -20, 4, 6);
    g.fillStyle(0x5a5040, 0.95);
    g.fillRect(-18, 0, 26, 6);
    // Warm window glow
    g.fillStyle(0xe6c35c, 0.65);
    g.fillRect(-36, -54, 12, 12);
    g.fillRect(22, -54, 12, 12);
    g.fillRect(-36, -36, 12, 10);
    g.lineStyle(1, 0x1a1410, 0.55);
    g.strokeRect(-36, -54, 12, 12);
    g.strokeRect(22, -54, 12, 12);
    g.strokeRect(-36, -36, 12, 10);
    // Roof + ridge
    g.fillStyle(0x1a1410, 0.95);
    g.fillTriangle(-52, -70, 56, -70, 6, -112);
    g.fillStyle(roof, 0.95);
    g.fillTriangle(-44, -70, 48, -70, 6, -104);
    g.lineStyle(1, trim, 0.45);
    g.strokeTriangle(-44, -70, 48, -70, 6, -104);
    if (label === 'Forge') {
      g.fillStyle(0x3a3028, 1);
      g.fillRect(28, -96, 10, 22);
      g.fillStyle(0x2a2218, 1);
      g.fillRect(26, -100, 14, 6);
    }
    const t = this.add
      .text(0, -118, label, {
        fontFamily: 'Georgia, serif',
        fontSize: '13px',
        color: '#e0d4bc',
        stroke: '#0a0c10',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setAlpha(0.92);
    const c = this.add.container(screenX, screenY, [g, t]);
    // Slightly behind foot depth so player/NPC draw in front when overlapping
    c.setDepth(depthFromWorld(p.x, p.y) - 40);
    this.decor.push(c);
  }

  /** Quiet craft interact point — anvil only, no always-on label. */
  private makeCraftSpot(wx: number, wy: number): Phaser.GameObjects.Container {
    const p = snapToTile(wx, wy);
    const { screenX, screenY } = worldToScreen(p.x, p.y);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.28);
    g.fillEllipse(0, 4, 22, 10);
    g.fillStyle(0x5a5040, 0.95);
    g.fillRect(-8, -6, 16, 8);
    g.fillStyle(0x8a7a60, 0.9);
    g.fillRect(-6, -10, 12, 5);
    g.lineStyle(1, 0xc4a574, 0.5);
    g.strokeRect(-8, -6, 16, 8);
    const c = this.add.container(screenX, screenY, [g]);
    c.setDepth(depthFromWorld(p.x, p.y) - 15);
    c.setData('wx', p.x);
    c.setData('wy', p.y);
    return c;
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
    const glow = this.add.graphics();
    glow.lineStyle(2, 0x8ec8ff, 0.55);
    glow.strokeEllipse(0, 2, 34, 14);
    const t = this.add
      .text(0, -82, 'Rift Obelisk · R', {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '11px',
        color: '#b8d8ff',
        stroke: '#0a0c10',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    const c = this.add.container(screenX, screenY, [g, glow, t]);
    c.setDepth(depthFromWorld(wx, wy));
    c.setData('wx', wx);
    c.setData('wy', wy);
    this.tweens.add({
      targets: glow,
      alpha: 0.35,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    return c;
  }

  /** Rift exit — standing gate, not a flat floor ellipse. */
  private makeExitPortal(wx: number, wy: number): Phaser.GameObjects.Container {
    const p = snapToTile(wx, wy);
    const { screenX, screenY } = worldToScreen(p.x, p.y);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.4);
    g.fillEllipse(0, 6, 36, 16);
    g.fillStyle(0x1a3858, 0.95);
    g.fillRect(-12, -58, 8, 60);
    g.fillRect(4, -58, 8, 60);
    g.fillStyle(0x4db6ff, 0.35);
    g.fillRect(-4, -54, 8, 52);
    g.lineStyle(2, 0x8ec8ff, 0.95);
    g.strokeRect(-12, -58, 24, 60);
    g.fillStyle(0xb8e4ff, 0.9);
    g.fillTriangle(-14, -58, 14, -58, 0, -78);
    const ring = this.add.graphics();
    ring.lineStyle(2.5, 0x7ad0ff, 0.85);
    ring.strokeEllipse(0, 4, 42, 18);
    ring.lineStyle(1.5, 0xe8f6ff, 0.55);
    ring.strokeEllipse(0, -20, 22, 28);
    const t = this.add
      .text(0, -90, 'Exit · R', {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '11px',
        color: '#b8e8ff',
        stroke: '#0a0c10',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    const c = this.add.container(screenX, screenY, [g, ring, t]);
    c.setDepth(depthFromWorld(p.x, p.y));
    c.setData('wx', p.x);
    c.setData('wy', p.y);
    this.tweens.add({
      targets: ring,
      alpha: 0.4,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    return c;
  }

  private clearTileSprites(): void {
    for (const s of this.tileSprites) s.destroy();
    this.tileSprites = [];
  }

  private clearBossArenaOverlay(): void {
    if (this.bossArenaOverlay) {
      this.tweens.killTweensOf(this.bossArenaOverlay);
      this.bossArenaOverlay.destroy();
      this.bossArenaOverlay = null;
    }
    this.bossArenaRoom = null;
  }

  /** Spotlight ring over the boss chamber — idle wash, boss/exit punch. */
  private paintBossArenaRing(phase: ArenaPhase): void {
    const room = this.bossArenaRoom;
    const look = this.biomeLookActive;
    if (!room || !look) return;
    if (!this.bossArenaOverlay) {
      this.bossArenaOverlay = this.add.graphics().setDepth(-900);
    } else {
      this.tweens.killTweensOf(this.bossArenaOverlay);
      this.bossArenaOverlay.clear();
    }
    const g = this.bossArenaOverlay;
    const color = arenaRingColor(look, phase);
    const alpha = arenaRingAlpha(phase);
    // Floor wash diamonds inside the room.
    for (let ty = room.y; ty < room.y + room.h; ty++) {
      for (let tx = room.x; tx < room.x + room.w; tx++) {
        if (this.dungeon?.cells[ty]?.[tx] !== 1) continue;
        const { screenX, screenY } = worldToScreen(tx + 0.5, ty + 0.5);
        g.fillStyle(color, phase === 'idle' ? 0.06 : 0.1);
        g.fillEllipse(screenX, screenY, 28, 14);
      }
    }
    const cx = room.x + room.w / 2;
    const cy = room.y + room.h / 2;
    const { screenX, screenY } = worldToScreen(cx, cy);
    const rw = room.w * 28;
    const rh = room.h * 14;
    g.lineStyle(phase === 'idle' ? 2 : 3, color, alpha);
    g.strokeEllipse(screenX, screenY, rw, rh);
    if (phase !== 'idle') {
      g.lineStyle(1.5, 0xfff0e0, alpha * 0.55);
      g.strokeEllipse(screenX, screenY, rw * 0.72, rh * 0.72);
      this.tweens.add({
        targets: g,
        alpha: { from: 0.55, to: 1 },
        duration: phase === 'boss' ? 520 : 640,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  /** Hide offscreen floor tiles/decor to cut mobile overdraw (P1). */
  private cullWorldSprites(): void {
    const view = this.cameras.main?.worldView;
    if (!view) return;
    const vr = { x: view.x, y: view.y, width: view.width, height: view.height };
    for (const img of this.tileSprites) {
      img.setVisible(isScreenPointVisible(img.x, img.y, vr, TILE_CULL_PAD));
    }
    for (const d of this.decor) {
      d.setVisible(isScreenPointVisible(d.x, d.y, vr, DECOR_CULL_PAD));
    }
  }

  private placeFloorTile(
    x: number,
    y: number,
    key: string,
    fallbackColor: number,
    gate: ShiftLayerId | null = null,
    tint?: number,
  ): void {
    if (hasArt(this, key)) {
      const { screenX, screenY } = worldToScreen(x, y);
      const img = this.add
        .image(screenX, screenY, key)
        .setOrigin(0.5, 0.5)
        .setScale(TILE_ART_SCALE)
        .setDepth(-1000);
      img.setData('gate', gate);
      const baseTint = tint ?? 0xffffff;
      img.setData('baseTint', baseTint);
      if (tint !== undefined) {
        img.setTint(tint);
      }
      // Gate tiles: cyan edge so layer locks are not confused with floor.
      if (gate) {
        img.setTint(gate === 'ash' ? 0xc8e8ff : 0x7ad4e8);
        this.strokeIsoTileOutline(
          this.tiles,
          x,
          y,
          gate === 'ash' ? 0xa0d4ff : 0x40c8e0,
        );
      }
      this.tileSprites.push(img);
      return;
    }
    this.strokeIsoTile(this.tiles, x, y, fallbackColor);
    if (gate) {
      this.strokeIsoTileOutline(
        this.tiles,
        x,
        y,
        gate === 'ash' ? 0xa0d4ff : 0x40c8e0,
      );
    } else if (tint !== undefined) {
      // For non-art tiles, we can't easily tint graphics; just keep fallback
    }
  }

  private drawHubTiles(): void {
    this.tiles.clear();
    this.clearTileSprites();
    const size = this.hubSize;
    const pathSet = new Set(
      (this.hubLayout?.paths ?? []).map((p) => `${p.x},${p.y}`),
    );

    const valueNoise = (x: number, y: number, scale: number): number => {
      const xi = Math.floor(x / scale);
      const yi = Math.floor(y / scale);
      const xf = x / scale - xi;
      const yf = y / scale - yi;
      const seed = 131542391;
      const hash = (nx: number, ny: number) => {
        let h = (nx * 374761393) ^ (ny * 668265263) ^ (seed * 1274126177);
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
      };
      const n00 = hash(xi, yi);
      const n10 = hash(xi + 1, yi);
      const n01 = hash(xi, yi + 1);
      const n11 = hash(xi + 1, yi + 1);
      const u = xf * xf * (3 - 2 * xf);
      const v = yf * yf * (3 - 2 * yf);
      const nx0 = n00 * (1 - u) + n10 * u;
      const nx1 = n01 * (1 - u) + n11 * u;
      return nx0 * (1 - v) + nx1 * v;
    };

    const pickClusteredTile = (
      x: number,
      y: number,
      band: 'plaza' | 'road' | 'transition' | 'wild',
    ): string => {
      // Asset truth (files ≠ old docs names):
      //   0 = green grass, 1 = dark stone, 2 = packed dirt,
      //   3 = mossy mix, 4 = dark fringe.
      // Plaza MUST use stone — hub_0 here made town look like a meadow.
      if (band === 'plaza') {
        const n = valueNoise(x, y, 4);
        return n < 0.82 ? 'tile_hub_1' : 'tile_hub_2';
      }
      if (band === 'road') {
        const n = valueNoise(x, y, 3);
        return n < 0.8 ? 'tile_hub_2' : 'tile_hub_3';
      }
      if (band === 'transition') {
        const n = valueNoise(x, y, 3.5);
        return n < 0.55 ? 'tile_hub_0' : n < 0.85 ? 'tile_hub_3' : 'tile_hub_2';
      }
      const n = valueNoise(x, y, 4);
      return n < 0.78 ? 'tile_hub_0' : 'tile_hub_3';
    };

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const onPath = pathSet.has(`${x},${y}`);
        const plaza = inPlaza(x, y);
        const poiOverride =
          !plaza && !onPath
            ? hubPoiFloorOverride({
                x,
                y,
                plaza,
                onPath,
                pois: this.hubLayout?.pois ?? [],
                noise: valueNoise(x, y, 3.5),
              })
            : null;
        if (poiOverride) {
          const poi = findPoiNear(x, y, this.hubLayout?.pois ?? []);
          const tint = poi ? hubPoiFloorTint(poi.kind) : 0xd8d8d8;
          this.placeFloorTile(x, y, poiOverride, tint, null, tint);
        } else {
          let tileBand: 'plaza' | 'road' | 'transition' | 'wild';
          let lookBand:
            'plaza' | 'apron' | 'townRoad' | 'dirtRoad' | 'transition' | 'wild';
          // 2-tile stone apron so the square doesn't drop into meadow.
          const plazaApron =
            !plaza &&
            x >= PLAZA.x0 - 2 &&
            x <= PLAZA.x1 + 2 &&
            y >= PLAZA.y0 - 2 &&
            y <= PLAZA.y1 + 2;
          if (plaza) {
            tileBand = 'plaza';
            lookBand = 'plaza';
          } else if (plazaApron) {
            tileBand = 'plaza';
            lookBand = 'apron';
          } else if (onPath) {
            if (nearTown(x, y, 16)) {
              tileBand = 'plaza';
              lookBand = 'townRoad';
            } else {
              tileBand = 'road';
              lookBand = 'dirtRoad';
            }
          } else if (nearTown(x, y, 14)) {
            tileBand = 'transition';
            lookBand = 'transition';
          } else {
            tileBand = 'wild';
            lookBand = 'wild';
          }
          const look = hubBandTint(lookBand);
          this.placeFloorTile(
            x,
            y,
            pickClusteredTile(x, y, tileBand),
            look.fallback,
            null,
            look.tint,
          );
          if (lookBand === 'dirtRoad') {
            this.strokeIsoTileOutline(
              this.tiles,
              x,
              y,
              HUB_DIRT_ROAD_EDGE,
              HUB_DIRT_ROAD_EDGE_ALPHA,
            );
          }
        }
        if (plaza) {
          const { screenX, screenY } = worldToScreen(x, y);
          const onEdge =
            x === PLAZA.x0 ||
            x === PLAZA.x1 ||
            y === PLAZA.y0 ||
            y === PLAZA.y1;
          if (onEdge) {
            this.tiles.fillStyle(HUB_PLAZA_EDGE_COLOR, HUB_PLAZA_EDGE_ALPHA);
            this.tiles.fillCircle(screenX, screenY, HUB_PLAZA_EDGE_RADIUS);
          } else if ((x + y) % HUB_PLAZA_GLOW_EVERY === 0) {
            this.tiles.fillStyle(HUB_PLAZA_GLOW_COLOR, HUB_PLAZA_GLOW_ALPHA);
            this.tiles.fillCircle(screenX, screenY, HUB_PLAZA_GLOW_RADIUS);
          }
        }
      }
    }
    this.tiles.setDepth(-999);
    this.cullWorldSprites();
  }

  private drawDungeonTiles(map: DungeonMap): void {
    this.tiles.clear();
    this.clearTileSprites();
    this.bossArenaOverlay?.destroy();
    this.bossArenaOverlay = null;

    const valueNoise = (x: number, y: number, scale: number): number => {
      const xi = Math.floor(x / scale);
      const yi = Math.floor(y / scale);
      const xf = x / scale - xi;
      const yf = y / scale - yi;
      const seed = 131542391;
      const hash = (nx: number, ny: number) => {
        let h = (nx * 374761393) ^ (ny * 668265263) ^ (seed * 1274126177);
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
      };
      const n00 = hash(xi, yi);
      const n10 = hash(xi + 1, yi);
      const n01 = hash(xi, yi + 1);
      const n11 = hash(xi + 1, yi + 1);
      const u = xf * xf * (3 - 2 * xf);
      const v = yf * yf * (3 - 2 * yf);
      const nx0 = n00 * (1 - u) + n10 * u;
      const nx1 = n01 * (1 - u) + n11 * u;
      return nx0 * (1 - v) + nx1 * v;
    };

    const biome = map.biome;
    const look = biomeLook(biome.id);
    const bossRoom = dungeonBossRoom(map.rooms);
    this.bossArenaRoom = bossRoom;
    const w0 = biome.tileWeights.tile_dungeon_0 ?? 0.6;
    const w1 = biome.tileWeights.tile_dungeon_1 ?? 0.3;
    const w2 = biome.tileWeights.tile_dungeon_2 ?? 0.1;
    const wSum = Math.max(0.0001, w0 + w1 + w2);
    const t0 = w0 / wSum;
    const t1 = t0 + w1 / wSum;

    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        if (map.cells[y][x] !== 1) continue;
        const n = valueNoise(x, y, 4);
        let key: string;
        if (n < t0) {
          key = 'tile_dungeon_0';
        } else if (n < t1) {
          key = 'tile_dungeon_1';
        } else {
          key = 'tile_dungeon_2';
        }
        const gate = map.layerGates[y]![x] ?? null;
        const inArena = !!(bossRoom && tileInArenaRoom(x, y, bossRoom));
        const floorTint = inArena ? bossArenaFloorTint(look) : look.floorTint;
        const edgeA = inArena ? bossArenaEdgeAlpha(look) : look.edgeAlpha;
        const speckEvery = inArena
          ? bossArenaSpeckEvery(look)
          : look.speckEvery;
        // Floor tint is the main biome read — painted sheets alone look identical.
        this.placeFloorTile(x, y, key, floorTint, gate, floorTint);
        if (!gate && isDungeonFloorEdge(map.cells, x, y)) {
          this.strokeIsoTileOutline(this.tiles, x, y, look.accent, edgeA);
        }
        if ((x * 17 + y * 31) % speckEvery === 0 && !gate) {
          const { screenX, screenY } = worldToScreen(x, y);
          this.tiles.fillStyle(
            look.accent,
            inArena ? Math.min(0.85, look.speckAlpha + 0.2) : look.speckAlpha,
          );
          this.tiles.fillCircle(
            screenX,
            screenY,
            inArena ? look.speckRadius + 1.2 : look.speckRadius,
          );
        }
      }
    }
    this.tiles.setDepth(-999);
    this.paintBossArenaRing('idle');
    this.cullWorldSprites();
  }

  /** Iso diamond outline for shift-gate tiles / rift void edges. */
  private strokeIsoTileOutline(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    color: number,
    alpha = 0.85,
  ): void {
    const { screenX, screenY } = worldToScreen(x, y);
    g.lineStyle(2, color, alpha);
    g.beginPath();
    g.moveTo(screenX, screenY - 16);
    g.lineTo(screenX + 32, screenY);
    g.lineTo(screenX, screenY + 16);
    g.lineTo(screenX - 32, screenY);
    g.closePath();
    g.strokePath();
  }

  /** Cheap iso diamond — inset face, no ellipses. */
  private strokeIsoTile(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    color: number,
  ): void {
    const { screenX, screenY } = worldToScreen(x, y);
    g.fillStyle(color, 1);
    g.beginPath();
    g.moveTo(screenX, screenY - 16);
    g.lineTo(screenX + 32, screenY);
    g.lineTo(screenX, screenY + 16);
    g.lineTo(screenX - 32, screenY);
    g.closePath();
    g.fillPath();

    const r = (color >> 16) & 0xff;
    const gr = (color >> 8) & 0xff;
    const b = color & 0xff;
    const face = Phaser.Display.Color.GetColor(
      Math.min(255, r + 20),
      Math.min(255, gr + 16),
      Math.min(255, b + 10),
    );
    g.fillStyle(face, 0.38);
    g.beginPath();
    g.moveTo(screenX, screenY - 8);
    g.lineTo(screenX + 18, screenY + 1);
    g.lineTo(screenX, screenY + 10);
    g.lineTo(screenX - 18, screenY + 1);
    g.closePath();
    g.fillPath();

    g.lineStyle(1, 0x000000, 0.16);
    g.beginPath();
    g.moveTo(screenX, screenY - 16);
    g.lineTo(screenX + 32, screenY);
    g.lineTo(screenX, screenY + 16);
    g.lineTo(screenX - 32, screenY);
    g.closePath();
    g.strokePath();
  }

  update(_time: number, delta: number): void {
    if (this.deathPending) {
      this.player.syncScreen();
      return;
    }
    if (this.zoneBusy) {
      this.player.syncScreen();
      return;
    }
    if (this.inHitstop()) {
      this.player.syncScreen();
      return;
    }
    try {
      this.updateWorld(delta);
    } catch (err) {
      const now = Date.now();
      if (now - this.updateErrorAt > 3000) {
        this.updateErrorAt = now;
        console.error('[WorldScene] update failed; keeping scene alive', err);
      }
    }
  }

  private updateWorld(delta: number): void {
    const dt = Math.min(0.05, delta / 1000);
    gameState.playTimeSec += dt;
    this.player.tick(dt);
    gameState.tickRegen(dt);
    this.checkAmbushTriggers();

    let dx = 0;
    let dy = 0;
    if (this.wasd.A.isDown || this.cursors.left?.isDown) dx -= 1;
    if (this.wasd.D.isDown || this.cursors.right?.isDown) dx += 1;
    if (this.wasd.W.isDown || this.cursors.up?.isDown) dy -= 1;
    if (this.wasd.S.isDown || this.cursors.down?.isDown) dy += 1;
    if (dx === 0 && dy === 0) {
      dx = this.touchDx;
      dy = this.touchDy;
    }

    const manualMove = dx !== 0 || dy !== 0;
    if (manualMove) {
      this.assistChase = false;
    }
    if (
      canRepeatBasicAttack({
        held: this.attackHeld,
        uiBlocked: false,
      })
    ) {
      this.tryAttack();
      if (manualMove) this.assistChase = false;
    }
    if (!manualMove && this.assistChase && !netClient.connected) {
      const targetables = this.enemies.map((e) => ({
        x: e.worldX,
        y: e.worldY,
        alive: e.alive && !e.isGhosted,
      }));
      const nearestIdx = pickNearestEnemyIndex(
        targetables,
        this.player.worldX,
        this.player.worldY,
        ASSIST_RANGE,
      );
      if (nearestIdx < 0) {
        this.assistChase = false;
      } else {
        const nearest = this.enemies[nearestIdx]!;
        const dist = worldDistance(
          { x: this.player.worldX, y: this.player.worldY },
          { x: nearest.worldX, y: nearest.worldY },
        );
        const weaponRange = gameState.inventory.weaponRange();
        if (dist <= weaponRange) {
          this.tryAttack();
        } else {
          const dir = directionTo(
            { x: this.player.worldX, y: this.player.worldY },
            { x: nearest.worldX, y: nearest.worldY },
          );
          dx = dir.x;
          dy = dir.y;
        }
      }
    }

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
    if (dx !== 0 || dy !== 0) {
      gameEvents.emit(Events.PLAYER_MOVED, { dx, dy });
    }

    if (gameState.inRift) {
      const near = this.playerNearShiftGate();
      if (near !== this.lastNearGate) {
        this.lastNearGate = near;
        this.emitShiftHud();
      }
    }

    gameState.skills.tick(dt);
    gameState.bounties.tick(dt);

    if (Phaser.Input.Keyboard.JustDown(this.keyE)) this.tryInteract();
    if (Phaser.Input.Keyboard.JustDown(this.keyF)) this.tryCraftNearby();
    if (Phaser.Input.Keyboard.JustDown(this.keyR)) this.tryPortal();
    if (Phaser.Input.Keyboard.JustDown(this.keyTown)) this.returnToTown();
    if (Phaser.Input.Keyboard.JustDown(this.keySpace)) this.tryDash(dx, dy);
    if (Phaser.Input.Keyboard.JustDown(this.keyP)) this.toggleCoop();
    if (Phaser.Input.Keyboard.JustDown(this.keySkill1)) this.tryCastSkill(0);
    if (Phaser.Input.Keyboard.JustDown(this.keySkill2)) this.tryCastSkill(1);
    if (Phaser.Input.Keyboard.JustDown(this.keySkill3)) this.tryCastSkill(2);
    if (Phaser.Input.Keyboard.JustDown(this.keySkill4)) this.tryCastSkill(3);
    if (this.keyShift && Phaser.Input.Keyboard.JustDown(this.keyShift)) {
      this.tryPlayerShift();
    }

    this.shiftSystem.tick(delta);
    this.tickBossShift(delta);
    this.shiftHudAcc += dt;
    if (this.shiftHudAcc >= 0.2) {
      this.shiftHudAcc = 0;
      this.emitShiftHud();
    }
    this.updateEnemies(dt);

    this.proxAcc += dt;
    if (this.proxAcc >= 0.12) {
      this.proxAcc = 0;
      this.updateNpcProximity();
      this.updatePoiProximity();
      this.refreshInteractHint();
    }

    this.corpseAcc += dt;
    if (this.corpseAcc >= 2.5) {
      this.corpseAcc = 0;
      this.compactDeadEnemies();
    }

    this.saveTimer += dt;
    if (this.saveTimer > 8) {
      this.saveTimer = 0;
      this.persistGame();
    }

    this.revealFogAroundPlayer();
    this.mapEmitAcc += dt;
    if (this.mapEmitAcc >= 0.15 || this.exploredDirty) {
      this.mapEmitAcc = 0;
      this.emitMapSnapshot();
    }

    this.tileCullAcc += dt;
    if (this.tileCullAcc >= 0.1) {
      this.tileCullAcc = 0;
      this.cullWorldSprites();
    }
  }

  private triggerHitShake(ms = 100, intensity = 0.004): void {
    if (ms <= 0 || intensity <= 0) return;
    this.cameras.main.shake(ms, intensity);
  }

  private triggerCombatShake(kind: CombatShakeKind): void {
    const { ms, intensity } = combatShakeParams(kind);
    this.triggerHitShake(ms, intensity);
  }

  private triggerHitstop(kind: CombatHitstopKind | boolean = 'hit'): void {
    const tier: CombatHitstopKind =
      typeof kind === 'boolean' ? (kind ? 'crit' : 'hit') : kind;
    const ms = combatHitstopMs(tier);
    if (ms <= 0) return;
    this.hitstopUntil = Math.max(this.hitstopUntil, performance.now() + ms);
  }

  private inHitstop(): boolean {
    return performance.now() < this.hitstopUntil;
  }

  private compactDeadEnemies(): void {
    if (!this.enemies.some((e) => !e.alive)) return;
    const next: Enemy[] = [];
    for (const e of this.enemies) {
      if (e.alive) next.push(e);
      else e.destroy();
    }
    this.enemies = next;
  }

  private ensureMapTerrain(): void {
    const inRift = gameState.inRift;
    const width = inRift ? (this.dungeon?.width ?? 36) : this.hubSize;
    const height = inRift ? (this.dungeon?.height ?? 36) : this.hubSize;
    if (this.mapCells && this.mapW === width && this.mapH === height) {
      return;
    }
    let riftFloor: boolean[][] | undefined;
    if (inRift && this.dungeon) {
      riftFloor = this.dungeon.cells.map((row) => row.map((c) => c === 1));
    }
    const base = buildMapSnapshot({
      inRift,
      width,
      height,
      riftFloor,
      paths: this.hubLayout?.paths,
      pois: inRift ? [] : this.wildernessPois,
      player: { x: 0, y: 0, facing: 1 },
      npcs: [],
      chests: [],
      enemies: [],
      portal: null,
    });
    this.mapCells = base.cells;
    this.mapW = width;
    this.mapH = height;
    this.explored = new Array(width * height).fill(false);
    this.exploredDirty = true;
    if (!inRift) {
      // Plaza always known
      for (let y = PLAZA.y0; y <= PLAZA.y1; y++) {
        for (let x = PLAZA.x0; x <= PLAZA.x1; x++) {
          this.explored[y * width + x] = true;
        }
      }
      if (gameState.hubExplored) {
        mergeExplored(
          this.explored,
          unpackExplored(gameState.hubExplored, width * height),
        );
      }
    } else if (gameState.riftRun?.explored) {
      mergeExplored(
        this.explored,
        unpackExplored(gameState.riftRun.explored, width * height),
      );
    }
  }

  private revealFogAroundPlayer(): void {
    this.ensureMapTerrain();
    const w = this.mapW;
    const h = this.mapH;
    const px = Math.floor(this.player.worldX);
    const py = Math.floor(this.player.worldY);
    const r = FOG_REVEAL_R;
    let changed = false;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r) continue;
        const x = px + dx;
        const y = py + dy;
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        const i = y * w + x;
        if (!this.explored[i]) {
          this.explored[i] = true;
          changed = true;
        }
      }
    }
    if (changed) {
      this.exploredDirty = true;
      if (!gameState.inRift) {
        gameState.hubExplored = packExplored(this.explored);
      }
    }
  }

  private emitMapSnapshot(): void {
    this.ensureMapTerrain();
    let portal: { x: number; y: number } | null = null;
    if (this.portalMarker) {
      portal = {
        x: this.portalMarker.getData('wx') as number,
        y: this.portalMarker.getData('wy') as number,
      };
    }
    const markers = buildMapMarkers({
      inRift: gameState.inRift,
      width: this.mapW,
      height: this.mapH,
      pois: gameState.inRift ? [] : this.wildernessPois,
      player: {
        x: this.player.worldX,
        y: this.player.worldY,
        facing: this.player.getFacing(),
      },
      npcs: this.npcs.map((n) => ({
        x: n.worldX,
        y: n.worldY,
        name: n.name,
      })),
      chests: this.chests.map((c) => ({
        x: c.worldX,
        y: c.worldY,
        looted: c.looted,
      })),
      enemies: this.enemies.map((e) => ({
        x: e.worldX,
        y: e.worldY,
        alive: e.alive,
        elite: e.elitePack || e.def.isElite,
        boss: e.isBoss,
      })),
      portal,
    });
    const snap: MapSnapshot = {
      width: this.mapW,
      height: this.mapH,
      cells: this.mapCells!,
      markers,
      inRift: gameState.inRift,
      explored: this.explored,
    };
    this.exploredDirty = false;
    gameEvents.emit('ui:mapSnapshot', snap);
  }

  private clearEnemyShots(): void {
    for (const s of this.enemyShots) s.graphic.destroy();
    this.enemyShots = [];
  }

  private spawnEnemyShotGraphic(shot: EnemyShot): Phaser.GameObjects.Graphics {
    const g = this.add.graphics();
    g.fillStyle(0xc4b090, 1);
    g.fillCircle(0, 0, 4);
    g.lineStyle(1, 0xf4e4c8, 0.9);
    g.strokeCircle(0, 0, 4);
    const { screenX, screenY } = worldToScreen(shot.worldX, shot.worldY);
    g.setPosition(screenX, screenY);
    g.setDepth(depthFromWorld(shot.worldX, shot.worldY) + 8);
    return g;
  }

  private damagePlayer(rawDamage: number): void {
    const dealt = gameState.takeDamage(rawDamage);
    const { screenX, screenY } = worldToScreen(
      this.player.worldX,
      this.player.worldY,
    );
    if (settingsStore.get().showDamageNumbers) {
      gameState.combat.emitDamageNumber(screenX, screenY - 20, dealt, 'player');
    }
    this.player.flashHit();
    audioBus.hit();
    this.triggerCombatShake('playerHit');
    this.triggerHitstop(false);
    if (gameState.hp <= 0) this.onPlayerDeath();
  }

  /**
   * Surprise packs wake up when the player walks into a POI — the ambush
   * fires once per visit and announces itself.
   */
  private checkAmbushTriggers(): void {
    if (gameState.inRift) return;
    const ambushes = this.hubLayout?.ambushes;
    if (!ambushes || ambushes.length === 0) return;
    for (const ambush of ambushes) {
      if (this.ambushFired.has(ambush.id)) continue;
      const trigger = shouldTriggerAmbush({
        ambush,
        playerX: this.player.worldX,
        playerY: this.player.worldY,
        fired: false,
      });
      if (!trigger) continue;
      this.ambushFired.add(ambush.id);
      const base = snapToTile(ambush.x, ambush.y);
      for (let i = 0; i < ambush.count; i++) {
        const ox = i === 0 ? 0 : i % 2 === 0 ? 0.7 : -0.7;
        const oy = i === 0 ? 0 : i % 2 === 0 ? -0.7 : 0.7;
        const p = snapToTile(base.x + ox, base.y + oy);
        const enemy = new Enemy(
          this,
          `enemy_ambush_${this.enemySeq++}`,
          ambush.enemyId,
          p.x,
          p.y,
          { levelScale: gameState.progression.level },
        );
        enemy.maxBound = this.hubSize - 0.5;
        this.enemies.push(enemy);
      }
      gameEvents.emit('ui:toast', { text: 'Ambush — rift shades rise!' });
      audioBus.hit();
    }
  }

  private updateEnemies(dt: number): void {
    if (netClient.connected) return;
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      // Allies are passed for support behavior (Rift Mender heals).
      const result = enemy.update(
        dt,
        this.player.worldX,
        this.player.worldY,
        this.enemies,
      );
      if (result.hitPlayer) {
        this.damagePlayer(result.damage);
      }
      if (result.shot) {
        this.enemyShots.push({
          shot: result.shot,
          graphic: this.spawnEnemyShotGraphic(result.shot),
        });
      }
    }

    if (this.enemyShots.length === 0) return;
    const target = { worldX: this.player.worldX, worldY: this.player.worldY };
    const keep: {
      shot: EnemyShot;
      graphic: Phaser.GameObjects.Graphics;
    }[] = [];
    for (const s of this.enemyShots) {
      const r = advanceEnemyShot(s.shot, dt, target);
      if (r.hit) {
        s.graphic.destroy();
        this.damagePlayer(s.shot.damage);
        if (this.deathPending) {
          for (const rest of keep) rest.graphic.destroy();
          return;
        }
        continue;
      }
      if (r.expired) {
        s.graphic.destroy();
        continue;
      }
      const { screenX, screenY } = worldToScreen(s.shot.worldX, s.shot.worldY);
      s.graphic.setPosition(screenX, screenY);
      s.graphic.setDepth(depthFromWorld(s.shot.worldX, s.shot.worldY) + 8);
      keep.push(s);
    }
    this.enemyShots = keep;
  }

  private onPlayerDeath(): void {
    if (this.deathPending) return;
    this.clearEnemyShots();
    this.deathPending = true;
    audioBus.death();
    this.safeCameraFlash(280, 120, 20, 30);
    this.triggerCombatShake('boss');
    this.triggerHitstop(true);
    this.player.resetCombatPose();
    gameEvents.emit(Events.PLAYER_DIED, {
      kills: this.lifeKills,
      level: gameState.progression.level,
      gold: gameState.inventory.count('gold'),
      playTimeSec: gameState.playTimeSec,
      inRift: gameState.inRift,
      depth: gameState.inRift ? this.riftDepth : undefined,
    });
  }

  /** After death-screen confirm: half HP and back to plaza. */
  private finishDeath(): void {
    if (!this.deathPending) return;
    gameState.hp = Math.floor(gameState.maxHp * 0.5);
    this.player.resetCombatPose();
    if (gameState.inRift) {
      this.returnToTown(false, true);
    } else {
      this.player.worldX = TOWN_SPAWN.x;
      this.player.worldY = TOWN_SPAWN.y;
      gameState.worldX = TOWN_SPAWN.x;
      gameState.worldY = TOWN_SPAWN.y;
      this.player.syncScreen();
      this.persistGame();
    }
    this.lifeKills = 0;
    this.deathPending = false;
  }

  /** Always available (B): leave rift / reset to plaza. */
  private returnToTown(reward = false, silent = false): void {
    // Death / forced exits must not wait on an enter fade.
    if (this.zoneBusy && !silent) return;
    const wasRift = gameState.inRift;
    if (!wasRift) {
      if (!silent) {
        gameEvents.emit('ui:toast', { text: 'Already in town' });
      }
      return;
    }

    const finish = (): void => {
      if (reward && this.riftCleared) {
        gameState.progression.addXp(50);
        gameState.inventory.add('rift_shard', 1);
        gameState.inventory.add('gold', 20);
      } else if (!silent) {
        gameState.progression.addXp(8);
      }
      gameState.clearRiftRun();
      gameState.worldX = TOWN_SPAWN.x;
      gameState.worldY = TOWN_SPAWN.y;
      this.player.worldX = TOWN_SPAWN.x;
      this.player.worldY = TOWN_SPAWN.y;
      this.loadZone(false);
      this.persistGame();
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
      this.emitRiftProgress();
    };

    if (silent) {
      finish();
      return;
    }
    audioBus.portalExit();
    this.runZoneTransition('exit', finish);
  }

  /** Fade out → swap zone → fade in. Blocks stacked portal / B presses. */
  private runZoneTransition(kind: 'enter' | 'exit', work: () => void): void {
    if (this.zoneBusy) return;
    this.zoneBusy = true;
    this.resetCameraFx();
    const outMs = 160;
    const inMs = 220;
    const rgb =
      kind === 'enter' ? ([18, 36, 72] as const) : ([8, 14, 28] as const);
    try {
      this.cameras.main.fadeOut(outMs, rgb[0], rgb[1], rgb[2]);
    } catch {
      work();
      this.zoneBusy = false;
      return;
    }
    this.cameras.main.once(
      Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
      () => {
        try {
          work();
          playZoneWash(this, kind);
        } catch (err) {
          console.warn('[WorldScene] zone transition failed', err);
        }
        try {
          this.cameras.main.fadeIn(inMs, rgb[0], rgb[1], rgb[2]);
        } catch {
          /* ignore */
        }
        this.zoneBusy = false;
      },
    );
  }

  private isPointerOverUi(pointer: Phaser.Input.Pointer): boolean {
    const ui = this.game.scene.getScene('UIScene') as
      | (Phaser.Scene & {
          input?: { hitTestPointer?: (p: unknown) => unknown };
        })
      | undefined;
    if (!ui?.input?.hitTestPointer) return false;
    try {
      const hits = ui.input.hitTestPointer(pointer);
      return Array.isArray(hits) ? hits.length > 0 : false;
    } catch {
      return false;
    }
  }

  private clearAttackHold(): void {
    this.attackHeld = false;
  }

  private startBasicAttackHold(): void {
    if (this.deathPending) return;
    this.attackHeld = true;
    this.tryAttack();
  }

  private tryAttack(): void {
    if (this.player.attackCooldown > 0) return;
    if (netClient.connected) {
      // Co-op is server-authoritative: the mouse press is an input event,
      // not local damage. Send it and let the server resolve the hit.
      netClient.sendInput({
        dx: 0,
        dy: 0,
        attack: true,
        gather: false,
        skill: false,
      });
      this.player.attackCooldown = gameState.progression.attackCooldown();
      this.player.playAttack();
      return;
    }

    const pointer = this.input.activePointer;
    const range = gameState.inventory.weaponRange();
    const targetables = this.enemies.map((e) => ({
      x: e.worldX,
      y: e.worldY,
      alive: e.alive && !e.isGhosted,
    }));
    const nearestIdx = pickNearestEnemyIndex(
      targetables,
      this.player.worldX,
      this.player.worldY,
      ASSIST_RANGE,
    );

    if (nearestIdx >= 0) {
      const nearest = this.enemies[nearestIdx]!;
      const dist = worldDistance(
        { x: this.player.worldX, y: this.player.worldY },
        { x: nearest.worldX, y: nearest.worldY },
      );
      if (dist > range && dist <= ASSIST_RANGE) {
        this.player.faceToward(nearest.worldX, nearest.worldY);
        this.assistChase = true;
        return;
      }
      if (dist <= range) {
        this.assistChase = false;
        this.player.attackCooldown = gameState.progression.attackCooldown();
        this.player.faceToward(nearest.worldX, nearest.worldY);
        this.player.playAttack();
        audioBus.swing();

        const dmg = Math.max(
          1,
          Math.floor(
            gameState.combat.playerAttackDamage() *
              gameState.skills.damageMultiplier(),
          ),
        );
        let hitCount = 0;
        let anyCrit = false;
        let anyBoss = false;
        for (const enemy of this.enemies) {
          if (!enemy.alive || enemy.isGhosted) continue;
          const d = worldDistance(
            { x: this.player.worldX, y: this.player.worldY },
            { x: enemy.worldX, y: enemy.worldY },
          );
          if (d > range) continue;
          hitCount += 1;
          const crit = isCombatCrit(dmg);
          if (crit) anyCrit = true;
          if (enemy.isBoss) anyBoss = true;
          const { screenX, screenY } = worldToScreen(
            enemy.worldX,
            enemy.worldY,
          );
          gameState.combat.emitDamageNumber(
            screenX,
            screenY - 18,
            dmg,
            'enemy',
          );
          playCombatBurst(
            this,
            enemy.worldX,
            enemy.worldY,
            crit ? 'crit' : 'hit',
          );
          if (enemy.applyDamage(dmg)) this.onEnemyKilled(enemy);
        }
        if (hitCount > 0) {
          audioBus.hit();
          const juice = {
            anyCrit,
            anyBoss,
            hitCount,
          };
          this.triggerCombatShake(basicAttackShakeKind(juice));
          this.triggerHitstop(basicAttackHitstopKind(juice));
        }
        if (netClient.connected) {
          netClient.sendInput({
            dx: 0,
            dy: 0,
            attack: true,
            gather: false,
            skill: false,
          });
        }
        return;
      }
    }

    // No enemy in assist range: pointer fallback + whiff
    this.assistChase = false;
    this.player.attackCooldown = gameState.progression.attackCooldown();
    const { screenX } = worldToScreen(this.player.worldX, this.player.worldY);
    const aimX = this.player.worldX + (pointer.worldX >= screenX ? 1 : -1);
    const aimY = this.player.worldY;
    this.player.faceToward(aimX, aimY);
    this.player.playAttack();
    audioBus.swing();
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
    if (gameState.inRift) this.shiftSystem.onKill();
    const depthBump = gameState.inRift
      ? riftLootTierBump(this.riftDepth) +
        this.riftMod.lootBump +
        this.depthRule.lootBump
      : 0;
    const tier = clampLootTier(
      (enemy.def.lootTier ?? 2) +
        (enemy.elitePack ? 1 : 0) +
        (enemy.isBoss ? 1 : 0) +
        depthBump,
    );
    const goldOnKill = gameState.inRift
      ? this.riftMod.goldOnKill + this.depthRule.goldOnKill
      : 0;
    if (goldOnKill > 0) {
      gameState.inventory.add('gold', goldOnKill);
    }
    this.grantBiomeMaterial(enemy);
    const scoutKill = enemy.def.id === 'ash_scout';
    const batKill = enemy.def.id === 'ash_bat';
    const brambleKill = enemy.def.id === 'ash_bramble';
    const namedElite = scoutKill || batKill || brambleKill;
    gameState.combat.grantKillRewards(enemy.def.xp, enemy.def.lootTable, {
      elite: enemy.awardsEliteLoot,
      lootTier: tier,
      guaranteedMinRarity: namedElite
        ? 'magic'
        : enemy.isBoss
          ? 'rare'
          : undefined,
      autoBag: false,
      onGear: (g) => {
        this.spawnGearDrop(enemy.worldX, enemy.worldY, g);
        if (scoutKill) {
          gameEvents.emit('ui:toast', {
            text: `Scout fall — ${g.rarity} ${g.name}`,
          });
        } else if (batKill) {
          gameEvents.emit('ui:toast', {
            text: `Nightwing down — ${g.rarity} ${g.name}`,
          });
        } else if (brambleKill) {
          gameEvents.emit('ui:toast', {
            text: `Bramble crushed — ${g.rarity} ${g.name}`,
          });
        } else {
          gameEvents.emit('ui:toast', {
            text: `Loot · ${describeGear(g)} · E / click`,
          });
        }
      },
    });
    if (!gameState.inRift) {
      if (scoutKill) gameState.bounties.noteScoutKill();
      else if (brambleKill) gameState.bounties.noteBrambleKill();
      else gameState.bounties.noteWildernessKill();
    }
    this.persistGame();
    this.lifeKills += 1;
    if (enemy.isBoss) {
      this.triggerCombatShake('boss');
      this.triggerHitstop('crit');
      playCombatBurst(this, enemy.worldX, enemy.worldY, 'crit');
    } else if (enemy.awardsEliteLoot) {
      this.triggerCombatShake('crit');
      playCombatBurst(this, enemy.worldX, enemy.worldY, 'crit');
    } else {
      this.triggerCombatShake('hit');
    }
    if (!gameState.inRift) return;

    if (
      isRiftBossKill({ id: enemy.id, defId: enemy.def.id }, this.riftBossId)
    ) {
      this.riftBossDead = true;
      this.riftBossId = null;
      this.riftCleared = true;
      this.spawnBossChest(enemy.worldX, enemy.worldY);
      this.openExitPortal();
      this.safeCameraFlash(220, 80, 160, 220);
      this.emitRiftProgress();
      gameEvents.emit(Events.RIFT_BOSS_SUMMARY, {
        depth: this.riftDepth,
        kills: this.riftKills,
        modName: this.riftMod.name,
        ruleName:
          this.depthRule.id === 'none' ? undefined : this.depthRule.name,
        gold: gameState.inventory.count('gold'),
        level: gameState.progression.level,
      });
      return;
    }

    this.riftKills += 1;
    this.emitRiftProgress();
    if (!this.riftBossSpawned && this.riftKills >= this.riftKillGoal) {
      this.spawnRiftBoss();
    }
  }

  /**
   * Biome material on rift kills — the crafting sink that makes each biome
   * worth re-running (Nix pays 1.4x, recipes need all three).
   */
  private grantBiomeMaterial(enemy: Enemy): void {
    if (!gameState.inRift || !this.dungeon) return;
    const itemId = this.dungeon.biome.lootMaterial;
    if (!itemId) return;
    const elite = enemy.awardsEliteLoot;
    if (Math.random() > (elite ? 0.85 : 0.35)) return;
    const qty = elite ? 2 + Math.floor(Math.random() * 2) : 1;
    if (!gameState.inventory.add(itemId, qty)) return;
    const itemName = getItemDef(itemId)?.name ?? itemId;
    const toast = biomeMatDropToast({
      itemName,
      qty,
      touch: shouldShowTouchControls(),
      craftKey: formatHotkey('craft'),
      state: this.biomeMatFeedback,
    });
    this.biomeMatFeedback = toast.state;
    gameEvents.emit('ui:toast', { text: toast.text });
  }

  private spawnRiftBoss(): void {
    if (this.riftBossSpawned || !gameState.inRift) return;
    this.riftBossSpawned = true;
    const anchor = this.bossAnchor ?? {
      x: this.player.worldX + 2,
      y: this.player.worldY,
    };
    const p = snapToTile(anchor.x, anchor.y);
    const boss = new Enemy(
      this,
      `enemy_${this.enemySeq++}`,
      this.riftBossDefId,
      p.x,
      p.y,
      {
        boss: true,
        levelScale: gameState.progression.level + 2 + this.riftDepth,
        hpMult: earlyBiomeBossHpMult(this.riftDepth, this.riftBossDefId),
        dmgMult: earlyBiomeBossDmgMult(this.riftDepth, this.riftBossDefId),
      },
    );
    boss.maxBound = 22;
    const bossLock = riftModLayerLock(this.riftMod);
    boss.setCombatLayer(bossLock ?? this.bossShift.layer);
    boss.syncShiftLayer(this.shiftSystem.layer);
    this.enemies.push(boss);
    this.riftBossId = boss.id;
    gameEvents.emit('ui:toast', {
      text: bossPhaseToastText({
        bossName: boss.def.name,
        depthLabel: riftDepthLabel(this.riftDepth),
      }),
    });
    // Emerge: scale-in + crit burst so the spawn reads as a setpiece.
    boss.body.setScale(0.4);
    boss.body.setAlpha(0.35);
    this.tweens.add({
      targets: boss.body,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 420,
      ease: 'Back.easeOut',
    });
    playCombatBurst(this, boss.worldX, boss.worldY, 'crit');
    this.safeCameraFlash(220, 160, 60, 120);
    this.triggerCombatShake('boss');
    this.triggerHitstop('crit');
    audioBus.skill();
    playEnemyTelegraph(this, 'wail', 'impact', boss.worldX, boss.worldY);
    this.paintBossArenaRing('boss');
    this.emitRiftProgress();
  }

  private tickBossShift(dtMs: number): void {
    if (!gameState.inRift || !this.riftBossSpawned || this.riftBossDead) {
      return;
    }
    // Layer-locked mods pin hop bosses — other tells still fire.
    const boss = this.enemies.find(
      (e) =>
        e.alive &&
        (this.riftBossId !== null ? e.id === this.riftBossId : e.isBoss),
    );
    if (!boss) return;
    const kind = bossSignatureKind(boss.def.id);
    if (kind === 'shift_hop' && riftModLayerLock(this.riftMod)) return;

    const ev = this.bossShift.tick(dtMs);
    if (!ev) return;
    const telegraph = bossSignatureTelegraph(kind);

    if (ev.phase === 'warn') {
      const nextName = SHIFT_LAYERS[ev.nextLayer].name;
      gameEvents.emit('ui:toast', {
        text: bossSignatureWarnToast({
          bossName: boss.def.name,
          kind,
          nextLayerName: nextName,
        }),
      });
      playEnemyTelegraph(this, telegraph, 'windup', boss.worldX, boss.worldY);
      audioBus.open();
      return;
    }

    // Punish beat — hop or signature special.
    if (kind === 'shift_hop') {
      boss.setCombatLayer(ev.layer);
      boss.syncShiftLayer(this.shiftSystem.layer);
      playShiftTransition(this, ev.layer, this.shiftFxIntensity);
      const punch = shiftShakeParams(this.shiftFxIntensity);
      this.triggerHitShake(punch.ms, punch.intensity);
      playEnemyTelegraph(this, 'wail', 'impact', boss.worldX, boss.worldY);
    } else if (kind === 'kite_wail') {
      boss.forceSignatureWail(this.player.worldX, this.player.worldY);
      playEnemyTelegraph(this, 'wail', 'impact', boss.worldX, boss.worldY);
      this.triggerHitShake(90, 0.004);
    } else if (kind === 'charge') {
      boss.forceSignatureRush(this.player.worldX, this.player.worldY);
      playEnemyTelegraph(this, 'rush', 'impact', boss.worldX, boss.worldY);
      this.triggerCombatShake('crit');
    } else {
      this.fireBossVolley(boss);
      playEnemyTelegraph(this, 'shot', 'impact', boss.worldX, boss.worldY);
      this.triggerHitShake(80, 0.0035);
    }
    audioBus.skill();
    gameEvents.emit('ui:toast', {
      text: bossSignaturePunishToast({
        bossName: boss.def.name,
        kind,
        layerName: SHIFT_LAYERS[ev.layer].name,
      }),
    });
  }

  /** Salt Warden punish — three-spoke shot fan at the player. */
  private fireBossVolley(boss: Enemy): void {
    const from = { x: boss.worldX, y: boss.worldY };
    const to = { x: this.player.worldX, y: this.player.worldY };
    const dmg = Math.max(1, Math.floor(boss.def.damage * 0.85));
    for (const angle of BOSS_VOLLEY_SPREAD) {
      const aim = volleyAimPoint(from, to, angle);
      const shot = createEnemyShot(from, aim, dmg);
      this.enemyShots.push({
        shot,
        graphic: this.spawnEnemyShotGraphic(shot),
      });
    }
  }

  private spawnBossChest(wx: number, wy: number): void {
    const p = snapToTile(wx + 0.8, wy - 0.6);
    const tier = clampLootTier(4 + riftLootTierBump(this.riftDepth));
    this.chests.push(
      new LootChest(this, `chest_boss_${this.chestSeq++}`, p.x, p.y, tier),
    );
    this.playLootJuice('legendary', p.x, p.y);
    this.triggerCombatShake('crit');
  }

  private playLootJuice(
    rarity: GearRarity,
    worldX?: number,
    worldY?: number,
  ): void {
    const tone =
      rarity === 'legendary'
        ? 'legendary'
        : rarity === 'rare'
          ? 'rare'
          : rarity === 'magic'
            ? 'magic'
            : 'common';
    audioBus.loot(tone);
    if (!rarityWantsCameraFlash(rarity)) return;
    const flash =
      rarity === 'legendary'
        ? [255, 180, 60]
        : rarity === 'rare'
          ? [120, 160, 255]
          : [80, 200, 140];
    this.safeCameraFlash(140, flash[0], flash[1], flash[2]);
    if (
      rarityWantsBurst(rarity) &&
      worldX !== undefined &&
      worldY !== undefined
    ) {
      playCombatBurst(
        this,
        worldX,
        worldY,
        rarity === 'legendary' ? 'crit' : 'hit',
      );
    }
  }

  private openExitPortal(opts: { silent?: boolean } = {}): void {
    this.portalMarker?.destroy(true);
    const layer = this.shiftSystem.layer;
    const point = pickExitPortalPoint({
      preferred: this.bossAnchor,
      fallback: {
        x: this.player.worldX,
        y: this.player.worldY - 1.5,
      },
      isWalkable: (tx, ty) => {
        if (!this.dungeon) return true;
        return isWalkableOnLayer(
          this.dungeon.cells,
          this.dungeon.layerGates,
          tx,
          ty,
          layer,
        );
      },
    });
    const p = snapToTile(point.x, point.y);
    this.portalMarker = this.makeExitPortal(p.x, p.y);
    if (!opts.silent) {
      audioBus.portalExit();
      playPortalReveal(this, p.x, p.y);
      this.safeCameraFlash(180, 70, 150, 230);
    }
    this.paintBossArenaRing('exit');
    this.emitMapSnapshot();
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
      depth: this.riftDepth,
      modName: this.riftMod.name,
      ruleName: this.depthRule.id === 'none' ? undefined : this.depthRule.name,
    });
  }

  /** Snapshot living rift state into GameState before disk write. */
  private syncRiftRunToState(): void {
    if (!gameState.inRift || !this.dungeon) {
      gameState.riftRun = null;
      return;
    }
    gameState.riftRun = this.captureRiftRun();
    gameState.riftSeed = gameState.riftRun.seed;
  }

  private persistGame(): void {
    if (this.player) {
      gameState.worldX = this.player.worldX;
      gameState.worldY = this.player.worldY;
    }
    this.syncRiftRunToState();
    gameState.persist();
  }

  private captureRiftRun(): RiftRunSave {
    const seed = gameState.riftSeed ?? 0;
    const enemies = sanitizeRiftEnemies(
      this.enemies
        .filter((e) => e.alive && e.hp > 0)
        .map((e) => ({
          defId: e.def.id,
          x: e.worldX,
          y: e.worldY,
          hp: e.hp,
          elitePack: e.elitePack,
          boss: e.isBoss,
          combatLayer: e.shiftLayer,
        })),
    );
    const groundLoot = this.groundLoot
      .filter((d) => !d.picked)
      .map((d) => ({
        x: d.worldX,
        y: d.worldY,
        item: cloneGearInstance(d.item),
      }));
    const bossChestEntity = this.chests.find((c) => c.isBossChest) ?? null;
    const bossChest = bossChestEntity
      ? {
          x: bossChestEntity.worldX,
          y: bossChestEntity.worldY,
          looted: bossChestEntity.looted,
          lootTier: bossChestEntity.lootTier,
        }
      : null;
    const nodes = this.nodes
      .filter((n) => !n.depleted && n.hp > 0)
      .map((n) => ({
        id: n.defId,
        x: n.worldX,
        y: n.worldY,
        hp: n.hp,
      }));
    const exploredPacked =
      this.explored.length > 0 ? packExplored(this.explored) : null;
    const combat = gameState.skills.snapshotCombat();
    return {
      seed,
      depth: this.riftDepth,
      modId: this.riftMod.id,
      kills: this.riftKills,
      bossSpawned: this.riftBossSpawned,
      bossDead: this.riftBossDead,
      cleared: this.riftCleared,
      shiftLayer: this.shiftSystem.layer,
      shiftEnergy: this.shiftSystem.energy,
      shiftCooldownLeft: this.shiftSystem.cooldownLeft,
      explored: exploredPacked,
      enemies,
      groundLoot,
      bossChest,
      nodes,
      skillCooldowns: combat.skillCooldowns,
      barrierHp: combat.barrierHp,
      barrierLeft: combat.barrierLeft,
      damageBuffMult: combat.damageBuffMult,
      damageBuffLeft: combat.damageBuffLeft,
    };
  }

  /** Restore living state after dungeon geometry is built. */
  private applyRiftRun(run: RiftRunSave): void {
    this.riftKills = run.kills;
    this.riftBossSpawned = run.bossSpawned;
    this.riftBossDead = run.bossDead;
    this.riftCleared = run.cleared;
    this.riftBossId = null;

    this.shiftSystem.restoreState({
      layer: run.shiftLayer,
      energy: run.shiftEnergy,
      cooldownLeft: run.shiftCooldownLeft,
    });
    gameState.skills.restoreCombat({
      skillCooldowns: run.skillCooldowns,
      barrierHp: run.barrierHp,
      barrierLeft: run.barrierLeft,
      damageBuffMult: run.damageBuffMult,
      damageBuffLeft: run.damageBuffLeft,
    });

    for (const e of this.enemies) e.destroy();
    this.enemies = [];
    const rows = sanitizeRiftEnemies(run.enemies);
    for (const row of rows) {
      const p = snapToTile(row.x, row.y);
      const enemy = new Enemy(
        this,
        `enemy_${this.enemySeq++}`,
        row.defId,
        p.x,
        p.y,
        {
          elitePack: row.elitePack,
          boss: row.boss,
          levelScale: row.boss
            ? gameState.progression.level + 2 + this.riftDepth
            : gameState.progression.level,
          hpMult: row.boss
            ? earlyBiomeBossHpMult(this.riftDepth, row.defId)
            : this.riftMod.hpMult * this.depthRule.hpMult,
          dmgMult: row.boss
            ? earlyBiomeBossDmgMult(this.riftDepth, row.defId)
            : this.riftMod.dmgMult * this.depthRule.dmgMult,
          speedMult: this.riftMod.speedMult * this.depthRule.speedMult,
        },
      );
      enemy.hp = Math.min(row.hp, enemy.maxHp);
      if (row.combatLayer === 'ash' || row.combatLayer === 'shadow') {
        enemy.setCombatLayer(row.combatLayer);
      }
      enemy.maxBound = (this.dungeon?.width ?? 22) - 1.5;
      enemy.syncShiftLayer(this.shiftSystem.layer);
      this.enemies.push(enemy);
      if (row.boss) {
        this.riftBossId = enemy.id;
        this.riftBossDefId = row.defId;
        this.riftBossSpawned = true;
      }
    }

    for (const n of this.nodes) n.destroy();
    this.nodes = [];
    for (const row of run.nodes) {
      if (row.hp <= 0) continue;
      const p = snapToTile(row.x, row.y);
      const node = new ResourceNode(
        this,
        `node_${this.nodeSeq++}`,
        row.id,
        p.x,
        p.y,
      );
      node.hp = Math.min(row.hp, node.maxHp);
      node.redraw();
      this.nodes.push(node);
    }

    for (const c of this.chests) c.destroy();
    this.chests = [];
    if (run.bossChest) {
      const p = snapToTile(run.bossChest.x, run.bossChest.y);
      const chest = new LootChest(
        this,
        `chest_boss_${this.chestSeq++}`,
        p.x,
        p.y,
        run.bossChest.lootTier,
      );
      if (run.bossChest.looted) chest.markLooted();
      this.chests.push(chest);
    }

    for (const l of this.groundLoot) l.destroy();
    this.groundLoot = [];
    for (const drop of run.groundLoot) {
      this.spawnGearDrop(drop.x, drop.y, cloneGearInstance(drop.item), {
        silent: true,
        exact: true,
      });
    }

    gameState.riftRun = run;
    if (run.bossDead) {
      this.portalMarker?.destroy(true);
      this.portalMarker = null;
      this.openExitPortal({ silent: true });
    } else if (run.bossSpawned) {
      this.paintBossArenaRing('boss');
    } else {
      this.paintBossArenaRing('idle');
    }

    this.emitRiftProgress();
  }

  private tryCastSkill(
    slot: number,
    aimScreen?: {
      dirX: number;
      dirY: number;
      pointerX: number;
      pointerY: number;
    },
  ): void {
    let aim: SkillAimHint | undefined;
    if (aimScreen) {
      const { dx, dy } = screenDirToWorldDelta(aimScreen.dirX, aimScreen.dirY);
      const reach = 5;
      aim = {
        dirX: dx,
        dirY: dy,
        worldX: this.player.worldX + dx * reach,
        worldY: this.player.worldY + dy * reach,
      };
    }
    const result = gameState.skills.cast(slot, {
      player: this.player,
      enemies: this.enemies,
      combat: gameState.combat,
      walkCheck: this.player.walkCheck,
      gearSkillPower: gameState.inventory.totalGearStats().skillPower,
      onKill: (enemy) => this.onEnemyKilled(enemy),
      aim,
    });
    if (!result.ok) {
      if (result.reason === 'out_of_range') {
        const now = this.time.now;
        if (shouldShowRangeHint(now, this.lastRangeHintAt)) {
          this.lastRangeHintAt = now;
          gameEvents.emit('ui:toast', { text: 'Move closer' });
        }
      } else if (result.reason) {
        gameEvents.emit('ui:toast', { text: result.reason });
      }
      return;
    }
    audioBus.skill();
    if (result.vfx && result.origin) {
      const classId = gameState.progression.classId as CharacterClassId;
      const hex =
        (classesData as Record<string, { color?: string }>)[classId]?.color ??
        '#c4a574';
      const color = Phaser.Display.Color.HexStringToColor(hex).color;
      playSkillVfx(this, {
        kind: result.vfx,
        worldX: result.origin.x,
        worldY: result.origin.y,
        targetX: result.target?.x,
        targetY: result.target?.y,
        facing: this.player.getFacing() < 0 ? -1 : 1,
        color,
        range: result.range,
      });
    }
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
    const action = this.resolveCurrentInteract();
    this.applyInteract(action);
  }

  private collectInteractCandidates(): InteractCandidate[] {
    const out: InteractCandidate[] = [];
    for (const drop of this.groundLoot) {
      if (drop.picked) continue;
      out.push({
        kind: 'loot',
        x: drop.worldX,
        y: drop.worldY,
        id: drop.id,
      });
    }
    for (const npc of this.npcs) {
      out.push({
        kind: 'npc',
        x: npc.worldX,
        y: npc.worldY,
        id: npc.id,
        npcRole: npc.role,
      });
    }
    if (this.portalMarker) {
      out.push({
        kind: 'portal',
        x: this.portalMarker.getData('wx') as number,
        y: this.portalMarker.getData('wy') as number,
        id: 'portal',
        portalExit: gameState.inRift,
      });
    }
    for (const chest of this.chests) {
      if (chest.looted) continue;
      out.push({
        kind: 'chest',
        x: chest.worldX,
        y: chest.worldY,
        id: chest.id,
      });
    }
    if (!gameState.inRift) {
      const shrine = this.wildernessPois.find((p) => p.kind === 'shrine');
      if (shrine) {
        out.push({
          kind: 'shrine',
          x: shrine.x,
          y: shrine.y,
          id: shrine.id,
        });
      }
    }
    if (this.benchMarker) {
      out.push({
        kind: 'bench',
        x: this.benchMarker.getData('wx') as number,
        y: this.benchMarker.getData('wy') as number,
        id: 'bench',
      });
    }
    for (const node of this.nodes) {
      if (node.depleted) continue;
      out.push({
        kind: 'gather',
        x: node.worldX,
        y: node.worldY,
        id: node.id,
      });
    }
    return out;
  }

  private resolveCurrentInteract(): ResolvedInteract {
    return resolveInteractAction(
      { x: this.player.worldX, y: this.player.worldY },
      this.collectInteractCandidates(),
      { gatherRange: this.player.gatherRange },
    );
  }

  private refreshInteractHint(): void {
    const a = this.resolveCurrentInteract();
    this.lastInteractHint = {
      label: a.label,
      dimmed: a.dimmed,
      kind: a.kind,
    };
    gameEvents.emit('ui:interactHint', this.lastInteractHint);
  }

  private applyInteract(action: ResolvedInteract): void {
    switch (action.kind) {
      case 'loot': {
        if (action.id) {
          const drop = this.groundLoot.find((d) => d.id === action.id);
          if (drop && this.pickupLoot(drop)) return;
        }
        this.tryPickupNearestLoot();
        return;
      }
      case 'npc': {
        const role = action.npcRole;
        if (role === 'vendor') {
          gameEvents.emit('ui:openShop', {});
          return;
        }
        if (role === 'trader') {
          gameEvents.emit('ui:openTrader', {});
          return;
        }
        if (role === 'crafter') {
          gameEvents.emit('ui:openCraft', {});
          return;
        }
        if (role === 'board') {
          this.tryBountyBoard();
          return;
        }
        return;
      }
      case 'portal':
        this.tryPortal();
        return;
      case 'chest':
        this.tryOpenChest();
        return;
      case 'shrine':
        this.tryShrine();
        return;
      case 'bench':
        gameEvents.emit('ui:openCraft', {});
        return;
      case 'gather':
        this.tryGather();
        return;
      case 'none':
        gameEvents.emit('ui:toast', {
          text: 'Mira · Nix · Bram · Board — E near them',
        });
        return;
    }
  }

  private spawnGearDrop(
    nearX: number,
    nearY: number,
    item: GearInstance,
    opts: { silent?: boolean; exact?: boolean } = {},
  ): void {
    const jitter = () => (Math.random() - 0.5) * 0.9;
    const p = opts.exact
      ? snapToTile(nearX, nearY)
      : snapToTile(nearX + jitter(), nearY + jitter());
    const drop = new GroundLoot(this, `loot_${this.lootSeq++}`, p.x, p.y, item);
    this.groundLoot.push(drop);
    if (!opts.silent) this.playLootJuice(item.rarity, p.x, p.y);
  }

  private tryClickLoot(screenX: number, screenY: number): boolean {
    for (let i = this.groundLoot.length - 1; i >= 0; i--) {
      const drop = this.groundLoot[i]!;
      if (drop.picked) continue;
      if (!drop.hitTest(screenX, screenY)) continue;
      return this.pickupLoot(drop);
    }
    return false;
  }

  private tryPickupNearestLoot(): boolean {
    let nearest: GroundLoot | null = null;
    let best = 1.55;
    for (const drop of this.groundLoot) {
      if (drop.picked) continue;
      const dist = worldDistance(
        { x: this.player.worldX, y: this.player.worldY },
        { x: drop.worldX, y: drop.worldY },
      );
      if (dist < best) {
        best = dist;
        nearest = drop;
      }
    }
    if (!nearest) return false;
    return this.pickupLoot(nearest);
  }

  private pickupLoot(drop: GroundLoot): boolean {
    if (drop.picked) return false;
    if (!gameState.inventory.addGear(drop.item)) {
      gameEvents.emit('ui:toast', { text: 'Bag full — clear space first' });
      return true;
    }
    const g = drop.item;
    drop.playPickup();
    this.groundLoot = this.groundLoot.filter((d) => d !== drop);
    if (g.rarity === 'common') {
      audioBus.uiClick();
    } else {
      audioBus.loot(
        g.rarity === 'legendary'
          ? 'legendary'
          : g.rarity === 'rare'
            ? 'rare'
            : 'magic',
      );
      const c = rarityPhaser(g.rarity);
      this.safeCameraFlash(70, (c >> 16) & 0xff, (c >> 8) & 0xff, c & 0xff);
    }
    this.persistGame();
    const chase =
      g.setId &&
      setChaseStatus(
        g.setId,
        gameState.inventory.equipment,
        gameState.inventory.slots,
      );
    gameEvents.emit('ui:toast', {
      text: chase
        ? `Picked up · ${g.name} · ${chase.line}`
        : `Picked up · ${g.name}`,
      color: rarityCss(g.rarity),
    });
    return true;
  }

  private tryBountyBoard(): void {
    if (gameState.inRift) {
      gameEvents.emit('ui:toast', { text: 'Bounties are posted in town' });
      return;
    }
    const line = gameState.bounties.statusLine();
    if (line) {
      gameEvents.emit('ui:toast', { text: `Active: ${line}` });
      return;
    }
    if (!gameState.bounties.canAccept()) {
      gameEvents.emit('ui:toast', {
        text: 'Board resting — try again shortly',
      });
      return;
    }
    const b = gameState.bounties.accept();
    if (!b) return;
    audioBus.uiClick();
    this.persistGame();
    const itemBit = b.rewardItemId
      ? ` + ${b.rewardItemId.replace(/_/g, ' ')}`
      : '';
    gameEvents.emit('ui:toast', {
      text: `Bounty: ${b.label} · reward ${b.rewardGold}g + ${b.rewardXp} XP${itemBit}`,
    });
  }

  private tryShrine(): boolean {
    if (gameState.inRift) return false;
    const shrine = this.wildernessPois.find((p) => p.kind === 'shrine');
    if (!shrine) return false;
    const dist = worldDistance(
      { x: this.player.worldX, y: this.player.worldY },
      { x: shrine.x, y: shrine.y },
    );
    if (dist > 1.6) return false;
    const now = this.time.now;
    if (now < this.shrineReadyAt) {
      const left = Math.ceil((this.shrineReadyAt - now) / 1000);
      gameEvents.emit('ui:toast', {
        text: `Shrine cooling — ${left}s`,
      });
      return true;
    }
    const bless = gameState.skills.applyShrineBuff(1.4, 45);
    this.shrineReadyAt = now + 90_000;
    const heal = Math.floor(gameState.maxHp * 0.15);
    gameState.hp = Math.min(gameState.maxHp, gameState.hp + heal);
    this.safeCameraFlash(180, 220, 100, 60);
    gameState.bounties.noteShrineUse();
    audioBus.skill();
    audioBus.open();
    gameEvents.emit('ui:toast', {
      text: `Ember blessing — +${Math.round((bless.mult - 1) * 100)}% damage ${bless.duration}s`,
    });
    return true;
  }

  private tryOpenChest(): boolean {
    let nearest: LootChest | null = null;
    let best = 1.5;
    for (const chest of this.chests) {
      if (chest.looted) continue;
      const dist = worldDistance(
        { x: this.player.worldX, y: this.player.worldY },
        { x: chest.worldX, y: chest.worldY },
      );
      if (dist < best) {
        best = dist;
        nearest = chest;
      }
    }
    if (!nearest) return false;
    this.openChest(nearest);
    return true;
  }

  private openChest(chest: LootChest): void {
    const tier = chest.lootTier as LootTier;
    const gold =
      tier === 1
        ? 4 + Math.floor(Math.random() * 6)
        : tier === 2
          ? 8 + Math.floor(Math.random() * 10)
          : tier === 3
            ? 14 + Math.floor(Math.random() * 16)
            : 25 + Math.floor(Math.random() * 30);
    gameState.inventory.add('gold', gold);
    const scrap = 1 + Math.floor(Math.random() * (1 + tier));
    gameState.inventory.add('scrap', scrap);
    if (tier >= 2 && Math.random() < 0.55) {
      gameState.inventory.add('ore', 1 + Math.floor(Math.random() * tier));
    }
    if (tier >= 3 && Math.random() < 0.4) {
      gameState.inventory.add('rift_shard', 1);
    }

    const parts = [`+${gold}g`, `scrap×${scrap}`];
    const gearOdds = Math.min(0.95, gearDropChance(tier, tier >= 4) + 0.25);
    if (Math.random() < gearOdds) {
      const chase = setChaseDropBias(
        gameState.progression.classId,
        gameState.inventory.equipment,
        gameState.inventory.slots,
      );
      const gear = rollGearDrop(gameState.progression.level, {
        elite: tier >= 4,
        preferArmor: chase.preferSlots?.length ? true : Math.random() > 0.35,
        forClass: gameState.progression.classId,
        lootTier: tier,
        minRarity: tier >= 3 ? 'magic' : undefined,
        preferSetId: chase.preferSetId,
        preferSlots: chase.preferSlots,
      });
      this.spawnGearDrop(chest.worldX, chest.worldY, gear);
      parts.push(`${gear.rarity} ${gear.name} (ground)`);
    }

    chest.markLooted();
    chest.playOpenPop();
    if (!gameState.inRift) gameState.bounties.noteChestOpen();
    audioBus.open();
    if (chest.isBossChest || tier >= 4) {
      this.playLootJuice('legendary', chest.worldX, chest.worldY);
      this.triggerCombatShake('crit');
    } else {
      audioBus.loot(tier >= 3 ? 'magic' : 'common');
      this.triggerHitShake(60, 0.003);
    }
    this.persistGame();
    gameEvents.emit('ui:toast', {
      text: `Chest — ${parts.join(' · ')}`,
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
    gameEvents.emit('ui:toast', {
      text: 'Mira · Nix · Bram · Board — E near them',
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
    if (this.zoneBusy) return;
    if (!this.portalMarker) {
      if (gameState.inRift && !this.riftBossDead) {
        gameEvents.emit('ui:toast', {
          text: 'Kill → Boss → Exit — or press B to abandon',
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
      const coopBlock = coopRiftBlockedReason(netClient.connected);
      if (coopBlock) {
        gameEvents.emit('ui:toast', { text: coopBlock });
        return;
      }
      gameState.inRift = true;
      gameState.riftRun = null;
      gameState.pendingRiftResumeToast = false;
      gameState.riftSeed = (Date.now() ^ (Math.random() * 1e9)) >>> 0;
      audioBus.portalEnter();
      this.runZoneTransition('enter', () => {
        this.loadZone(true);
        gameEvents.emit(Events.RIFT_ENTERED, {
          seed: gameState.riftSeed,
          depth: this.riftDepth,
        });
        gameEvents.emit('ui:toast', {
          text: riftEnterToastText({
            depthLabel: riftDepthLabel(this.riftDepth),
            modName: this.riftMod.name,
            modBlurb: this.riftMod.blurb,
            ruleName:
              this.depthRule.id === 'none' ? undefined : this.depthRule.name,
            ruleBlurb:
              this.depthRule.id === 'none' ? undefined : this.depthRule.blurb,
            biomeName: this.dungeon?.biome.name,
          }),
        });
        this.emitRiftProgress();
        this.persistGame();
      });
      return;
    }
    if (this.riftBossDead) {
      this.returnToTown(true);
      return;
    }
    gameEvents.emit('ui:toast', {
      text: 'Defeat the boss to open the Exit (B abandons)',
    });
    this.persistGame();
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
      playCombatBurst(this, enemy.worldX, enemy.worldY, 'burn');
      if (enemy.applyDamage(dmg)) this.onEnemyKilled(enemy);
    }
    this.safeCameraFlash(80, 110, 160, 200);
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
      gameEvents.emit('ui:toast', { text: 'Left co-op session' });
      this.unsubNet?.();
      this.unsubNet = null;
      for (const g of this.remoteGhosts.values()) g.destroy(true);
      this.remoteGhosts.clear();
      // The server answers `leave` with session_rewards — keep the socket
      // open briefly or the reply is lost with the close.
      window.setTimeout(() => netClient.disconnect(), 900);
      return;
    }
    const joinBlock = coopJoinBlockedReason(gameState.inRift);
    if (joinBlock) {
      gameEvents.emit('ui:toast', { text: joinBlock });
      return;
    }
    this.unsubNet = netClient.onMessage((msg) => {
      if (msg.type === 'welcome') {
        gameEvents.emit('ui:toast', {
          text: coopWelcomeToast(!!msg.host),
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
      } else {
        // The first state can land before the join sets the server name.
        const label = ghost.getAt(1) as Phaser.GameObjects.Text | undefined;
        if (label && label.text !== p.name) label.setText(p.name);
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
