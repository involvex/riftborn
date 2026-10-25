# Riftborn — Living roadmap

## Shipped

- Phaser 4 isometric hub + **procedural rift dungeons** (rooms/corridors)
- Classes: **Warrior / Mystic / Mage** character creation
- Level **1–50**, **2 stat points/level** (STR/VIT/INT/SPI), character menu (`C`)
- Gear instances: **hat / chest / legs / feet / weapon** with random affixes + rarity
- **Set bonuses** (Ashen, Riftbound, Bone) at 2pc / 4pc
- Enemy material loot + **armor/weapon drops**
- Crafting bench, gathering, dash skill, local save v2
- Self-hosted co-op (max 4) with port fallback + `public/coop-port.json`
- **Electron** desktop shell (`bun run desktop` / `desktop:prod`)
- **Portable Windows exe** (`bun run build:portable` → `release/Riftborn-*-portable.exe`)

## Next (good solo evenings)

1. Class skills that differ (warrior leap, mystic pulse, mage bolt)
2. Inventory UI grid (drag equip) instead of hotkeys only
3. Dungeon depth / difficulty scaling with player level
4. Persist multiple characters (slot select)
5. Custom app icon for Electron (replace default)
6. Sound + juicier death/loot feedback
7. Harden co-op: sync gear drops authoritatively

## Explicitly later

- Mobile
- Trading / economy
- Seasons / battle pass
- Huge seamless open world
