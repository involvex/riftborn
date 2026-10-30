# Map-Layouts für Riftborn (Planung)

> Stand: nur Planung, keine Codeänderungen. Dieses Dokument soll als Grundlage für eine spätere Implementierung dienen.

## 1. Ist-Stand

### Dateien & Kernfunktionen

| Bereich                       | Datei                        | Relevante Funktionen/Typen                                                                                                                                                                                                                                                                      |
| ----------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Weltgenerierung (Hub + Rifts) | `src/world/MapGen.ts`        | `generateHub(seed)`, `generateRift(seed)`, `mulberry32(seed)`, Typen `ZoneLayout`, `HubDecorKind`, `WildernessPoi`, `PoiKind`, `ChestSpawn`, Konstanten `HUB_SIZE`, `PLAZA`, `HUB_ROAD_AXIS`, `HUB_SPAWN`, Hilfsfunktionen `inPlaza`, `nearTown`, `nearRoad`, `nearPoi`, `fillClearing`, `spur` |
| Raum-/Korridor-Rifts          | `src/world/DungeonGen.ts`    | `generateDungeon(seed, depth)`, `isWalkable(map, x, y)`, Typ `DungeonMap` (cells 0/1, rooms[], layout)                                                                                                                                                                                          |
| Rendering / Spawning / Logik  | `src/scenes/WorldScene.ts`   | `loadZone(rift)`, `spawnFromLayout(layout)`, `drawHubTiles()`, `drawDungeonTiles(map)`, `strokeIsoTile(...)`, `makeHubDecor(d)`, `makePoiMarker(poi)`, `poiStyle(kind)`, POI-Interaktion (`tryShrine`), Kisten/Beute, Gegner-Spawning aus `layout.packs`                                        |
| Debug / Sichtprüfung          | `src/debug/RiftbornDebug.ts` | `installRiftbornDebug`, `clearRiftbornDebug` (Snapshot inkl. `pois`, `chests`, `enemies`, `plaza`)                                                                                                                                                                                              |
| Smoke-Test                    | `e2e/hub.smoke.spec.ts`      | Lädt `/?smoke=1`, prüft Hub-Größe 64, ≥8 POIs, **keine Hostiles im Town-Soft-Buffer (margin 10)**, schreibt `artifacts/hub.png`                                                                                                                                                                 |

### Kachelgröße & Koordinatensystem

- **Isometrisches Rendering**: `src/core/IsoMath.ts` wird verwendet (`worldToScreen`, `snapToTile`, `depthFromWorld`). Tiles werden als Diamonds gezeichnet (`WorldScene.strokeIsoTile`), Kacheldimensionen ergeben sich aus der Iso-Projektion (Diamantbreite ~64, Höhe ~32 im Screenraum).
- **Weltkoordinaten**: Tile-basierte Float/Integer-Koordinaten (z. B. `x: 32.5, y: 33.5` für Spawn). `snapToTile` rundet/justiert für konsistentes Spawning.
- **Hub-Größe**: `HUB_SIZE = 64` (64×64 Tiles).
- **Plaza (sicher)**: `PLAZA = { x0: 28, x1: 36, y0: 28, y1: 36 }` (inklusive). `inPlaza(x,y)` prüft dies. `nearTown(x,y, margin=10)` definiert Soft-Buffer um Town-Mitte.
- **Rifts**: Aktuell entweder prozedurales Raum/Korridor-Dungeon via `generateDungeon` (Tile-Grid `cells[y][x]` mit 0/1, Walkability `isWalkable`) oder Legacy-`generateRift` in `MapGen.ts` (kleines, festes Layout mit wenigen Packs/Kisten). In `WorldScene.loadZone(rift)` wird für Rifts standardmäßig `generateDungeon(seed, depth)` genutzt; `generateRift` existiert parallel.

### Aktueller Hub-Aufbau (wie heute)

- **Straßennetz**: Kreuzung bei `HUB_ROAD_AXIS = 32` (vertikale/horizontale Straßenbreite ~3 Tiles um Achse), Spurs zu POIs (`spur`), Clearing pro POI (`fillClearing`). `paths[]` enthält Pfad-/Plaza-Tiles.
- **Plaza**: Gefüllt mit `paths`, dekoriert mit Brunnen `well` (32.5,32.5), Laternen, Stände/Kisten, NPCs (`vendor_mira`, `crafter_bram`, `board_bounties`, `trader_nix`), Gebäude-Marker (`Shop`, `Forge`, `Inn`), Rift-Obelisk am Portal (`{x:32.5,y:18.5}`).
- **POIs (8)**: Positionen wie in `generateHub` definiert (camp, ruin, scout, shrine, warren, grove, watch, cairn). Jedes POI hat `radius`, wird per `spur` angebunden, erhält spezifisches `decor[]`, Packs und meist eine Kiste. `WorldScene` zeichnet POI-Marker und zeigt Toasts bei Annäherung.
- **Fringe/Wilderness**: Zufällige Bäume/Erze/Büsche (`ash_tree`, `rift_vein`, `berry_bush`), zufälliges Fringe-Deko, 8 Fringe-Packs außerhalb von Plaza/POIs/Town-Buffer.
- **Sicherheit**: `inPlaza` → keine Gegner. `nearTown(margin=10)` wird genutzt, um Packs aus Town-Umfeld fernzuhalten (Smoke test erzwingt dies).

