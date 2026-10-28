import { mkdir, readdir, copyFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

if (process.argv.length > 2)
  throw new Error('This command accepts no arguments and supports local rehearsal only');
const root = resolve('.bun-tmp/release-rehearsal', crypto.randomUUID());
const source = resolve(root, 'source');
const restored = resolve(root, 'restored');
const migrations = resolve(root, 'migrations');
await mkdir(migrations, { recursive: true });
const manifest: { files: { name: string; sha256: string }[] } = await Bun.file(
  'docs/release-migrations.json',
).json();
const files = (await readdir('migrations')).filter((name) => name.endsWith('.sql')).sort();
assert.deepEqual(
  files,
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
for (const directory of [source, restored]) {
  await Bun.write(
    resolve(directory, 'wrangler.json'),
    JSON.stringify({
      name: 'medimap-release-rehearsal',
      compatibility_date: '2026-07-30',
      d1_databases: [
        {
          binding: 'DB',
          database_name: 'release-rehearsal',
          database_id: '00000000-0000-0000-0000-000000000001',
          migrations_dir: migrations,
        },
      ],
    }),
  );
}
let number = 0;
async function command(args: string[], expectFailure = false) {
  const logfile = resolve(root, `${++number}.log`);
  const output = Bun.file(logfile);
  const child = Bun.spawn(['node', 'node_modules/wrangler/bin/wrangler.js', ...args], {
    stdin: 'ignore',
    stdout: output,
    stderr: Bun.file(`${logfile}.stderr`),
    env: {
      ...process.env,
      WRANGLER_SEND_METRICS: 'false',
      WRANGLER_LOG_PATH: resolve(root, 'wrangler.log'),
    },
  });
  const code = await child.exited;
  if (expectFailure ? code === 0 : code !== 0)
    throw new Error(`Unexpected rehearsal command result ${code}. Inspect ${logfile}`);
  console.log(
    `Local rehearsal phase ${number} passed${expectFailure ? ' with the expected migration rejection' : ''}.`,
  );
}
const config = resolve(source, 'wrangler.json');
const targetConfig = resolve(restored, 'wrangler.json');
const apply = () => command(['d1', 'migrations', 'apply', 'DB', '--local', '--config', config]);
for (const file of files.slice(0, 5))
  await copyFile(`migrations/${file}`, resolve(migrations, file));
await apply();
await command([
  'd1',
  'execute',
  'DB',
  '--local',
  '--config',
  config,
  '--file',
  resolve('seeds/catalog.sql'),
]);
for (const file of files.slice(5)) await copyFile(`migrations/${file}`, resolve(migrations, file));
await apply();
await apply();
const build = await Bun.build({
  entrypoints: ['scripts/database/rehearsal-audit.ts'],
  outdir: '.bun-tmp/rehearsal-runner',
  target: 'node',
  packages: 'external',
});
if (!build.success) throw new Error(build.logs.map(String).join('\n'));
async function audit(directory: string, operation: '--seed' | '--snapshot') {
  const child = Bun.spawn(
    ['node', '.bun-tmp/rehearsal-runner/rehearsal-audit.js', directory, operation],
    { stdout: 'inherit', stderr: 'inherit' },
  );
  if (await child.exited) throw new Error('Local rehearsal audit failed');
}
await audit(source, '--seed');
await Bun.write(
  resolve(migrations, '0009_rehearsal_failure.sql'),
  "CREATE TABLE rehearsal_failed_write(id TEXT PRIMARY KEY);\nINSERT INTO rehearsal_failed_write VALUES ('must-roll-back');\nSELECT * FROM missing_rehearsal_table;\n",
);
await command(['d1', 'migrations', 'apply', 'DB', '--local', '--config', config], true);
await audit(source, '--snapshot');
const backup = resolve(root, 'backup.sql');
await command(['d1', 'export', 'DB', '--local', '--config', config, '--output', backup]);
const dataBackup = resolve(root, 'backup-data.sql');
await command([
  'd1',
  'export',
  'DB',
  '--local',
  '--config',
  config,
  '--no-schema',
  '--output',
  dataBackup,
]);
for (const file of [
  resolve(source, 'restore-schema.sql'),
  dataBackup,
  resolve(source, 'restore-triggers.sql'),
]) {
  await command(['d1', 'execute', 'DB', '--local', '--config', targetConfig, '--file', file]);
}
await audit(restored, '--snapshot');
assert.equal(
  await Bun.file(resolve(source, 'snapshot.json')).text(),
  await Bun.file(resolve(restored, 'snapshot.json')).text(),
  'Restored schema, data or catalog differs',
);
await Bun.write(
  resolve(root, 'result.json'),
  JSON.stringify(
    {
      passed: true,
      migrationCount: files.length,
      backupRestoreMatched: true,
      failedMigrationRolledBack: true,
      measurements: resolve(source, 'measurements.json'),
    },
    null,
    2,
  ) + '\n',
);
console.log(`Rehearsal passed. Retained local evidence: ${root}`);
