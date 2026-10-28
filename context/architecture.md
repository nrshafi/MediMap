# Architecture context

## Decision status

This document records confirmed constraints. Unanswered architecture questions remain open and do not authorize implementation choices.

## Stack

| Layer | Selected technology | Role and pending decisions |
| --- | --- | --- |
| UI | React | User-selected UI technology. |
| Application framework | TanStack Start with React | Server rendering for public service and branch pages. |
| Runtime and hosting | Cloudflare Workers | One application deployment with separate internal modules. |
| Database | Cloudflare D1 | Direct prepared SQL queries and versioned SQL migrations. No ORM selected. |
| HTTP routing | Hono if required | Optional. Decide after the application structure is selected. |
| Authentication | Google OpenID Connect through oauth4webapi | D1 accounts and hashed seven-day sessions. Owner-controlled administrator grants. |
| Mapping and routing | Pending provider research | Check Dhaka coverage, maps, geocoding, road distance, travel time, and free usage before selecting a provider. |

The package versions are recorded in `package.json` and `bun.lock`.
Verify current official documentation and installed versions before later implementation.

## Initial application setup

The first implementation is a static "Coming soon" page with React, strict TypeScript, TanStack Start, and Vite.
Use stable Bun 1.4.4 for package management, local scripts, formatting, and strict TypeScript checking.
Use `bun check --no-script` for type checking and Oxlint for linting. Bun's native linter remains canary-only in 1.4.4.
Keep the existing lint rules and exclusions in `.oxlintrc.json`.
Run Vite and Wrangler through Node. Wrangler does not support the Bun runtime.
Use `bun fmt` with the options in `bunfig.toml`.
Require a three-day minimum release age for new dependency resolution. Keep existing versions in `bun.lock`.
Use exact-version exceptions only for reviewed urgent updates. Keep Bun's default installation retry settings.
Prefer Bun native utilities for local scripts and compatible unit tests.
Use stable releases only. Do not adopt a prerelease to obtain a native utility.
Keep Bun-specific APIs out of browser and Cloudflare Workers application code.
Use supported web APIs and Workers bindings in the deployed application.
Keep route entry points in `src/routes` and the landing-page component in `src/features/landing`.
The initial setup uses React 19.3, TanStack Start 1.169.1, TanStack Router 1.170.44, and Vite 8.3.4.
Match the editor's TypeScript package to `process.versions.typescript` in the selected Bun version.
The catalog foundation adds local Workers execution through Cloudflare Vite plugin 1.49.0 and Wrangler 4.116.0.
These pinned stable releases use Miniflare 4.20260730.0. Later stable CLI releases currently depend on prerelease Miniflare.
The compatibility date is 2026-07-30, matching the selected stable workerd runtime. Review it when upgrading these packages.
Bun remains the package manager. Workers tooling can use Node when its subprocess runtime requires Node.
No remote database or deployment is part of this foundation.

## Discovery prototype

The `/discovery` route is a demonstration with sample branch listings, not a published clinical dataset.
Keep sample records in a separate fixture module. Never assign verified status, source evidence, or verification dates to these records.
Show a sample-data notice and label sample prices. Preserve unknown prices and dates as null.
Return no branch results for ambiguous, unmatched, or unconfirmed typo queries. Require explicit service selection.
Use one radius range, 0.1 to 100 km, across URL validation, domain filtering, and controls.
Show routing as unavailable until a selected provider supplies validated results. The OSRM adapter is an optional integration, not the default provider.
The SVG map is a schematic preview. Provider selection, source-backed data, D1 access, address search, and map-based location selection remain unfinished.

### Provider-independent location input

Support location presets, manual WGS 84 coordinates, and browser geolocation in the discovery demonstration.
Request browser location only after a user action. Keep the current center when permission, validation, or location acquisition fails.
Accept finite latitude from -90 to 90 and longitude from -180 to 180, consistent with URL validation.
Do not restrict coordinates to the sample dataset area. Locations without nearby sample branches use the existing empty state.
Keep the query and radius when the center changes. Clear branch selection and synchronize the center through the existing URL parameters.
Ignore late location callbacks after cancellation, another location selection, external center changes, or component removal.
Show coordinate signs correctly. Do not label southern or western coordinates as north or east.
Coordinates appear in the URL. Disclose this before location acquisition or manual submission.
Address search and selection on a geographic map depend on provider selection and remain deferred.

