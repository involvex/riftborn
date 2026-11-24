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
- **HubLook** — plaza glow, POI floor washes, dirt-road edges, warmer plaza lanterns
- **Combat readability** — warmer hit flash/knock, Low-tier hit bursts, skill hit VFX, boss scale-in + crit kill juice
- **LoopBeat / portals** — zone fade + portal sting; exit gate at boss anchor; HUD phase pulse
- **Loot readability** — magic+ drop icons/beams, boss chest look, rarity-gated loot juice
- **Boss arena beat** — biome wash + phase ring in boss room (idle → boss → exit)
- **Biome pack identity** — opening packs per biome (grind / kite / rush / poke)
- **Boss signature beats** — Ash hop / Crystal wail / Grove charge / Salt volley
- **Full rift resume** — mid-rift reload restores seed/mod/progress/foes/loot/SHIFT/fog/skill CDs/barrier/shrine buff (`riftRun` v5)
- **8-dir facing** — screen octant + lean + slash aim; sheets remain 2-dir flipX
- **Share-ready** — `SHARE.md` + `docs/ITCH_PAGE.md` current loop; co-op hub toasts (`CoopGate`)
- **Optional rift champion** — side-room elite off the boss path; skip freely; kill pays this-run buff + magic gear (not kill-goal)
- **D3+ kill quota ~60%** — skip trash / take elite / fight boss is a real route (D1–D2 stay ~80%+)
- **SHIFT split pack** — one ash goblin + shadow archer fight per rift; Q swaps who is solid
- **Second skill fork per class** — War Charge / Rift Echo / Arc Spark (stack with the first forks)
- **Champion minimap ping** — gold spur marker (fog-piercing) on mini + full map
- **Champion loot line** — spur kill stamps `Champion's …` on the magic+ drop + prize toast
- **Rift clear names the spur** — return card says Elite slain/skipped + Champion's drop when present
- **Rare set variety** — second set per class (Bulwark / Grove / Spark); set armor ~12–28% of armor drops

## Done — feel & look (core loop)

Prefer sessions that make the existing Hub → Rift → Boss → Exit loop
**clearer and prettier**. Skip jam-theme work and new systems unless they
earn their keep in feel.

| #   | Slice                    | Why it matters               | Done when                                                                                            |
| --- | ------------------------ | ---------------------------- | ---------------------------------------------------------------------------------------------------- |
| ✓   | **Rift biomes readable** | Same tiles — biomes alike    | Shipped: `BiomeLook` floor tint / accents / void bg + enter biome name                               |
| ✓   | **Hub atmosphere**       | Town still reads flat        | Shipped: `HubLook` plaza glow / POI tints / dirt-road edges / lanterns                               |
| ✓   | **Combat readability**   | Hits/boss moments still soft | Shipped: warmer hit flash/knock, Low-tier hit bursts, skill hit VFX, boss scale-in + crit kill juice |
| ✓   | **LoopBeat / portals**   | Enter/clear/exit still soft  | Shipped: zone fade + portal sting; exit gate at boss anchor; HUD phase pulse                         |
| ✓   | **Loot readability**     | Payoff after combat soft     | Shipped: magic+ drop icons/beams, boss chest look, rarity-gated loot juice                           |
| ✓   | **Boss arena beat**      | Boss room = any hall         | Shipped: biome wash + phase ring in boss room (idle → boss → exit)                                   |

## Done — content (keep after feel)

| #   | Slice                     | Why it matters                            | Done when                                                          |
| --- | ------------------------- | ----------------------------------------- | ------------------------------------------------------------------ |
| ✓   | **Biome pack identity**   | Biomes tint floors; packs fight alike     | Shipped: opening packs (grind / kite / rush / poke) + skewed mixes |
| ✓   | **Boss signature beats**  | Arena looks special; fight is one pattern | Shipped: hop / wail / charge / volley on shared beat cadence       |
| ✓   | **Set chase readability** | Loot pops; keeping gear is thin           | Shipped: missing-slot drop bias + HUD/bag “need X” from 1pc        |
| ✓   | **Rare set variety**      | One set per class; set armor too common   | Alternate set per class; set drops ~12–28%; chase owned incomplete |

## Done — lite mobile ARPG loop (v0.2.0)

Phone-first feel, post-cap chase, plaza chrome trimmed. Itch / store /
co-op rifts stayed parked.

