# Catalog administration

Administrators maintain categories, canonical services, and English/Bangla aliases at `/admin/catalog/manage`.
Public discovery retains its existing demonstration data until the public integration phase.
The stored catalog and the read-only inspector reflect accepted changes immediately.

## Local setup

1. Run `bun run db:setup` to apply migrations `0001` through `0004` and the reviewed seed.
2. Configure the Google OAuth web client as described in [authentication setup](authentication.md).
3. Complete sign-in, then use the documented owner-run operation to grant administrator access.
4. Sign in again after the grant changes.
5. Open `/admin/catalog/manage`.

Local browser tests use isolated synthetic accounts. They do not create a real administrator in the development database.
Real Google consent, callback, sign-out, and owner-granted access still require live verification after credential configuration.

## Record rules

| Record | Required fields | Correction rules |
| --- | --- | --- |
| Category | Stable ID, name, active status | Retain ID. Deactivation hides all services under the category. |
| Canonical service | Stable ID, name, category ID, active status | Retain ID and diagnostic meaning. Create a separate record for a different variant. |
| Alias | Stable ID, name, service ID, `en` or `bn`, active status | Retain ID and service ownership. Confirm the same diagnostic meaning. |

IDs use lowercase letters, digits, and single hyphen separators, up to 120 characters.
Names contain 1 to 180 characters after compatibility normalization and whitespace collapse.
Reject empty labels, control characters, markup delimiters, and directional override characters.
Bangla aliases must include Bangla characters. English aliases must not contain Bangla characters.
The language field labels the alias script. It does not translate or verify clinical meaning.

Duplicate keys use `normalizeText` from the existing search module.
The normalizer applies NFKC, removes zero-width characters, lowercases text, and collapses whitespace.
Category names are unique within categories. Canonical names and aliases are unique across their combined namespace.
Inactive records retain their current names and aliases as reserved terms.
Exact collisions fail even when records belong to the same service or use different language labels.
Use a more specific alias when a term could incorrectly identify another service.
The existing resolution engine still requires selection for ambiguous prefix or keyword matches.

The application cannot establish clinical equivalence from text. An administrator must review each mapping and correction.
Changing a display name does not change branch-service IDs, provider labels, sources, or price history.
There is no merge, reassignment, or delete operation in this unit.

## Server contract

`inspectManagement` is an administrator-only GET server function.
It reads paginated active and inactive categories, services, and aliases through `CatalogAdministrationRepository`.
Its optional search fields are `after`, `categoryAfter`, `aliasAfter`, `service`, and `category`.
Pages contain at most 50 records, with stable ID cursors. Selected records can come from another page.
Category options show the current category page and retain an edited service's existing category.

Native HTML forms submit URL-encoded POST requests to `/admin/catalog/write`.
Every write requires a current administrator session and the shared exact-Origin, same-origin POST check.
GET returns 405. Guests and expired sessions receive 401. Ordinary members receive 403.
Bodies are limited to 16,384 bytes. Duplicate form keys are rejected.

`parseEdit` validates input before repository writes. All SQL values use bound parameters.
Fields include `entity`, `mode`, `id`, `name`, and `active`, with `0` or `1` for status.
Services add `categoryId`. Aliases add `serviceId` and `language`.
Updates add the positive `revision` from the displayed record.
Service and alias updates also require `confirm=yes` for diagnostic-meaning confirmation.

Successful writes return 303 with `code=saved` and the affected selection.
Fixed failure codes are `invalid_request`, `duplicate`, `collision`, `conflict`, and `unavailable`.
No raw SQL, tokens, or provider errors appear in feedback.
Failures retain a validated selection when available. Re-enter rejected new-record values after the redirect.
If a write response is uncertain, reload the record before retrying.

Updates compare the submitted revision in the SQL WHERE condition and increment it on success.
An outdated form changes no rows and returns `conflict`.
Unique indexes and cross-table triggers reject concurrent normalized-term collisions.
Foreign keys reject missing categories and services. Ownership triggers reject alias reassignment or ID changes.

## Migration and verification

Add `0004_catalog_administration.sql` after the three existing migrations. Do not modify applied migrations.
The migration retains existing rows and adds search keys, revisions, and alias activation.
The currently reviewed stored names and aliases are ASCII, so SQLite lowercase and trim establish their keys.
Future reviewed SQL seeds must supply keys produced by the shared Unicode normalizer.
Direct SQL updates must preserve normalized keys and advance revisions. Use application forms for ordinary maintenance.

Run `bun run test:database` for actual local D1 tests of upgrade retention, access, collisions, revisions, and deactivation.
Run `bun run test:browser` for desktop, 375 px mobile, and JavaScript-disabled catalog form checks.
Browser writes remain inside `.bun-tmp/browser-d1-state`.
Database test fixtures and synthetic diagnostic names do not become release data.

Official documentation checked on 28 October 2026:

- [TanStack server routes](https://tanstack.com/start/latest/docs/framework/react/guide/server-routes).
- [TanStack non-nested routes](https://tanstack.com/router/latest/docs/routing/routing-concepts#non-nested-routes).
- [React input and native forms](https://react.dev/reference/react-dom/components/input).
- [D1 prepared statements](https://developers.cloudflare.com/d1/worker-api/prepared-statements/).
- [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/).
- [Playwright assertions](https://playwright.dev/docs/test-assertions).

This document uses STE-guided technical prose. It does not claim formal ASD-STE100 compliance.