## System boundaries

Separate the user interface, search logic, application logic, database access, location integration, authentication, and administration.
Use one Workers application deployment. Keep public pages, administration, backend logic, database access, and integrations in separate internal modules. Organize application modules by feature. Share database access and integrations. Exact folder names remain open.
The browser must not access D1 directly or receive server secrets.
Generate binding names with `wrangler types --include-runtime false`.
Import matching Workers types selectively through `src/worker-bindings.d.ts` to avoid browser DOM conflicts.
Check application types with `tsconfig.json` and Node/Bun tooling types separately with `tsconfig.tooling.json`.

## Storage model

D1 stores relational application records for providers, branches, categories, canonical services, aliases, branch-service listings, prices, sources, reviews, and reports.
Keep original provider service names separate from canonical service names.
Keep price sources and verification information associated with branch-specific prices.
Keep collected website research in `data/catalog/`, separate from discovery fixtures and database seeds.
The extraction script in `scripts/data/` records original provider labels, row references, source URLs, retrieval times, and content hashes.
Source retrieval does not establish a provider's effective date, live appointment availability, or a canonical service mapping.
Record published site-update dates separately from tariff effective dates. Record explicit currency labels or contextual currency assignments for each source.
Retain disputed rows in a separate review export. Do not select a price from conflicting rows or interpret zero as free.
These research exports do not change the public discovery data source or establish a D1 schema.
Verified Visit evidence uploads are deferred from the required release. No evidence-storage product is selected.

### Catalog foundation

The implementation request on 27 October 2026 authorizes the local catalog slice described in the foundation proposal.
Mapping-provider selection remains open. Local catalog reads do not depend on that selection.
Use `migrations/` for ordered schema changes and `seeds/catalog.sql` for the separately reviewed initial import.
Keep repositories in `src/features/catalog/server/` and public contracts in `src/features/catalog/contracts.ts`.
The read-only `/admin/catalog` inspector exposes published catalog fields only and now requires administrator access.
General catalog read contracts remain public.
Keep its reusable layout and core navigation in separate administration modules. Accept additional navigation through an explicit prop.

Each active branch-service listing has at most one current price revision, selected by a nullable reference.
The selected revision must belong to that listing. Keep previous revisions when the current reference changes.
Future price writes must insert a revision and change the reference in one D1 batch.
Store prices as positive integer paisa. Return BDT amounts at the public read boundary.
A missing current revision returns null price, source, and verification date.
Verified revisions require an official source and an actual review timestamp. Website review does not imply provider confirmation.
Keep source-update dates, review timestamps, and unknown tariff-effective dates separate.
Do not expire prices by age. Report-related status transitions and statistics remain outside this slice.
Only active categories, services, providers, branches, and listings appear in public reads.
Read failures return an explicit error. Never substitute research exports or discovery fixtures.

The initial reviewed import maps Ad-din Moghbazar's published `CBC` to the existing `complete-blood-count` canonical ID.
The official hematology tariff lists 400 taka. Its contact page supports the branch address.
Coordinates, opening hours, telephone details, and tariff-effective dates remain null until separately verified.
The broader research export remains unpublished and requires individual mapping and currency checks.

### Catalog administration

Use `/admin/catalog/manage` for category, canonical service, and English/Bangla alias forms.
Keep validation and write repositories in `src/features/catalog/administration/`.
Check current administrator access and same-origin POST requirements before every write.
Use explicit TypeScript validation without an additional dependency.
Normalize duplicate keys with the existing search normalizer. Reserve inactive names and aliases against reuse.
Reject exact normalized collisions between canonical names and aliases. Prefix and keyword matches can remain ambiguous.
Preserve stable record IDs and alias ownership. Corrections must retain the diagnostic meaning of the service.
Create a separate service for a clinically different variant. Do not merge or delete referenced records.
Use revision checks to reject changes from outdated forms. Deactivation hides records through existing public read filters.
Migration `0004_catalog_administration.sql` adds normalized keys, revisions, alias activation, and collision constraints.
Existing stored names and aliases are ASCII. Backfill their keys with SQLite lowercase and trim operations.
New writes and reviewed seeds must supply keys from the shared Unicode normalizer.
The live Google acceptance check remains pending credentials while local administrator-write verification proceeds.

