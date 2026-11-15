# Riftborn — Living roadmap

Solo evenings, one shippable slice at a time. Prefer **feel → content → systems → polish → share**.

## Shipped

- Phaser 4 isometric hub + **procedural rift dungeons**
- Classes: **Warrior / Mystic / Mage**; level **1–50**, stat points, character menu
- Gear (5 slots), affixes/rarity, **set bonuses**; crafting, gathering, dash, local save
- Hub **64×64**, plaza soft buffer, **POIs**, loot chests, Ember Shrine, Ash Scout
- Inventory icons, **Sort**, vendor **Buy/Sell**, **auto-sell junk**
- Passive OOC HP regen; attack facing + slash VFX; agent smoke / `__RIFTBORN`
- **Class skills 1/2/3/4** distinct (Leap / Pulse / Bolt kits + Battle Cry / Rift Step / Chain Surge) + cast VFX
- **SHIFT (Q)** Ash/Shadow layers in rifts; biome mats toast into craft sink
- **Rift depth 1–10** from level (packs / HP / dmg / loot); Rift Lord + boss chest
- Death flash/shake + rarity loot sting; **3 character slots** on boot
- Plaza **Bounty Board** (scout / chests / cull)
- **Rift modifiers** (Dense / Glass / Gilded)
- **Nix** material / repair trader (supplies, mat buyback, patch-up)
- **Bounties persist** across reload (active + board cooldown)
- **Minimap** + **M** map overlay (top-down)
- **HUD polish** (HotkeyDock) + **touch controls** + Expo WebView shell
- **Map fog of war** (explore to reveal); **hub fog persists** on save
- **Custom app icon** (Electron + Expo via `bun run icons`)
- Electron portable + self-hosted co-op (basic); share kit in `SHARE.md`
- **FOV-safe Low fillrate** (M7b buffer + camera zoom); touch stick analog speed
- **A1b jam audio** — ChipTone-style SFX + hub/combat loops (CC0 synth)
- Game Off itch pack (`docs/ITCH_PAGE.md`, `bun run build:itch`)
- **Co-op Fix-light** — hub sandbox clamps/spawns on full **64×64** (`clampHubCoord`)
- Biome craft sinks: **Ashen Charm / Crystal Lens / Grove Tonic**
- Hub elite **Ash Bramble** (grove); bounty kind **shrine** (Ember bless)

## Next — post-jam

| #   | Slice               | Why it matters                  | Done when                                 |
| --- | ------------------- | ------------------------------- | ----------------------------------------- |
| 1   | **Friend feedback** | One external playtest complaint | Next evening fixes that **one** item only |

**Playtest slot:** share a build (`SHARE.md`), ask for **one** top complaint, put that complaint in this table as #1 for the next session — do not invent extras the same night.

Skip inventing new frameworks — extend `MapGen` / `WorldScene` / `SaveStore` / NPCs / `server/index.ts` / `src/data/*`.

## Later (parked — after playtest loop)

Do **not** start these until a friend complaint slice is done (or explicitly requested):

- App Store packaging for Expo shell
- Authoritative co-op loot / gear sync / rift co-op (beyond Fix-light)
- CI: `typecheck` + `test:smoke` on GitHub Actions (release guard)
- Seasons, trading, seamless open world
- Full new painted attack sheets (needs art time; VFX covers the gap for now)
- Drag-drop equip (double-click already works)

## Pace guide (solo)

- **1 slice / session** when tired; **2** if hot
- Always leave a green `typecheck` + `lint` + `build`; map/POI → also `test:smoke`
- Share a portable build with one friend once a slice feels good

## Archive

Jam-era planning lives in [`GAME_OFF_2026_ROADMAP.md`](GAME_OFF_2026_ROADMAP.md) (**archive** — do not treat as current tasks). Living truth is this file.
