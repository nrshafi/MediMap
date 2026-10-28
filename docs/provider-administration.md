# Provider and branch administration

Use `/admin/providers` to maintain provider identities and physical branches.
All reads and writes on this page require a current administrator session.
The public catalog reads remain available without sign-in.

## Local setup

1. Run `bun run db:setup` to apply the five numbered migrations and the reviewed seed.
2. Complete the [Google account and administrator setup](authentication.md).
3. Open `/admin/providers`.
4. Select a provider before creating or editing its branches.

Real Google acceptance remains pending OAuth credentials.
Browser checks use isolated synthetic accounts and state. They do not grant access to a real account.

## Identity, contacts, and location

Provider forms maintain the provider name, primary telephone, website, and active status.
Branch forms maintain the branch name, address, telephone numbers, website, coordinates, and usual weekly hours.
Provider and branch IDs remain fixed. A branch cannot move to another provider through a correction.
Deactivate referenced records instead of deleting or reassigning them.
An inactive provider hides all its branches from public reads.

Names use the existing Unicode search normalizer for duplicate checks.
Provider names are unique across providers. Branch names are unique within each provider.
Inactive names remain reserved. The same branch name can occur under a different provider.
Name corrections do not alter listing IDs, provider service labels, source snapshots, or price revisions.

Blank optional fields become null. Do not copy a provider telephone or schedule into an unsupported branch field.
Telephone values permit 5 to 15 digits with an optional leading plus, spaces, hyphens, and parentheses.
Bangla digits become ASCII digits. The application does not infer international prefixes or confirm that a telephone is reachable.
Websites require HTTP or HTTPS and reject embedded credentials, control characters, and backslashes.
The application validates website syntax. It does not fetch or establish ownership of a submitted website.

Coordinates require both latitude and longitude, or neither value.
Latitude ranges from -90 to 90. Longitude ranges from -180 to 180. Zero is a valid coordinate.
Coordinate bounds do not establish the physical branch location. Use supported evidence and preserve unknown values.

An active branch save requires an official contact source belonging to its provider.
The administrator must confirm that the selected source supports the submitted branch details.
Tariff sources and another provider's contact sources are rejected.
Keep unsupported branches inactive. Create reviewed contact-source metadata through [source administration](pricing-administration.md).
Source retrieval alone does not verify every contact field or opening period.

## Weekly hours

Weekly hours use `Asia/Dhaka` and the following structure:

```ts
type OpeningPeriod = { opens: string; closes: string };
type WeeklyHours = {
  timeZone: 'Asia/Dhaka';
  days: Record<WeekDay, OpeningPeriod[] | null>;
};
```

`WeekDay` contains `sunday` through `saturday`. Every day must be present.
Null means unknown. An empty array means no periods start on that day.
One to four periods describe known opening times. Unknown hours remain distinct from a known closed day.

| Form input | Stored meaning |
| --- | --- |
| Blank | Unknown day |
| `closed` | No opening periods start that day |
| `08:00-13:00, 16:00-22:00` | Two opening periods |
| `22:00-02:00` | Opens that evening and closes the following day |
| `00:00-24:00` | Open all day |

Opening times range from `00:00` to `23:59`. Closing times also permit `24:00` for midnight at the day's end.
Reject equal opening and closing boundaries. Use the explicit all-day period instead.
Opening boundaries are inclusive. Closing boundaries are exclusive.
Reject overlapping periods within a day, across midnight, and across the Saturday-to-Sunday week boundary.
Adjacent periods can meet at the same boundary.

A previous day's overnight period continues into a day marked closed.
For example, Saturday `22:00-02:00` remains open until Sunday 02:00, even when Sunday has no starting periods.
Unknown current or previous days can leave opening status unknown when no known interval covers the requested instant.
The helper never invents a closed status from missing hours.

Use `openingStatus(hours, instant)` from `src/features/providers/hours.ts` with an explicit `Date`.
It returns `open`, `closed`, or `unknown` in Dhaka local time.
Pass the same instant across server and browser rendering when the interface needs a current status.
Public reads return the schedule. They do not store or cache a time-dependent opening status.
These are usual weekly hours. Holiday schedules and temporary-closure exceptions are outside this unit.

## Public detail contract

`CatalogRepository.getBranch(id)` and branch-service reads now expose:

- `provider.id`, `provider.name`, `provider.phone`, and `provider.website`.
- `phone`, `alternativePhone`, `website`, and `address` for the physical branch.
- Nullable WGS 84 coordinates and the original official contact-source metadata.
- `openingHours` as `WeeklyHours | null`.

This replaces the earlier free-text `openingHours` type.
The initial reviewed CBC branch retains null contacts, coordinates, and hours. No additional hospital data was invented for this change.
The administration inspector displays known branch contacts and structured hours from the same public read contract.
Public discovery, map rendering, and public detail routes remain separate integration work.

## Server operations and migration

`inspectProviders` is an administrator-only GET server function.
Selectors are `provider`, `branch`, `providerAfter`, `after`, and `sourceAfter`.
Provider, branch, and contact-source pages contain at most 50 records and use stable ID cursors.
Selected records and their existing contact source can come from another page.

Native forms POST URL-encoded input to `/admin/providers/write`.
The server checks current administrator access, exact Origin, method, form size, values, source ownership, and revision.
Bodies are limited to 16,384 bytes. Duplicate form fields are rejected.
GET returns 405. Anonymous or expired sessions receive 401. Ordinary members receive 403.
Rejected cross-origin requests receive 400.

Both forms send `entity`, `mode`, `id`, `name`, `active`, `phone`, and `website`.
Updates also send `revision`. Branches add `providerId`, `address`, `alternativePhone`, coordinates, `contactSourceId`, and seven `hours_<day>` fields.
Active branch saves require `confirmContact=yes`.
Accepted writes return 303 with `code=saved` and the selected record.
Failures use fixed codes: `invalid_request`, `duplicate`, `conflict`, or `unavailable`.
Reload before retrying an outdated or uncertain write. Re-enter rejected new-record values after the redirect.

Migration `0005_provider_administration.sql` adds contact columns, revisions, normalized keys, and ownership/source/hour checks.
It preserves existing rows and null fields. Existing reviewed names are ASCII and receive lowercase, trimmed keys.
Future reviewed seeds must supply keys from the shared Unicode normalizer.
Stored hour objects receive full application validation before public reads. Malformed stored schedules return an explicit unavailable response.

Run `bun run test:database` for real D1 upgrade, access, revision, source, deactivation, and schedule checks.
Run `bun run test:browser` for desktop, 375 px mobile, and JavaScript-disabled form checks.
Synthetic provider and branch records stay in isolated test databases.

Official documentation checked on 28 October 2026:

- [D1 prepared statements](https://developers.cloudflare.com/d1/worker-api/prepared-statements/).
- [D1 JSON support](https://developers.cloudflare.com/d1/sql-api/query-json/).
- [TanStack server routes](https://tanstack.com/start/latest/docs/framework/react/guide/server-routes).
- [React select labels and native forms](https://react.dev/reference/react-dom/components/select).

This document uses STE-guided prose. It does not claim formal ASD-STE100 compliance.
