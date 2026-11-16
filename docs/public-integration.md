# Public application integration

The public application uses the source-backed D1 catalog. `/discovery` remains the separately labelled demonstration.

## Routes and contracts

| Route | Purpose |
| --- | --- |
| `/` | Service-discovery entry and account navigation |
| `/find?service=<canonical-id>` | Public catalog search, geographic location selection, current branch prices, and eligible area statistics |
| `/services/<id>` | Server-rendered service details and published listings |
| `/branches/<id>` | Server-rendered branch details, contacts, weekly hours, sources, and separately labelled branch/provider review summaries |
| `/reviews?listing=<listing-id>` | Public service reviews and the signed-in user's retained review form |
| `/compare?ids=<listing-id>,<listing-id>` | Two to four active listings for one service, with tables and accessible numerical charts |
| `/admin/reviews` | Protected review reports and moderation |

Native review, abuse-report, and moderation forms submit to `/reviews/write`, `/reviews/report`, and `/reviews/moderate`.
These routes require same-origin POST requests and current server-confirmed user or administrator access.
They do not trust account IDs or role fields supplied by clients.

## Data and display rules

- Store six required integer review ratings from one to five. The dimensions cover service quality, staff behavior, waiting time, cleanliness, value, and delivery experience.
- Allow optional written text up to 2,000 characters. Retain one review per account and listing, with version-checked owner editing.
- Limit review submissions and edits to five per account per rolling 24 hours. Keep prior text and ratings in immutable history.
- Keep review-abuse reports separate from core-information reports. Allow one pending report per reporter and review, with five reports per rolling day.
- Hide and remove reviews from public lists and aggregates. Restoration requires a current administrator decision, reason, and revision.
- Retain removed reviews and moderation history. Owners cannot restore removed reviews by editing them.
- Calculate service-review means across the six dimensions. Branch/provider means include visible reviews at active records and are labelled separately.
- Calculate area statistics from one current verified price per recorded branch location, inside the straight-line radius. Require three eligible branches.
- Keep numerical area statistics independent of display sorting and verification filters. Do not expire prices because of age.
- Default to ascending price. Put unknown sort values last and use stable listing IDs for ties.
- Support descending price, nearest, travel-time, service-rating, and verification-date sorts.
- Keep comparison to one service and at most four listings. Clear selection on service, query, location, radius, or page changes.
- Preserve unknown prices, ratings, coordinates, hours, and travel estimates. Do not count location-unknown branches inside a radius.

The reviewed import still has 196 listings and three branches. Its coordinate fields remain unknown.
Those listings remain available to browse, but they cannot establish geographic membership, map pins, routing endpoints, or three-branch area statistics.
Administrators can enter separately verified coordinates through the existing branch editor.
No coordinates or review data were invented for the release dataset.

## Mapping provider

Geoapify supplies server-side address search and driving estimates. Set `GEOAPIFY_API_KEY` in ignored local `.dev.vars` or deployed Worker secrets.
The tracked example contains an empty placeholder.
Requests use fixed HTTPS provider endpoints, bounded input, a six-second timeout, validated fields, and a 65,536-byte response limit.
The application permits at most two provider requests per second and 600 per UTC day across address and route requests.
Reservations are enforced in D1. Rejected or failed calls may consume a reservation, which keeps the ceiling conservative.
The budget stores time buckets and counts, not user addresses or coordinates.
Provider failures leave catalog prices available and preserve the selected search location.

OpenStreetMap supplies geographic raster tiles. Show its copyright link, preserve browser caching and referrer headers, and request only visible tiles.
The map has no offline, bulk-download, or prefetch feature. Coordinate controls provide a keyboard alternative to map selection.
Geoapify attribution appears beside the address and route controls.
The public Nominatim endpoint is not used for autocomplete.

The Geoapify pricing page checked on 28 October 2026 lists 3,000 free daily credits and up to five requests per second.
Basic geocoding and routing requests generally use one credit. Recheck account usage and endpoint-specific credit costs before increasing the local budget.
No paid account, remote resource, or provider subscription was created.

## Migrations and setup

Apply the existing migrations in order, followed by:

1. `0009_service_reviews.sql` for reviews and immutable edit history.
2. `0010_review_moderation.sql` for abuse reports, retained decisions, and guarded visibility changes.
3. `0011_mapping_budget.sql` for shared provider-request reservations.

Use `bun run db:setup`, then `bun run db:catalog:apply` for the separately reviewed dataset.
The reviewed migration manifest includes the new files. No previously applied migration was changed.
Use `bun run typecheck`, `bun run lint`, `bun run format:check`, `bun test`, `bun run test:database`, and `bun run test:browser`.
Run heavy Workers/browser suites separately on Windows.
Use `bun run release:package` for a build and packaging check without deployment.

## Acceptance evidence

Current test results and unresolved acceptance checks are recorded in `docs/public-release-checklist.md`.
Browser scenarios use synthetic users and listings in a fresh local database. They do not change the development dataset or create real administrator grants.
Live Google, provider credentials, verified branch coordinates, production capacity, and deployment remain separate acceptance requirements.

## Official references

- [Geoapify geocoding](https://apidocs.geoapify.com/docs/geocoding/forward-geocoding/), [routing](https://apidocs.geoapify.com/docs/routing/), and [pricing](https://www.geoapify.com/pricing/).
- [OpenStreetMap tile policy](https://operations.osmfoundation.org/policies/tiles/) and [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/).
- [TanStack Router data loading](https://tanstack.com/router/latest/docs/framework/react/guide/data-loading) and [Google Maps directions URLs](https://developers.google.com/maps/documentation/urls/get-started).

This document uses STE-guided prose without claiming formal ASD-STE100 compliance.
