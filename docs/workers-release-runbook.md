# Workers release runbook

Prepared on 28 October 2026 for the implemented catalog, authentication, administration, and correction-report modules.
This runbook prepares local release checks. It does not authorize deployment or production database changes.
The public discovery route still uses labelled sample records.

## Reproduce the local foundation

Use Bun 1.4.4 and Node 22.12 or later. This rehearsal used Node 26.4.0.
Keep the installed Cloudflare Vite plugin 1.49.0, Wrangler 4.116.0, Miniflare 4.20260730.0, and compatibility date `2026-07-30` together.
No package upgrade is required for this procedure.

1. Run `bun install --frozen-lockfile`.
2. Run `bun run cf:types` after configuration changes.
3. Run `bun run db:setup` for the development database.
4. Run `bun run catalog:check`.
5. Run `bun run db:catalog:apply` for the additional reviewed subset.
6. Run `bun run db:catalog:check`.
7. Run `bun run dev` to inspect the local application.

Run `bun test`, `bun run typecheck`, `bun run lint`, and `bun run format:check`.
Run `bun run test:database` and `bun run test:browser` separately to limit simultaneous runtime memory use.
Browser regressions build the application and use local Workers preview with fresh synthetic accounts and database state.
They do not use the development database or real Google credentials.

## Bindings and environment values

| Name | Local source | Release requirement |
| --- | --- | --- |
| `DB` | D1 binding in `wrangler.jsonc` | An owner-approved real D1 database and account. The current UUID is a local placeholder. |
| `AUTH_ORIGIN` | Ignored `.dev.vars` | Exact HTTPS browser origin, without a path or trailing slash. Configure it as a non-secret Worker variable. |
| `GOOGLE_CLIENT_ID` | Ignored `.dev.vars` | Google OAuth web-client identifier for that origin. Keep runtime configuration outside browser modules. |
| `GOOGLE_CLIENT_SECRET` | Ignored `.dev.vars` | Worker secret. Never put the value in source, command arguments, logs, or this runbook. |
| `MEDIMAP_D1_STATE` | Optional local process variable | Local development/test state only. It is not a deployed binding. |
| Mapping/routing credentials | None | Provider selection remains open. Add only the bindings required by the selected provider. |

Copy `.dev.vars.example` for local authentication setup.
The exact callback is `<AUTH_ORIGIN>/auth/google/callback`.
Follow [authentication setup](authentication.md) for real login acceptance and the separate owner-controlled administrator grant.
Google sign-in never grants administrator access automatically.
No session-signing secret is required by the current opaque-token and hashed-session implementation.

The Vite plugin selects Cloudflare environments during the build.
An environment chosen only during deployment cannot retarget an existing build.
The output config at `dist/server/wrangler.json` contains the built entry point, assets, and flattened bindings.
Review the source config, then rebuild. Do not repair generated configuration manually.
The plugin can copy local `.dev.vars` into build output for preview. Treat `dist/` as private local build output.
Those local secret files are not deployed as Worker secrets automatically.

## Reviewed migration order

| Migration | Purpose |
| --- | --- |
| `0001_catalog.sql` | Catalog, providers, branches, sources, listings, prices, seed ledger |
| `0002_price_revision_integrity.sql` | Price/source integrity and immutable revisions |
| `0003_authentication.sql` | Accounts, sessions, login attempts, administrator grants |
| `0004_catalog_administration.sql` | Normalized catalog terms, revisions, collision guards |
| `0005_provider_administration.sql` | Provider/branch revisions, contacts, weekly hours |
| `0006_pricing_administration.sql` | Source snapshots and listing-change history |
| `0007_correction_reports.sql` | Signed-in reports, quotas, immediate price disputes |
| `0008_report_resolution.sql` | Immutable administrator decisions and guarded resolution transitions |

`release-migrations.json` records SHA-256 hashes of the reviewed migration text, normalized to LF.
Both release commands reject a changed migration or an unexplained migration-file set.
Keep applied files unchanged. Add the next numbered migration for a schema correction, then review its manifest entry.
The additional hospital dataset is a reviewed seed, not a schema migration.

## Local migration and recovery rehearsal

Run `bun run db:rehearse`.
The command accepts no remote target or command-line arguments.
Each invocation creates a separate directory under ignored `.bun-tmp/release-rehearsal/`.
It never opens `.wrangler/state` or the browser-test database.

The rehearsal performs these checks:

