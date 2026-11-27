/**
 * Convert Partner Center Product identity paste in .env → KEY=value.
 * Prints key names only (never values).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(root, '.env');

if (!fs.existsSync(envPath)) {
  console.error('Missing .env');
  process.exit(1);
}

const raw = fs.readFileSync(envPath, 'utf8');

// Already KEY=value?
if (/^\s*APPX_IDENTITY_NAME\s*=/m.test(raw)) {
  console.log('already_key_value');
  process.exit(0);
}

function tabValue(label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`${escaped}\\t([^\\r\\n]+)`);
  return raw.match(re)?.[1]?.trim() || '';
}

const identityName = tabValue('Package/Identity/Name');
const publisher = tabValue('Package/Identity/Publisher');
const publisherDisplayName = tabValue(
  'Package/Properties/PublisherDisplayName',
);
const storeId = tabValue('Store ID');
const url = tabValue('URL');
const pfn = tabValue('Package Family Name (PFN)');
const msa = tabValue('MSA app Id');

if (!identityName || !publisher || !publisherDisplayName || !storeId) {
  console.error('parse_failed — expected Partner Center paste fields');
  process.exit(1);
}

const lines = [
  '# Microsoft Store / AppX identity',
  '# Converted from Partner Center Product identity paste.',
  '# Do not commit this file.',
  '',
  `APPX_IDENTITY_NAME=${identityName}`,
  `APPX_PUBLISHER=${publisher}`,
  `APPX_PUBLISHER_DISPLAY_NAME=${publisherDisplayName}`,
  'APPX_DISPLAY_NAME=Riftborn',
  `MSSTORE_PRODUCT_ID=${storeId}`,
  `MSSTORE_STORE_ID=${storeId}`,
];
if (url) lines.push(`MSSTORE_LISTING_URL=${url}`);
if (pfn) lines.push(`APPX_PACKAGE_FAMILY_NAME=${pfn}`);
if (msa) lines.push(`MSSTORE_MSA_APP_ID=${msa}`);
lines.push('');

fs.writeFileSync(envPath, lines.join('\n'));
console.log(
  'converted_keys',
  lines
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => l.split('=')[0])
    .join(','),
);