### Aktueller Rift-Aufbau

- **Raum/Korridor (`generateDungeon`)**: Räume variieren, verbunden per Corridors, `depth` skaliert Größe (36×36 bis ~44×44), Raumzahl steigt. Pro Raum ab Raum 1 Packs (`shade`/`crawler`/`wisp`), Chance auf `rift_vein`, `killGoal` ~68–85% der erwarteten Kills, Bossraum am Ende mit `elite = Boss-Spawn`, Exit-Portal erscheint erst nach Boss-Tod. `bench` im Start-Raum.
- **Legacy `generateRift`**: Sehr kompakt (Packs in zufälligen Bereichen), 7 Wellen, gelegentlich `ash_bat`-Elite, Kisten, Boss an `(12,12)`, `killGoal: 18`.

## 2. Hub-Layout (Zonenkonzept)

Ziel: Der Hub soll lesbar in Zonen gegliedert sein, klare Sichtachsen zum Plaza aufweisen, vorhandene POIs sinnvoll anbinden und Platz für Erweiterung lassen.

### Vorgeschlagene Zonen

| Zone                             | Zweck                                               | Anbindung                                       | Tile-Charakter (Idee)                                                                                 |
| -------------------------------- | --------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Marktplatz (Plaza)**           | Zentrum, sicher, NPCs, Obelisk                      | Kreuzung (32,32-Achse)                          | Gepflastert/steinerner Plaza, Laternenreihen, Brunnen, keine Wildnis-Deko, komplett frei von Hostiles |
| **Lager/Handwerk**               | Shop/Forge/Inn, Crafter/Vendor/Board/Trader         | Süd-/Ostflanke der Plaza entlang Hauptstraße    | Überdachte Stände, Kistenstapel, Laternen, etwas weniger Gras, klarer Freiraum zum Plaza              |
| **Nordrand / Grove-Annäherung**  | Übergang zur Natur, Anbindung `ash_grove`           | Nördlicher Ast der Kreuzung                     | Weicher Übergang: Gras → Waldlichtung, weniger Pflaster, verstärkte Vegetation                        |
| **Westrand / Warren-Annäherung** | Düsterer Übergang, Anbindung `bone_warren`          | Westlicher Ast                                  | Verfallener Look, Geröll, weniger Laternen, Übergang zu verwittertem Boden                            |
| **Ostrand / Watch-Annäherung**   | Hochgelegener Übergang, Anbindung `watch_ridge`     | Östlicher Ast                                   | Steinig, freiere Sichtachsen, Wachturm-ähnliche Deko                                                  |
| **Südrand / Cairn-Annäherung**   | Übergang zum Burial-Areal, Anbindung `hollow_cairn` | Südlicher Ast                                   | Verfallene Säulen, Moos/Stein, gedämpftere Beleuchtung                                                |
| **Wilderness / POI-Gürtel**      | Äußere POIs (Camp, Ruin, Scout, Shrine)             | Spurs von Kreuzung zu Ecken/Seiten              | Biome-typisch pro POI, Lichtung mit klarer Lesbarkeit, umgebendes Dickicht                            |
| **Fringe**                       | Rohstoffe, gelegentliche kleine Packs               | Zwischen/außerhalb Spurs, außerhalb Town-Buffer | Wildnis, verstreute Nodes (`ash_tree`, `rift_vein`, `berry_bush`), spärliche Deko                     |

### Tile-Mix pro Zone (konzeptionell)