1. Verify the eight migration hashes.
2. Apply migrations `0001` through `0005` to an empty local database.
3. Apply the current foundation seed, which requires the normalized keys added by `0004` and `0005`.
4. Upgrade through `0008`, then repeat migration application to check the ledger.
5. Enter the reviewed subset and reconcile all 196 listings.
6. Reject an intentionally invalid temporary migration and confirm its table and ledger entry were rolled back.
7. Export the complete database and a separate data-only SQL backup.
8. Restore schema, data, and triggers into another empty local database, in that order.
9. Compare migration history, schema hashes, every application table's row count/data hash, and the full catalog audit.

The temporary failure migration exists only in the rehearsal directory. It is never added to `migrations/`.
The checks include `PRAGMA quick_check` and `PRAGMA foreign_key_check`.
Snapshots and measurements contain local synthetic/reviewed data only.
The command retains its SQL files, snapshots, phase logs, and `result.json` for inspection.

A direct full-dump import exposed forward table references before all tables existed in the pinned tooling.
The rehearsed restore therefore creates all tables and indexes first, imports data with deferred foreign keys, then creates triggers.
The original full dump remains available. The command does not disable retained-data constraints in the live application.
Do not import a dump over an existing application database.

## Packaging without deployment

Run `bun run release:package`.
The command verifies migration hashes, builds the application, and invokes the installed Wrangler with `deploy --dry-run`.
Its deployment arguments are fixed. It accepts no forwarding arguments.
It checks the generated `DB` binding and browser assets for known server-only identifiers and a build-time test marker.
Its local report is `.bun-tmp/release-package/report.json`.
The 28 October dry run reported a 1,378.08 KiB uncompressed Worker upload and 29 scanned browser files.
The browser files totalled 543,855 bytes; the largest was 238,579 bytes.
This marker check supplements code boundaries; it cannot prove that every possible credential is absent.

Successful packaging checks the build and upload package only.
It does not verify remote D1 identity, Google credentials, production CPU time, or request routing.
The configured placeholder remains intentional until the owner selects an authorized remote target.

## Workload and free-tier assessment

The owner has not supplied a traffic forecast. The following values are planning assumptions, not measured user traffic.
Use a 500-visit daily pilot with 100 sign-ins, 100 administrator actions, and 100 reporting actions.
Allow 4,000 dynamic requests per day, including retries and form navigation.
Budget 500 catalog-page reads, 100 unfiltered listing-page reads, and 1,000 CBC-list reads per day.
Reserve another 500,000 D1 rows read and 20,000 rows written daily for authentication, reports, and administration.
The write allowance must include indexes and trigger effects.

The rehearsal records actual D1 row metadata from the application's catalog repository on the 196-listing subset.
Local measurements do not measure production CPU time or future public query implementations.
Use the rehearsal's `measurements.json` and the calculation recorded below when changing these assumptions.

The successful 28 October rehearsal measured a 454,656-byte database and these read costs:

| Repository operation | SQL statements | Rows read | Rows written |
| --- | --- | --- | --- |
| Catalog page, limit 50 | 2 | 299 | 0 |
| Unfiltered listing page, limit 50 | 1 | 408 | 0 |
| CBC listings, limit 100 | 1 | 404 | 0 |

The assumed catalog workload reads `500 × 299 + 100 × 408 + 1,000 × 404 = 594,300` rows daily.
The additional reserve gives 1,094,300 rows daily, about 22% of the documented read allowance.
The request model uses 4% of the daily request allowance. The reserved write budget uses 20% of the daily write allowance.
These calculations cover the stated local dataset and assumptions only.

Cloudflare documentation checked on 28 October 2026 gives these Free plan limits:

| Resource | Documented limit | Acceptance condition |
| --- | --- | --- |
| Workers requests | 100,000 daily | The 4,000-request model fits. Measure actual traffic before increasing the pilot. |
| Workers CPU | 10 ms per invocation | Unverified in production. Local elapsed time is not CPU acceptance. |
| Worker memory | 128 MB | Check production runtime behavior. Host-process memory is not isolate memory. |
| Worker package | 64 MiB uncompressed | Compare the current dry-run upload size. Older compressed-size figures are not the current documented limit. |
| D1 reads | 5,000,000 rows daily | Include all queries, scans, and other applications sharing account quotas. |
| D1 writes | 100,000 rows daily | Include index and trigger writes. Monitor retained price/report growth. |
| D1 storage | 500 MB per Free database, 5 GB per account | Current local size is recorded by the rehearsal. Check growth and account usage before release. |
| D1 recovery | Seven days on Free | Capture a fresh recovery bookmark before an approved remote migration. |

These are capacity assumptions, not a guarantee of free operation.
Mapping, geocoding, road distance, and travel-time quotas remain unassessed because no provider is selected.
No paid service is enabled by these checks.

## Production migration and recovery procedure

