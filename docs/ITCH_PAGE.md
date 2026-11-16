# itch.io page copy (Game Off 2026)

Paste into [involvex.itch.io/riftborn](https://involvex.itch.io/riftborn).
Build: `bun run build:itch` → upload `release/riftborn-web.zip` as **HTML5**.

## Short description

2.5D isometric ARPG for **Game Off 2026** theme **SHIFT** — swap Ash and
Shadow layers mid-rift, phase through foes, open layer gates, clear the boss.

## Full description

**Riftborn** is a Diablo-leaning isometric ARPG: safe hub town, wilderness
POIs, and procedural rifts across four biomes.

**Theme — SHIFT:** Kills fill shift energy. Press **Q** (or the SHIFT button
on touch) to swap between **Ash** and **Shadow**. Enemies on the other
layer cannot hurt you — and you cannot hurt them. Layer-locked gates need
the matching world. Rift goal: **Kill packs → Boss → Exit portal**.

**Play loop (10–20 min):** explore town → enter the Obelisk (**R**) → clear
packs → slay the Rift Lord → take the Exit → sell/craft biome materials at
the bench (**F**). Mid-rift reloads **resume** the same run (seed, foes,
loot, SHIFT, skill CDs).

**Classes:** Warrior, Mystic, Mage — four active abilities each (keys 1–4)
plus one passive. Depth **D1–D10** scales packs/HP/loot; random rift mods
(Dense / Glass / Gilded). Chase class armor sets via HUD “need X” hints.

**Also:** bounties, Mira/Nix vendors, fog map, set gear, optional local
co-op prototype (**P** — hub sandbox only, no rifts).

### Controls

| Key             | Action                        |
| --------------- | ----------------------------- |
| WASD            | Move                          |
| LMB             | Attack (hold to repeat)       |
| 1–4             | Skills                        |
| Q               | SHIFT layers                  |
| E               | Interact                      |
| R               | Rift portal                   |
| B               | Town                          |
| F               | Craft at bench                |
| P               | Co-op hub sandbox (prototype) |
| I / M / K / Esc | Bag / Map / Skills / Settings |

Touch: stick · ATK · E · DASH · SHIFT · abilities.

### Screenshots / GIF

- `docs/screenshots/shift-ash.png` / `shift-shadow.png` — theme layers
- `docs/screenshots/shift-rift.gif` — layer switch in a rift
- `docs/screenshots/shift-combat.png` — combat while shifting
- `docs/screenshots/touch-rift.png` — mobile HUD
- `docs/screenshots/town.png` / `rift.png` — hub & dungeon

### Credits / licenses

- **Audio:** procedural CC0 — `scripts/gen-placeholder-sfx.mjs`
- **LPC monsters** (Charles Sanchez / Liberated Pixel Cup): **CC-BY-SA 3.0**
  → shade / crawler / wisp / bat sheets
- **Particles** (hackcraft.de): **CC-BY** → combat bursts
- Full notes: `public/assets/ATTRIBUTION.md`

### Links

- Source: https://github.com/involvex/riftborn
- Play (Pages): https://involvex.github.io/riftborn/play/
- Share kit (builds + friend ask): `SHARE.md` in the repo
