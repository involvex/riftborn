/**
 * Create a Partner Center draft from the latest store .msix,
 * set Listings.en-us ReleaseNotes to package.json version, verify, commit.
 *
 * Usage: bun run scripts/msstore-patch-release-notes.mjs
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const productId = '9PK475MX7JFQ';
const pkgJson = JSON.parse(
  fs.readFileSync(path.join(root, 'package.json'), 'utf8'),
);
const version = String(pkgJson.version || '0.0.0');
const releaseNotes =
  `Tester build ${version} — hidden listing for promotional-code ` +
  `installs (AUMID / fullscreen fixes). Beta keys: ` +
  `https://involvex.github.io/riftborn/beta.html`;

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

function notesOf(draft) {
  return (
    draft.Listings?.['en-us']?.BaseListing?.ReleaseNotes ||
    draft.Listings?.['en-us']?.BaseListing?.releaseNotes ||
    ''
  );
}

function findStorePackage() {
  const release = path.join(root, 'release');
  const pub = path.join(root, 'artifacts', 'msstore-pub');
  const dirs = [release, pub].filter((d) => fs.existsSync(d));
  const files = [];
  for (const d of dirs) {
    for (const f of fs.readdirSync(d)) {
      if (/Riftborn-.*-store\.(appx|msix)$/i.test(f)) {
        files.push(path.join(d, f));
      }
    }
  }
  // Prefer .msix — msstore publish treats a bare .appx path as a project root.
  const ranked = files.sort((a, b) => {
    const score = (f) => {
      let s = 0;
      if (f.includes(version)) s += 10;
      if (f.endsWith('.msix')) s += 5;
      return s;
    };
    return score(a) - score(b);
  });
  const picked = ranked.pop();
  if (!picked) {
    throw new Error(
      'No Riftborn-*-store.appx|msix — run bun run build:msstore',
    );
  }
  return picked;
}

const pkg = findStorePackage();
console.log('[patch-notes] version', version);
console.log('[patch-notes] package', path.basename(pkg));

const status0 = await run('msstore', ['submission', 'status', productId], {
  allowFail: true,
});
const st = status0.out + status0.err;
if (
  /Found Pending Submission/i.test(st) &&
  !/Submission Status = Published/i.test(st)
) {
  console.error(
    '[patch-notes] A submission is already in flight. Wait until Published, then re-run.\n' +
      st.slice(-700),
  );
  process.exit(1);
}

console.log('[patch-notes] creating draft (--noCommit)…');
const pub = await run('msstore', [
  'publish',
  pkg,
  '-id',
  productId,
  '--noCommit',
  '--uploadTimeout',
  '600',
]);
console.log((pub.out + pub.err).slice(-800));

const got = await run('msstore', ['submission', 'get', productId]);
const draft = parseJsonBlob(got.out);
if (draft.Status !== 'PendingCommit') {
  throw new Error(`Expected PendingCommit, got ${draft.Status}`);
}

const listing = draft.Listings?.['en-us']?.BaseListing;
if (!listing) throw new Error('No en-us BaseListing on draft');

const toWrite = structuredClone(draft);
delete toWrite.FileUploadUrl;
delete toWrite.Status;
delete toWrite.StatusDetails;
toWrite.Listings['en-us'].BaseListing.ReleaseNotes = releaseNotes;

const patchedPath = path.join(root, 'artifacts', 'msstore-notes-patch.json');
fs.writeFileSync(patchedPath, JSON.stringify(toWrite, null, 2));

console.log('[patch-notes] updating submission…');
await run('msstore', [
  'submission',
  'update',
  productId,
  '-p',
  patchedPath,
  '-s',
]);

const after = parseJsonBlob(
  (await run('msstore', ['submission', 'get', productId])).out,
);
const notes = notesOf(after);
console.log('[patch-notes] draft notes:', notes);
if (!notes.includes(version)) {
  throw new Error(
    `Release notes did not stick (got: ${JSON.stringify(notes)})`,
  );
}

console.log('[patch-notes] committing…');
const commit = await run('msstore', ['submission', 'publish', productId]);
console.log((commit.out + commit.err).slice(-1000));

const status = await run('msstore', ['submission', 'status', productId], {
  allowFail: true,
});
console.log((status.out + status.err).slice(-800));
