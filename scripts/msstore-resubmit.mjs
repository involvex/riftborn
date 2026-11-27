/**
 * Create API draft, patch listing (no IsGameDvrEnabled), upload ZIP, commit.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const productId = '9PK475MX7JFQ';
const privacyUrl = 'https://involvex.github.io/riftborn/privacy.html';
const uploadDir = path.join(root, 'artifacts', 'msstore-upload');
const pkgName = 'Riftborn-0.2.1-store.msix';
const pkgSrc = path.join(uploadDir, pkgName);
const zipPath = path.join(uploadDir, 'submission.zip');
const patchedPath = path.join(root, 'artifacts', 'msstore-draft-patched.json');

const SHORT =
  '2.5D isometric ARPG — hub town, procedural rifts, SHIFT ash/shadow layers, gear sets, and a Diablo-leaning combat loop.';

const DESCRIPTION = `Riftborn is a Diablo-leaning isometric ARPG: safe hub, wilderness POIs, and procedural rifts across four biomes (Ash, Crystal, Grove, Salt).

SHIFT: kills fill shift energy. Press Q to swap Ash and Shadow layers — phase through foes on the other layer and open layer-locked gates. Loop: explore town → enter the Obelisk (R) → clear packs → Rift Lord → Exit portal. Mid-rift reloads resume the same run.

Classes: Warrior, Mystic, Mage — four abilities each plus one passive. Depth D1–D10; random rift mods. Chase class armor sets. Optional local LAN co-op (P) is a hub sandbox prototype — not online multiplayer.

Controls: WASD move, LMB attack, 1–4 skills, E interact, F craft, Q SHIFT, R rift, B town, I/M/K/Esc menus. F11 fullscreen.

Credits: procedural CC0 audio; LPC monsters (Charles Sanchez) CC-BY-SA 3.0; hackcraft.de particles CC-BY. Some sprite sources used generative image tools then processed into game sheets.`;

function run(cmd, args, { allowFail = false } = {}) {
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
      if (code === 0 || allowFail) resolve({ code, out, err });
      else reject(new Error(`${cmd} failed (${code}): ${err || out}`));
    });
  });
}

function parseJsonBlob(text) {
  const i = text.indexOf('{');
  if (i < 0) throw new Error('No JSON in output');
  return JSON.parse(text.slice(i));
}

async function ensureZip() {
  const shotDir = path.join(root, 'docs', 'screenshots', 'store');
  const shots = [
    '01-hub.png',
    '02-shift-ash.png',
    '03-shift-shadow.png',
    '04-combat.png',
    '05-rift.png',
  ].filter((n) => fs.existsSync(path.join(shotDir, n)));

  const ps1 = path.join(uploadDir, 'make-zip.ps1');
  const lines = [
    'Add-Type -AssemblyName System.IO.Compression',
    'Add-Type -AssemblyName System.IO.Compression.FileSystem',
    `$zipPath = '${zipPath.replace(/'/g, "''")}'`,
    'if (Test-Path $zipPath) { Remove-Item $zipPath -Force }',
    '$fs = [IO.File]::Open($zipPath, [IO.FileMode]::Create)',
    '$zip = New-Object IO.Compression.ZipArchive($fs, [IO.Compression.ZipArchiveMode]::Create)',
    `function Add-Entry([string]$entryName, [string]$filePath) {`,
    '  $entry = $zip.CreateEntry($entryName, [IO.Compression.CompressionLevel]::Optimal)',
    '  $es = $entry.Open()',
    '  $bytes = [IO.File]::ReadAllBytes($filePath)',
    '  $es.Write($bytes, 0, $bytes.Length)',
    '  $es.Dispose()',
    '}',
    `Add-Entry '${pkgName}' '${pkgSrc.replace(/'/g, "''")}'`,
  ];
  for (const n of shots) {
    lines.push(
      `Add-Entry 'images/${n}' '${path.join(shotDir, n).replace(/'/g, "''")}'`,
    );
  }
  lines.push('$zip.Dispose()', '$fs.Dispose()', 'Write-Output "zip_ok"');
  fs.writeFileSync(ps1, lines.join('\n'));
  await run('powershell', ['-NoProfile', '-File', ps1]);
  return shots;
}

console.log('[resubmit] creating draft via publish (expect interactive fail)…');
await run(
  'msstore',
  [
    'publish',
    pkgSrc,
    '-id',
    productId,
    '--noCommit',
    '--uploadTimeout',
    '600',
  ],
  { allowFail: true },
);

console.log('[resubmit] fetching draft…');
const got = await run('msstore', ['submission', 'get', productId]);
const draft = parseJsonBlob(got.out);
if (!draft.FileUploadUrl) throw new Error('No FileUploadUrl on draft');
fs.writeFileSync(
  path.join(root, 'artifacts', 'msstore-draft.json'),
  JSON.stringify(draft, null, 2),
);

console.log('[resubmit] building zip…');
const shots = await ensureZip();
console.log('[resubmit] zip bytes', fs.statSync(zipPath).size);

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
  CanInstallOnRemovableMedia: true,
  // IsGameDvrEnabled intentionally omitted — account cannot set it
  NotesForCertification:
    'Tester build. Local saves only. Optional LAN co-op is a hub prototype.',
  AllowTargetFutureDeviceFamilies: {
    Desktop: true,
    Mobile: false,
    Holographic: false,
    Xbox: false,
  },
  ApplicationPackages: [
    {
      FileName: pkgName,
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
      Genres: ['Games_ActionAndAdventure'],
      IsLocalMultiplayer: false,
      IsLocalCooperative: false,
      IsOnlineMultiplayer: false,
      IsOnlineCooperative: false,
      IsBroadcastingPrivilegeGranted: false,
      IsCrossPlayEnabled: false,
      KinectDataForExternal: 'Disabled',
    },
  ],
};
delete patched.FileUploadUrl;
delete patched.Status;
delete patched.StatusDetails;

fs.writeFileSync(patchedPath, JSON.stringify(patched, null, 2));
console.log('[resubmit] updating metadata…');
await run('msstore', [
  'submission',
  'update',
  productId,
  '-p',
  patchedPath,
  '-s',
]);

const afterUpdate = parseJsonBlob(
  (await run('msstore', ['submission', 'get', productId])).out,
);
const uploadUrl = afterUpdate.FileUploadUrl;
if (!uploadUrl) throw new Error('Missing FileUploadUrl after update');

console.log('[resubmit] uploading zip…');
const zipBuf = fs.readFileSync(zipPath);
const put = await fetch(uploadUrl, {
  method: 'PUT',
  headers: {
    'x-ms-blob-type': 'BlockBlob',
    'Content-Type': 'application/octet-stream',
  },
  body: zipBuf,
});
if (!put.ok) {
  throw new Error(`Blob upload ${put.status}: ${(await put.text()).slice(0, 400)}`);
}
console.log('[resubmit] blob ok', put.status);

console.log('[resubmit] committing…');
const pub = await run('msstore', ['submission', 'publish', productId], {
  allowFail: true,
});
fs.writeFileSync(
  path.join(root, 'artifacts', 'msstore-commit.log'),
  `${pub.out}\n${pub.err}`,
);
console.log((pub.out + pub.err).slice(-1200));

const status = await run('msstore', ['submission', 'status', productId], {
  allowFail: true,
});
console.log((status.out + status.err).slice(-1500));

const gotFinal = await run('msstore', ['submission', 'get', productId], {
  allowFail: true,
});
try {
  const final = parseJsonBlob(gotFinal.out);
  fs.writeFileSync(
    path.join(root, 'artifacts', 'msstore-draft-after.json'),
    JSON.stringify(final, null, 2),
  );
  console.log(
    JSON.stringify(
      {
        Status: final.Status,
        Errors: final.StatusDetails?.Errors,
        Category: final.ApplicationCategory,
        Visibility: final.Visibility,
        Packages: (final.ApplicationPackages || []).map((p) => ({
          FileName: p.FileName,
          FileStatus: p.FileStatus,
        })),
      },
      null,
      2,
    ),
  );
} catch (e) {
  console.log('get_after_commit:', (gotFinal.out + gotFinal.err).slice(0, 800));
}
