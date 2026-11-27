/**
 * Upload release/*.appx|.msix to Partner Center as a draft (--noCommit),
 * then patch listing copy / privacy / stop-acquisition visibility.
 *
 * Prerequisite: no Partner Center–created pending submission
 * (delete that draft in the portal first — API cannot).
 *
 * Usage: bun run scripts/msstore-upload.mjs
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const productId =
  process.env.MSSTORE_PRODUCT_ID?.trim() ||
  process.env.MSSTORE_STORE_ID?.trim() ||
  '';
const privacyUrl =
  process.env.MSSTORE_PRIVACY_URL?.trim() ||
  'https://involvex.github.io/riftborn/privacy.html';
const uploadDir = path.join(root, 'artifacts', 'msstore-upload');
const draftPath = path.join(root, 'artifacts', 'msstore-draft.json');
const patchedPath = path.join(root, 'artifacts', 'msstore-draft-patched.json');

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: root,
      stdio: opts.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
      shell: true,
      env: process.env,
    });
    let out = '';
    let err = '';
    if (opts.capture) {
      child.stdout?.on('data', (d) => {
        out += d.toString();
      });
      child.stderr?.on('data', (d) => {
        err += d.toString();
      });
    }
    child.on('exit', (code) => {
      if (code === 0) resolve({ out, err });
      else
        reject(
          new Error(
            `${cmd} ${args.join(' ')} exited ${code}\n${err || out}`.trim(),
          ),
        );
    });
  });
}

function loadProductId() {
  if (productId) return productId;
  const envFile = path.join(root, '.env');
  if (!fs.existsSync(envFile)) {
    console.error('Missing MSSTORE_PRODUCT_ID / .env');
    process.exit(1);
  }
  const raw = fs.readFileSync(envFile, 'utf8');
  const m = raw.match(/^\s*MSSTORE_PRODUCT_ID\s*=\s*(.+)\s*$/m);
  const id = m?.[1]?.trim();
  if (!id) {
    console.error('Missing MSSTORE_PRODUCT_ID in .env');
    process.exit(1);
  }
  return id;
}

function findPackage() {
  fs.mkdirSync(uploadDir, { recursive: true });
  const release = path.join(root, 'release');
  const appx = fs
    .readdirSync(release)
    .filter((f) => /Riftborn-.*-store\.(appx|msix)$/i.test(f))
    .sort()
    .pop();
  if (!appx) {
    console.error(
      'No release/Riftborn-*-store.appx — run bun run build:msstore',
    );
    process.exit(1);
  }
  const src = path.join(release, appx);
  const destMsix = path.join(uploadDir, appx.replace(/\.appx$/i, '.msix'));
  fs.copyFileSync(src, destMsix);
  return destMsix;
}

const SHORT =
  '2.5D isometric ARPG — hub town, procedural rifts, SHIFT ash/shadow layers, gear sets, and a Diablo-leaning combat loop.';

const DESCRIPTION = `Riftborn is a Diablo-leaning isometric ARPG: safe hub, wilderness POIs, and procedural rifts across four biomes (Ash, Crystal, Grove, Salt).

SHIFT: kills fill shift energy. Press Q to swap Ash and Shadow layers — phase through foes on the other layer and open layer-locked gates. Loop: explore town → enter the Obelisk (R) → clear packs → Rift Lord → Exit portal. Mid-rift reloads resume the same run.

Classes: Warrior, Mystic, Mage — four abilities each plus one passive. Depth D1–D10; random rift mods. Chase class armor sets. Optional local LAN co-op (P) is a hub sandbox prototype — not online multiplayer.

Controls: WASD move, LMB attack, 1–4 skills, E interact, F craft, Q SHIFT, R rift, B town, I/M/K/Esc menus. F11 fullscreen.

Credits: procedural CC0 audio; LPC monsters (Charles Sanchez) CC-BY-SA 3.0; hackcraft.de particles CC-BY. Some sprite sources used generative image tools then processed into game sheets.`;

function patchSubmission(draft) {
  const next = structuredClone(draft);

  // Stop acquisition + not discoverable (promo-code tester path).
  if (!next.visibility) next.visibility = {};
  next.visibility.visibilityAudience = 'PublicAudience';
  next.visibility.groupIds = next.visibility.groupIds ?? [];
  next.visibility.hideFromDiscovery = true;
  next.visibility.stopAcquisition = true;

  if (!next.pricing) next.pricing = {};
  next.pricing.priceId = next.pricing.priceId || 'Free';
  next.pricing.trialPeriod = next.pricing.trialPeriod ?? 'NoFreeTrial';

  next.privacyPolicyUrl = privacyUrl;
  next.websiteUrl = next.websiteUrl || 'https://involvex.github.io/riftborn/';
  next.supportContact =
    next.supportContact || 'https://github.com/involvex/riftborn/issues';

  const listings = next.listings ?? {};
  const en = listings['en-us'] ?? listings['en-US'] ?? {};
  en.baseListing = {
    ...(en.baseListing ?? {}),
    title: 'Riftborn',
    shortDescription: SHORT.slice(0, 250),
    description: DESCRIPTION,
    privacyPolicyUrl: privacyUrl,
    keywords: ['ARPG', 'isometric', 'RPG', 'action', 'dungeon', 'SHIFT'],
    features: [
      'Hub town, POIs, and procedural rifts',
      'SHIFT ash/shadow world layers',
      'Three classes with skill forks and set gear',
      'Depth D1–D10 with rift modifiers',
      'Local LAN co-op hub sandbox (prototype)',
    ],
    releaseNotes: `Tester build ${
      process.env.npm_package_version ||
      JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
        .version
    } — hidden listing for promotional-code installs. Beta keys: https://involvex.github.io/riftborn/beta.html`,
  };
  listings['en-us'] = en;
  next.listings = listings;

  return next;
}

const id = loadProductId();
const pkg = findPackage();
console.log('[msstore-upload] product', id);
console.log('[msstore-upload] package', path.basename(pkg));

console.log('[msstore-upload] publishing draft (--noCommit)…');
await run('msstore', [
  'publish',
  pkg,
  '-id',
  id,
  '--noCommit',
  '--uploadTimeout',
  '600',
]);

console.log('[msstore-upload] fetching draft…');
const { out } = await run('msstore', ['submission', 'get', id], {
  capture: true,
});
const jsonStart = out.indexOf('{');
if (jsonStart < 0) {
  console.error('No JSON in submission get output');
  process.exit(1);
}
const draft = JSON.parse(out.slice(jsonStart));
fs.writeFileSync(draftPath, JSON.stringify(draft, null, 2));

const patched = patchSubmission(draft);
fs.writeFileSync(patchedPath, JSON.stringify(patched, null, 2));
console.log('[msstore-upload] patching metadata (visibility/privacy/copy)…');
await run('msstore', [
  'submission',
  'updateMetadata',
  id,
  fs.readFileSync(patchedPath, 'utf8'),
]);

console.log(
  '[msstore-upload] Draft ready. Review in Partner Center, complete IARC\n' +
    '  + screenshots if missing, then:\n' +
    `  msstore submission publish ${id}`,
);
