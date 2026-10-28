const configuration: unknown = Bun.JSON5.parse(await Bun.file('wrangler.jsonc').text());
if (typeof configuration !== 'object' || configuration === null)
  throw new Error('Invalid local Worker configuration');
const databases: unknown = Reflect.get(configuration, 'd1_databases');
if (!Array.isArray(databases)) throw new Error('Missing local D1 binding');
const binding: unknown = databases.find(
  (item: unknown) =>
    typeof item === 'object' && item !== null && Reflect.get(item, 'binding') === 'DB',
);
if (
  typeof binding !== 'object' ||
  binding === null ||
  typeof Reflect.get(binding, 'database_id') !== 'string'
)
  throw new Error('Missing local D1 identity');
const operation = process.argv[2];
if (operation !== '--apply' && operation !== '--check')
  throw new Error('Use --apply or --check. Remote operations are not supported.');
const build = await Bun.build({
  entrypoints: ['scripts/database/reviewed-local.ts'],
  outdir: '.bun-tmp/reviewed-local',
  target: 'node',
  packages: 'external',
});
if (!build.success) {
  for (const log of build.logs) console.error(log);
  process.exit(1);
}
const child = Bun.spawn(['node', '.bun-tmp/reviewed-local/reviewed-local.js', operation], {
  stdout: 'inherit',
  stderr: 'inherit',
  env: { ...process.env, MEDIMAP_LOCAL_D1_ID: Reflect.get(binding, 'database_id') },
});
process.exit(await child.exited);
