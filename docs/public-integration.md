# Public application integration

The public application uses the source-backed D1 catalog. `/discovery` remains the separately labelled demonstration.

## Routes and contracts

| Route | Purpose |
| --- | --- |
| `/` | Service-discovery entry and account navigation |
| `/find?service=<canonical-id>` | Public catalog search, address and map location selection, current branch prices, and eligible area statistics |
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

The reviewed import has 217 listings and five branches.
On 18 November 2026, each branch received a coordinate pair from one Places lookup of its published official address. The branch row stores latitude and longitude only.
Eleven canonical services are published at three or more branches. These services can supply the three-branch area statistic.
Administrators can replace a coordinate through the existing branch editor. A later lookup does not replace a saved coordinate.
No review data was invented for the release dataset.

## Mapping provider

Google Maps Platform provides the map, driving estimates, and address search. The owner selected it on 11 November 2026.

- The browser map uses the Maps JavaScript API through `@vis.gl/react-google-maps` 1.10.2 with `DEMO_MAP_ID`.
- Driving estimates use Routes API Compute Routes with `TRAFFIC_UNAWARE` routing. The field mask is `routes.distanceMeters,routes.duration`.
- The `/find` "Show route" request adds `routes.polyline.encodedPolyline`, `routes.legs.steps.distanceMeters`, and `routes.legs.steps.navigationInstruction`, with `languageCode: "en"`.
- Address search uses Places API (New) Autocomplete and Place Details. Suggestions are restricted to the rectangle from 23.6 to 24.0 N and 90.2 to 90.6 E, with region code `bd`. Place Details requests `location,formattedAddress`.

Set `GOOGLE_MAPS_BROWSER_KEY` as a Worker variable. Set `GOOGLE_MAPS_SERVER_KEY` as a Worker secret.
All Google web-service calls run on the server through same-origin POST requests. The browser generates the Places session token with `crypto.randomUUID()`, and the server validates its format.
Requests use a six-second timeout, a 65,536-byte response limit, and validated fields. The server sends each key in the `X-Goog-Api-Key` header.
The application permits at most two provider requests per second and 600 per UTC day across address and route requests. Reservations are enforced in D1. Rejected or failed calls may consume a reservation, which keeps the ceiling conservative. Google publishes no Demo Key limit, so these values are local ceilings.
The budget stores time buckets and counts, not user addresses or coordinates.
Address lookup starts only when the user submits the address form. The client does not send a request for each keystroke.
Provider failures leave catalog prices available and preserve the selected search location.

### Terms constraints

- MediMap is not an emergency or ambulance tool. Google's terms prohibit High Risk Activities, which are uses where failure of the services could reasonably cause death or serious personal injury.
- Google content never appears with or near a non-Google map. The `/discovery` schematic preview has no Google content.
- Do not store a Places response, a Routes response, a place ID, a Google address, or a route value in D1. Do not add a server cache for route or place results.
- Branch coordinates come from official provider evidence or administrator entry. The 18 November 2026 pairs for the three reviewed branches are stored latitude and longitude only. A later lookup does not replace a saved coordinate.
- Keep Google attribution visible. The map attribution row stays uncovered.
- Show "Google Maps" attribution beside suggestion lists when no Google map is visible.
- Footer links go to the [Google Maps End User Additional Terms](https://maps.google.com/help/terms_maps/) and the [Google Privacy Policy](https://policies.google.com/privacy).

### Maps Demo Key

MediMap is used for demonstrations only. The owner decided this on 19 November 2026. It keeps the Maps Demo Key. There is no billing account and no production Google Maps key.
Google states that the Demo Key is "intended for testing and prototyping purposes only". It "is not designed for production use".
Google publishes no numeric daily limit. At the limit, usage pauses until the next day with no risk of charges.
The browser key is visible to every visitor. A third party that uses it can exhaust the limit and pause the map for all users.
On 11 November 2026, server requests to Compute Routes, Places Autocomplete, and Place Details accepted the Demo Key.
A public production launch needs a billing-enabled key first. The app must work with the map unavailable.

### Map availability

- On `/find`, the map loads on page load at desktop widths. On mobile, it loads when the user opens the Map view.
- On `/branches/<id>`, the map loads only after the user selects "Show on map".
- A missing browser key, a rejected key, or a failed map load shows the "map unavailable" notice.
- Address search and driving estimates use the server key and do not depend on the browser map.
- Coordinate controls provide the keyboard alternative to map selection. The map has no offline, bulk-download, or prefetch feature.

## Migrations and setup

Apply the existing migrations in order, followed by:

1. `0009_service_reviews.sql` for reviews and immutable edit history.
2. `0010_review_moderation.sql` for abuse reports, retained decisions, and guarded visibility changes.
3. `0011_mapping_budget.sql` for shared provider-request reservations.

Use `bun run db:setup`. It also applies the separately reviewed dataset.
The reviewed migration manifest includes the new files. No previously applied migration was changed.
Use `bun run typecheck`, `bun run lint`, `bun run format:check`, `bun test`, `bun run test:database`, and `bun run test:browser`.
Run heavy Workers/browser suites separately on Windows.
Use `bun run release:package` for a build and packaging check without deployment.

## Acceptance evidence

Current test results and unresolved acceptance checks are recorded in `docs/public-release-checklist.md`.
Browser scenarios use synthetic users and listings in a fresh local database. They do not change the development dataset or create real administrator grants.
Live Google, provider credentials, verified branch coordinates, production capacity, and deployment remain separate acceptance requirements.

## Official references

Checked on 11 November 2026, as listed in `docs/google-maps-integration-plan.md`.

- [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms) and [Service Specific Terms](https://cloud.google.com/maps-platform/terms/maps-service-terms).
- [Maps Demo Key](https://developers.google.com/maps/documentation/javascript/demo-key) and [Routes API usage and billing](https://developers.google.com/maps/documentation/routes/usage-and-billing).
- [Places API (New) Autocomplete](https://developers.google.com/maps/documentation/places/web-service/place-autocomplete), [Place Details data fields](https://developers.google.com/maps/documentation/places/web-service/data-fields), and [Places policies](https://developers.google.com/maps/documentation/places/web-service/policies).
- [TanStack Router data loading](https://tanstack.com/router/latest/docs/framework/react/guide/data-loading) and [Google Maps directions URLs](https://developers.google.com/maps/documentation/urls/get-started).

This document uses STE-guided prose without claiming formal ASD-STE100 compliance.
