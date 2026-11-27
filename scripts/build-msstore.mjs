/**
 * Build a Microsoft Store AppX for Riftborn (Electron).
 *
 * Reads Partner Center identity from:
 *   1) APPX_* / MSSTORE_* env vars (preferred KEY=value .env), or
 *   2) a Partner Center "Product identity" paste in .env
 *      (Package/Identity/Name\t… lines).
 *
 * Does not print identity / publisher values.
 *
 * Usage: bun run build:msstore
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(root, '.env');
const builderConfigPath = path.join(
  root,
  'electron',
  'build',
  'msstore-builder.json',
);

function run(command, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, ...opts.env },
    });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited ${code ?? 'null'}`));
    });
  });
}

function tabValue(raw, label) {
  const re = new RegExp(
    `${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\t([^\\r\\n]+)`,
  );
  return raw.match(re)?.[1]?.trim() || '';
}

function firstEnv(...keys) {
  for (const key of keys) {
    const v = process.env[key]?.trim();
    if (v) return v;
  }
  return '';
}

/**
 * @returns {{
 *   identityName: string,
 *   publisher: string,
 *   publisherDisplayName: string,
 *   displayName: string,
 *   productId: string,
 * }}
 */
function loadStoreIdentity() {
  let paste = '';
  if (fs.existsSync(envPath)) {
    paste = fs.readFileSync(envPath, 'utf8');
  }

  const identityName =
    firstEnv('APPX_IDENTITY_NAME', 'MSSTORE_IDENTITY_NAME') ||
    tabValue(paste, 'Package/Identity/Name');
  const publisher =
    firstEnv('APPX_PUBLISHER', 'MSSTORE_PUBLISHER') ||
    tabValue(paste, 'Package/Identity/Publisher');
  const publisherDisplayName =
    firstEnv('APPX_PUBLISHER_DISPLAY_NAME', 'MSSTORE_PUBLISHER_DISPLAY_NAME') ||
    tabValue(paste, 'Package/Properties/PublisherDisplayName');
  const displayName =
    firstEnv('APPX_DISPLAY_NAME', 'MSSTORE_DISPLAY_NAME') || 'Riftborn';
  const productId =
    firstEnv('MSSTORE_PRODUCT_ID', 'MSSTORE_STORE_ID', 'APPX_STORE_ID') ||
    tabValue(paste, 'Store ID');

  const missing = [];
  if (!identityName) missing.push('APPX_IDENTITY_NAME (Package/Identity/Name)');
  if (!publisher) missing.push('APPX_PUBLISHER (Package/Identity/Publisher)');
  if (!publisherDisplayName) {
    missing.push(
      'APPX_PUBLISHER_DISPLAY_NAME (Package/Properties/PublisherDisplayName)',
    );
  }
  if (missing.length) {
    console.error(
      '[build:msstore] Missing Store identity. Set KEY=value in .env\n' +
        '  (see .env.example) or paste Partner Center Product identity\n' +
        '  into .env. Missing:\n  - ' +
        missing.join('\n  - '),
    );
    process.exit(1);
  }

  if (!productId) {
    console.warn(
      '[build:msstore] No MSSTORE_PRODUCT_ID / Store ID found — ' +
        'package will still build; pass -id when publishing.',
    );
  } else {
    console.log('[build:msstore] Product/Store id present (not printed).');
  }

  return {
    identityName,
    publisher,
    publisherDisplayName,
    displayName,
    productId,
  };
}

const identity = loadStoreIdentity();
console.log('[build:msstore] Identity loaded (values not printed).');

await run('bun', ['run', 'icons']);
await run('bun', ['run', 'build']);

const builderConfig = {
  appId: 'dev.riftborn.game',
  productName: 'Riftborn',
  copyright: 'Copyright © Riftborn',
  directories: {
    output: 'release',
    buildResources: 'electron/build',
  },
  files: ['dist/**/*', 'electron/main.cjs', 'package.json'],
  asar: true,
  icon: 'electron/build/icon.png',
  win: {
    icon: 'electron/build/icon.ico',
    target: [
      {
        target: 'appx',
        arch: ['x64'],
      },
    ],
  },
  appx: {
    identityName: identity.identityName,
    publisher: identity.publisher,
    publisherDisplayName: identity.publisherDisplayName,
    applicationId: 'Riftborn',
    displayName: identity.displayName,
    languages: ['en-US'],
    backgroundColor: '#0a0c10',
    // Store rejects MinVersion <= 10.0.17134.0
    minVersion: '10.0.17763.0',
    maxVersionTested: '10.0.22621.0',
    artifactName: 'Riftborn-${version}-store.${ext}',
  },
};

fs.mkdirSync(path.dirname(builderConfigPath), { recursive: true });
fs.writeFileSync(builderConfigPath, JSON.stringify(builderConfig, null, 2));
console.log('[build:msstore] Wrote electron/build/msstore-builder.json');

await run(
  'bunx',
  ['electron-builder', '--win', 'appx', '--x64', '--config', builderConfigPath],
  {
    env: {
      CSC_IDENTITY_AUTO_DISCOVERY: 'false',
    },
  },
);

const releaseDir = path.join(root, 'release');
const artifacts = fs.existsSync(releaseDir)
  ? fs
      .readdirSync(releaseDir)
      .filter((f) => /Riftborn-.*-store\.(appx|msix)$/i.test(f))
  : [];

if (artifacts.length === 0) {
  console.error('[build:msstore] No store .appx found under release/');
  process.exit(1);
}

console.log('[build:msstore] Artifacts:');
for (const name of artifacts) {
  console.log(`  release/${name}`);
}
console.log(
  '[build:msstore] Next: upload via Partner Center Packages (first\n' +
    '  submission), or later:\n' +
    '  msstore publish -i release/<artifact> -id <productId> --noCommit',
);
