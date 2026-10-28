import { readFile, writeFile } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { Miniflare } from 'miniflare';
import { readReviewedInputs, seedStatements, seedFile } from '../data/reviewedCatalog';
import { auditReviewedCatalog } from './reviewed-audit';

const state = resolve(process.env.MEDIMAP_D1_STATE ?? '.wrangler/state');
const inside = relative(resolve('.'), state);
if (!inside || inside.startsWith('..') || isAbsolute(inside))
  throw new Error('Reviewed catalog operations require a local workspace state directory');
const id = process.env.MEDIMAP_LOCAL_D1_ID;
if (!id || !/^[a-f0-9-]{36}$/.test(id)) throw new Error('Missing local D1 identity');
const { catalog } = await readReviewedInputs();
if ((await readFile('seeds/reviewed-catalog.sql', 'utf8')) !== seedFile(catalog))
  throw new Error('Reviewed seed is stale. Run catalog:check first.');
const mf = new Miniflare({
  modules: true,
  script: 'export default {fetch(){return new Response("local catalog setup");}}',
  compatibilityDate: '2026-07-30',
  d1Persist: resolve(state, 'v3/d1'),
  d1Databases: { DB: id },
});
try {
  const db = await mf.getD1Database('DB');
  if (process.argv.includes('--apply')) {
    const before = await auditReviewedCatalog(db, catalog);
    if (before.issues.some((issue) => issue.kind === 'conflict'))
      throw new Error(
        `Resolve local catalog conflicts before entry: ${JSON.stringify(before.issues.filter((issue) => issue.kind === 'conflict'))}`,
      );
    await db.batch(seedStatements(catalog).map((sql) => db.prepare(sql)));
  }
  const audit = await auditReviewedCatalog(db, catalog);
  await writeFile('.bun-tmp/reviewed-catalog-audit.json', JSON.stringify(audit, null, 2) + '\n');
  console.log(
    JSON.stringify(
      {
        ...audit,
        issues: audit.issues.slice(0, 10),
        overrides: audit.overrides.slice(0, 10),
        issueCount: audit.issues.length,
        overrideCount: audit.overrides.length,
        fullAudit: '.bun-tmp/reviewed-catalog-audit.json',
      },
      null,
      2,
    ),
  );
  if (audit.issues.length) process.exitCode = 1;
} finally {
  await mf.dispose();
}
