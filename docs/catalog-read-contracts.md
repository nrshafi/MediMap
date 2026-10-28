# Catalog read contracts

The local catalog foundation exposes public records through server-only prepared D1 queries.
General catalog reads remain public. The read-only inspector at `/admin/catalog` now requires server-confirmed administrator access.
See [authentication contracts](authentication.md) for Google sign-in, sessions, and the owner-controlled grant procedure.
Category, service, and alias writes use the separate [catalog administration contract](catalog-administration.md).
The inspector's GET form also works before JavaScript hydration.

## Initial reviewed import

| Record | Stable ID |
| --- | --- |
| Category | `hematology` |
| Canonical service | `complete-blood-count` |
| English alias | `complete-blood-count-cbc-en` |
| Provider | `addin-medical-college-hospital` |
| Branch | `addin-moghbazar` |
| Branch-service listing | `addin-moghbazar-complete-blood-count` |
| Current price revision | `addin-moghbazar-cbc-20261027` |
| Tariff source snapshot | `addin-hematology-20261027` |
| Contact source snapshot | `addin-contact-20261027` |

The existing discovery catalog already maps CBC to `complete-blood-count`. This import preserves that canonical ID.
The [official hematology tariff](https://awmch.addinhospital.org/hematology-service-charge) lists CBC at 400 taka, row 1.
The tariff header explicitly identifies taka. The page reports an update date of 23 February 2026.
The [official contact page](https://awmch.addinhospital.org/contact/) supports the address, 2 Bara Maghbazar, Dhaka 1217.

The stored source hashes and retrieval timestamps match the research export collected on 27 October 2026.
The implementation review rechecked the CBC mapping, amount, currency header, and branch evidence on that date.
The review timestamp is `2026-10-27T11:20:41Z`. It is separate from source retrieval and source-update dates.
Website review does not establish telephone confirmation, appointment availability, or a provider-confirmed effective date.
Coordinates, opening hours, telephone details, and the tariff-effective date remain null in this import.
The remaining research rows require individual canonical mapping, currency checks, and review before import.

## Storage and price selection

`0001_catalog.sql` creates categories, services, aliases, providers, sources, branches, listings, prices, and the seed-import ledger.
`0002_price_revision_integrity.sql` requires official tariff evidence for verified prices and makes price revisions immutable.
Foreign keys protect relationships. A unique constraint permits one listing for each branch and canonical-service pair.
Exact normalized canonical names and aliases are unique in the stored catalog, including inactive records.
Prefix and keyword matches can still return multiple services. Resolution must preserve that ambiguity.

Store positive integer paisa in `prices.amount_minor`. The public price includes `amountMinor` and `amountBdt`.
A listing selects at most one current revision through `current_price_id`. A composite foreign key requires the same listing ID.
Insert a new revision and update the current reference in one D1 batch. Previous revisions remain available.
A null reference means unknown price. The read returns null for the complete price object, including source and verification metadata.
An unverified revision can have null source and verification fields. A verified revision requires official source and review evidence.
Disputed revisions retain their history. The report workflow will define when to select a disputed revision.
Prices do not expire by age. No statistics calculation or report-related eligibility transition is part of this slice.

`seeds/catalog.sql` is a reviewed, repeatable local import. It does not overwrite existing records or reset later price selections.
Research exports and demonstration fixtures are never fallback data sources.

## Public reads

Import `CatalogRepository` from `src/features/catalog/server/repository.server.ts` in server code only.
Inject the generated `env.DB` binding per request. Do not cache request bindings in module state.
Public types are in `src/features/catalog/contracts.ts` and contain no credentials or private account records.

| Repository operation | Validated input | Result |
| --- | --- | --- |
| `listCatalog` | Optional `after` and `limit` | `Page<Service>` with category and English/Bangla aliases |
| `getService` | Canonical service ID | `Service` or null |
| `getBranch` | Branch ID | `Branch` or null, with contact, hours, nullable coordinates, and contact source |
| `listBranchServices` | Optional `serviceId`, `branchId`, `after`, `limit` | `Page<BranchService>` with current price and evidence |
| `getBranchService` | Listing ID | `BranchService` or null |

IDs contain lowercase letters, digits, and single hyphen separators, with a maximum of 120 characters.
Page limits range from 1 to 100 and default to 50. `nextCursor` is null on the last page.
Pass a returned cursor as `after` to continue in stable ID order.
Each read excludes inactive records and inactive ancestors. Missing active records return null or an empty page.
Service reads include active aliases only. Deactivation preserves stored aliases and their original service IDs.
The repository validates stored values before returning public contracts.
Branch reads now include provider contacts, branch website, alternative telephone, and typed `WeeklyHours | null` schedules.
See [provider administration](provider-administration.md) for the Dhaka-time, overnight, unknown-day, and deactivation contracts.

`readCatalog` in `catalog.functions.ts` exposes GET reads using a validated `kind` request.
Use `catalog`, `service`, `branch`, `listing`, or `listings` as `kind`.
Detail requests supply `id`. Page requests supply an optional `query` object with the fields above.
Success returns `ok: true`, `kind`, and `data`. Failures return `ok: false`, a code, and a public message.
Invalid input returns `invalid_request`. Database and invalid stored-data failures return `unavailable` without SQL details.
The inspector uses `inspectCatalog` to combine the service selector, selected service, and listing page.

## Administration extension

`AdminLayout` accepts `activeHref`, `children`, and an optional array of `{ href, label }` navigation entries.
The core catalog entry stays in `navigation.ts`. Later review administration supplies its own extension entries.
This layout provides no authorization. Privileged pages must call the shared server checks before private reads or writes.

## Verification and documentation

`bun run test:database` bundles the integration tests for Node and runs actual Miniflare/workerd D1.
It applies all migrations to an empty isolated database and tests constraints, history, rollback, validation, pagination, missing values, and failures.
`bun run test:browser` checks the inspector and existing discovery flows at desktop and 375 px mobile widths.

Checked official APIs and installed package definitions on 27 October 2026:

- [TanStack Start on Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/).
- [TanStack server functions](https://tanstack.com/start/latest/docs/framework/react/guide/server-functions).
- [D1 prepared statements](https://developers.cloudflare.com/d1/worker-api/prepared-statements/).
- [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/).
- [D1 foreign keys](https://developers.cloudflare.com/d1/sql-api/foreign-keys/).
- [Miniflare D1 bindings](https://developers.cloudflare.com/workers/testing/miniflare/storage/d1/).
- [Worker TypeScript types](https://developers.cloudflare.com/workers/languages/typescript/) and [selective type imports](https://blog.cloudflare.com/improving-workers-types/).

This document uses STE-guided prose. It does not claim formal ASD-STE100 compliance.
