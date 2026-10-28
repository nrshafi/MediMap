# MediMap

MediMap is a diagnostic-service discovery and price-comparison project for Dhaka, Bangladesh.
The home page has a static "Coming soon" page. The `/discovery` route demonstrates search with unverified sample data.

Built with React, TypeScript, TanStack Start, and Vite.

## Prerequisites

Use stable [Bun](https://bun.com/docs/installation) 1.4.4, the version selected in `package.json`.
Install a supported Node.js version, at least 22.12, for the Cloudflare Vite plugin, Wrangler, and Miniflare.
Bun manages packages and scripts. Cloudflare development commands run through Node.
Application and tooling types use separate configurations to avoid browser and Bun global-type conflicts.

## Commands

| Task                                                 | Command                         |
| ---------------------------------------------------- | ------------------------------- |
| Install dependencies                                 | `bun install --frozen-lockfile` |
| Start the development server                         | `bun run dev`                   |
| Create a production build                            | `bun run build`                 |
| Check types                                          | `bun run typecheck`             |
| Run unit and component tests                         | `bun test`                      |
| Inspect unit and component coverage                  | `bun run test:coverage`         |
| Install the browser for browser tests                | `bun run test:browser:install`  |
| Run desktop and mobile browser tests                 | `bun run test:browser`          |
| Check lint rules                                     | `bun run lint`                  |
| Apply safe lint fixes                                | `bun run lint:fix`              |
| Format source, tests, root configuration, and README | `bun run format`                |
| Check formatting without changes                     | `bun run format:check`          |
| Rehearse local migrations, rollback, and SQL restore | `bun run db:rehearse`           |
| Build and check Worker packaging without deployment  | `bun run release:package`       |

Open [localhost:3000](http://localhost:3000) after starting the development server.

## Local catalog database

1. Run `bun install --frozen-lockfile`.
2. Run `bun run cf:types` to regenerate bindings after configuration changes.
3. Run `bun run db:setup` to apply migrations and import the reviewed listing.
4. Run `bun run dev`.
5. Open [the catalog inspector](http://localhost:3000/admin/catalog).

The inspector requires a server-confirmed administrator session and has no write operations.
Open `/admin/catalog/manage` for protected category, service, and English/Bangla alias administration.
See [catalog administration](docs/catalog-administration.md) for validation, correction, deactivation, and migration details.
Open `/admin/providers` for provider and branch contacts, coordinates, and weekly opening hours.
See [provider administration](docs/provider-administration.md) for source requirements and the updated branch read contract.
Open `/admin/prices` for branch-service availability, standard BDT price revisions, and official source records.
See [pricing administration](docs/pricing-administration.md) for evidence, retained history, and revision checks.
Open `/report?target=listing&id=<listing-id>` for incorrect-information submission.
Signed-in accounts can submit five reports per rolling 24 hours, with one pending report per target and issue.
Price reports immediately mark the current price disputed. See [report submission](docs/correction-report-submission.md) for all target parameters and failure states.
Open `/admin/reports` for the protected report queue and evidence-based decisions.
See [report resolution](docs/correction-report-resolution.md) for price restoration, competing reports, retained history, and native form behavior.
The initial import contains Ad-din Moghbazar's CBC listing at BDT 400, supported by official tariff and contact pages.
Run `bun run catalog:check`, then `bun run db:catalog:apply` to add the separately reviewed 196-listing dataset.
Run `bun run db:catalog:check` to reconcile its three hospital branches and retained source evidence.
See [reviewed hospital data](docs/reviewed-hospital-dataset.md) for mappings, held records, local entry, and regeneration.
See [the catalog contracts](docs/catalog-read-contracts.md) for evidence, stable IDs, price rules, and read operations.
The broader research export stays separate. Public discovery continues to use labeled sample records.

`bun run db:migrate` and `bun run db:seed` run each setup step separately with `--local`.
The seed preserves existing rows and later current-price selections on reruns. It does not reset the database.
Keep migration files unchanged after application. Add another numbered migration for each schema change.

The Vite plugin and Wrangler share local persistence in `.wrangler/state`.
The configured database ID is a local placeholder. Remote provisioning and deployment require separate configuration and approval.
Keep secrets in ignored `.dev.vars` or `.env` files. Do not store credentials in `wrangler.jsonc`.

Run `bun run test:database` for isolated, real workerd/D1 integration tests. The tests do not use the development database.
Database suites run sequentially to limit peak runtime memory use.
Browser tests apply local migrations, seed data, and synthetic sessions, then build and preview the application in local Workers.
Each run uses fresh state under `.bun-tmp/browser-d1-state/`, with synthetic accounts and sessions outside the development database.
Cloudflare tooling can access its user-level development registry and retrieve development request metadata at startup.

The project pins Cloudflare Vite plugin 1.49.0, Wrangler 4.116.0, and Miniflare 4.20260730.0.
These releases use stable Miniflare. The compatibility date matches their workerd runtime, 30 July 2026.
Review runtime changes and update the compatibility date when upgrading this toolchain.

## Google sign-in

See the [Workers release runbook](docs/workers-release-runbook.md) for migration order, backup/recovery, bindings, workload assumptions, and remaining release requirements.

Open `/sign-in` or `/account` for Google account access. Public discovery does not require sign-in.
Follow [authentication setup](docs/authentication.md) to configure the OAuth web client and local secrets.
Copy `.dev.vars.example` to `.dev.vars` and provide `AUTH_ORIGIN`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET`.
The Google callback is `/auth/google/callback` on that exact origin.
The sign-in button stays disabled until configuration is available.

Sessions last seven days without automatic renewal. Google sign-in never grants administrator access.
The setup document includes the separate owner-run grant procedure and server contracts for later features.
Real Google login verification remains pending until OAuth credentials are configured.

Browser tests use Playwright Test 1.64.1 and Chromium. The test command starts a separate local server on port 3100.
Browser downloads stay in `.bun-cache/playwright`. Test traces and screenshots stay in `.bun-tmp/playwright-results`.
Happy DOM tests verify component behavior. Browser tests verify selected navigation, keyboard, and layout behavior.
These tests do not verify provider data or establish full accessibility conformance.

## Development tools

Bun provides type checking, formatting, and unit-test coverage. TypeScript 7.0.2 matches the selected Bun version for editor support.
Oxlint remains necessary because [Bun's native linter](https://bun.com/docs/lint) is canary-only in Bun 1.4.4.

Formatting uses two spaces, semicolons, single quotes, and a 100-character print width. Import sorting is disabled.
The formatter excludes generated routes, generated Worker bindings, and agent configuration directories. Review context documents separately.
Coverage remains optional and has no percentage threshold. The coverage command prints a text report without creating coverage files.

New dependency resolution requires a minimum release age of three days through `bunfig.toml`.
Existing versions in `bun.lock` remain unchanged. Use exact-version exceptions only for reviewed urgent updates.
Keep `bun install --frozen-lockfile` for reproducible installs. Bun's default request retries need no additional configuration.
