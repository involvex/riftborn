/**
 * Fulfill the pending API-created Store draft:
 * 1) Build ZIP (msix + screenshots)
 * 2) Patch category / visibility / listing / packages
 * 3) msstore submission update
 * 4) PUT ZIP to FileUploadUrl
 *
 * Does NOT commit/publish — complete IARC in Partner Center first if needed.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const productId = '9PK475MX7JFQ';
const draftPath = path.join(root, 'artifacts', 'msstore-draft.json');
const patchedPath = path.join(root, 'artifacts', 'msstore-draft-patched.json');
const zipPath = path.join(
  root,
  'artifacts',
  'msstore-upload',
  'submission.zip',
);
const privacyUrl = 'https://involvex.github.io/riftborn/privacy.html';

const SHORT =
  '2.5D isometric ARPG — hub town, procedural rifts, SHIFT ash/shadow layers, gear sets, and a Diablo-leaning combat loop.';

const DESCRIPTION = `Riftborn is a Diablo-leaning isometric ARPG: safe hub, wilderness POIs, and procedural rifts across four biomes (Ash, Crystal, Grove, Salt).

SHIFT: kills fill shift energy. Press Q to swap Ash and Shadow layers — phase through foes on the other layer and open layer-locked gates. Loop: explore town → enter the Obelisk (R) → clear packs → Rift Lord → Exit portal. Mid-rift reloads resume the same run.

Classes: Warrior, Mystic, Mage — four abilities each plus one passive. Depth D1–D10; random rift mods. Chase class armor sets. Optional local LAN co-op (P) is a hub sandbox prototype — not online multiplayer.

Controls: WASD move, LMB attack, 1–4 skills, E interact, F craft, Q SHIFT, R rift, B town, I/M/K/Esc menus. F11 fullscreen.

Credits: procedural CC0 audio; LPC monsters (Charles Sanchez) CC-BY-SA 3.0; hackcraft.de particles CC-BY. Some sprite sources used generative image tools then processed into game sheets.`;

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => {
      out += d.toString();
    });
    child.stderr.on('data', (d) => {
      err += d.toString();
    });
    child.on('exit', (code) => {
      if (code === 0) resolve({ out, err });
      else reject(new Error(`${cmd} failed (${code}): ${err || out}`));
    });
  });
}

async function zipFiles(entries) {
  // Prefer PowerShell Compress-Archive for zero deps
  const staging = path.join(root, 'artifacts', 'msstore-upload', 'zip-src');
  fs.rmSync(staging, { recursive: true, force: true });
  fs.mkdirSync(staging, { recursive: true });
  fs.mkdirSync(path.join(staging, 'images'), { recursive: true });

  for (const [rel, abs] of entries) {
    const dest = path.join(staging, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(abs, dest);
  }

  fs.rmSync(zipPath, { force: true });
  await run('powershell', [
    '-NoProfile',
    '-Command',
    `Compress-Archive -Path '${staging}\\*' -DestinationPath '${zipPath}' -Force`,
  ]);
}

const pkgSrc = path.join(
  root,
  'artifacts',
  'msstore-upload',
  'Riftborn-0.2.1-store.msix',
);
if (!fs.existsSync(pkgSrc)) {
  console.error('Missing', pkgSrc);
  process.exit(1);
}

const shotDir = path.join(root, 'docs', 'screenshots', 'store');
const shots = [
  '01-hub.png',
  '02-shift-ash.png',
  '03-shift-shadow.png',
  '04-combat.png',
  '05-rift.png',
].filter((n) => fs.existsSync(path.join(shotDir, n)));

console.log('[fulfill] building zip…');
const zipEntries = [['Riftborn-0.2.1-store.msix', pkgSrc]];
for (const n of shots) {
  zipEntries.push([`images/${n}`, path.join(shotDir, n)]);
}
await zipFiles(zipEntries);
console.log('[fulfill] zip', zipPath, fs.statSync(zipPath).size, 'bytes');

console.log('[fulfill] refreshing draft…');
const { out } = await run('msstore', ['submission', 'get', productId]);
const jsonStart = out.indexOf('{');
if (jsonStart < 0) throw new Error('No draft JSON');
const draft = JSON.parse(out.slice(jsonStart));
fs.writeFileSync(draftPath, JSON.stringify(draft, null, 2));

const uploadUrl = draft.FileUploadUrl;
if (!uploadUrl) throw new Error('Draft has no FileUploadUrl');

const images = shots.map((n) => ({
  FileName: `images/${n}`,
  FileStatus: 'PendingUpload',
  ImageType: 'Screenshot',
  Description: n.replace(/\.png$/, '').replace(/^\d+-/, ''),
}));

const patched = {
  ...draft,
  ApplicationCategory: 'Games_ActionAndAdventure',
  Visibility: 'Hidden',
  PrivacyPolicyUrl: privacyUrl,
  CanInstallOnRemovableMedia: true,
  IsGameDvrEnabled: true,
  NotesForCertification:
    'Tester build. Local saves only. Optional LAN co-op is a hub prototype.',
  AllowTargetFutureDeviceFamilies: {
    Desktop: true,
    Mobile: false,
    Holographic: false,
    Xbox: false,
    Team: false,
  },
  ApplicationPackages: [
    {
      FileName: 'Riftborn-0.2.1-store.msix',
      FileStatus: 'PendingUpload',
      MinimumDirectXVersion: 'None',
      MinimumSystemRam: 'None',
    },
  ],
  Listings: {
    'en-us': {
      BaseListing: {
        Title: 'Riftborn',
        ShortDescription: SHORT.slice(0, 250),
        Description: DESCRIPTION,
        Keywords: ['ARPG', 'isometric', 'RPG', 'action', 'dungeon', 'SHIFT'],
        Features: [
          'Hub town, POIs, and procedural rifts',
          'SHIFT ash/shadow world layers',
          'Three classes with skill forks and set gear',
          'Depth D1–D10 with rift modifiers',
          'Local LAN co-op hub sandbox (prototype)',
        ],
        ReleaseNotes:
          'Tester build 0.2.1 — hidden listing for promotional-code installs.',
        PrivacyPolicyUrl: privacyUrl,
        SupportContact: 'https://github.com/involvex/riftborn/issues',
        WebsiteUrl: 'https://involvex.github.io/riftborn/',
        CopyrightAndTrademarkInfo: 'Copyright © Riftborn / involvex',
        LicenseTerms: '',
        Images: images,
        RecommendedHardware: [],
      },
      PlatformOverrides: {},
    },
  },
  GamingOptions: [
    {
      Genres: ['Action', 'RolePlaying'],
      IsLocalMultiplayer: true,
      IsLocalCooperative: true,
      IsOnlineMultiplayer: false,
      IsOnlineCooperative: false,
      LocalMultiplayerMinPlayers: 1,
      LocalMultiplayerMaxPlayers: 4,
      LocalCooperativeMinPlayers: 1,
      LocalCooperativeMaxPlayers: 4,
      IsBroadcastingPrivilegeGranted: false,
      IsCrossPlayEnabled: false,
      KeyboardMouseDescription: 'WASD move, mouse attack, hotkeys for skills.',
      GamePadDescription: '',
    },
  ],
};

// Keep FileUploadUrl out of PUT body (read-only on update)
delete patched.FileUploadUrl;
delete patched.Status;
delete patched.StatusDetails;

fs.writeFileSync(patchedPath, JSON.stringify(patched, null, 2));
console.log('[fulfill] updating submission metadata…');

// Pass JSON via file to avoid argv length / escaping issues
const updateScript = path.join(
  root,
  'artifacts',
  'msstore-upload',
  'do-update.ps1',
);
fs.writeFileSync(
  updateScript,
  `$json = Get-Content -Raw '${patchedPath.replace(/'/g, "''")}'
msstore submission update ${productId} $json
`,
);
await run('powershell', ['-NoProfile', '-File', updateScript]);

console.log('[fulfill] uploading zip to blob…');
const zipBuf = fs.readFileSync(zipPath);
const put = await fetch(uploadUrl, {
  method: 'PUT',
  headers: {
    'x-ms-blob-type': 'BlockBlob',
    'Content-Type': 'application/zip',
  },
  body: zipBuf,
});
if (!put.ok) {
  const body = await put.text();
  throw new Error(`Blob upload failed ${put.status}: ${body.slice(0, 400)}`);
}
console.log('[fulfill] blob upload ok', put.status);

console.log('[fulfill] re-fetch draft status…');
const after = await run('msstore', ['submission', 'get', productId]);
const afterJson = JSON.parse(after.out.slice(after.out.indexOf('{')));
fs.writeFileSync(
  path.join(root, 'artifacts', 'msstore-draft-after.json'),
  JSON.stringify(afterJson, null, 2),
);
console.log(
  JSON.stringify(
    {
      Status: afterJson.Status,
      Category: afterJson.ApplicationCategory,
      Visibility: afterJson.Visibility,
      Packages: (afterJson.ApplicationPackages || []).map((p) => ({
        FileName: p.FileName,
        FileStatus: p.FileStatus,
      })),
      ListingKeys: Object.keys(afterJson.Listings || {}),
      Errors: afterJson.StatusDetails?.Errors,
    },
    null,
    2,
  ),
);

console.log(
  '\n[fulfill] Draft filled. Next in Partner Center:\n' +
    '  1) Complete IARC age ratings if prompted\n' +
    '  2) Confirm Screenshots / Visibility=Hidden\n' +
    '  3) Then: msstore submission publish ' +
    productId,
);
