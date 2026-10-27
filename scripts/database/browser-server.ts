const setup = Bun.spawn([process.execPath, 'run', 'scripts/database/setup.ts'], {
  stdin: 'ignore',
  stdout: 'inherit',
  stderr: 'inherit',
});
const setupCode = await setup.exited;
if (setupCode !== 0) process.exit(setupCode);
const server = Bun.spawn(
  [
    'node',
    'node_modules/vite/bin/vite.js',
    '--host',
    '127.0.0.1',
    '--port',
    '3100',
    '--strictPort',
  ],
  {
    stdout: 'inherit',
    stderr: 'inherit',
    env: {
      ...process.env,
      WRANGLER_LOG_PATH: '.bun-tmp/wrangler.log',
      WRANGLER_SEND_METRICS: 'false',
    },
  },
);
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => server.kill(signal));
process.exit(await server.exited);
