import { readdir, readFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

if (process.argv.length > 2) throw new Error('This command accepts no deployment arguments');
const manifest: { files: { name: string; sha256: string }[] } = await Bun.file(
  'docs/release-migrations.json',
).json();
assert.deepEqual(
  (await readdir('migrations')).filter((name) => name.endsWith('.sql')).sort(),
  manifest.files.map((file) => file.name),
);
for (const file of manifest.files) {
  const text = (await readFile(`migrations/${file.name}`, 'utf8')).replaceAll('\r\n', '\n');
  assert.equal(
    createHash('sha256').update(text).digest('hex'),
    file.sha256,
    `Changed reviewed migration: ${file.name}`,
  );
}
await mkdir('.bun-tmp/release-package', { recursive: true });
for (const args of [
  ['node', 'node_modules/vite/bin/vite.js', 'build'],
  [
    'node',
    'node_modules/wrangler/bin/wrangler.js',
    'deploy',
    '--dry-run',
    '--config',
    'dist/server/wrangler.json',
    '--outdir',
    '.bun-tmp/release-package',
  ],
]) {
  const child = Bun.spawn(args, {
    stdin: 'ignore',
    stdout: 'inherit',
    stderr: 'inherit',
    env: {
      ...process.env,
      GOOGLE_CLIENT_SECRET: 'medimap-release-check-not-a-real-secret',
      WRANGLER_SEND_METRICS: 'false',
      WRANGLER_LOG_PATH: '.bun-tmp/wrangler.log',
    },
  });
  if (await child.exited) throw new Error('Local release packaging failed');
}
const generated: unknown = await Bun.file('dist/server/wrangler.json').json();
if (
  typeof generated !== 'object' ||
  generated === null ||
  !Array.isArray(Reflect.get(generated, 'd1_databases'))
)
  throw new Error('Missing generated D1 configuration');
const databases: unknown[] = Reflect.get(generated, 'd1_databases');
assert.equal(databases.length, 1);
const database = databases[0];
if (typeof database !== 'object' || database === null || Reflect.get(database, 'binding') !== 'DB')
  throw new Error('Unexpected generated D1 binding');
const databaseId: unknown = Reflect.get(database, 'database_id');
if (typeof databaseId !== 'string' || !/^[a-f0-9-]{36}$/.test(databaseId))
  throw new Error('Missing explicit D1 identity in the package');
assert.deepEqual(Reflect.get(generated, 'observability'), {
  enabled: true,
  logs: { enabled: true, invocation_logs: false, head_sampling_rate: 1 },
  traces: { enabled: true, head_sampling_rate: 0 },
});
const forbidden =
  /GOOGLE_CLIENT_SECRET|GOOGLE_CLIENT_ID|AUTH_ORIGIN|medimap-release-check-not-a-real-secret|INSERT INTO auth_sessions|UPDATE correction_reports SET|report_resolutions|google_subject/;
let files = 0;
let totalBytes = 0;
let largestFileBytes = 0;
async function inspect(directory: string) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await inspect(path);
    else {
      const contents = await readFile(path);
      files++;
      totalBytes += contents.length;
      largestFileBytes = Math.max(largestFileBytes, contents.length);
      if (forbidden.test(contents.toString('utf8')))
        throw new Error(`Server-only marker in browser asset: ${entry.name}`);
    }
  }
}
await inspect('dist/client');
const report = {
  packagedLocally: true,
  deployed: false,
  migrationCount: manifest.files.length,
  clientAssets: { files, totalBytes, largestFileBytes, serverMarkersAbsent: true },
  remoteDatabaseIdentifierProvided: databaseId !== '00000000-0000-0000-0000-000000000001',
  remoteIdentityVerified: false,
  remainingAcceptance: [
    'Authorized remote D1/account and HTTPS origin',
    'Google OAuth credentials and live login acceptance',
    'Production CPU/startup and observed workload',
    'Mapping/routing provider selection and public integration',
    'Automatic request observability query-string redaction',
  ],
};
await Bun.write('.bun-tmp/release-package/report.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