| Zone                       | Tiles (ids aus Task)                          | Bemerkung                                                                                  |
| -------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Plaza                      | `tile_hub_0`/`tile_hub_1` (gepflastert)       | Aktuell wird per Farbgebung unterschieden (0x4a463c/0x3e3a32); Assets würden dies ersetzen |
| Hauptstraßen/Spurs         | `tile_hub_1`/`tile_hub_2` (festgetreten)      | Klarer Übergang, oft diagonal/orthogonal, Straßenränder                                    |
| Überleitung Übergangszonen | `tile_hub_2`/`tile_hub_3` (gemischt)          | Weicher Übergang zwischen Plaza/Straße und Wildnis                                         |
| Wildnis/Fringe             | `tile_hub_3`/`tile_hub_4` (grasig/verwildert) | Höchste Varianz, Ränder zu POIs/Vegetation                                                 |
| POI-spezifisch             | Gemisch je POI-Typ                            | z. B. `shrine`-Nähe eher verbrannter/zerklüfteter Look, `grove` eher moosig                |

### Props pro Zone (Dichte)

Dichte = **Props pro 10x10 Tiles** (Richtwert für Planung). Orientiert an aktueller `makeHubDecor` + POI-Deko.

| Zone           | Props (relevante ids)                                                                | Dichte (pro 10x10) | Notizen                                                                 |
| -------------- | ------------------------------------------------------------------------------------ | ------------------ | ----------------------------------------------------------------------- |
| Plaza          | `prop_well`, `prop_lantern`, `prop_crate`, `prop_pillar` (sparsam)                   | 2–4                | Funktional, übersichtlich, keine blockierenden Hindernisse in Laufwegen |
| Lager/Handwerk | `prop_lantern`, `prop_crate`, `prop_tent` (als Gebäude-Alternative), `prop_campfire` | 4–6                | Stände, Kisten, Laternen entlang Wege                                   |
| Übergangszonen | `prop_bush`, `prop_rock`, `prop_lantern`                                             | 3–5                | Weicher Übergang, Straßensäume                                          |
| Grove          | `prop_tree`, `prop_bush`, `prop_rock`, `prop_crystal_vein` (dekorativ)               | 6–8                | Vegetationsreich, lesbare Lichtung um POI-Zentrum                       |
| Warren         | `prop_rubble`, `prop_totem`, `prop_rock`                                             | 4–6                | Verfallen, Geröllhaufen, weniger Vegetation                             |
| Watch          | `prop_totem`, `prop_campfire`, `prop_crate`, `prop_rock`                             | 3–5                | Freie Sichtachsen betonen, spärlicher bewachsen                         |
| Cairn          | `prop_pillar`, `prop_rubble`, `prop_rock`                                            | 3–5                | Sakral/verfallen, geringe Vegetation                                    |
| Camp           | `prop_tent`, `prop_campfire`, `prop_crate`, `prop_lantern`                           | 5–7                | Lageratmosphäre, klare Freifläche um Feuer                              |
| Ruin           | `prop_pillar`, `prop_rubble`, `prop_rock`, `prop_crystal_vein`                       | 4–6                | Zerfallene Struktur, Reste von Säulen                                   |
| Scout          | `prop_tent`, `prop_crate`, `prop_lantern`, `prop_bush`                               | 2–4                | Minimal, fokussiert auf Elite                                           |
| Shrine         | `prop_altar`, `prop_lantern`, `prop_rock`                                            | 2–3                | Sehr fokussiert, freier Zugang zum Altar                                |
| Fringe/Wildnis | `prop_tree`, `prop_bush`, `prop_rock`, `prop_crystal_vein`                           | 4–7                | Zufällig verteilt, außerhalb von Wegen/Plaza/POIs                       |

### Wege, Sichtachsen, Platz für vorhandene POIs

- **Hauptwege**: Kreuzung (32,32) → 4 Richtungen zu POI-Spurs. Genug Breite für Spieler + NPCs.
- **Spurs**: Verbinden Kreuzung direkt zu jedem der 8 POIs, enden in Clearing (`fillClearing` mit POI-`radius`).
- **Platz für POIs**: Aktuell alle 8 POIs platziert (SW Camp, NW Shrine, W Warren, N Grove, E Watch, SE Scout, S Cairn, NE Ruin) mit ausreichendem Abstand zur Plaza (durch `nearTown`-Buffer) und untereinander mit eigenem Clearing.
- **Sichtachsen**: Plaza hat freie Sicht entlang der Hauptachsen. POIs sollten aus der Ferne erkennbar sein (POI-Marker in `WorldScene.makePoiMarker`). Aufgeräumte Lichtungen helfen, Packs/Kisten schnell zu erfassen.
- **Sicherheitszonen**: Plaza strikt frei von Hostiles; Town-Soft-Buffer verhindert, dass Packs zu nah rücken (vom Smoke-Test geprüft).

## 3. Drei Rift-Biome (Konzept)

