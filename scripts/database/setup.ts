// Local operations only. Both commands use the same default .wrangler/state as Vite.
for (const args of [
  ['d1', 'migrations', 'apply', 'DB', '--local'],
  ['d1', 'execute', 'DB', '--local', '--file', 'seeds/catalog.sql'],
]) {
  if (process.env.MEDIMAP_D1_STATE) args.push('--persist-to', process.env.MEDIMAP_D1_STATE);
  const child = Bun.spawn(['node', 'node_modules/wrangler/bin/wrangler.js', ...args], {
    stdin: 'ignore',
    stdout: 'inherit',
    stderr: 'inherit',
    env: {
      ...process.env,
      WRANGLER_SEND_METRICS: 'false',
      WRANGLER_LOG_PATH: '.bun-tmp/wrangler.log',
    },
  });
  const code = await child.exited;
  if (code !== 0) process.exit(code);
}

export {};
