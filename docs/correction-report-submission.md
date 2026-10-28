# Incorrect-information report submission

The standalone reporting page supports active providers, branches, and branch-service listings.
Public result and detail pages can use the links below during their integration.
Existing discovery cards remain unchanged.

## Route contract

Use `GET /report?target=<type>&id=<stable-id>&issue=<issue>`.
The optional `issue` parameter selects a supported issue. An unsupported selection defaults to the target's first issue.

| Target type | ID | Supported issue values |
| --- | --- | --- |
| `listing` | Branch-service listing ID | `price`, `availability`, `duplicate_listing`, `service_mapping` |
| `branch` | Branch ID | `address`, `hours`, `phone` |
| `provider` | Provider ID | `provider_information`, `phone` |

Example: `/report?target=listing&id=addin-moghbazar-complete-blood-count&issue=price`.
Use `reportHref` from `src/features/corrections/contracts.ts` to construct an encoded URL.
Keep incorrect-information reports separate from reports about abusive reviews.

The page previews the selected public record and its current price or contact details.
Inactive records, inactive listing ancestors, and missing targets cannot receive reports.
Anonymous visitors can inspect public target details. Submission requires a current signed-in session.
The sign-in link retains the selected target and issue.

## Submission contract

The native form posts URL-encoded fields to `/report/submit` and works without JavaScript.
The server requires the configured same-origin `Origin` header and a current account session.
Reporter identity comes only from that session. Submitted account IDs and role fields have no effect.
GET requests to the submission endpoint return HTTP 405.

| Field | Requirement |
| --- | --- |
| `target`, `id`, `issue` | A supported combination from the route contract |
| `observedRevision` | Positive integer matching the displayed target revision |
| `observedPriceId` | Displayed current price ID for listings, or empty when unknown |
| `details` | 20 to 2,000 characters describing the issue |
| `suggestedCorrection` | Optional text, at most 500 characters |
| `evidenceUrl` | Optional HTTPS URL without embedded credentials, at most 2,048 characters |
| `confirmReport` | `yes` |

The body limit is 65,536 bytes. Other administration forms retain their 16,384-byte limit.
Duplicate field names and malformed UTF-8 fail validation.
Submitted text remains literal text. The server does not fetch evidence URLs or apply proposed corrections.

The owner approved these controls on 28 October 2026:

- Require sign-in for every submission.
- Accept at most five reports per account in a rolling 24-hour interval, across all targets and statuses.
- Allow one pending report per account, target type, target ID, and issue type.
- Count a report at the exact 24-hour boundary outside the current interval.

D1 checks these controls inside the report insert. Concurrent requests cannot bypass the quota or pending-duplicate constraint.
Client timestamps cannot change the quota interval. The server supplies submission time.

## Price status and retained history

Migration `0007_correction_reports.sql` follows the six existing migrations.
Apply migrations locally with `bun run db:setup`. Remote migrations and deployment require separate authorization.

A price report inserts the retained submission and changes the current price in one database statement with transactional triggers.
For a verified or unverified current price, D1 inserts a disputed revision and selects it as current.
The clone retains the exact amount, currency, source, source row, actual review metadata, and effective date.
The preceding revision and listing state remain in history.
For an already disputed or unknown price, D1 retains the report without creating another price revision.
An unknown amount remains unknown.

Pending price reports block new verified revisions and restoration of an older verified current price.
The price administration form shows a fixed message when verification fails for this reason.
Disputed current prices do not qualify for default statistics under the catalog contract.
Public statistics integration remains separate work.
Reports about other issues do not change public amounts, contacts, addresses, availability, or service mappings.
Elapsed time alone does not change price status.

D1 rejects stale target revisions or observed price IDs before retaining any report or dispute effect.
A failed dispute write rolls back the report, audit row, revision, and current-price selection together.
Original report content and its target snapshot cannot be changed or deleted through application operations.
The [administrator resolution workflow](correction-report-resolution.md) records its actor, reason, evidence, and history before changing report status.
Resolved submissions remain readable by their original reporter. Original report content remains unchanged.

## Responses and privacy

Successful submission redirects with HTTP 303 to `/report?submitted=<report-id>`.
The receipt shows the original target snapshot and submitted text, even after public details change.
Only the submitting account can read that receipt. Administrator status alone does not grant receipt access through this route.
The administrator queue uses its own protected read contract at `/admin/reports`.

| HTTP status | Failure |
| --- | --- |
| 400 | Invalid form or rejected same-origin check |
| 401 | Missing or expired session |
| 404 | Target no longer available |
| 409 | Pending duplicate or changed target |
| 429 | Rolling report quota reached |
| 503 | Reporting storage or access unavailable |

Native form errors render a complete HTML page with the submitted draft when the bounded body can be read safely.
A stale-target response refreshes its public preview and hidden revision so the user can review and retry.
Expired sessions disable submission while preserving same-origin draft text for copying.
Oversized or malformed bodies may not provide a recoverable draft.
Report pages and responses use `Cache-Control: private, no-store`.
Use `Referrer-Policy: same-origin` to prevent cross-origin referrer disclosure while retaining browser Origin checks on form POST requests.
Evidence links also use `rel="noreferrer"`.

## Verification

Run `bun test`, `bun run test:database`, and `bun run test:browser`.
D1 tests cover migration upgrades, signed-in access, invalid targets, concurrent quotas and duplicates, private receipts, stale forms, and failed-write rollback.
Browser tests cover desktop and 375 px layouts, native form recovery, immediate disputes, private receipts, and JavaScript-disabled submission.
Browser accounts and report data use isolated state. These fixtures do not verify real Google OAuth or production provider data.

Implementation references checked on 28 October 2026:

- [SQLite triggers](https://www.sqlite.org/lang_createtrigger.html).
- [SQLite date functions](https://www.sqlite.org/lang_datefunc.html).
- [D1 database operations](https://developers.cloudflare.com/d1/worker-api/d1-database/).
- [React static rendering](https://react.dev/reference/react-dom/server/renderToStaticMarkup).
- [Origin header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Origin).
- [Referrer policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy).
