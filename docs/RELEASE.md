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
- **Android APK**: `Riftborn-<version>.apk` (built via `bun run mobile:build` with CI-safe Android build)

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
- Itch-Titelbild: `docs/screenshots/shift-ash.png` + `shift-shadow.png` zeigen das
  SHIFT-Thema (Layer-Wechsel inkl. HUD + „Q · kills till energy“);
  `touch-rift.png` zeigt das Touch-HUD.
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
- Android APK (release): `bun run mobile:build`
- itch.io Web-ZIP: `bun run build:itch` → `release/riftborn-web.zip`