Rifts nutzen aktuell vor allem `generateDungeon` (raum/korridor) mit generischem Look. Die folgenden Biome sind Vorschläge zur Differenzierung (Tiles/Props/Gegner/Mischung/Raumtypen/Dekoregeln).

### Biom 1: Verfallene Krypta (Crypt)

**Atmosphäre**: Verfallene Gruft, feuchter Stein, verrostete Eisenreste, gedämpftes Licht.

| Aspekt         | Vorschlag                                                                                                                                                                   |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tiles**      | `tile_dungeon_0` (verwitterter Stein), `tile_dungeon_1` (Risse/Fugen), `tile_dungeon_2` (Bruchstein) – Schwerpunkt auf `tile_dungeon_0`/`tile_dungeon_1`                    |
| **Props**      | `prop_pillar` (gebrochen/umgestürzt), `prop_rubble` (häufig), `prop_altar` (selten, verfallen), `prop_totem` (sehr selten), `prop_crate` (veraltet)                         |
| **Gegner-Mix** | Vorwiegend `enemy_bone_archer` (Fernkampf), `enemy_rift_goblin` (Nahkampf-Gruppe), weniger `enemy_rift_wraith`. Fokus auf kontrollierte Gruppen                             |
| **Raumtypen**  | Kleine bis mittelgroße Rechteckräume, enge Korridore, gelegentlich längliche Hallen. Sarkophag-ähnliche Nischen. Häufiger Übergang durch Türbögen                           |
| **Dekoregeln** | Säulen entlang Wänden/Nischen, Geröll in Ecken, weniger freistehende Vegetation, Kisten oft in versteckten Ecken. Fokus auf vertikale Ruinenstruktur. Weniger offenes Areal |

### Biom 2: Kristallhöhle (Crystal Cavern)

**Atmosphäre**: Unterirdische Höhle mit leuchtenden Kristallen, feuchter Fels, biolumineszentes Licht.

| Aspekt         | Vorschlag                                                                                                                                                                                      |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tiles**      | `tile_dungeon_1`/`tile_dungeon_2` als Basis, mit kristallinen Akzenten. Varianz höher (organischere Formen)                                                                                    |
| **Props**      | `prop_crystal_vein` (sehr häufig, dekorativ + thematisch), `prop_rock` (große Felsbrocken), `prop_rubble` (spärlich), `prop_pillar` (kristallin umfunktioniert)                                |
| **Gegner-Mix** | `enemy_rift_wraith` (geisterhaft, bewegt sich gut in Höhlen), `enemy_shadow_wolf` (Rudel), `enemy_rift_goblin` (gelegentlich). Betonung auf Mobilität/Rudel                                    |
| **Raumtypen**  | Unregelmäßigere Räume (höhlenartig), größere Kavernen verbunden durch schmale, verwinkelte Gänge. Zentralhöhle für Boss. Weniger rechteckig                                                    |
| **Dekoregeln** | Kristalladern an Wänden/Ecken, aus dem Boden ragende Kristalle, Felsformationen als natürliche Barrieren. Biolumineszente Cluster, weniger künstliche Ruinen. Offener, verwirrender als Krypta |

### Biom 3: Schattenwald (Shattered Woods)

**Atmosphäre**: Verkrüppelter Wald zwischen den Welten, verdrehte Bäume, neblig, gespenstisch.

| Aspekt         | Vorschlag                                                                                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tiles**      | `tile_dungeon_0`/`tile_dungeon_1` mit verwittertem Look, stärkerer Übergang zu natürlichem Boden. Mehr organische Varianz                                                 |
| **Props**      | `prop_tree` (verdrehte, tote Bäume – thematisch), `prop_bush` (dürr), `prop_rock` (moosbedeckt/verwittert), `prop_totem` (uralte Holztotems), `prop_rubble` (überwuchert) |
| **Gegner-Mix** | `enemy_shadow_wolf` (Hauptgegner, Rudel), `enemy_rift_wraith` (schleichend), `enemy_bone_archer` (gelegentlich aus dem Unterholz). Fokus auf Flankierung                  |
| **Raumtypen**  | Lichtungen (Clearing) verbunden durch verwinkelte Pfade, weniger geschlossene Hallen, eher natürliches Labyrinth. Boss auf größerer Lichtung                              |
| **Dekoregeln** | Bäume als Teil der "Wände" (können Korridore verengen), dichtes Unterholz, umgestürzte Stämme, Totems an Wegkreuzungen. Natürlicher, weniger kubisch als Krypta           |

### Gemeinsame Rift-Dekoregeln

