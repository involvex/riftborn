# Mobile performance (M1)

Playtest on Android (Expo WebView) showed ~32 fps in combat / inventory.
Root causes and the Low-quality profile that Auto enables on touch devices.

## Measured / observed causes

| Source                             | Why it hurts on WebView                              |
| ---------------------------------- | ---------------------------------------------------- |
| Full `devicePixelRatio` canvas     | Phones often render 2–3× CSS pixels; fill-rate bound |
| Per-hit `add.text` + destroy       | GC spikes every swing / pack                         |
| Additive particle bursts every hit | Overdraw + blend cost                                |
| Hitstop + camera shake             | Extra frames stalled + redraw                        |
| High-res UI text (`resolution: 2`) | Extra glyph raster cost                              |

## Fixes (graphics quality profile)

Setting: **Graphics** = Auto / Low / High (Settings + title).

- **Auto** → Low when `?touch=1` / coarse pointer / small screen; else High.
- **Low** (`src/core/GraphicsQuality.ts`):
  - Render buffer ~65% of CSS size, stretched via canvas CSS (`Phaser.Scale.NONE`)
  - Damage-number pool + hard cap (10 live)
  - Skip routine hit/burn particles; cap concurrent bursts
  - Scale hitstop / shake (~45%)
  - Text resolution 1 for floating numbers
- **High**: native scale, prior juice budget

## How to verify

1. `/?touch=1` → FPS HUD should stay closer to 50–60 in a pack.
2. Settings → Graphics → High restores desktop look (heavier).
3. `bun test src` covers tier resolve / caps.