| #   | Slice                   | Why it matters                                                     | Done when                                                                          |
| --- | ----------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| ✓   | **Phone combat weight** | Stick cancels chase; dash has no i-frames; trash hits with no tell | Dash i-frames, melee/rush windups, stick+ATK blend, Low buffer scale               |
| ✓   | **Thumb layout**        | Skills far from ATK; word pads                                     | Skill fan by ATK, icon pads, stick-biased cleave, hit haptic                       |
| ✓   | **Replay ladder**       | Depth 10 / L50 plateaus                                            | Pressure step, skill forks, named affixes, set family, shard reroll, rift bounties |
| ✓   | **Plaza / boss look**   | Vector town + reskin bosses                                        | Proximity labels, figure shadows, boss silhouette accents                          |

## Done — rift verbs

In-rift choice, SHIFT fight, build fork, map ping, and named drop are in.

| #   | Slice                         | Why it matters                          | Done when                                                                                 |
| --- | ----------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------- |
| ✓   | **Plaza building sprites**    | Rectangle inns beside the hero          | Shop / Forge / Inn use iso PNGs (`sprites:plaza`); smoke hub size OK                      |
| ✓   | **Plaza NPC + props**         | Triangle Mira / board / chest / obelisk | Mira, Bram, Nix, board, chest, obelisk + warm lantern/well/crate/anvil                    |
| ✓   | **Optional champion room**    | Middle of rift was only a kill counter  | Spur elite off path; HUD `Elite`; buff on kill; kill goal ignores it                      |
| ✓   | **D3+ kill quota ~60%**       | Full clear before boss blocked skips    | `riftKillGoalFillRatio` is 0.6 from D3 up; D1–D2 stay ~80%+                               |
| ✓   | **SHIFT split pack**          | SHIFT was only a gate key               | One ash/shadow pair per rift; enter toast; Veiled still overrides                         |
| ✓   | **Second skill forks**        | One fork left build choice thin         | Charge / Echo / Spark replace bash / slash / bolt; stack with forks 1                     |
| ✓   | **Champion minimap ping**     | Spur easy to miss on the map            | Gold `champion` marker + fog pierce; Spur in M legend                                     |
| ✓   | **Champion loot line**        | Spur buff alone is soft payoff          | Drop renamed `Champion's …`; prize toast on kill                                          |
| ✓   | **Rift clear names the spur** | Clear card skipped the Elite choice     | Clear / death / abandon line says Elite slain or skipped; names `Champion's …` if dropped |

## Now

_No open slice — pick the next loop beat after playtest, or park._

| #   | Slice                | Why it matters                          | Done when                                                              |
| --- | -------------------- | --------------------------------------- | ---------------------------------------------------------------------- |
| ✓   | **Rare set variety** | One set per class; set armor too common | Alternate set per class; set drops ~12–28%; chase owned incomplete set |

Skip inventing new frameworks — extend `WorldArt` / `WorldScene` /
`Npc` / `LootChest` / `public/assets/props/`.

## Later (parked)

- **Playtest combat nits** — fix 2–3 notes from landscape `/?touch=1` or APK when someone has device time
- Co-op rifts + authoritative loot / gear sync (hub sandbox stays prototype)
- App Store packaging for Expo shell
- Seasons, trading, seamless open world
- Dedicated 8-dir **sprite rows** (logic/octant shipped; sheets still 2-dir flipX)

## Done — systems polish

| #   | Slice                | Why it matters                | Done when                                                                                                                         |
| --- | -------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| ✓   | **Full rift resume** | Reload mid-rift wiped the run | Shipped: `riftRun` v5 snapshot (seed/mod/foes/loot/SHIFT/fog/skill CDs/barrier/shrine buff); HubResume plaza only if blob corrupt |
| ✓   | **8-dir facing**     | Only screen-X flip read flat  | Shipped: octant + lean + slash aim vector; sheets still 2-dir flip (hit/death frames already derived)                             |
| ✓   | **Share-ready**      | Friend build + copy stale     | Shipped: SHARE + itch copy (resume/biomes/sets/co-op); leave/connect hub toasts                                                   |

## Pace guide (solo)

- **1 slice / session** when tired; **2** if hot
- Always leave a green `typecheck` + `lint` + `build`; map/POI → also `test:smoke`
- Share a portable build with one friend once a slice feels good

## Archive

Jam-era planning lives in [`GAME_OFF_2026_ROADMAP.md`](GAME_OFF_2026_ROADMAP.md) (**archive** — do not treat as current tasks). Living truth is this file.
