// Local operations only. Every step uses the same default .wrangler/state as Vite.
// `--seed-only` skips the reviewed catalog. The browser tests use it to keep a one-listing database.
const seedOnly = process.argv.includes('--seed-only');
const env = {
  ...process.env,
  WRANGLER_SEND_METRICS: 'false',
  WRANGLER_LOG_PATH: '.bun-tmp/wrangler.log',
};
for (const args of [
  ['d1', 'migrations', 'apply', 'DB', '--local'],
  ['d1', 'execute', 'DB', '--local', '--file', 'seeds/catalog.sql'],
]) {
  if (process.env.MEDIMAP_D1_STATE) args.push('--persist-to', process.env.MEDIMAP_D1_STATE);
  const child = Bun.spawn(['node', 'node_modules/wrangler/bin/wrangler.js', ...args], {
    stdin: 'ignore',
    stdout: 'inherit',
    stderr: 'inherit',
    env,
  });
  const code = await child.exited;
  if (code !== 0) process.exit(code);
}
if (!seedOnly) {
  const child = Bun.spawn([process.execPath, 'scripts/database/reviewed-catalog.ts', '--apply'], {
    stdin: 'ignore',
    stdout: 'inherit',
    stderr: 'inherit',
    env,
  });
  const code = await child.exited;
  if (code !== 0) process.exit(code);
}

export {};
