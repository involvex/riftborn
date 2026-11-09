# Third-party art attribution

## Audio

All SFX and music loops in `public/assets/audio/` are procedurally
synthesized by `scripts/gen-placeholder-sfx.mjs` (original work, released
as CC0 / public domain). No third-party samples are bundled — regenerate
with:

```bash
bun run scripts/gen-placeholder-sfx.mjs
```

## Liberated Pixel Cup monsters

- **Author:** Charles Sanchez (CharlesGabriel)
- **Source:** Liberated Pixel Cup / OpenGameArt (`lpc-monsters`)
- **License:** [CC-BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/)
  and/or [GNU GPL 3.0](https://www.gnu.org/licenses/gpl-3.0.html)
- **Used as:** `assets-src/sprites/lpc/*.png` → processed into
  `sprites/game/spr_shade.png`, `spr_crawler.png`, `spr_wisp.png`,
  `spr_bat.png`

Share-alike applies to modifications of these sprites.

## Particle FX (hackcraft.de)

- **Author:** hackcraft.de donation pack (`particles_20101102`)
- **License:** Creative Commons Attribution (CC-BY)
- **Used as:** `vfx/particles/*.tga` → `*.png` for combat bursts

Credit hackcraft.de when redistributing these particles.
