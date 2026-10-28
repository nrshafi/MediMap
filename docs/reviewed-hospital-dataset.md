# Reviewed hospital dataset

Reviewed on 28 October 2026 from official hospital publications.
This dataset is a reviewed subset, with no fixed hospital, branch, or service target.
It does not represent complete hospital coverage or confirm live appointment availability.

## Publication inventory

| Hospital branch | Reviewed listings | Research listings held |
| --- | --- | --- |
| Ad-din Medical College Hospital, Moghbazar | 128 | 341 |
| Monowara Orthopedic and General Hospital, Kamalapur Road | 66 | 45 |
| Holy Family Red Crescent Medical College Hospital, Eskatan Garden Road | 2 | 582 |
| BMU Super Specialized Hospital, Shahbag | 0 | 829 |
| Farabi General Hospital, Dhanmondi | 0 | 97 |
| Total | 196 | 1,894 |

The reviewed subset has three providers, three branches, 136 canonical services, and 17 stored source records.
Every research listing has a published or held decision in `data/catalog/publication-inventory.json`.
The 1,894 holds comprise 1,508 currency gaps, 379 mapping gaps, and seven specific review concerns.
The original parser's excluded rows and duplicate evidence remain in `data/catalog/tariff-review.json`.
The broader research exports remain unchanged and retain `publicationReady: false`.

## Source evidence

