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
- Plaza **Bounty Board** (scout / chests / cull / shrine / bramble / **forge contract**)
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
- Biome craft sinks: **Ashen Charm / Crystal Lens / Grove Tonic / Salt Charm**
- Hub elite **Ash Bramble** (grove); also in shattered_woods rift mix
- Inventory **drag-to-equip** (desktop); double-click / double-tap still work
- Craft / bounty / shrine **SFX juice**
- CI: typecheck + lint + format + unit + smoke (`.github/workflows/ci.yml`)
- **Depth rules** D4 Hardened / D7 Relentless / D10 Apex (stack on rift mods + HUD)
- **Forge contract** bounty pays a craft-sink item (ashen/crystal/grove)
- Fourth rift biome **Salzwüste** (`salt_wastes`) + **Salt Warden** + salt shard craft sink
- **One passive per class** (Iron Will / Rift Attunement / Arcane Reservoir)
- **BiomeLook** — rift floors tinted per biome + accents + void background

## Next — feel & look (core loop)

Prefer sessions that make the existing Hub → Rift → Boss → Exit loop
**clearer and prettier**. Skip jam-theme work and new systems unless they
earn their keep in feel.

| #   | Slice                    | Why it matters               | Done when                                                              |
| --- | ------------------------ | ---------------------------- | ---------------------------------------------------------------------- |
| ✓   | **Rift biomes readable** | Same tiles — biomes alike    | Shipped: `BiomeLook` floor tint / accents / void bg + enter biome name |
| 2   | **Hub atmosphere**       | Town still reads flat        | Plaza glow / stronger POI floors / readable roads without new systems  |
| 3   | **Combat readability**   | Hits/boss moments still soft | Hit/death/boss emerge juice pass on existing sheets + VFX              |

Skip inventing new frameworks — extend `MapGen` / `WorldScene` /
`SaveStore` / NPCs / `server/index.ts` / `src/data/*` / `src/render/*`.

## Later (parked)

- Co-op rifts + authoritative loot / gear sync (hub sandbox stays prototype)
- Full rift progress across reload (`HubResume` boots hub on purpose today)
- True 8-dir facing + dedicated hit/death frames (screen-X flip + fade now)
- App Store packaging for Expo shell
- Seasons, trading, seamless open world
- `GraphicsQuality` `renderScale: 0.65` remains a probe until a device breaks Low juice caps

## Pace guide (solo)

- **1 slice / session** when tired; **2** if hot
- Always leave a green `typecheck` + `lint` + `build`; map/POI → also `test:smoke`
- Share a portable build with one friend once a slice feels good

## Archive

Jam-era planning lives in [`GAME_OFF_2026_ROADMAP.md`](GAME_OFF_2026_ROADMAP.md) (**archive** — do not treat as current tasks). Living truth is this file.