- **Lesbarkeit**: Auch in dichteren Biomen müssen Laufwege frei bleiben. Dekoration sollte Sichtachsen nicht vollständig blockieren.
- **Thematische Konsistenz**: Props passend zum Biom, sparsam gemischt (nicht alle auf einmal).
- **Loot-Verteilung**: Kisten thematisch platzieren (in Nischen/Ecken/Clearing-Rand), in Bossraum ggf. Bosskiste.
- **Gegnerbalance**: Packgrößen je Biom anpassen (z. B. Krypta kontrollierter, Schattenwald eher Rudel, Kristallhöhle mobil).
- **Progression**: `killGoal`/Boss bleibt zentral (aktuell `generateDungeon` setzt dies bereits).

## 4. Datenformat-Vorschlag (TS-Konstante)

Vorschlag für `src/data/biomes.ts` (nur als Codebeispiel im Doc, **nicht anlegen**).

```ts
export type TileId =
  | 'tile_hub_0'
  | 'tile_hub_1'
  | 'tile_hub_2'
  | 'tile_hub_3'
  | 'tile_hub_4'
  | 'tile_dungeon_0'
  | 'tile_dungeon_1'
  | 'tile_dungeon_2';
export type PropId =
  | 'prop_well'
  | 'prop_lantern'
  | 'prop_crate'
  | 'prop_rock'
  | 'prop_bush'
  | 'prop_tent'
  | 'prop_campfire'
  | 'prop_pillar'
  | 'prop_altar'
  | 'prop_totem'
  | 'prop_rubble'
  | 'prop_tree'
  | 'prop_crystal_vein';
export type EnemyId =
  | 'ash_scamp'
  | 'shade'
  | 'crawler'
  | 'wisp'
  | 'ash_bat'
  | 'ash_scout'
  | 'enemy_rift_goblin'
  | 'enemy_shadow_wolf'
  | 'enemy_bone_archer'
  | 'enemy_rift_wraith'
  | 'rift_lord';

export type BiomeDef = {
  id: 'hub' | 'crypt' | 'crystal_cavern' | 'shattered_woods';
  name: string;
  tileWeights: Partial<Record<TileId, number>>;
  propWeights: Partial<Record<PropId, number>>;
  propsPer10x10: { min: number; max: number };
  enemyMix: Array<{
    enemyId: EnemyId;
    weight: number;
    minCount: number;
    maxCount: number;
    eliteChance?: number;
  }>;
  roomTypeRules: string[];
  decorRules: string[];
};

export const HUB_BIOME: BiomeDef = {
  id: 'hub',
  name: 'Town & Wilderness',
  tileWeights: {
    tile_hub_0: 0.15, // plaza/paved
    tile_hub_1: 0.25, // roads
    tile_hub_2: 0.2, // transition
    tile_hub_3: 0.25, // wild grass
    tile_hub_4: 0.15, // fringe/wild
  },
  propWeights: {
    prop_tree: 0.2,
    prop_bush: 0.18,
    prop_rock: 0.14,
    prop_lantern: 0.12,
    prop_crate: 0.1,
    prop_well: 0.08,
    prop_tent: 0.06,
    prop_campfire: 0.05,
    prop_pillar: 0.03,
    prop_rubble: 0.02,
    prop_altar: 0.01,
    prop_totem: 0.01,
    prop_crystal_vein: 0.0,
  },
  propsPer10x10: { min: 3, max: 6 },
  enemyMix: [
    { enemyId: 'ash_scamp', weight: 0.4, minCount: 2, maxCount: 4 },
    { enemyId: 'wisp', weight: 0.25, minCount: 2, maxCount: 4 },
    { enemyId: 'shade', weight: 0.2, minCount: 2, maxCount: 3 },
    { enemyId: 'crawler', weight: 0.1, minCount: 2, maxCount: 3 },
    {
      enemyId: 'ash_bat',
      weight: 0.05,
      minCount: 1,
      maxCount: 1,
      eliteChance: 0.5,
    },
  ],
  roomTypeRules: ['plaza_safe', 'road_spurs', 'poi_clearings', 'open_fringe'],
  decorRules: [
    'keep_plaza_clear',
    'buffer_around_town',
    'poi_thematic_decor',
    'path_edge_sparce',
  ],
};

export const CRYPT_BIOME: BiomeDef = {
  id: 'crypt',
  name: 'Verfallene Krypta',
  tileWeights: {
    tile_dungeon_0: 0.5,
    tile_dungeon_1: 0.35,
    tile_dungeon_2: 0.15,
  },
  propWeights: {
    prop_pillar: 0.25,
    prop_rubble: 0.25,
    prop_crate: 0.15,
    prop_altar: 0.12,
    prop_totem: 0.08,
    prop_rock: 0.1,
    prop_lantern: 0.05,
    prop_tree: 0.0,
    prop_bush: 0.0,
    prop_well: 0.0,
    prop_tent: 0.0,
    prop_campfire: 0.0,
    prop_crystal_vein: 0.0,
  },
  propsPer10x10: { min: 4, max: 6 },
  enemyMix: [
    { enemyId: 'enemy_bone_archer', weight: 0.35, minCount: 2, maxCount: 4 },
    { enemyId: 'enemy_rift_goblin', weight: 0.45, minCount: 3, maxCount: 5 },
    { enemyId: 'enemy_rift_wraith', weight: 0.2, minCount: 1, maxCount: 2 },
  ],
  roomTypeRules: [
    'rectangular_halls',
    'niches',
    'corridors_narrow',
    'boss_hall',
  ],
  decorRules: [
    'pillars_along_walls',
    'rubble_in_corners',
    'chests_in_niches',
    'minimal_nature',
  ],
};

export const CRYSTAL_CAVERN_BIOME: BiomeDef = {
  id: 'crystal_cavern',
  name: 'Kristallhöhle',
  tileWeights: {
    tile_dungeon_0: 0.25,
    tile_dungeon_1: 0.35,
    tile_dungeon_2: 0.4,
  },
  propWeights: {
    prop_crystal_vein: 0.4,
    prop_rock: 0.3,
    prop_rubble: 0.12,
    prop_pillar: 0.1,
    prop_bush: 0.05,
    prop_tree: 0.03,
    prop_lantern: 0.0,
    prop_crate: 0.0,
    prop_well: 0.0,
    prop_tent: 0.0,
    prop_campfire: 0.0,
    prop_altar: 0.0,
    prop_totem: 0.0,
  },
  propsPer10x10: { min: 5, max: 7 },
  enemyMix: [
    { enemyId: 'enemy_rift_wraith', weight: 0.35, minCount: 2, maxCount: 3 },
    { enemyId: 'enemy_shadow_wolf', weight: 0.4, minCount: 3, maxCount: 5 },
    { enemyId: 'enemy_rift_goblin', weight: 0.25, minCount: 2, maxCount: 4 },
  ],
  roomTypeRules: [
    'organic_caverns',
    'wide_kaverns',
    'twisty_galleries',
    'central_boss_cavern',
  ],
  decorRules: [
    'crystal_clusters',
    'natural_rock_formations',
    'avoid_rectilinear_symmetry',
    'bioluminescent_accent',
  ],
};

export const SHATTERED_WOODS_BIOME: BiomeDef = {
  id: 'shattered_woods',
  name: 'Schattenwald',
  tileWeights: {
    tile_dungeon_0: 0.4,
    tile_dungeon_1: 0.4,
    tile_dungeon_2: 0.2,
  },
  propWeights: {
    prop_tree: 0.35,
    prop_bush: 0.2,
    prop_rock: 0.15,
    prop_totem: 0.12,
    prop_rubble: 0.1,
    prop_pillar: 0.05,
    prop_crate: 0.03,
    prop_lantern: 0.0,
    prop_well: 0.0,
    prop_tent: 0.0,
    prop_campfire: 0.0,
    prop_altar: 0.0,
    prop_crystal_vein: 0.0,
  },
  propsPer10x10: { min: 5, max: 8 },
  enemyMix: [
    { enemyId: 'enemy_shadow_wolf', weight: 0.45, minCount: 3, maxCount: 5 },
    { enemyId: 'enemy_rift_wraith', weight: 0.3, minCount: 2, maxCount: 3 },
    { enemyId: 'enemy_bone_archer', weight: 0.25, minCount: 2, maxCount: 3 },
  ],
  roomTypeRules: [
    'forest_clearings',
    'twisted_paths',
    'overgrown_passages',
    'boss_glade',
  ],
  decorRules: [
    'trees_as_barriers',
    'fallen_trunks',
    'totems_at_junctions',
    'natural_flow',
  ],
};
```