Ad-din's official charge tables explicitly identify Taka or Tk.
Monowara's visible item prices use the taka symbol and match its directory metadata.
Holy Family's [COVID information page](https://holyfamily.com.bd/about/covid-information) lists RT-PCR at Tk 3,000 and rapid antigen testing at Tk 700.
The same two prices appear in its [pathology table](https://holyfamily.com.bd/service/pathology-services).
The separate Tk 500 home-collection charge is not part of either test's base price.
This corroboration establishes currency for those two items only.
It does not establish the currency of Holy Family's other pathology or radiology rows.
The existing `explicit_taka_header` storage code also covers explicit Taka/Tk labels outside a table header.

Official contact pages support each published branch's address.
No prices transfer between branches. BMU and Farabi remain held because their item currency is not explicitly confirmed.
Farabi's initial browser retrieval timed out; the later direct capture succeeded and did not resolve its currency gap.
Monowara's government-rate wording remains provider wording. This review does not independently verify government fee schedules.

`data/catalog/reviewed-evidence.json` records fresh retrieval times, raw-HTML hashes, extracted rows, address evidence, and currency scope for 24 pages.
Raw HTML stays in ignored `.bun-tmp/reviewed-catalog/`.
The collector makes public GET requests only, without login, calls, messages, or form submissions.

`data/catalog/reviewed-selection.json` records the actual reviewer and review time.
Its hashes cover the captured evidence, original research, explicit mappings, and specific holds.
A changed input cannot inherit the previous review.
Source retrieval, website update, actual review, and provider effective dates remain distinct.
The seed preserves null effective dates, coordinates, telephone fields, and opening hours.
Website-publication verification does not imply telephone or physical confirmation.

## Canonical mapping and holds

`scripts/data/reviewedMappings.ts` lists explicit source IDs, row numbers, exact provider labels, canonical IDs, and reviewed aliases.
The generator rejects changed labels, duplicate branch-service mappings, held rows, and current parser exclusions.
It does not use fuzzy matching or infer a mapping for an unreviewed row.
Source wording remains in `provider_service_name` after mapping.

Timing, sample counts, specimen, methods, laterality, views, and panels remain distinct where specified.
Examples include fasting versus unspecified lipid profiles, individual thyroid tests versus panels, and ICT versus ELISA dengue tests.
Left and right knee views remain separate services.
Whole-abdomen ultrasound with PVR remains separate from the ordinary whole-abdomen listing.

Specific holds retain the published data without choosing a replacement value:

- Monowara's `CBC/CP` needs confirmation before treating it as the separately listed CBC.
- Monowara's published creatinine amount needs additional confirmation because it is an outlier.
- Monowara's two electrolyte labels may describe the same service at different prices. Neither is selected.
- Ad-din's unqualified creatinine label does not establish a serum specimen.
- Ad-din's folate and folic-acid rows have different amounts and incomplete variant details. Neither is selected.

These holds do not establish that the provider's published data is wrong.
All remaining unreviewed mappings stay outside the published subset.

## Local setup

Use the repository's installed stable Bun, Node, and Miniflare versions.
The reviewed entry command supports local workspace state only. It has no remote mode.

1. Run `bun install --frozen-lockfile`.
2. Run `bun run db:setup` for existing migrations and the original reviewed foundation seed.
3. Run `bun run catalog:check` to verify the reviewed artifacts.
4. Run `bun run db:catalog:apply` to enter the additional reviewed records atomically.
5. Run `bun run db:catalog:check` to reconcile the local database.

The entry command uses the configured D1 identity in local `.wrangler/state` through Miniflare.
It performs no Cloudflare API call, remote migration, resource provisioning, or deployment.
`MEDIMAP_D1_STATE` can select an isolated state directory inside the workspace for testing.
Keep the configured database identity consistent with the foundation setup.

`seeds/reviewed-catalog.sql` is generated from reviewed inputs.
The command checks it against those inputs before entry and applies the statements in one guarded D1 batch.
Existing canonical-name collisions or immutable-source conflicts require review; they cannot silently replace records.
An unsuccessful batch leaves the previous dataset intact.

The original Ad-din CBC listing, price ID, source snapshots, and actual review time remain unchanged.
Other records retain their separately reviewed source and price references.
Seed reruns do not create duplicate revisions, reactivate records, restore cleared prices, or override administrator choices.
They also cannot restore a verified price while a price report remains pending.
The seed-import ledger prevents repeat current-price selection.

## Reconciliation and regeneration

`bun run db:catalog:check` compares expected entities, ownership, canonical mappings, source hashes, seed prices, and review metadata against D1.
It also enumerates public active listings through the application's actual catalog repository.
Missing or conflicting records produce a nonzero exit code.
Retained administrator changes appear as explicit overrides, separate from integrity errors.
The command writes the full local audit to ignored `.bun-tmp/reviewed-catalog-audit.json` and prints a bounded summary.

`bun run catalog:build` regenerates publication JSON, the coverage inventory, and the reviewed SQL from the frozen inputs.
`bun run catalog:check` verifies those artifacts without writing them.
Git preserves LF line endings for these generated artifacts, including on Windows checkouts.
`bun run catalog:evidence` captures fresh official pages; it does not approve or apply new data.
After a refresh, complete a new row review and update its receipt before regenerating publication artifacts.
Do not reuse an existing immutable source ID for a changed snapshot.
Use administration workflows for later price changes rather than rewriting this reviewed seed's history.

The standard `db:setup` and existing browser fixtures retain the single-listing foundation seed.
They do not load the additional reviewed dataset implicitly.
The reviewed dataset has its own real D1 integration checks.
Public discovery still uses its separately labelled demonstration records; later public integration must use the catalog contracts.
The current subset does not establish three eligible branches for every service or satisfy full release acceptance.

## Verification

Run `bun test`, `bun run test:database`, `bun run catalog:check`, and the existing build/type/lint/format checks.
Dataset tests cover complete inventory reconciliation, exact source rows, price precision, rollback, idempotence, null values, and retained administrator choices.
Pending-report tests confirm that seed reruns cannot remove disputed status.
Database suites run sequentially to limit peak Workers-runtime memory use on Windows.
Existing browser regressions use fresh isolated synthetic accounts, foundation data, and the built application in local Workers preview.

Implementation documentation checked for this unit:

- [D1 batch operations](https://developers.cloudflare.com/d1/worker-api/d1-database/).
- [Local D1 in Miniflare](https://developers.cloudflare.com/workers/testing/miniflare/storage/d1/).
- [Wrangler D1 commands](https://developers.cloudflare.com/d1/wrangler-commands/).
- [Bun file I/O](https://bun.sh/docs/runtime/file-io).
