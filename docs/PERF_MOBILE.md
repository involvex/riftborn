# Mobile performance (M7 — Game Off)

Playtest on Android (Expo WebView) historically showed ~32 fps in combat.
Jam stance: **best-effort**, FOV must not regress.

## Measured / observed causes

| Source                             | Why it hurts on WebView                              |
| ---------------------------------- | ---------------------------------------------------- |
| Full `devicePixelRatio` canvas     | Phones often render 2–3× CSS pixels; fill-rate bound |
| Per-hit `add.text` + destroy       | GC spikes every swing / pack                         |
| Additive particle bursts every hit | Overdraw + blend cost                                |
| Hitstop + camera shake             | Extra frames stalled + redraw                        |
| High-res UI text (`resolution: 2`) | Extra glyph raster cost                              |

## What ships (Low / Auto on touch)

Setting: **Graphics** = Auto / Low / High (Settings + title).

- **Auto** → Low when `?touch=1` / coarse pointer / small screen; else High.
- **Low** (`src/core/GraphicsQuality.ts`):
  - Records `renderScale: 0.65` for probes (`__RIFTBORN.graphicsProfile()`)
  - **Does not** shrink Phaser `scale.resize` (that zoomed the world / broke FOV)
  - Damage-number pool + hard cap (8 live)
  - Particle burst cap (3)
  - Scale hitstop / shake (~40%)
  - Text resolution 1 for floating numbers
- **High**: native juice budget

## Explicit non-goal until after jam

FOV-safe canvas **buffer** downscale (`computeGraphicsResize` helpers) is
designed but not wired to the live path — shrinking the game size without a
matching zoom/CSS contract caused M3d FOV regressions. Prefer juice caps
over a risky buffer path for Game Off.

## How to verify

1. `/?touch=1` → FPS better than uncapped High; town FOV matches desktop span.
2. Settings → Graphics → High restores desktop look (heavier).
3. Hub smoke M3d / P1 tests assert wide town FOV at 1024×473 Low/touch.
4. `bun test src/core/GraphicsQuality.core.test.ts`

## M1g / M7 status

| Probe (`graphicsProfile()`) | Result                  |
| --------------------------- | ----------------------- |
| Auto on touch               | `tier: low`             |
| `renderScale` recorded      | `0.65`                  |
| `particleCap` (M7)          | `3`                     |
| Live canvas size            | CSS viewport (FOV safe) |

**Verdict:** Mobile is **best-effort**. Playable on WebView; judges should use
desktop browser for peak feel. APK remains a convenience shell.
