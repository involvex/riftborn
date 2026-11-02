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

## Verify

```bash
bun test src/core/FigureScale.core.test.ts
bun test src
```
