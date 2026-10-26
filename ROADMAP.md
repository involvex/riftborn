# Riftborn — Living roadmap

Solo evenings, one shippable slice at a time. Prefer **feel → content → systems → polish → share**.

## Shipped

- Phaser 4 isometric hub + **procedural rift dungeons**
- Classes: **Warrior / Mystic / Mage**; level **1–50**, stat points, character menu
- Gear (5 slots), affixes/rarity, **set bonuses**; crafting, gathering, dash, local save
- Hub **64×64**, plaza soft buffer, **POIs** (camp / ruin / scout / shrine / warren / grove / watch / cairn)
- **Loot chests**, Ember Shrine timed buff, Ash Scout elite + rarity toast
- Inventory **painted icons**, **Sort**, vendor **Buy/Sell**, **auto-sell junk**, sell values
- Passive **OOC HP regen** (stronger in town)
- Attack facing + class slash VFX; agent **smoke** (`/?smoke=1`, `__RIFTBORN`, Playwright)
- Electron portable + self-hosted co-op (basic)

## Now — keep the loop fun (next ~4–6 evenings)

Each item should be playable the same night you finish it.

| #   | Slice                         | Why it matters                         | Done when                                          |
| --- | ----------------------------- | -------------------------------------- | -------------------------------------------------- |
| 1   | **Distinct class skills**     | Classes feel same after create         | ~~Done:~~ Leap / Pulse / Bolt + full 1–3 kit + VFX |
| 2   | **Rift depth ↔ level**        | Rifts get boring / too easy            | Deeper floors scale HP/dmg + slightly better loot  |
| 3   | **Death / loot juice**        | Wins feel flat                         | Death sting + loot ping + rarity flash             |
| 4   | **Character slots (2–3)**     | Replays / class tryouts without wipe   | Title → pick slot → create or load                 |
| 5   | **One “boss” per rift**       | Clear goal inside the dungeon          | End room elite + guaranteed rare+ chest            |
| 6   | **Commit shop/sort/autosell** | Economy slice is ready; get it on main | Playtested → commit → push                         |

Skip inventing new frameworks — extend `SkillSystem`, `DungeonGen` / `MapGen`, `UIScene`, `SaveStore`.

## Next wave — content density

- 2–3 more hub vendor NPCs (repair? one material buyer?)
- Mini quests / bounties on plaza board (“clear scout camp”) → gold + XP
- Rift modifiers (1–2: denser packs, glass cannon, double mats)
- Drag-drop equip in inventory (optional; click/double-click already works)
- Custom Electron icon (cheap win before sharing builds)

## Later (don’t start yet)

- Authoritative co-op loot / gear sync
- Mobile, seasons, trading, seamless open world
- Full new painted attack sheets (needs art time; VFX covers the gap for now)

## Pace guide (solo)

- **1 slice / session** when tired; **2** if hot
- Always leave a green `typecheck` + `lint` + `build`; map/POI → also `test:smoke`
- Share a portable build with one friend only after class skills + rift depth feel good
