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
- Electron portable + self-hosted co-op (basic)

## Next — content density (pick one per evening)

| #   | Slice                        | Why it matters                    | Done when                                   |
| --- | ---------------------------- | --------------------------------- | ------------------------------------------- |
| 1   | **Plaza bounty board**       | Gives a short “go do this” goal   | Done — scout / chests / cull → gold+XP      |
| 2   | **Rift modifiers**           | Variety between runs              | 1–2 random affixes on enter (dense / glass) |
| 3   | **Repair / material vendor** | Gold sink + hub life              | Second NPC or Mira tab                      |
| 4   | **Custom Electron icon**     | Looks real when you share a build | `electron/build` icon set                   |
| 5   | **Drag-drop equip**          | QoL for bag                       | Optional; double-click already works        |

Skip inventing new frameworks — extend `MapGen` / `WorldScene` / `SaveStore` / NPCs.

## Later (don’t start yet)

- Authoritative co-op loot / gear sync
- Mobile, seasons, trading, seamless open world
- Full new painted attack sheets (needs art time; VFX covers the gap for now)

## Pace guide (solo)

- **1 slice / session** when tired; **2** if hot
- Always leave a green `typecheck` + `lint` + `build`; map/POI → also `test:smoke`
- Share a portable build with one friend once rifts + skills feel good