### Provider and branch administration

Use `/admin/providers` for provider and branch administration. Keep its contracts and repositories in `src/features/providers/`.
Keep provider identity separate from each physical branch. Preserve IDs and branch ownership during correction and deactivation.
Add provider contacts, branch website and alternative telephone, revisions, and normalized duplicate keys in migration `0005_provider_administration.sql`.
Keep contacts and coordinate pairs nullable. Require valid HTTP or HTTPS websites without embedded credentials.
Active branches require a selected official contact source for their own provider and administrator confirmation of the details.
New branches without that evidence remain inactive. No source snapshot, price, coordinate, or contact detail is invented.
Existing public branch reads expose typed weekly hours and nullable contact fields. Public discovery integration remains separate.
Use the same current-administrator, exact-Origin POST, bounded-form, and revision checks as catalog administration.

Weekly hours use `Asia/Dhaka`. Store seven days as null for unknown, an empty period array for closed, or validated periods.
Periods use 24-hour times. `00:00` to `24:00` means all day. Earlier closing times continue into the next day.
Opening boundaries are inclusive and closing boundaries are exclusive. Reject equal boundaries and overlapping periods, including week boundaries.
An explicitly closed day has no periods starting that day. A previous day's overnight period still applies.
Return unknown opening status when an unknown current or previous day could affect a time without a known open period.
These are usual weekly hours. Date-specific holidays and temporary-closure exceptions remain outside this unit.
Keep opening-status calculation separate from persistence and accept an explicit instant for reproducible checks.

### Price and source administration

Use `/admin/prices` for branch-service availability, standard BDT prices, retained price history, and official source snapshots.
Keep its contracts and repositories in `src/features/pricing/`. Require current administrator access and same-origin bounded POST forms.
Migration `0006_pricing_administration.sql` adds listing revisions, immutable source metadata, price notes/actors, and a guarded listing-change log.
Store source collection timestamps, actual collector references, hashes, and notes separately from website-update and price-effective dates.
Source forms record reviewed snapshot metadata. They do not fetch URLs or infer missing evidence.
Keep existing sources with unknown collectors unchanged. New writes record the authenticated actor and actual submission time separately.
Use immutable source snapshots. Corrections create a new source record.
Price corrections insert a new revision and update the current reference in one guarded D1 batch.
The change-log guard rejects outdated listing revisions and rolls back competing writes without orphan price revisions.
Keep branch/service ownership fixed. Availability corrections retain provider labels, price history, and source references.
Clear an unknown current price by setting its reference to null. Retain previous revisions and log the change.
Verified prices require their provider's official tariff, explicit currency evidence, a source row, and a fresh administrator review confirmation.
Record a confirmed review at server time. A status-only correction can retain the previous review when amount, source, row, and effective date are unchanged.
Unverified and disputed revisions cannot qualify for default statistics. Elapsed time alone never changes status.
The owner decided on 28 October 2026 that pending price reports immediately select a disputed revision and exclude it from default statistics.
Retain source and review history during that transition. Report submission and resolution operations remain later implementation units.

## Authentication and access

- Browsing, service search, and comparison are public.
- Review submission, review editing, and review reporting require an account.
- Users can edit their own reviews.
- Administrators maintain core published data and moderate reviews and reports.
- Users submit data corrections as reports. Users cannot directly overwrite published core data.
- Google sign-in is the only account method for the first version. Assign administrator access separately from ordinary sign-in.
- Use `oauth4webapi` for Google's authorization-code OpenID Connect flow, with PKCE, state, nonce, and signature validation.
- Store accounts by Google's stable subject identifier. Do not merge accounts or assign privileges by email address.
- Keep opaque application-session tokens in HttpOnly cookies and store only their SHA-256 hashes in D1.
- Store short-lived, single-use OAuth attempts in D1. Bind each attempt to a separate browser cookie.
- Keep Google access, refresh, and ID tokens out of persistent storage and browser responses.
- Put authentication code in `src/features/authentication/` and use new numbered migrations after the catalog schema.
- Keep public catalog reads and discovery accessible. Protect the administration inspector on the server.
- Require same-origin POST requests for sign-in initiation and sign-out. Validate callback state, nonce, issuer, audience, expiry, and signature.
- Accept return destinations only as validated local paths. Never trust callback-supplied account IDs or role fields.
- The owner approved seven-day absolute sessions without automatic renewal on 27 October 2026.
- Only an explicit owner-run database operation can grant administrator access. Sign-in never creates or changes a grant.
- Revoke existing sessions when a grant changes. Check current grants from D1 on every privileged request.
- No administrator account is assigned by default. Live Google verification requires an OAuth web client and local secret configuration.

