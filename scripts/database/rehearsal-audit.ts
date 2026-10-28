import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { Miniflare } from 'miniflare';
import type { D1Database } from '@cloudflare/workers-types';
import { readReviewedInputs, seedStatements } from '../data/reviewedCatalog';
import { auditReviewedCatalog } from './reviewed-audit';
import { CatalogRepository } from '../../src/features/catalog/server/repository.server';

const directory = resolve(process.argv[2] ?? '');
const within = relative(resolve('.bun-tmp/release-rehearsal'), directory);
if (!within || within.startsWith('..') || isAbsolute(within))
  throw new Error('Rehearsal requires a generated local directory');
const mode = process.argv[3];
if (mode !== '--seed' && mode !== '--snapshot') throw new Error('Unknown rehearsal operation');
const mf = new Miniflare({
  modules: true,
  script: 'export default {fetch(){return new Response("local rehearsal");}}',
  compatibilityDate: '2026-07-30',
  d1Persist: resolve(directory, '.wrangler/state/v3/d1'),
  d1Databases: { DB: '00000000-0000-0000-0000-000000000001' },
});
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
try {
  const db = await mf.getD1Database('DB');
  const { catalog } = await readReviewedInputs();
  if (mode === '--seed') await db.batch(seedStatements(catalog).map((sql) => db.prepare(sql)));
  const audit = await auditReviewedCatalog(db, catalog);
  assert.deepEqual(audit.issues, []);
  assert.deepEqual(audit.overrides, []);
  assert.equal(audit.verifiedCurrentListings, catalog.listings.length);
  assert.deepEqual((await db.prepare('PRAGMA foreign_key_check').all()).results, []);
  assert.equal(await db.prepare('PRAGMA quick_check').first('quick_check'), 'ok');
  assert.equal(
    await db
      .prepare("SELECT COUNT(*) AS count FROM sqlite_schema WHERE name = 'rehearsal_failed_write'")
      .first('count'),
    0,
  );
  const migrations = await db.prepare('SELECT name FROM d1_migrations ORDER BY name').all();
  const manifest: { files: { name: string; sha256: string }[] } = JSON.parse(
    await readFile('docs/release-migrations.json', 'utf8'),
  );
  assert.deepEqual(
    migrations.results.map((row) => row.name),
    manifest.files.map((file) => file.name),
  );
  const schema = await db
    .prepare(
      "SELECT type,name,tbl_name,sql FROM sqlite_schema WHERE name NOT GLOB '_cf_*' AND name NOT GLOB 'sqlite_*' ORDER BY type,name",
    )
    .all<{ type: string; name: string; tbl_name: string; sql: string }>();
  const tables: Record<string, { rows: number; sha256: string }> = {};
  const schemaStatements = [
    ...schema.results.filter((row) => row.type === 'table'),
    ...schema.results.filter((row) => row.type !== 'table' && row.type !== 'trigger'),
  ].map((row) => `${row.sql};`);
  await writeFile(resolve(directory, 'restore-schema.sql'), schemaStatements.join('\n') + '\n');
  await writeFile(
    resolve(directory, 'restore-triggers.sql'),
    schema.results
      .filter((row) => row.type === 'trigger')
      .map((row) => `${row.sql};`)
      .join('\n') + '\n',
  );
  for (const table of schema.results.filter((row) => row.type === 'table')) {
    if (!/^[a-z_][a-z0-9_]*$/.test(table.name)) throw new Error('Unexpected rehearsal table');
    const rows = await db.prepare(`SELECT * FROM "${table.name}"`).all();
    const values = rows.results.map((row) => JSON.stringify(row)).sort();
    tables[table.name] = { rows: values.length, sha256: hash(JSON.stringify(values)) };
  }
  await writeFile(
    resolve(directory, 'snapshot.json'),
    JSON.stringify({ schemaSha256: hash(JSON.stringify(schema.results)), tables, audit }, null, 2) +
      '\n',
  );
  const samples: { operation: string; queries: number; rowsRead: number; rowsWritten: number }[] =
    [];
  let current = { operation: '', queries: 0, rowsRead: 0, rowsWritten: 0 };
  function capture(results: { meta: { rows_read: number; rows_written: number } }[]) {
    for (const result of results) {
      current.queries++;
      current.rowsRead += result.meta.rows_read;
      current.rowsWritten += result.meta.rows_written;
    }
  }
  function statement(value: ReturnType<D1Database['prepare']>): ReturnType<D1Database['prepare']> {
    return new Proxy(value, {
      get(target, key) {
        if (key === 'bind') return (...values: unknown[]) => statement(target.bind(...values));
        if (key === 'all')
          return async () => {
            const result = await target.all();
            capture([result]);
            return result;
          };
        const member: unknown = Reflect.get(target, key);
        return typeof member === 'function' ? member.bind(target) : member;
      },
    });
  }
  const measured: D1Database = new Proxy(db, {
    get(target, key) {
      if (key === 'prepare') return (sql: string) => statement(target.prepare(sql));
      if (key === 'batch')
        return async (statements: ReturnType<D1Database['prepare']>[]) => {
          const results = await target.batch(statements);
          capture(results);
          return results;
        };
      const member: unknown = Reflect.get(target, key);
      return typeof member === 'function' ? member.bind(target) : member;
    },
  });
  const repository = new CatalogRepository(measured);
  for (const [operation, read] of [
    ['catalog-page-50', () => repository.listCatalog({ limit: 50 })],
    ['listing-page-50', () => repository.listBranchServices({ limit: 50 })],
    [
      'cbc-listings',
      () => repository.listBranchServices({ serviceId: 'complete-blood-count', limit: 100 }),
    ],
  ] as const) {
    current = { operation, queries: 0, rowsRead: 0, rowsWritten: 0 };
    await read();
    samples.push(current);
  }
  const size = (await db.prepare('SELECT 1').all()).meta.size_after;
  assert.ok(size > 0);
  await writeFile(
    resolve(directory, 'measurements.json'),
    JSON.stringify(
      {
        databaseBytes: size,
        samples,
        scope:
          'Local D1 metadata for actual catalog repository reads. This does not measure production Worker CPU or future public integration.',
      },
      null,
      2,
    ) + '\n',
  );
  console.log(
    JSON.stringify({
      listings: audit.verifiedCurrentListings,
      migrations: migrations.results.length,
      snapshot: resolve(directory, 'snapshot.json'),
    }),
  );
} finally {
  await mf.dispose();
}
