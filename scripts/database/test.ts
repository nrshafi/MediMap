// Bundle project TypeScript for Node; Miniflare runs the actual workerd D1 implementation.
const build = await Bun.build({
  entrypoints: [
    'tests/catalog/catalog.integration.ts',
    'tests/auth/auth.integration.ts',
    'tests/catalog/administration.integration.ts',
    'tests/catalog/providers.integration.ts',
  ],
  root: 'tests',
  outdir: '.bun-tmp/catalog-tests',
  target: 'node',
  packages: 'external',
});
if (!build.success) {
  for (const log of build.logs) console.error(log);
  process.exit(1);
}
const child = Bun.spawn(
  [
    'node',
    '--test',
    '.bun-tmp/catalog-tests/catalog/catalog.integration.js',
    '.bun-tmp/catalog-tests/auth/auth.integration.js',
    '.bun-tmp/catalog-tests/catalog/administration.integration.js',
    '.bun-tmp/catalog-tests/catalog/providers.integration.js',
  ],
  {
    stdout: 'inherit',
    stderr: 'inherit',
  },
);
process.exit(await child.exited);