## 5. Fehlende Assets: Liste mit Bing-Prompts

Basierend auf den im Task genannten IDs und dem Manifest-Stil (Kategorie, id, prompt). Prompts auf Pixel-Art, isometrisch/kompatibel zu bestehendem Stil (gedämpfte Farben, Diablo-ähnlich, low-detail).

### Tiles

| Kategorie | id               | Bing-Prompt                                                                                                                                                                                     |
| --------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| tile      | `tile_hub_0`     | `Isometric 64x32 pixel art town plaza stone tileset, worn cobblestone, neutral gray-beige, seamless diagonal diamond tiles, top-down isometric, dark fantasy ARPG, no decorations, flat shaded` |
| tile      | `tile_hub_1`     | `Isometric 64x32 pixel art packed dirt/flagstone road tileset, well-trodden path, slightly darker edges, seamless isometric diamond, dark fantasy RPG hub, no props`                            |
| tile      | `tile_hub_2`     | `Isometric 64x32 pixel art transitional ground tileset, grass mixed with dirt/stone, overgrown edges, seamless diagonal, moody dark fantasy, no furniture`                                      |
| tile      | `tile_hub_3`     | `Isometric 64x32 pixel art wild grass tileset, tufted grass, patches of mossy dirt, varied natural shapes, seamless isometric, low-res pixel art`                                               |
| tile      | `tile_hub_4`     | `Isometric 64x32 pixel art dense fringe grass/undergrowth tileset, darker, rougher, more varied, seamless isometric diamond, dark fantasy wilderness`                                           |
| tile      | `tile_dungeon_0` | `Isometric 64x32 pixel art dungeon stone floor tileset, cracked flagstone, damp shadows, seamless isometric, dark gothic crypt, no torches/furniture`                                           |
| tile      | `tile_dungeon_1` | `Isometric 64x32 pixel art worn dungeon floor tileset, large broken slabs, mortar gaps, moss in cracks, seamless diagonal isometric, crypt dungeon`                                             |
| tile      | `tile_dungeon_2` | `Isometric 64x32 pixel art rough hewn stone floor tileset, irregular blocks, rubble between slabs, cave-like crypt, seamless isometric pixel art`                                               |

