# Architecture context

## Decision status

### Public integration decisions

Public source-backed discovery uses `/find`, separate from the existing labelled `/discovery` demonstration.
Google Maps Platform is the mapping provider. The owner selected it on 11 November 2026.
Render the map with the Maps JavaScript API through `@vis.gl/react-google-maps` 1.10.2. Render it only in the browser, with `DEMO_MAP_ID`.
Use Routes API Compute Routes for driving estimates and for the driving route on `/find`. Use Places API (New) Autocomplete and Place Details for address search.
Run every Google web-service call on the server. Place the adapters in `src/integrations/mapping/google/` and the request handling in `src/features/public/catalog.functions.ts`.
Use `GOOGLE_MAPS_BROWSER_KEY` as a public Worker variable. Use `GOOGLE_MAPS_SERVER_KEY` as a Worker secret.
Missing provider configuration must retain core catalog results. A missing browser key, a rejected key, or a failed map load shows a "map unavailable" notice.
Unknown branch coordinates remain unknown and cannot qualify a branch for geographic statistics.
Review ratings use six required integer dimensions from one to five, with their arithmetic mean as the service-review score.
Public aggregates include visible reviews only. Keep one retained review per account and listing, with owner editing and immutable moderation history.
Comparison permits up to four listings for one service. Unknown sort values appear last; ties use stable listing IDs.

This document records confirmed constraints. Unanswered architecture questions remain open and do not authorize implementation choices.

### Google Maps constraints

Google's terms prohibit High Risk Activities. These are uses where failure of the services could reasonably cause death or serious personal injury. MediMap is not an emergency or ambulance tool. Keep the emergency care exclusion.
Do not show Google content with or near a non-Google map. The `/discovery` schematic preview has no Google content.
Do not store a Places response, a Routes response, a place ID, a Google address, or a route value in D1. Do not add a server cache for route or place results.
Branch coordinates come from official provider evidence or from administrator entry.
On 18 November 2026, each of the three reviewed branches received one coordinate pair from the application's Places lookup of its published official address. The branch row stores only that latitude and longitude. A later lookup does not replace a saved coordinate. An empty coordinate stays empty until an administrator enters a value.
Keep Google attribution visible. Do not cover the map attribution row.
Link the Google Maps End User Additional Terms and the Google Privacy Policy in the footer.

### Maps Demo Key

MediMap is used for demonstrations only. The owner decided this on 19 November 2026. It keeps the Maps Demo Key. There is no billing account and no production Google Maps key. Google states that the Demo Key is "intended for testing and prototyping purposes only" and "is not designed for production use".
Google publishes no numeric daily limit. At the limit, usage pauses until the next day with no risk of charges.
The browser key is visible to every visitor. A third party that uses it can exhaust the limit and pause the map for all users.
On 11 November 2026, server requests to Compute Routes, Places Autocomplete, and Place Details accepted the Demo Key. This result is recorded as Phase 0 in `docs/google-maps-integration-plan.md`. The server design is selected. The browser-side fallback is not used.
A public production launch needs a billing-enabled key first. The app must work with the map unavailable.

### Google Maps request rules

- Send keys in the `X-Goog-Api-Key` header. Never place them in a URL.
- Keep same-origin POST requests, the D1 request budget (`reserveMappingRequest`), a six-second timeout, a 65,536-byte response limit, and field validation.
- Keep the budget at four requests per second and 600 per UTC day across address and route requests. Google publishes no Demo Key limit, so these values are local ceilings.
- Do not request traffic-aware routing, intermediate waypoints, two-wheeler mode, or the Place Details `displayName` field. These options move requests to higher billing tiers.
- Start address lookup only after the user submits the address form. Do not send a request for each keystroke.
- Generate the Places session token in the browser with `crypto.randomUUID()`. The server validates its format.
- Parse the route `duration` value. Reject values that are not finite and non-negative.
- The `/find` route request (`computeRoadRoute`) adds `routes.polyline.encodedPolyline`, `routes.legs.steps.distanceMeters`, and `routes.legs.steps.navigationInstruction` to the field mask and sets `languageCode: "en"`. Without `languageCode`, Google returns Dhaka steps in Bangla. Google's Compute Routes SKU list does not name these fields as Pro or Enterprise triggers. Do not request traffic on polylines, because it is an Enterprise feature. `/compare` keeps the distance and duration field mask.
- The server decodes the polyline and validates each point, the step text, the maneuver, and the step distance. It rejects more than 5,000 points or 200 steps. The browser keeps the route only in component state.
- Show a route request only after the user selects "Show route". Do not request a route for each listing or again when the live position changes.
- Live position uses `navigator.geolocation.watchPosition` after a user action. Stop it when the user stops it, when the route clears, or when the page closes. Do not send the live position to the server or put it in the URL.
- On failure, return the unavailable result. Prices, the selected location, and the list stay unchanged.

