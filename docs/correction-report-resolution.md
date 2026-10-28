# Administrator correction resolution

Open `/admin/reports` with a current administrator session.
The queue shows pending reports by default, with the oldest submissions first.
Use the status filter to inspect accepted, rejected, or all reports.
Report references remain accessible when the selected report falls outside the current page or filter.

The original submission and current target appear separately.
Inactive targets remain available for review, while public reporting continues to require active records.
Submitted evidence links are untrusted user input. They do not establish source verification.
Select a retained official provider source and confirm a current review before resolving a report.

## Routes and access

| Route | Contract |
| --- | --- |
| `GET /admin/reports` | Protected queue, selected report, current target, official sources, and retained resolution |
| `POST /admin/reports/resolve` | Protected, same-origin native resolution form |
| `GET /admin/reports/resolve` | HTTP 405, no state change |

Queue search parameters are `status`, `report`, `after`, `sourceAfter`, `source`, and `limit`.
Status accepts `pending`, `accepted`, `rejected`, or `all`.
Queue cursors contain a submission timestamp and stable report ID, ordered together.
Source cursors use stable source IDs. Page sizes range from 1 to 100 and default to 30.
The optional `source` parameter retains an official source outside the current source page.

Every read and write checks current administrator access before accessing report data.
D1 also checks the active administrator grant inside resolution insertion.
Submitted actor IDs, report status, review timestamps, and resulting price IDs have no authority.
The server supplies identity, time, snapshot data, and generated IDs.
All report review responses use private, no-store caching and a same-origin referrer policy.

## Resolution procedure

1. Open a report from the queue.
2. Compare the original submission with the current target.
3. Review an official source for the same provider.
4. For a non-price correction, use the linked record editor before accepting the report.
5. Return to the report and review the changed target.
6. Select the decision and enter a reason of 20 to 2,000 characters.
7. Select the official source and enter its row when applicable.
8. For a known price, confirm the standard base price and current source review.
9. Save the resolution.

Non-price acceptance requires a target revision newer than the submitted revision.
Administrators must confirm that the changed fields resolve the reported issue.
The existing editors retain their validation and source requirements.
Non-price resolution records the reviewed correction; it does not perform another core-data edit.
A failed closure leaves that correction visible and the report pending for another review.
Rejection records the reason and source without changing non-price core data.

For a known price, select `Publish reviewed standard price`.
Enter the confirmed amount in BDT, its official tariff source, and its source row.
The source must belong to the provider and have explicit taka currency evidence.
Unknown tariff-effective dates remain empty. Actual review time always comes from the server.
For an accepted removal or an already unknown price, select `Set or retain unknown price`.
This action retains a null current amount and all prior price history.

## Price transitions

The owner approved these rules on 28 October 2026.
Fresh official-source review is required before restoring verified status, including report rejection.
Reports resolve individually. Other pending price reports keep each reviewed known price disputed.
The last resolution can restore verified status through a new reviewed revision.
Rejection cannot change the current amount or its provider effective date.
Rejection cannot clear a known price or invent a price for an unknown amount.
Accepted corrections can publish a different reviewed amount or explicitly clear it to unknown.
Elapsed time alone never changes status or statistics eligibility.

These examples describe illustrative BDT amounts, not additional provider data.

| Report outcome | Other pending price reports | Resulting current price | Default statistics contract |
| --- | --- | --- | --- |
| Pending report on verified BDT 400 | Any | BDT 400, disputed | Excluded |
| Accepted correction to BDT 450.05 | At least one | BDT 450.05, disputed, newly reviewed | Excluded |
| Accepted correction to BDT 450.05 | None | BDT 450.05, verified, newly reviewed | Eligible if all other catalog conditions hold |
| Rejected report on current BDT 400 | At least one | BDT 400, disputed, newly reviewed | Excluded |
| Rejected report on current BDT 400 | None | BDT 400, verified, newly reviewed | Eligible if all other catalog conditions hold |
| Accepted removal of unsupported price | Any | Unknown, previous revisions retained | Excluded |
| Rejected report on an unknown price | Any | Unknown | Excluded |

New reports after resolution can dispute the current price again.
Closed reports cannot reopen or change decisions. A new submission retains a separate history.
Statistics still require active catalog ancestors and at least three eligible branches.
This workflow supplies the current status contract; public statistics and comparison integration remain separate work.

## Persistence and failure behavior

Migration `0008_report_resolution.sql` follows the seven existing migrations.
Run `bun run db:setup` for local migrations and the repeatable seed.
Remote migrations, provisioning, and deployment require separate authorization.

The `report_resolutions` table retains one immutable decision per report.
Each record includes the administrator, outcome, reason, source, source row, current-review confirmation, and server time.
It also retains the reviewed target snapshot, expected revision, observed current-price reference, and resulting price reference.
Known-price resolution appends a price revision and a listing audit record.
Source collection dates, actual review dates, and provider effective dates remain distinct.

A guarded resolution insert applies its history, report status, audit, and current-price selection together through D1 triggers.
Stale target revisions, changed price references, repeated decisions, missing evidence, and revoked grants reject the operation.
A failed price write rolls back every resolution effect, leaving the original pending report and disputed pointer intact.
Report status changes require a matching retained resolution. Resolution records cannot be updated or deleted.

Success redirects with HTTP 303 to the retained report detail.
Validation or evidence failures return HTTP 400; stale or repeated decisions return HTTP 409.
Missing reports return HTTP 404. Access failures return HTTP 401 or 403; unavailable storage returns HTTP 503.
Native errors preserve typed reasons when the bounded body can be read safely.
The form limit is 65,536 bytes, with duplicate fields and malformed bodies rejected.
Both review and resolution work without JavaScript.

## Integration exports

`readReview` and `writeResolution` are server-only operations with authorization at their entry points.
`ReviewReads.read` returns queue pages, the selected original report, current target, active state, pending-price-report count, and official sources.
Its `resolution` object returns the actor, reason, review time, evidence references, reviewed target snapshot, and immutable resulting price status.
`CatalogRepository.getBranchService` continues to return the selected current price and its actual review metadata.
The original reporter's `/report?submitted=<id>` receipt shows the updated report status with the unchanged submission snapshot.
It does not expose administrator-only queue data or resolution reasons.

## Verification

Use `bun test`, `bun run test:database`, and `bun run test:browser`.
D1 tests exercise migration upgrades, accepted and rejected prices, competing reports, unknown prices, stale forms, rollback, history retention, and revoked grants.
Browser tests exercise source-validation recovery, protected access, final verification, and corrections followed by native resolution without JavaScript.
Fixture accounts and source-backed test prices stay inside isolated test databases.
Live Google login verification still requires real OAuth configuration.

Official references checked on 28 October 2026:

- [D1 database operations](https://developers.cloudflare.com/d1/worker-api/d1-database/).
- [SQLite triggers](https://sqlite.org/lang_createtrigger.html).
- [TanStack server routes](https://tanstack.com/start/latest/docs/framework/react/guide/server-routes).
- [React static rendering](https://react.dev/reference/react-dom/server/renderToStaticMarkup).