### Props

| Kategorie | id                  | Bing-Prompt                                                                                                                                                 |
| --------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| prop      | `prop_well`         | `Isometric pixel art stone well, circular base, rope/wheel minimal, mossy, dark fantasy town hub, game sprite, no UI, transparent background`               |
| prop      | `prop_lantern`      | `Isometric pixel art wall/post lantern, wrought iron, glass, small warm glow, medieval dark fantasy, town lighting prop, sprite on transparent bg`          |
| prop      | `prop_crate`        | `Isometric pixel art wooden crate, worn planks, iron bands, stackable, loot/container, dark fantasy ARPG, game prop, transparent`                           |
| prop      | `prop_rock`         | `Isometric pixel art medium boulder/rocks, jagged gray stone, mossy patches, natural clutter, wilderness prop, transparent background`                      |
| prop      | `prop_bush`         | `Isometric pixel art thorny bush, dark green foliage, gnarled branches, natural cover, dark fantasy undergrowth, sprite transparent`                        |
| prop      | `prop_tent`         | `Isometric pixel art leather/rough canvas tent, weathered, pitched, bandit camp prop, dark fantasy, game sprite, transparent bg`                            |
| prop      | `prop_campfire`     | `Isometric pixel art campfire, stone ring, logs, small flames, ember glow, ambient prop, dark fantasy, transparent background`                              |
| prop      | `prop_pillar`       | `Isometric pixel art broken stone pillar, cracked shaft, toppled/base remnants, ruined column, crypt/ruin prop, transparent`                                |
| prop      | `prop_altar`        | `Isometric pixel art runed stone altar, slab on base, brazier-like or empty, ember runes, shrine prop, dark fantasy, transparent background`                |
| prop      | `prop_totem`        | `Isometric pixel art wooden totem pole, carved skulls/runes, weathered, tribal dark fantasy, prop sprite, transparent bg`                                   |
| prop      | `prop_rubble`       | `Isometric pixel art stone rubble pile, broken blocks, loose debris, ruin clutter, dungeon/ruin prop, game sprite transparent`                              |
| prop      | `prop_tree`         | `Isometric pixel art gnarled dead tree, twisted trunk, leafless branches, haunted woods, dark fantasy, game prop, transparent background`                   |
| prop      | `prop_crystal_vein` | `Isometric pixel art glowing crystal formation, jagged amethyst/blue crystals growing from rock, bioluminescent, cavern prop, dark fantasy, transparent bg` |

### Enemies

| Kategorie | id                  | Bing-Prompt                                                                                                                                                                   |
| --------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| enemy     | `enemy_rift_goblin` | `Isometric pixel art small goblin warrior, ragged leather/cloth, crude dagger/spear, hunched, angry, dark fantasy rift enemy, game sprite sheet idle/walk ready, transparent` |
| enemy     | `enemy_shadow_wolf` | `Isometric pixel art lean shadow wolf, smoky gray-black fur, glowing red eyes, muscular, prowling, rift beast, dark fantasy, game enemy sprite, transparent bg`               |
| enemy     | `enemy_bone_archer` | `Isometric pixel art skeletal archer, tattered robe/bone armor, cracked longbow, bony hands, undead crypt enemy, dark fantasy pixel art, transparent`                         |
| enemy     | `enemy_rift_wraith` | `Isometric pixel art spectral wraith, translucent misty form, tattered robes, glowing eyes/hands, floating, ethereal rift spirit, dark fantasy, transparent background`       |