### Map loading

- On `/find`, load the map on page load at desktop widths. On mobile, load it when the user opens the Map view.
- On `/branches/<id>`, load the map only after the user selects "Show on map".
- Server rendering produces the list, the location form, and a map placeholder. The map is a progressive enhancement inside TanStack Router `ClientOnly`.
- Set `window.gm_authFailure` in the map component so that the notice appears when Google rejects the key. Verify this callback against current Maps JavaScript API documentation before use.

### Release preparation

Keep release checks local. Use a fresh workspace directory for migration and SQL export/restore rehearsals.
Record migration hashes before rehearsal and reject changes to the reviewed migration set.
Package the built Worker with Wrangler's dry-run mode. Packaging does not establish production credentials, bindings, CPU fit, or live Google acceptance.
Keep the configured D1 placeholder until the owner supplies an authorized remote target.
Record provider dependencies and unresolved release requirements in a runbook outside `context/`.

## Stack

| Layer | Selected technology | Role and pending decisions |
| --- | --- | --- |
| UI | React | User-selected UI technology. |
| Application framework | TanStack Start with React | Server rendering for public service and branch pages. |
| Runtime and hosting | Cloudflare Workers | One application deployment with separate internal modules. |
| Database | Cloudflare D1 | Direct prepared SQL queries and versioned SQL migrations. No ORM selected. |
| HTTP routing | Hono if required | Optional. Decide after the application structure is selected. |
| Authentication | Google OpenID Connect through oauth4webapi | D1 accounts and hashed seven-day sessions. Owner-controlled administrator grants. |
| Mapping and routing | Google Maps Platform: Maps JavaScript API, Routes API, and Places API (New) | Browser map with a public key. Server-side web-service keys, user-triggered address lookup, shared request budgets, validated responses, and visible Google attribution. |
| Styling and icons | Tailwind CSS 4.3.5 with `@tailwindcss/vite`, and `lucide-react` 1.73.0 | Development dependencies. The `@theme` block in `src/styles.css` mirrors the DESIGN.md tokens. Preflight is enabled. |

The package versions are recorded in `package.json` and `bun.lock`.
Verify current official documentation and installed versions before later implementation.

## Initial application setup

The application uses React, strict TypeScript, TanStack Start, and Vite.
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
Show routing as unavailable. The OSRM adapter is removed.
The SVG map is a schematic preview with no Google content. The `/discovery` route keeps sample data and does not use address search or map-based location selection. These features apply to `/find`.

### Provider-independent location input

Support location presets, manual WGS 84 coordinates, and browser geolocation in the discovery demonstration.
Request browser location only after a user action. Keep the current center when permission, validation, or location acquisition fails.
Accept finite latitude from -90 to 90 and longitude from -180 to 180, consistent with URL validation.
Do not restrict coordinates to the sample dataset area. Locations without nearby sample branches use the existing empty state.
Keep the query and radius when the center changes. Clear branch selection and synchronize the center through the existing URL parameters.
Ignore late location callbacks after cancellation, another location selection, external center changes, or component removal.
Show coordinate signs correctly. Do not label southern or western coordinates as north or east.
Coordinates appear in the URL. Disclose this before location acquisition or manual submission.
Address search and map-based location selection apply to `/find` through Google Maps Platform. The `/discovery` route keeps preset, browser, and manual coordinate input.

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
Local catalog reads do not depend on the mapping provider.
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

