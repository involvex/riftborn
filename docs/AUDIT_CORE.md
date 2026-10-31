# C6 — Core gameloop & animation audit

Date: 2026-10-31 · Branch: `c6-core-loop` · Repo: `D:\repos\rpg-game`

Scope: Hub → Rift → fight → loot → boss → exit → hub; death/respawn; level-up; save; player/enemy anims (idle/walk/attack/hit/death), facing, frames, rates, foot anchors, depth. Did **not** touch MapGen / DungeonGen / WorldArt / biomes / hub tile draw / `playwright.config.ts`.

Verification baseline: `bun run test:smoke` green on hub (64 tiles, ≥8 POIs, no hostiles in town buffer). Code-path walk + `__RIFTBORN` / `/?smoke=1` for loop structure.

## Loop map (code)

| Step | Where |
| --- | --- |
| Boot hub / resume | `WorldScene.create` → `loadZone(gameState.inRift)` |
| Enter rift (R @ obelisk) | `WorldScene.tryPortal` → `inRift=true`, seed, `loadZone(true)` |
| Fight / loot | `tryAttack` / skills → `onEnemyKilled` → XP/loot/`persist` |
| Boss | kill goal → `spawnRiftBoss` → kill → chest + `openExitPortal` |
| Exit (R) / abandon (B) | `tryPortal` / `returnToTown` → hub spawn + `persist` |
| Death | `takeDamage` → `onPlayerDeath` → half HP, hub (rift) or plaza snap |
| Level-up | `ProgressionSystem.addXp` → `Events.LEVEL_UP` → UI toast + `recalcMaxHp` |
| Autosave | every 8s in `WorldScene.update` + on kills/portal/death |

Anims: sheets are 14 frames (`SpriteAtlas`: idle 0–3 @6fps, walk 4–9 @18fps, attack 10–13 @20fps once). Facing is **screen-X flip only** (`facingFromDelta`), not true 8-dir art. Hit = tint flash. Death = no frames (instant hide / respawn).

---

## Bugs

### 1. Attribute spend fires fake level-up — **major**

- **Where:** `src/systems/ProgressionSystem.ts:96-100` emits `Events.LEVEL_UP` from `spendStat`; `src/scenes/UIScene.ts:169-190` always plays level-up SFX + “Level N!” toast.
- **Effect:** Spending STR/DEX/STA/INT feels like leveling again; confuses the progression loop.
- **Fix idea:** Emit a dedicated `STATS_CHANGED` (or ignore payloads with `spent` in UI) and only juice real level-ups.

### 2. Mid-rift autosave resumes incomplete rift — **major**

- **Where:** `GameState.toSave` persists `inRift`/`riftSeed` (`GameState.ts:160-161`); autosave `WorldScene.ts:1033-1036`; boot `WorldScene.create:158` calls `loadZone(gameState.inRift)`. Rift kill/boss/exit state is **not** saved (`riftKills` etc. are scene-local).
- **Effect:** Reload mid-rift drops you into a fresh clear bar with the same seed — soft softlock / confusing core loop. Death/B already send you to hub.
- **Fix idea:** On load, force hub (`inRift=false`, clear seed, plaza spawn if save had `inRift`); or never persist `inRift`.

### 3. Double `PLAYER_DIED` emission — **major**

- **Where:** `GameState.takeDamage` (`GameState.ts:194`) and `WorldScene.onPlayerDeath` (`WorldScene.ts:1233`).
- **Effect:** Listeners run twice per death (HUD refresh, future hooks). Death handling should be single-owner.
- **Fix idea:** Emit only from `onPlayerDeath` (or only from `takeDamage` and call a silent respawn). Prefer WorldScene as owner of respawn side effects.

### 4. Attack `ANIMATION_COMPLETE` listeners stack — **major**

- **Where:** `Player.playAnim` (`Player.ts:248-253`), `Enemy.playAnim` (`Enemy.ts:268-273`) — each forced attack registers another `once` handler.
- **Effect:** Rapid swings can leave stale completions flipping `animKind` / restarting idle/walk under a new attack; feels like hung or clipped attack frames.
- **Fix idea:** Generation token or `off` before `once` so only the latest attack completion wins.

### 5. Death does not reset player combat pose/anim — **major**

- **Where:** `WorldScene.onPlayerDeath` (`WorldScene.ts:1212-1234`) moves/loads zone but never resets player anim, slash, tint, or attack lock.
- **Effect:** After death mid-swing, attack lock / slash gfx / tint can linger until a completion event (or forever if anim interrupted oddly).
- **Fix idea:** Public `Player.resetCombatPose()` → force idle, clear slash/tint/offsets, bump attack gen.

### 6. Enemy death pops (no death anim / fade) — **minor**

- **Where:** `Enemy.applyDamage` (`Enemy.ts:282-285`) sets `alive=false` and `body.setVisible(false)` immediately. Sheets have no death frames.
- **Effect:** Mobs vanish; kill feedback relies only on VFX/shake.
- **Fix idea:** Short alpha/scale tween (~150–200ms) before hide; keep compact corpses as today.

### 7. Walk lean persists into attack — **minor**

- **Where:** `Player.move` sets `sprite.rotation` from walk phase (`Player.ts:151`); `playAttack` (`Player.ts:169-183`) does not zero rotation; `tick` only clears rotation when not attacking and not moving (`Player.ts:270-273`).
- **Effect:** Swings while strafing keep a tilted sprite.
- **Fix idea:** Zero rotation (and stabilize y) at start of `playAttack`.

### 8. Redundant enemy foot origin assign — **minor**

- **Where:** `Enemy` constructor sets origin `0.82` then immediately `0.88` (`Enemy.ts:84` and `:98`).
- **Effect:** Dead code; foot anchor is 0.88 (matches player). Harmless but noisy.
- **Fix idea:** Single `setOrigin(0.5, 0.88)`.

---

## Notes (not filed as fix targets this pass)

| Topic | Finding |
| --- | --- |
| 8-direction facing | Design is 2-way flip via screen X (`IsoMath.facingFromDelta`). True 8-dir needs new art — leave open. |
| Hit anims | Tint flash only (`Player.flashHit`, `Enemy.flashHit`) — acceptable without hit frames. |
| Depth sort | `depthFromWorld` on bodies — OK for iso. |
| Frame rates | Idle 6 / walk 18 / attack 20 — coherent; no hung missing keys observed when sheets load. |
| Level-up max HP | UIScene LEVEL_UP calls `recalcMaxHp` — OK for real levels. |
| Hub smoke | Town buffer clear — OK. |

## Status

| # | Severity | Status |
| --- | --- | --- |
| 1 | major | open |
| 2 | major | open |
| 3 | major | open |
| 4 | major | open |
| 5 | major | open |
| 6 | minor | open |
| 7 | minor | open |
| 8 | minor | open |

Fixes follow in subsequent `C6: fix …` commits (≤8).