> Hinweis: Die bestehenden Enemy-Sprites im Repo heißen z. B. `ash_scamp`, `shade`, `crawler`, `wisp`, `ash_bat`, `ash_scout`, `rift_lord` (siehe `MapGen.ts`/`Enemy`-Nutzung). Die im Task genannten `enemy_*` IDs sind für die geplanten Rift-Biome vorgesehen.

## 6. Umsetzungsschritte für einen Coding-Agent

Klein gehalten, mit Prüfbefehl nach jedem logischen Schritt: `bun run typecheck; bun run test:smoke`

| Schritt                                            | Aktion                                                                                                                                                                                                         | Dateien                                                         | Prüfbefehl                              |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------- |
| **1. Planung verifizieren**                        | `docs/MAP_LAYOUTS.md` gegen aktuellen Code abgleichen (POI-Liste, Konstanten, Funktionen). Sicherstellen, dass genannte Pfade exakt existieren.                                                                | `docs/MAP_LAYOUTS.md`                                           | `bun run typecheck; bun run test:smoke` |
| **2. Biome-Datenstruktur vorbereiten (nur Typen)** | Neue Datei `src/data/biomes.ts` mit Typen/Interfaces gemäß Abschnitt 4 anlegen (konstantenfrei, nur Typen + Kommentar). Noch keine Logik.                                                                      | `src/data/biomes.ts` (neu)                                      | `bun run typecheck; bun run test:smoke` |
| **3. Hub-Layout leicht anpassen**                  | Falls erwünscht, nur Deko/Wege in `generateHub` verfeinern (z. B. Straßenrand-Deko straffen), ohne POI-Anzahl/Plaza zu verändern. Änderungen minimal halten.                                                   | `src/world/MapGen.ts`                                           | `bun run typecheck; bun run test:smoke` |
| **4. Rift-Biome integrieren**                      | `generateDungeon` um Biome-Auswahl erweitern (z. B. über `seed`/`depth`). Tiles/Deko/Gegner-Mix pro Biom anwenden. Bestehende Logik für `killGoal`/Boss/Exit beibehalten.                                      | `src/world/DungeonGen.ts`, ggf. `src/world/MapGen.ts`           | `bun run typecheck; bun run test:smoke` |
| **5. Rendering anpassen**                          | `WorldScene.drawHubTiles` / `drawDungeonTiles` für neue Tile-IDs vorbereiten (Mapping von Biome/TileId zu Farben/Assets). Falls Assets noch fehlen, nur Mapping/Logik, keine hartcodierten Annahmen erzwingen. | `src/scenes/WorldScene.ts`                                      | `bun run typecheck; bun run test:smoke` |
| **6. Deko/Props rendern**                          | `makeHubDecor` erweitern oder biome-spezifisches Decor-Rendering ergänzen (nutzt `prop_*`-IDs). Auf bestehende Patterns achten.                                                                                | `src/scenes/WorldScene.ts`, `src/world/MapGen.ts`               | `bun run typecheck; bun run test:smoke` |
| **7. Gegner-Mapping prüfen**                       | Sicherstellen, dass neue `enemy_*` IDs in Enemy-Definitionen existieren, bevor sie gespawnt werden. Falls nicht vorhanden, erst Definitions ergänzen.                                                          | `src/entities/Enemy.ts`, `src/data/*enemies*` (falls vorhanden) | `bun run typecheck; bun run test:smoke` |
| **8. Smoke-Test & Debug**                          | Nach Änderungen `bun run test:smoke` ausführen. `artifacts/hub.png` prüfen, `window.__RIFTBORN` Snapshot checken (POIs/Chests/Enemies). Sicherstellen: keine Hostiles im Town-Soft-Buffer.                     | —                                                               | `bun run typecheck; bun run test:smoke` |
| **9. Feintuning**                                  | Dichten/Weights anhand Smoke/Debug nachjustieren, Lesbarkeit priorisieren. Keine unnötigen Refactors.                                                                                                          | Betroffene Dateien                                              | `bun run typecheck; bun run test:smoke` |

**Done-Kriterium**: `docs/MAP_LAYOUTS.md` existiert, nennt reale Dateien/Funktionen aus dem Repo, `git status` zeigt nur `docs/MAP_LAYOUTS.md` (und `.gitignore`) als Änderung.
