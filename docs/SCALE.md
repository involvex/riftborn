# Figure / tile scale (M1d)

Iso tiles: `TILE_WIDTH = 64`, `TILE_HEIGHT = 32` (`IsoMath.ts`).
Painted character frames: **128×128** (`SpriteAtlas`); mage idle opaque
content ≈ **108×108** px.

## Before (playtest / branch base)

| Actor                                       | Draw scale                         | Visible content (px)            | vs tile                                |
| ------------------------------------------- | ---------------------------------- | ------------------------------- | -------------------------------------- |
| Player (painted)                            | `0.95`                             | ≈102.6 × 102.6                  | **~3.21 × TILE_H**, **~1.60 × TILE_W** |
| Player (procedural)                         | `1.35`                             | (48² frames) oversized vs tiles | —                                      |
| Enemy painted                               | `0.92`–`1.05`                      | ~99–113 px                      | wider than 1 tile                      |
| Enemy procedural                            | `1.2`–`1.55`                       | —                               | —                                      |
| NPC (hub graphics)                          | fixed ~22×25 px                    | already &lt; 0.9 TILE_W         | short                                  |
| Collision                                   | point sample (`walkCheck` at feet) | no radius                       | —                                      |
| Rift corridors (`DungeonGen.carveCorridor`) | **1 tile** wide (pre-M1e)          | —                               | sprite overhangs abyss                 |

Reference: `.phases/ref/playtest-rift-scale.png` — mage ~2+ tile heights,
wider than the 1-tile bridge.

## After (`FigureScale.ts`)

| Constant                  | Value                                                     |
| ------------------------- | --------------------------------------------------------- |
| `FIGURE_HEIGHT_TILES`     | `1.4` (target visible height)                             |
| `FIGURE_WIDTH_TILES_MAX`  | `0.9`                                                     |
| `FIGURE_COLLISION_RADIUS` | `0.32` tiles (≤ 0.35)                                     |
| `figureDrawScale()`       | ≈ **0.415**                                               |
| Visible content           | **44.8 × 44.8** px → **1.40 × TILE_H**, **0.70 × TILE_W** |
| Elite/boss                | `figureEliteDrawScale()` ≤ width cap                      |

Walk checks in the rift use `footprintFits` (center + 8 rim samples).
**M1e:** corridors carve with a **2×2 brush** (incl. stair-step diagonals);
shift gates stamp **2 tiles** wide. Figure still fits with room to spare.

## M1f — rift stuck on stair diagonals

**Cause (hypothesis b):** axis-only wall slide + circular footprint
(`FIGURE_COLLISION_RADIUS = 0.32`) wedges into outer corners of
stair-step corridors. Holding a diagonal 8-dir input (WASD / stick)
could freeze motion for >0.5s. Shift gates (a) were a red herring for
the playtest knick — turquoise floor was decoration / gate wash, not
the jam itself; (c) footprint origin matches FigureScale; (d) props are
not collision solids.

**Fix:** `slideMove` in `Movement.ts` — axis separate, then lateral
pre-nudge (≤0.25 tile), angled deflection, pure lateral wall-slide.
`Player.move` uses it when `walkCheck` is set (rift). Gates keep a cyan
outline + near-gate “Q Shift” HUD hint so layer locks stay readable.

**Verify**

```bash
bun test src/core/Movement.core.test.ts
bun test src/core/RiftWalkSim.core.test.ts
bun test src
```

## M1h — empty / unreachable rift enemies

**Cause:** `generateDungeon` only spawned packs in rooms after the start
room. Seeds with few accepted rooms (overlap rejection) could drop to a
single pack of ~3 foes. Pack centers also ignored footprint reachability
after shift gates were stamped, and `WorldScene` jittered ±0.9 tiles so
foes could land off the walkable set.

**Fix:** `reachableFloorCells` flood-fills from spawn with
`footprintFits` + layer shifts (same rules as rift movement).
`placeRiftEnemyPacks` snaps room packs onto that set (≥3 tiles from
spawn) and tops up to `minRiftEnemyCount(depth)` (≥6). Rift spawns no
longer scatter off-tile.
