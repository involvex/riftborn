# Riftborn — Living roadmap

Solo evenings, one shippable slice at a time. Prefer **feel → content → systems → polish → share**.

## Shipped

- Phaser 4 isometric hub + **procedural rift dungeons**
- Classes: **Warrior / Mystic / Mage**; level **1–50**, stat points, character menu
- Gear (5 slots), affixes/rarity, **set bonuses**; crafting, gathering, dash, local save
- Hub **64×64**, plaza soft buffer, **POIs**, loot chests, Ember Shrine, Ash Scout
- Inventory icons, **Sort**, vendor **Buy/Sell**, **auto-sell junk**
- Passive OOC HP regen; attack facing + slash VFX; agent smoke / `__RIFTBORN`
- **Class skills 1/2/3** distinct (Leap / Pulse / Bolt kits) + cast VFX
- **Rift depth 1–10** from level (packs / HP / dmg / loot); Rift Lord + boss chest
- Death flash/shake + rarity loot sting; **3 character slots** on boot
- Plaza **Bounty Board** (scout / chests / cull)
- **Rift modifiers** (Dense / Glass / Gilded)
- **Nix** material / repair trader (supplies, mat buyback, patch-up)
- **Bounties persist** across reload (active + board cooldown)
- Electron portable + self-hosted co-op (basic)

## Next — content density (pick one per evening)

| #   | Slice                        | Why it matters                    | Done when                             |
| --- | ---------------------------- | --------------------------------- | ------------------------------------- |
| 1   | **Repair / material vendor** | Gold sink + hub life              | Done — Nix supplies / mats / patch-up |
| 2   | **Custom Electron icon**     | Looks real when you share a build | `electron/build` icon set             |
| 3   | **Drag-drop equip**          | QoL for bag                       | Optional; double-click already works  |
| 4   | **Persist bounties**         | Survive reload                    | Done — bounty + cooldown in save      |

Skip inventing new frameworks — extend `MapGen` / `WorldScene` / `SaveStore` / NPCs.

## Later (don’t start yet)

- **Mobile / small screens:** on-screen virtual controls (move stick + attack / interact / skills) — keep AbilityBar touch-ready
- Authoritative co-op loot / gear sync
- Seasons, trading, seamless open world
- Full new painted attack sheets (needs art time; VFX covers the gap for now)

## Pace guide (solo)

- **1 slice / session** when tired; **2** if hot
- Always leave a green `typecheck` + `lint` + `build`; map/POI → also `test:smoke`
- Share a portable build with one friend once rifts + skills feel good
