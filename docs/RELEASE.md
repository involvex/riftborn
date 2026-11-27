# Releases

## Creating a release

You can create a release in two ways:

### Option 1: Push a git tag

```bash
git tag v0.1.0
git push origin v0.1.0
```

### Option 2: Manual workflow dispatch

1. Go to Actions → Release → Run workflow
2. Enter the tag name (e.g. `v0.1.0`)

## Artifacts

Each release includes:

- **Windows portable**: `Riftborn-<version>-portable.exe` (built via `bun run build:portable`)
- **Windows Store AppX**: `Riftborn-<version>-store.appx` (built via `bun run build:msstore`)
- **Android APK**: `Riftborn-<version>.apk` (built via `bun run mobile:build` with CI-safe Android build)

## Microsoft Store (tester / hidden listing)

Desktop Store builds are **AppX** (MSIX product). Portable EXE is for
GitHub / friends only — it is not the Store package.

### Build

1. Put Partner Center **Product identity** in `.env` either as:
   - `KEY=value` (see [`.env.example`](../.env.example)), or
   - the pasted Product identity page (tab-separated
     `Package/Identity/Name` lines — `build:msstore` parses both).
2. `bun run build:msstore` → `release/Riftborn-<version>-store.appx`
3. Microsoft re-signs on ingest; local code signing is not required
   (`CSC_IDENTITY_AUTO_DISCOVERY=false`). The produced `.appx` is
   intentionally unsigned — `Add-AppxPackage` sideload will fail with
   `0x800B0100` until Store certification re-signs it (or you sign for
   enterprise sideload). Smoke the same game via
   `bun run desktop:prod` / portable EXE.

### First submission (human — Partner Center)

1. Complete listing: description (below), IARC age rating, category
   **Games → Action / Role playing**, support contact.
2. Privacy URL (after Pages deploy):
   `https://involvex.github.io/riftborn/privacy.html`
3. **Pricing and availability → Discoverability:** available but
   **not discoverable**; choose **Stop acquisition** so only
   promotional-code holders (or prior owners) can install.
4. Do **not** switch to Public audience (one-way lock).
5. Upload the `.appx` under **Packages**, then **Submit**.
6. After **Published**: **Promotional codes** → generate and send to
   testers (Microsoft account required on their Windows sign-in).

Package flights appear only after a submission is published. Later
tester updates can reuse the same hidden listing (redeemers get Store
auto-updates) or use flights for a riskier subgroup.

### Later package-only updates (CLI)

```text
msstore apps get <productId>
msstore publish -i release/Riftborn-<ver>-store.appx -id <productId> --noCommit
# confirm draft still has Stop acquisition, then:
msstore submission publish <productId>
```

Do not pass `--flightId` until a flight exists. Prefer `--noCommit` on
the first CLI upload so you can inspect the draft.

### Store listing copy (paste-ready)

**Short description**

2.5D isometric ARPG — hub town, procedural rifts, SHIFT ash/shadow
layers, gear sets, and a Diablo-leaning combat loop.

**Full description**

Riftborn is a Diablo-leaning isometric ARPG: safe hub, wilderness POIs,
and procedural rifts across four biomes (Ash, Crystal, Grove, Salt).

SHIFT: kills fill shift energy. Press Q to swap Ash and Shadow layers —
phase through foes on the other layer and open layer-locked gates. Loop:
explore town → enter the Obelisk (R) → clear packs → Rift Lord → Exit
portal. Mid-rift reloads resume the same run.

Classes: Warrior, Mystic, Mage — four abilities each plus one passive.
Depth D1–D10; random rift mods. Chase class armor sets. Optional local
LAN co-op (P) is a hub sandbox prototype — not online multiplayer.

Controls: WASD move, LMB attack, 1–4 skills, E interact, F craft,
Q SHIFT, R rift, B town, I/M/K/Esc menus. F11 fullscreen.

**Credits / disclosure**

- Audio: procedural CC0 (`public/assets/ATTRIBUTION.md`).
- LPC monsters (Charles Sanchez): CC-BY-SA 3.0 → shade / crawler / wisp / bat.
- Particles (hackcraft.de): CC-BY.
- Some character/enemy sheet sources used generative image tools
  (Bing / Hugging Face) then processed into game sprites; disclose as
  generative art in Partner Center if asked.

### Store screenshots

Partner Center desktop wants **1920×1080** (or 1366×768) stills — at
least four: hub, rift/SHIFT, combat, UI. Existing
`docs/screenshots/*.png` may need a resize or a smoke capture at that
size. GIF is itch-only.

## Android signing (optional)

The Android build uses debug signing by default, so no secrets are required for the first release build. If you want to sign with your own keystore, add the following GitHub Secrets:

- `KEYSTORE_BASE64` - Base64-encoded keystore file
- `KEYSTORE_PASSWORD` - Keystore password
- `KEY_ALIAS` - Key alias
- `KEY_PASSWORD` - Key password

**Never commit keystores or passwords to the repository.**

## itch.io (HTML5)

Für [itch.io](https://involvex.itch.io/riftborn) als Browser-Spiel:

1. `bun run build:itch` erzeugt `release/riftborn-web.zip` (Inhalt von `dist/`, `index.html` liegt im Root der ZIP).
2. Auf itch.io unter **Edit game → Uploads** die ZIP als **HTML5** hochladen.
3. Bei **Kind of project** `HTML5` wählen, Haken **This file will be played in the browser** setzen.
4. Unter **Embed options** kann **Embed in page** genutzt werden. Als **shared files** einfach das ZIP hochladen.
5. SharedArrayBuffer wird nicht benötigt. Viewport/Mobile-Verhalten bleibt wie bisher.

## Submission-Paket (Game Off 2026)

- Web-ZIP: `release/riftborn-web.zip` via `bun run build:itch` (letzter Lauf **3/3** Smoke-Tests grün; HTML lädt ohne Fehler).
- Itch-Copy + Credits: [`docs/ITCH_PAGE.md`](ITCH_PAGE.md) (paste-ready).
- Captures: `shift-ash.png` / `shift-shadow.png` (Thema), `shift-rift.gif`
  (Layer-Switch), `shift-combat.png` (Combat), `touch-rift.png` (Touch-HUD).
- Steuerung/SHIFT erklärt: `site/controls.html` (SHIFT-Panel mit
  Energie/Gates/Phasen-Regel), `README.md` (SHIFT im Control-Table
  plus Hinweis auf Rebinding).
- Spielstand: vier Fähigkeiten pro Klasse (Battle Cry / Rift Step / Chain Surge),
  Rift Mender (heilt seine Gruppe) und die Sunken-Rift-POI mit Hinterhalt.
- Audio: prozedural erzeugt, CC0 — siehe `public/assets/ATTRIBUTION.md`.

## GitHub Pages (Play in Browser)

Der Landingpage-Workflow baut zusätzlich das Spiel unter [`/play/`](https://involvex.github.io/riftborn/play/). Über die Website kann direkt im Browser gespielt werden.

## Local builds

- Windows portable: `bun run build:portable`
- Windows Store AppX: `bun run build:msstore` → `release/Riftborn-*-store.appx`
- Android APK (release): `bun run mobile:build`
- itch.io Web-ZIP: `bun run build:itch` → `release/riftborn-web.zip`