### Reviewed hospital dataset

Keep reviewed publication inputs and their coverage/gap inventory in `data/catalog/`, separate from the unchanged research exports and discovery fixtures.
Use explicit source-row mappings. Preserve specimen, method, laterality, view, timing, and panel differences rather than merging similar names.
Generate an additional development seed from the reviewed inputs. Apply it explicitly after the foundation setup, with a local-only command.
Preserve existing records and later administrator choices on reruns. Reconcile expected seed records against D1 without silently replacing changed data.
Retain fresh source hashes, actual retrieval/review times, currency-label evidence, and official branch-address evidence.
The existing `explicit_taka_header` currency code covers explicit Taka/Tk price labels, including labels outside table headers.
Cross-check item-specific currency corroboration without extending it to unrelated rows from the same hospital.
Keep unsupported records in the gap inventory. No minimum branch or service count applies, and partial coverage is permitted.

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
Retain source and review history during that transition. Administrator resolution remains the next implementation unit.

### Incorrect-information report targets

Use `/report?target=listing|branch|provider&id=<stable-id>` for the standalone correction-report page.
Keep report code in `src/features/corrections/`. Public discovery links remain separate integration work.
Listing issues cover price, availability, duplicate listings, and service mapping. Branch issues cover hours, address, and telephone details.
Provider issues cover provider information and telephone details.
Read only active public targets. Retain the target identity, displayed revision, observed price reference, and submitted information for review.
Reports cannot overwrite amounts, source evidence, addresses, contacts, or mappings. Only the approved price-dispute effect can change published status.
The owner approved signed-in submission, five reports per account in a rolling 24 hours, and one pending report per account/target/issue type.
Enforce quota, duplicate, target-version, and active-account checks inside D1. Do not accept reporter identity from submitted fields.
Use one report insert with transactional trigger effects to retain the report and select a disputed price together.
Clone the current amount, source, actual review metadata, and effective date. Never apply a reporter's proposed correction to core data.
Already-disputed or unknown current prices need no additional price revision. A stale target or price reference rejects submission without partial writes.
Keep verified revisions and verified current-price selection blocked while an unresolved price report remains pending.
Keep receipts private to the submitting account. Administrator report review uses a separate protected read contract.

### Administrator correction queue

Use `/admin/reports` for protected report filters, retained submissions, current target details, and resolution history.
Read inactive targets for administrator review. Keep public reporting limited to active records.
Keep original report text and its snapshot unchanged. Store resolution evidence, actor, reason, timestamp, and reviewed target state separately.
For non-price issues, use the existing protected editors before accepting a correction. Require a changed target revision and reviewed official evidence.
Record rejection reasons and evidence without changing core data. Reject stale resolution forms and repeated decisions.
The owner approved fresh official-source review before restoring verified status, including rejection, on 28 October 2026.
Resolve price reports individually. Each reviewed known amount creates a new revision that remains disputed while any price report stays pending.
The last resolution can restore verified status only through that fresh review. Rejected price reports cannot change the current amount or effective date.
Explicit unknown outcomes retain a null current price. Rejection cannot clear a known amount or invent an amount for an unknown price.
Apply resolution history, report status, listing audit, and selected price atomically through one guarded resolution insert.

### Account administration

Use `/admin/accounts` for account administration. The code is in `src/features/administration/` (`AccountManager.tsx`, `accounts.functions.ts`, `server/accounts.server.ts`). The route needs `requireAdministrator` on the server for the read and the write.
The list shows email, sign-in methods (Google, email and password), administrator status, active status, created time and last sign-in time. It never selects a password hash, a Google subject or a session token. It pages with a cursor (`created_at.id`, 20 rows) and searches by normalized email. The search text is bound as a parameter, and `%`, `_` and the escape character match literally.
`POST /admin/accounts/write` (`account`, `action`, `reason`, `confirm`) disables or enables one account. It checks the same origin, the administrator, a reason of 20 to 1000 characters and the confirmation box. The page shows the form inside a `details` element, so the step works without JavaScript. GET returns 405.
Migration `0013_account_administration.sql` adds `account_status_changes` (account, actor, action, reason, time). One INSERT does the whole change. A guard trigger refuses a caller that is not an active administrator, refuses a self-disable, and refuses a change that does not match the current state (a stale form). An apply trigger sets `accounts.active` and, for a disable, deletes every session of the account. A failed check rolls back the statement. Update and delete triggers keep the history immutable.
A disabled account cannot start a session by password or by Google. A Google sign-in attempt of a disabled account does not change its email or last sign-in time. An administrator can disable another administrator but not themselves. The app has no screen to set a password for a user and no screen that shows a hash or a token.