## Invariants

1. Prices apply to a specific branch and canonical diagnostic service.
2. Show standard/base prices in BDT. Exclude promotional prices.
3. Keep clinically meaningful service variants distinct.
4. Reviews apply to a specific branch-service listing.
5. Allow one active review per user and branch-service listing.
6. Show price-verification status and verification dates without inventing missing values.
7. Core branch and pricing information must remain available when routing fails.
8. Map results and list results must represent the same filtered result set.
9. Enforce administrative access on the server.
10. Do not infer medical suitability from price or ratings.

## Budget constraints

Use free tiers first. Obtain explicit approval before enabling a paid service.
Cloudflare free-tier suitability must be checked against the expected workload.
Map, geocoding, and routing services require separate capability and billing checks.

## Documentation checked

Verified Bun 1.4.4 on 25 October 2026 against installed CLI help and the official [release notes](https://bun.sh/blog/bun-v1.4.4).
Checked [formatting](https://bun.com/docs/format), [installation](https://bun.com/docs/pm/cli/install), and [coverage](https://bun.com/docs/test/code-coverage).
The [linter documentation](https://bun.com/docs/lint) limits native linting to canary builds. Retain Oxlint until stable Bun supports equivalent checks.

Verified the Bun migration on 14 October 2026 against [Bun 1.4.3 release notes](https://bun.com/blog/release-notes/bun-v1.4.3) and installed CLI help.
Use release-specific documentation and installed commands to distinguish stable capabilities from unreleased documentation.

Checked on 8 October 2026. These sources establish available integration options, not final selections.

- [Cloudflare D1 overview](https://developers.cloudflare.com/d1/).
- [Cloudflare Workers static assets](https://developers.cloudflare.com/workers/static-assets/).
- [TanStack Start on Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/).
- [TanStack Router](https://tanstack.com/router/latest).
- [Hono on Workers](https://hono.dev/docs/getting-started/cloudflare-workers).
- [D1 prepared statements](https://developers.cloudflare.com/d1/worker-api/prepared-statements/).
- [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/).

## Open decisions

- Additional TanStack packages and selected package versions.
- Need for Hono within the single application deployment.
- Exact SQL repository paths and migration review rules. Use server-side repositories and versioned SQL migrations.
- Live Google OAuth client configuration and report-submission access policy.
- Mapping, geocoding, and routing provider selection.
- Rating aggregation, report-resolution restoration rules, and competing-report handling. Pending price reports immediately make prices disputed and ineligible.
- Default sorting, comparison limits, and the definition of current records.


## Location and search rules

- Use straight-line distance to determine eligibility within the selected radius.
- Label radius filtering as straight-line distance. Display road distance and estimated travel time separately.
- Prioritize exact canonical names, exact aliases, prefixes, and keywords in that order.
- Offer typo suggestions. Require user selection when a match is ambiguous.
- Do not automatically resolve an ambiguous query to a clinically different service.

## Price verification and statistics

- A price does not become stale because of elapsed time.
- Pending price reports immediately mark the current price disputed, as confirmed on 28 October 2026.
- Continue to display the actual last verification date. Do not describe an old verification date as recent.
- Default statistics use one current, verified, non-stale price per active branch-service listing within the selected area.
- Show the number of eligible branches and distinct providers.
- Require at least three eligible branches for aggregate statistics.
- Do not apply an age cutoff to statistics under the selected report-based freshness policy.
- Disputed current prices are excluded from default statistics. Resolution and competing-report rules remain open for the report workflow.

## Comparison output

- Present written comparison details in a table.
- Use numerical statistics for numerical values only.
- Do not add generated narrative comparison summaries or an external AI service for this feature.
- Retain the required comparison charts alongside the table.

