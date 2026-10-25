# Gemini Export
Conversation: New World als Solo-Entwickler  
URL: https://gemini.google.com/app/2b3bbd8a238b200a  
Exported: 2026-10-25T12:25:25.321Z

## User

Kannst du mir bitte einen detaillierten Plan erstellen

## Assistant

## Kurzfassung

Hier ist ein vollständiger, phasenbasierter MVP-Entwicklungsplan für ein **2.5D-Action-RPG** (New-World-Lite) mit **Bun, Phaser 3 und TypeScript**, das speziell darauf ausgelegt ist, von **KI-Agenten** in kleinen, modularen Abschnitten gebaut zu werden.

## Architektur-Prinzipien für Agenten-Entwicklung

Damit KI-Agenten ohne Halluzinationen oder Code-Breche arbeiten können, nutzt das Projekt drei Grundregeln:

1. **Data-Driven Design:** Items, Crafting-Rezepte und Stats liegen in reinen JSON-Dateien. Der Agent muss für neue Inhalte keinen Code ändern.
2. **Dekompression von Grafik:** Zunächst wird mit prozeduralen Form-Renderern (Canvas Primitives/Gradients) gearbeitet. Richtige Assets (Spritesheets) können später 1:1 ausgetauscht werden.
3. **Entkoppelte Systeme:** Logik (z. B. `InventorySystem`) ist strikt von der Phaser-Visualisierung (`InventoryScene`) getrennt.

## Entwicklungs-Roadmap (Phasenplan)

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Phase 1: Core   │ ──> │ Phase 2: World  │ ──> │ Phase 3: Action │ ──> │ Phase 4: UI/Loop│
│ Setup & Engine  │     │ & Gathering     │     │ & Combat        │     │ & Polishing     │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Phase 1: Projekt-Setup & Isometrische Engine (Woche 1)

*Ziel: Ein laufendes Bun-Projekt mit einem beweglichen Spieler auf einem isometrischen Grid.*

- **Aufgabe 1.1:** Setup von Vite + Phaser 3 mit Bun (`bun create vite my-game --template vanilla-ts`).
- **Aufgabe 1.2:** Implementierung der Isometric-Math-Utils (Umrechnung World-3D `<->` Screen-2D).
- **Aufgabe 1.3:** Erstellung des Player-Entities mit Bewegung (WASD / Point-and-Click) und Depth-Sorting (Z-Indexing nach Y-Koordinate).

### Phase 2: Ressourcen-System & Gathering (Woche 2)

*Ziel: Bäume und Erze in der Welt platzieren, abbauen und ins Inventar aufnehmen.*

- **Aufgabe 2.1:** Datenschema (`src/data/items.json`, `src/data/nodes.json`) für Abbau-Quellen definieren.
- **Aufgabe 2.2:** Interaktions-System mit Reichweiten-Prüfung und Hitpoints für Ressourcen-Knoten.
- **Aufgabe 2.3:** Datenzentriertes Inventar-System (`InventoryManager`) mit Stack-Limits und Event-Emitter (`onItemAdded`).

### Phase 3: Crafting & Equipment (Woche 3)

*Ziel: Aus gesammelten Rohstoffen Ausrüstung oder Werkzeuge an Werkbänken herstellen.*

- **Aufgabe 3.1:** Recipe-Engine schreiben (`src/systems/CraftingSystem.ts`), die benötigte Items prüft und konsumiert.
- **Aufgabe 3.2:** Equipment-System (Haupt- und Zweithand, z. B. Axt vs. Schwert) mit Attribut-Bonus (z. B. +Abbautempo).

### Phase 4: Simple Combat & Loop (Woche 4)

*Ziel: Ein einfacher Gegner-Prototyp mit Beute-Droplist zur Vervollständigung der Gameloop.*

- **Aufgabe 4.1:** Zustand-basierte KI (`Patrol`, `Chase`, `Attack`) für wilde Tiere / Mobs.
- **Aufgabe 4.2:** Trefferzonen- und Schadensberechnung (Hitbox/Hurtbox oder Distance-Check).
- **Aufgabe 4.3:** Loot-Table System (`src/data/loottables.json`).

## Projektstruktur für den Agenten

```plaintext
my-isometric-rpg/
├── package.json
├── index.html
├── src/
│   ├── main.ts
│   ├── core/
│   │   ├── IsoMath.ts          # Wandelt (x, y, z) in (screenX, screenY) um
│   │   └── EventBus.ts         # Entkoppelt Systeme (z.B. PLAYER_MOVED, ITEM_PICKED)
│   ├── entities/
│   │   ├── Player.ts
│   │   ├── ResourceNode.ts
│   │   └── Enemy.ts
│   ├── systems/
│   │   ├── InventorySystem.ts
│   │   ├── CraftingSystem.ts
│   │   └── CombatSystem.ts
│   ├── data/
│   │   ├── items.json
│   │   ├── recipes.json
│   │   └── nodes.json
│   └── scenes/
│       ├── WorldScene.ts
│       └── UIScene.ts
```

## Agent-Prompt (Phase 1 Execution)

Verwende diesen Prompt, um den KI-Agenten direkt mit dem Bau von **Phase 1** zu beauftragen:

```plaintext
Du bist ein Experte für TypeScript, Bun und Phaser 3. Baue die Grundlagen für ein isometrisches 2.5D RPG (Phase 1).

Arbeitsschritte:
1. Erstelle `src/core/IsoMath.ts` mit Utility-Funktionen zur Umrechnung von World-Koordinaten (x, y, z) zu Screen-Koordinaten (screenX, screenY) für ein Isometrisches Raster (Tile-Breite: 64px, Tile-Höhe: 32px).
2. Erstelle eine Phaser-Szene (`src/scenes/WorldScene.ts`), die eine isometrische Map mit Platzhalter-Tiles rendert.
3. Erstelle ein `Player`-Entity in `src/entities/Player.ts`. Der Spieler soll sich per WASD auf dem isometrischen Raster bewegen können.
4. Implementiere korrektes Depth-Sorting (Spriting Z-Index) basierend auf der Y-Position, damit der Spieler korrekt vor oder hinter Objekten dargestellt wird.
5. Nutze reine Canvas-Graphics (z. B. zeichne Diamanten für Tiles und Zylinder/Rechtecke für Charaktere), um extern geladene Assets vorerst zu vermeiden.
6. Verwende Bun-kompatible TypeScript-Imports.
```
