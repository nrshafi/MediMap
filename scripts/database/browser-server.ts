import { resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';

const configDirectory = resolve('.bun-tmp/browser-config');
await mkdir(configDirectory, { recursive: true });
const parsed: unknown = Bun.JSON5.parse(await Bun.file('wrangler.jsonc').text());
if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
  throw new Error('Invalid Worker configuration');
const browserConfig = resolve(configDirectory, 'wrangler.json');
await Bun.write(
  browserConfig,
  JSON.stringify({
    ...Object.fromEntries(Object.entries(parsed)),
  }),
);
// The browser runtime loads only these test settings, even after real local OAuth credentials exist.
await Bun.write(
  resolve(configDirectory, '.dev.vars'),
  'AUTH_ORIGIN="http://127.0.0.1:3100"\nGOOGLE_CLIENT_ID=""\nGOOGLE_CLIENT_SECRET=""\n',
);

const browserEnvironment = {
  ...process.env,
  MEDIMAP_D1_STATE: resolve('.bun-tmp/browser-d1-state'),
  CLOUDFLARE_VITE_WRANGLER_CONFIG_PATH: browserConfig,
};
const setup = Bun.spawn([process.execPath, 'run', 'scripts/database/setup.ts'], {
  stdin: 'ignore',
  stdout: 'inherit',
  stderr: 'inherit',
  env: browserEnvironment,
});
const setupCode = await setup.exited;
if (setupCode !== 0) process.exit(setupCode);
const fixtureBuild = await Bun.build({
  entrypoints: ['tests/auth/browser-session.fixture.ts'],
  outdir: '.bun-tmp/auth-browser',
  target: 'node',
  packages: 'external',
});
if (!fixtureBuild.success) {
  console.error(fixtureBuild.logs);
  process.exit(1);
}
const fixture = Bun.spawn(['node', '.bun-tmp/auth-browser/browser-session.fixture.js'], {
  stdout: 'inherit',
  stderr: 'inherit',
  env: browserEnvironment,
});
const fixtureCode = await fixture.exited;
if (fixtureCode !== 0) process.exit(fixtureCode);
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
      ...browserEnvironment,
      WRANGLER_LOG_PATH: '.bun-tmp/wrangler.log',
      WRANGLER_SEND_METRICS: 'false',
    },
  },
);
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => server.kill(signal));
process.exit(await server.exited);
