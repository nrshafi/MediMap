# Branch prices and source evidence

Use `/admin/prices` to maintain branch-service availability, standard BDT prices, and official source records.
Select a provider to create sources or branch-service listings. Select a listing to correct availability or its current price.
Every administration read and write requires current server-confirmed administrator access.

## Local setup

1. Run `bun run db:setup` to apply all six numbered migrations and the reviewed seed.
2. Complete the [Google and administrator setup](authentication.md).
3. Open `/admin/prices`.

Real Google acceptance still requires OAuth credentials. Synthetic browser accounts and price records stay in isolated test databases.
Public discovery retains its existing demonstration data until the public integration phase.

## Source records

Source forms record immutable metadata for an official tariff or contact-page snapshot.
Provide the provider, official HTTPS URL, actual UTC collection timestamp, snapshot SHA-256, and actual collector reference.
Website-update dates and notes are optional. Explicit taka evidence is required before a tariff can support verified prices.
Contact sources do not require currency evidence.

The application records the authenticated recorder and submission time separately from the supplied collection details.
The application does not fetch, hash, or archive a page from its URL. Keep the original collected content outside this form.
A URL or checksum alone does not establish price accuracy. The administrator must review the source and confirm the supplied metadata.
Do not infer collection or update dates from filenames, URLs, or submission time.
Unknown historical collectors remain null. The initial reviewed source records are not assigned invented collectors or submission dates.

Source records cannot be edited or deleted. Create another source record when evidence changes or metadata needs correction.
Duplicate provider/URL/collection-time/hash/kind snapshots are rejected.
The source ID can then support branch contact administration or price revisions for that provider.
Another provider's source or a contact page cannot support a price revision.

Collector references, recorder identifiers, and administration notes remain in protected administration reads.
The public source contract continues to expose the source ID, URL, kind, collection timestamp, and website-update date.

## Branch-service listings

Each listing connects one branch and one canonical diagnostic service. The pair is unique, including inactive listings.
Keep the original provider service label separate from the canonical name.
Confirm that the label refers to the selected diagnostic service and variant before creating or correcting a listing.
The application does not infer clinical equivalence or merge variants.

Listing IDs, branch ownership, and canonical service ownership remain fixed.
Availability changes retain source references, previous labels in the change log, and price revisions.
Inactive listings and inactive parent records remain excluded from public reads.
A newly created listing has an unknown current price until a price revision is selected.

## Standard BDT prices

Enter a positive BDT amount with at most two decimal places. The server converts the decimal string into integer paisa without rounding.
`400.01` becomes `40001` paisa. Zero, negative values, exponent notation, separators, and excess decimal places are rejected.
The maximum stored amount is `9007199254740991` paisa. `amountMinor` remains the authoritative exact public value.
Confirm that the amount is a standard base price. Promotional and discounted prices are outside the selected price scope.

Price status can be `unverified`, `verified`, or `disputed`.
A verified price requires the same provider's official tariff, explicit taka evidence, a positive source row, and current review confirmation.
The server records confirmed website review at submission time. It does not substitute the source collection or website-update date.
Tariff-effective dates remain null when unknown. Future effective dates are rejected for current-price writes.

An unverified price can retain unknown source and review metadata.
If a non-verified revision retains the same amount, source, row, and effective date, it can retain the previous actual website-review timestamp.
A changed amount or evidence does not inherit that review. A new confirmation records a new review timestamp.
Previous price rows and their notes, sources, actors, and review metadata remain immutable.

To make the current price unknown, use the separate confirmed clear operation.
It sets the current reference to null without inserting a zero price or deleting history.
Public reads return null for the complete current-price object, including source and verification metadata.
Rejected or incomplete price input never clears the previous current price.

## Revision and concurrency rules

Every listing form carries the displayed listing revision.
Before a correction, a guarded change-log insert checks that revision inside the D1 batch.
The batch retains the prior provider label, active state, current-price reference, actor, action, and time.
It then inserts a price revision when needed, changes the current reference or availability, and advances the listing revision.
An outdated or competing request aborts the complete batch. It cannot leave an orphan price revision or partial change-log entry.

Price history and source pages use stable ID cursors, with at most 50 records per page.
Price-history pagination is ordered by ID. Each record shows its own creation and review timestamps.
Selected current sources remain available even when they fall outside the current source page.

## Public reads and statistics handoff

`CatalogRepository.getBranchService` and `listBranchServices` expose accepted current-price changes immediately.
The read-only catalog inspector uses the same values. Public DTO shapes remain unchanged in this unit.
Source retrieval, source-update date, website review, and tariff-effective date remain separate fields.

Default statistical eligibility requires an active listing with active branch, provider, service, and category parents, plus a verified current price.
Public listing reads already exclude inactive records and parents. Consumers must select `price.status === 'verified'` from the remaining current prices.
Unknown, unverified, and disputed prices do not qualify.
Elapsed time alone never changes a price status or its eligibility.
The existing minimum of three eligible branches and branch/provider counts remain part of the later statistics implementation.

On 28 October 2026, the owner required pending price reports to mark the current price disputed immediately.
The report submission transaction appends/selects a disputed revision and preserves its source and actual prior review metadata.
If no current amount is known, retain null instead of inventing a disputed amount.
Report submission and [administrator resolution](correction-report-resolution.md) now provide the automatic report transitions.
Pending price reports block verified price writes here. Resolve reports through the protected report queue before restoring verified status.
Statistical charts remain separate implementation work.

## Server and migration contract

`inspectPricing` is an administrator-only GET server function.
Selectors include `provider`, `listing`, `providerAfter`, `branchAfter`, `serviceAfter`, `sourceAfter`, `historyAfter`, and `after`.
Native forms POST URL-encoded data to `/admin/prices/write`.
The server checks the current administrator grant, exact Origin, POST method, bounded body, values, relationships, and listing revision.
Bodies are limited to 16,384 bytes. Duplicate form fields are rejected.
GET returns 405. Anonymous or expired sessions receive 401. Ordinary members receive 403. Rejected cross-origin writes receive 400.

Successful writes return 303 with `code=saved` and the affected provider or listing selection.
Failures use `invalid_request`, `duplicate`, `conflict`, or `unavailable`, without exposing SQL or secrets.
Reload before retrying outdated or uncertain writes. Re-enter rejected new-record values after the redirect.
Price, source, and availability parsing is in `src/features/pricing/contracts.ts`.
SQL, transaction guards, and private history reads are in `src/features/pricing/repository.server.ts`.

Migration `0006_pricing_administration.sql` follows the five existing migrations.
It adds listing revisions, source/price metadata, immutable-source checks, fixed listing ownership, and the guarded change log.
It does not rewrite existing price amounts, current references, source metadata, or historical review timestamps.

Run `bun run test:database` for actual D1 upgrade, concurrency, rollback, history, evidence, access, and unknown-value checks.
Run `bun run test:browser` for desktop, 375 px mobile, no-JavaScript forms, and public inspector checks.

Official documentation checked on 28 October 2026:

- [D1 transactional batches](https://developers.cloudflare.com/d1/worker-api/d1-database/).
- [D1 prepared statements](https://developers.cloudflare.com/d1/worker-api/prepared-statements/).
- [SQLite trigger checks and RAISE](https://www.sqlite.org/lang_createtrigger.html).
- [TanStack server routes](https://tanstack.com/start/latest/docs/framework/react/guide/server-routes).

This document uses STE-guided prose. It does not claim formal ASD-STE100 compliance.