Production operations require separate owner authorization for the exact account, database, Worker, and origin.
The following sequence is a future procedure, not a record of completed deployment.

1. Confirm the target account, database identity, plan, permissions, pending migrations, and the deployed application's compatible schema range.
2. Complete local checks and review migration hashes against the approved commit.
3. Arrange a maintenance window and stop writes before the recovery point when a migration is not backward compatible.
4. Record the current Worker version and a fresh D1 Time Travel bookmark.
5. Export the remote database to protected storage. Record the hash, target identity, timestamp, schema, and migration ledger.
6. Rehearse restore on a separately authorized empty target. Check schema, data, foreign keys, and application reads.
7. Apply reviewed migrations in order to the confirmed target. Do not apply development seeds over existing production choices without separate data review.
8. Reconcile the reviewed inventory and verify authentication, administrator restrictions, and report transitions before reopening writes.
9. If validation fails, stop writes and choose a forward correction or an explicitly approved database restore.
10. Restore compatible Worker code and database state together when required, then verify the retained records before reopening writes.

Worker rollback does not roll back D1 data.
A database restore can discard writes after its recovery point. Reconcile those writes before resuming normal service.
Time Travel requires the production D1 storage backend and the plan's available retention window.
An SQL export is a separate recovery artifact; do not assume that a Worker version contains database records.

## Integration handoff and remaining acceptance

Use [catalog reads](catalog-read-contracts.md), [authentication](authentication.md), [provider administration](provider-administration.md), and [pricing administration](pricing-administration.md).
Use the [report route](correction-report-submission.md) and [administrator resolution transitions](correction-report-resolution.md) when adding public links and trust indicators.
The [reviewed dataset](reviewed-hospital-dataset.md) has 196 listings, three branches, and 136 canonical services. Another 1,894 research listings remain held.
Unknown coordinates, hours, contacts, and effective dates remain null. This subset does not establish three eligible branches for every service.
Inject `env.DB` into server repositories per request. Keep `.server.ts` modules and account records out of browser imports.
Extend `AdminLayout.navigation` for later moderation pages. Keep the current core navigation and server authorization checks.
Public reviews, review moderation, maps, statistics, and comparison remain later integration work.

Before production acceptance, resolve these requirements:

- Authorized real D1/account configuration, HTTPS origin, and deployed secret setup.
- Live Google consent, callback, account creation, sign-out, and owner-granted administrator verification.
- Production CPU/startup measurements and observed workload, including later public queries.
- Mapping/routing provider selection, Dhaka coverage, and usage-budget verification.
- Query-string redaction for automatic observability. OAuth callback codes and user locations occur in URLs.
- Public integration and full-flow acceptance. Existing sample discovery regressions do not establish release readiness.

Application logs remain enabled. Automatic invocation logs are disabled, and enabled traces have zero sampling until URL redaction is verified.
The pinned Wrangler schema does not provide the newer query-redaction field.
Review a stable tooling upgrade or another verified redaction method before collecting automatic request traces.
Recheck observability pricing near the December release, because the current documentation announces a change on 1 December 2026.

## Local verification result

On 28 October 2026, all 295 unit/component tests and all 82 final desktop/mobile browser checks passed.
The complete D1 regression run passed 107 tests before this tooling unit. No application SQL or migration changed afterward.
The additional local migration-failure and SQL-restore rehearsal passed, including the final source/restored audit comparison.
Types, lint, formatting, deterministic catalog artifacts, local catalog reconciliation, production builds, and the fixed packaging check passed.
The development audit still reports 196 verified current listings with no issues or administrator overrides.
Remote-argument rejection checks passed. No remote resource, production migration, real administrator grant, push, or deployment occurred.
Production and live-provider requirements listed above remain open.

## Official references

- [TanStack Start on Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/).
- [Vite preview and generated deployment configuration](https://developers.cloudflare.com/workers/vite-plugin/reference/migrating-from-wrangler-dev/).
- [Vite secret handling](https://developers.cloudflare.com/workers/vite-plugin/reference/secrets/).
- [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/), [SQL checks](https://developers.cloudflare.com/d1/sql-api/sql-statements/), and [SQL export/restore](https://developers.cloudflare.com/d1/best-practices/import-export-data/).
- [D1 recovery](https://developers.cloudflare.com/d1/reference/time-travel/) and [Worker rollback limitations](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/).
- [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [D1 limits](https://developers.cloudflare.com/d1/platform/limits/), and [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/).
- [Workers traces](https://developers.cloudflare.com/workers/observability/traces/) and [observability pricing](https://developers.cloudflare.com/observability/pricing/).

This runbook uses STE-guided prose without claiming formal ASD-STE100 compliance.