## Authentication and access

- Browsing, service search, and comparison are public.
- Review submission, review editing, and review reporting require an account.
- Users can edit their own reviews.
- Administrators maintain core published data and moderate reviews and reports.
- Users submit data corrections as reports. Users cannot directly overwrite published core data.
- Accounts use Google sign-in or an email and password. Assign administrator access separately from ordinary sign-in.
- Password accounts have no email verification and no password reset by email. No email is sent. An administrator can disable an account (`accounts.active`).
- A sign-up with an email that already belongs to any account is refused. The message tells the user to sign in with the existing method. This message shows others that the email has an account. The owner accepted this on 27 November 2026.
- A Google sign-in for a new Google subject whose email belongs to another account is refused with the same message. Do not link accounts.
- This release has no sign-in rate limit. This is an open security risk (see the progress tracker).
- Use `oauth4webapi` for Google's authorization-code OpenID Connect flow, with PKCE, state, nonce, and signature validation.
- Store Google accounts by Google's stable subject identifier. `accounts.google_subject` is null for password accounts. Do not merge accounts or assign privileges by email address.
- `accounts.email_normalized` holds the email trimmed and lower-cased. A unique index on it makes the email unique across both methods. Migration `0012_password_accounts.sql` adds it, rebuilds `accounts`, and adds `password_credentials`. The migration stops with a clear message if two existing accounts share a normalized email.
- Rebuild of `accounts`: D1 enforces foreign keys. The migration sets `PRAGMA defer_foreign_keys = on`, copies the rows to a backup table, drops and recreates `accounts`, then copies the rows back. Child rows keep their ids, so the checks at commit pass. Source: https://developers.cloudflare.com/d1/sql-api/foreign-keys/
- Password hashing (`src/features/authentication/server/password.server.ts`): PBKDF2 with HMAC-SHA-256 from Web Crypto. A random 16-byte salt for each password. A 32-byte derived key. The stored string is `pbkdf2-sha256$<iterations>$<salt base64url>$<hash base64url>`. The comparison is constant-time. `verifyPassword` returns false for a malformed string and never throws.
- Iteration count: 100,000. OWASP recommends 600,000 for PBKDF2-HMAC-SHA256 (https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html). The Cloudflare Web Crypto page (https://developers.cloudflare.com/workers/runtime-apis/web-crypto/) gives no iteration limit. The workerd issue https://github.com/cloudflare/workerd/issues/1346 reports a production maximum of 100,000, with no change announced (last comment checked: 20 September 2026). The Workers limit is lower than the OWASP value, so 100,000 applies. Local workerd accepts 600,000, so a local test cannot confirm the production limit. Verify it on the first deployment. Raise the count in a new hash version when Cloudflare raises the limit.
- Hash time: about 60 ms for 100,000 iterations in local workerd (Miniflare, 27 November 2026). The Workers Free plan allows 10 ms of CPU time per request (https://developers.cloudflare.com/workers/platform/limits/). The hash does not fit the Free plan limit. Verify the CPU time on the target plan before release.
- Password rules (`src/features/authentication/passwordRules.ts`) run on the server and in the browser. The common-password list is `src/features/authentication/commonPasswords.ts` (SecLists, MIT).
- Password endpoints (`src/routes/auth.password.*.ts`, handlers in `src/features/authentication/server/passwordHttp.server.ts`). Each accepts a native form POST only. GET returns 405 with `Allow: POST`. Every response has `Cache-Control: no-store`. Each checks the same origin first. A failed check returns 403 and changes nothing.
  - `POST /auth/password/sign-up` (`email`, `password`, `confirmPassword`, `returnTo`). It creates the account, the credential and the session in one D1 batch (`AuthStore.createPasswordAccount`). The new session replaces the session in the request cookie.
  - `POST /auth/password/sign-in` (`email`, `password`, `returnTo`). An unknown email, a Google-only account and a wrong password give the same `credentials` error. Each request runs one PBKDF2 derivation. For an unknown email or a Google-only account, it verifies against `dummyPasswordHash`. This is a fixed stored hash of a discarded random password. A unit test checks that its iteration count equals `passwordIterations`. The `forbidden` error for an inactive account shows only after a correct password. The new session replaces the session in the request cookie.
  - `POST /auth/password/change` (`currentPassword`, `newPassword`, `confirmNewPassword`). It needs a session of a password account. It updates the hash only if the hash is still the one that was verified. It deletes every other session of the account and keeps the current one.
  - A failure redirects to `/sign-up`, `/sign-in` or `/account` with `?error=<code>` and, if it is not `/account`, the validated `returnTo`. The codes are in `src/features/authentication/passwordForm.ts`: `invalid_email`, `too_short`, `too_long`, `common`, `matches_email`, `mismatch`, `email_in_use`, `credentials`, `forbidden`, `current_incorrect`, `not_password_account` and `unavailable`. A password, a hash and an email never go into a URL, a log or a response body. After a sign-in or sign-up error, the user types the email again.
  - These routes do not need the Google settings. The cookie lifetime is `sessionSeconds` in `config.server.ts`.
- `normalizeEmail` in `src/features/authentication/passwordForm.ts` (trim, then `toLowerCase`) is the only function that builds `accounts.email_normalized`. Every write and lookup uses it. The migration used SQL `lower(trim())`, which changes ASCII letters only. A Google sign-in rewrites the column with the code value. So an old row with a non-ASCII capital letter is corrected at its next Google sign-in. A password account has the code value from sign-up.
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
Google Maps Platform runs on the Maps Demo Key without a billing account. This follows the demonstration-only decision of 19 November 2026.

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
- Live Google OAuth client configuration.
- Live Google Maps acceptance with the Demo Key.
- Live review-volume acceptance. Service ratings use the mean of six required dimensions; branch/provider summaries include visible reviews at active records.
- Production workload verification. Default sorting is ascending price; comparison allows two to four active listings for one service.


## Location and search rules

- Use straight-line distance to determine eligibility within the selected radius.
- The default search radius is 10 km from the Dhaka center (23.8103, 90.4125), with 1 km, 3 km, 5 km, 10 km, and custom radius options.
- Label radius filtering as straight-line distance. Display road distance and estimated travel time separately.
- Prioritize exact canonical names, exact aliases, prefixes, and keywords in that order.
- Offer typo suggestions. Require user selection when a match is ambiguous.
- Do not automatically resolve an ambiguous query to a clinically different service.

## Price verification and statistics

- A price does not become stale because of elapsed time.
- Pending price reports immediately mark the current price disputed, as confirmed on 28 October 2026.
- Continue to display the actual last verification date. Do not describe an old verification date as recent.
- Default statistics use one current, verified, non-stale price per active branch-service listing within the selected area. Price range (`minPrice`, `maxPrice`) and minimum rating (`minRating`) filters run in the browser, hide unknown prices and unreviewed listings with explicit hidden counts, and do not alter area statistics.
- Show the number of eligible branches and distinct providers.
- Require at least three eligible branches for aggregate statistics.
- Do not apply an age cutoff to statistics under the selected report-based freshness policy.
- Disputed current prices are excluded from default statistics. Freshly reviewed resolutions can restore verified status after all pending price reports close.

## Comparison output

- Present written comparison details in a table.
- Use numerical statistics for numerical values only.
- Do not add generated narrative comparison summaries or an external AI service for this feature.
- Retain the required comparison charts alongside the table.

