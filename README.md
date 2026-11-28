# MediMap

MediMap is a diagnostic-service discovery and price-comparison project for Dhaka, Bangladesh.
The home page shows popular services and hospitals from the reviewed catalog. `/find` searches that catalog. The `/discovery` route demonstrates search with unverified sample data.

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
| Run real workerd and D1 integration tests            | `bun run test:database`         |
| Reconcile the reviewed catalog with the file         | `bun run catalog:check`         |
| Reconcile the reviewed catalog with the local D1     | `bun run db:catalog:check`      |
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
3. Run `bun run db:setup` to apply migrations, import the initial listing and apply the reviewed 217-listing dataset with branch coordinates.
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
`bun run db:setup` also adds the separately reviewed 217-listing dataset. To apply it again, run `bun run catalog:check`, then `bun run db:catalog:apply`.
Run `bun run db:catalog:check` to reconcile its five hospital branches and retained source evidence.
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

## Sign-in and accounts

See the [Workers release runbook](docs/workers-release-runbook.md) for migration order, backup/recovery, bindings, workload assumptions, and remaining release requirements.

Open `/sign-in` or `/account` for account access. Public discovery does not require sign-in.
Two sign-in methods exist. Use Google, or use an email and a password. Create a password account at `/sign-up`.
A password needs 10 to 128 characters. It must not be on the common-password list or equal the email. MediMap sends no email, so there is no email check and no password reset. A signed-in password user can change the password on `/account`.
Password sign-in needs no extra secret or setting. Only Google sign-in needs `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
This release has no sign-in rate limit. See [the security review](docs/security-review.md).
Follow [authentication setup](docs/authentication.md) to configure the OAuth web client and local secrets.
Copy `.dev.vars.example` to `.dev.vars` and provide `AUTH_ORIGIN`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET`. `AUTH_ORIGIN` is also the origin check for the password forms.
The Google callback is `/auth/google/callback` on that exact origin.
The sign-in button stays disabled until configuration is available.

Sessions last seven days without automatic renewal. Neither sign-in method grants administrator access.
An administrator opens `/admin/accounts` to search accounts by email, then disables or enables an account with a reason. Disabling deletes every session of the account. An administrator cannot disable their own account. Each change stays in `account_status_changes`.
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

## Public application

Open `/find` for the source-backed catalog. Select two to four listings for one service to compare them.
Public service and branch pages retain source links and explicit unknown values.
Signed-in users can submit and edit service reviews. Administrators can review abuse reports at `/admin/reviews`.

Apply local migrations with `bun run db:setup`.

Google Maps uses two keys. During development, set both in ignored `.dev.vars` to the same Maps Demo Key.

- `GOOGLE_MAPS_BROWSER_KEY` is a Worker variable for the browser map. It is public by design.
- `GOOGLE_MAPS_SERVER_KEY` is a Worker secret for address search and driving estimates.

MediMap is for demonstrations only, so the deployed demo keeps the Maps Demo Key and has no billing account. Google states that the Demo Key is for testing and prototyping only. A public production launch needs a billing-enabled key first. Without `GOOGLE_MAPS_BROWSER_KEY`, the map shows an unavailable notice. Without `GOOGLE_MAPS_SERVER_KEY`, address search and driving estimates are unavailable. Prices and lists still work.
Deploy the browser key as a Worker variable and the server key as a Worker secret.
See [public integration](docs/public-integration.md) for contracts and [the verification checklist](docs/public-release-checklist.md) for results and remaining acceptance.
