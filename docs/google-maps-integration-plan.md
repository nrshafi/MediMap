# Google Maps integration plan

Status: phases 0 to 5 implemented on 17 November 2026. Phase 6 manual checks of live address search and driving estimates remain. Prepared on 11 November 2026.

This plan replaces the Geoapify and OpenStreetMap integration with Google Maps Platform. It also moves the public pages to the layout in [`DESIGN.md`](../DESIGN.md). The source material was an earlier emergency routing prototype that is not part of this repository.

## Owner decisions

The owner made these decisions on 11 November 2026. They replace conflicting statements in `context/architecture.md`, `context/project-overview.md`, `context/ui-context.md`, and `context/code-standards.md`. Phase 1 updates those files before any code changes.

| Topic | Decision |
| --- | --- |
| Visual direction | Keep the clinical teal palette. Adopt the prototype layout: sidebar list, full-height map, cards, chips, and floating panel. |
| Maps scope | Full swap to Google. Use the Maps JavaScript API for the map, the Routes API for driving estimates, and Places API (New) Autocomplete for address search. Remove Geoapify and the OpenStreetMap tiles. |
| Billing | Use the Maps Demo Key only. Do not create a billing account. |
| Styling | Adopt Tailwind CSS v4 and `lucide-react`. |

## What to take from the AI Studio prototype

The prototype is an emergency-triage application. MediMap is a diagnostic price-comparison application. Take only the map mechanics and the layout.

| Take | Leave |
| --- | --- |
| `APIProvider`, `Map`, and `AdvancedMarker` structure from `@vis.gl/react-google-maps` | Incidents, triage severity, trauma levels, beds, operating rooms, helipads, and the "Match" score |
| Map click to choose a location | Ambulance, helicopter, motorcycle, and walking mode comparison |
| `fitBounds` on selection | The 0.85 "siren" factor, the 1.32 road-circuity factor, and the fixed speeds. These invent travel times. |
| Sidebar, cards, metric tiles, chips, and floating panel layout | Hard-coded fallback metrics, such as 4,500 m and 480 s. These replace unknown values with invented ones. |
| A quota notice, rewritten for MediMap | The `console.error` override in `main.tsx` |
|  | `GEMINI_API_KEY`, `@google/genai`, Express, `motion`, and the GitHub guide modal |
|  | `as any` casts on `Route.computeRoutes` |
|  | The `internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}` prop |
|  | Slate and rose colors, Plus Jakarta Sans, JetBrains Mono, and text smaller than 12px |

Do not copy the prototype's `README.md` integration guide. It describes emergency routing.

## Terms and policy constraints

These constraints come from the Google Maps Platform terms and documentation, checked on 11 November 2026. They are not legal advice. The owner is responsible for the final terms review.

1. **No High Risk Activities.** The terms prohibit use "for High Risk Activities". The definition is use "where the use or failure of the Services would reasonably be expected to result in death, serious personal injury". MediMap must not present itself as an emergency or ambulance tool. Keep the existing scope exclusion for emergency care. Bangladesh is not on the prohibited-territories list.
2. **No use with non-Google maps.** The terms say "Customer will not use the Google Maps Core Services with or near a non-Google Map". Remove the OpenStreetMap tiles from every page that shows Google content. Keep Google content off the `/discovery` schematic preview.
3. **Caching limits.** The terms permit temporary caching of latitude and longitude from the Routes API and Places API "for up to 30 consecutive calendar days". The terms permit caching of `place_id`. Therefore:
   - Do not write Google coordinates, addresses, or route values to D1.
   - Branch coordinates in D1 must come from official provider evidence and administrator entry. Never fill them from Google geocoding.
   - Do not add a server cache for route or place results.
4. **Attribution.** A Google map shows its own attribution. The Places policy says autocomplete suggestion lists remain Google Maps Content. When suggestions show without a visible Google map, show "Google Maps" attribution beside the list. Never cover the attribution row at the bottom of the map.
5. **End-user terms.** Google's compliance guidance asks applications to say that they use Google Maps features. Add footer links to the [Google Maps End User Additional Terms](https://maps.google.com/help/terms_maps/) and the [Google Privacy Policy](https://policies.google.com/privacy).

## Demo Key constraints

The [Maps Demo Key page](https://developers.google.com/maps/documentation/javascript/demo-key) states these limits:

- It supports the Maps JavaScript API, Places API (New), Geocoding API v4, Compute Routes, and Weather API.
- The owner must create it with a personal Google Account. Google Workspace accounts are not eligible.
- It is "intended for testing and prototyping purposes only" and "is not designed for production use".
- Google does not publish a numeric daily limit. At the limit, "usage is paused until the following day with no risk of charges".
- Production use requires a billing account on the key or a new billing-enabled key.

Consequences for this plan:

- The key cannot support a production release. The release candidate must work with the map unavailable. A production map requires a later owner decision on billing.
- The page does not say whether server requests to the Routes and Places web services accept a Demo Key. Phase 0 showed on 11 November 2026 that they do.
- A Maps JavaScript key is visible to every visitor. If a third party uses the key, the daily limit can pause the map for all users. No charges result.
- Use `DEMO_MAP_ID` for `AdvancedMarker`. A cloud Map ID needs a Google Cloud project.

## Target architecture

### Browser

- `@vis.gl/react-google-maps` renders the map inside TanStack Router's `ClientOnly`. Server rendering produces the list, the location form, and a map placeholder. The map is a progressive enhancement.
- The route loader gives the browser key to the page. If the key is missing, the page shows the "map unavailable" notice and keeps all other features.
- Load the map on `/find` on page load at desktop widths, and when the user opens the "Map" view on mobile. On `/branches/<id>`, load the map only after the user selects "Show on map". This reduces map loads against the daily limit.
- Set `window.gm_authFailure` in the map component to show the notice when Google rejects the key. Verify this callback against current Maps JavaScript API documentation before use.

### Server

Add Google adapters in `src/integrations/mapping/google/`. Keep request handling in `src/features/public/catalog.functions.ts`.

| Function | Google request | Fields | Billing tier at production prices |
| --- | --- | --- | --- |
| Road estimate | `POST https://routes.googleapis.com/directions/v2:computeRoutes`, `travelMode: DRIVE`, `routingPreference: TRAFFIC_UNAWARE` | `X-Goog-FieldMask: routes.distanceMeters,routes.duration` | Compute Routes Essentials |
| Address suggestions | `POST https://places.googleapis.com/v1/places:autocomplete` with `locationRestriction.rectangle` (23.6 to 24.0 N, 90.2 to 90.6 E), `includedRegionCodes: ["bd"]`, and `sessionToken` | `suggestions.placePrediction.placeId`, `suggestions.placePrediction.text.text` | Autocomplete Requests |
| Selected address | `GET https://places.googleapis.com/v1/places/{placeId}` with the same `sessionToken` | `X-Goog-FieldMask: location,formattedAddress` | Place Details Essentials |

Rules for all adapters:

- Keep the existing protections: same-origin POST, D1 request budget (`reserveMappingRequest`), six-second timeout, 65,536-byte response limit (`providerJson`), and field validation.
- Send the key in the `X-Goog-Api-Key` header, not in the URL.
- Do not request `TRAFFIC_AWARE` routing, intermediate waypoints, or `TWO_WHEELER` mode. These move requests to the Pro or Enterprise tier.
- Do not request `displayName` in Place Details. It moves the request to the Pro tier.
- Keep address lookup user-triggered. The user submits the "Find address" form, then selects one suggestion. Do not send a request on each keystroke.
- Generate the session token in the browser with `crypto.randomUUID()`. Validate its format on the server.
- Parse the `duration` string (for example `"1080s"`) and reject values that are not finite and non-negative.
- On any failure, return the existing unavailable result. Keep prices, the selected location, and the list unchanged.

Verify every request field, header, and response field against the current Routes API and Places API (New) reference before coding.

### Fallback if the Demo Key fails on the server

If Phase 0 shows that server requests reject the Demo Key, use the Maps JavaScript classes in the browser instead: `Route.computeRoutes`, `AutocompleteSuggestion`, and `Place.fetchFields`. Before each browser request, call a server function that reserves the D1 budget. Record this choice in `context/architecture.md`. The server key variable is then not needed.

### Configuration

| Variable | Type | Use |
| --- | --- | --- |
| `GOOGLE_MAPS_BROWSER_KEY` | Worker variable | Maps JavaScript API in the browser. Public by design. |
| `GOOGLE_MAPS_SERVER_KEY` | Worker secret | Routes and Places web-service requests. |

With the Demo Key, both variables hold the same key. Two variables let a later production setup use separately restricted keys. Remove `GEOAPIFY_API_KEY`. Update `.dev.vars.example`, then run `bun run cf:types`.

No migration is required. `mapping_budget` from `0011_mapping_budget.sql` stays in use. Lower its daily ceiling of 600 if Phase 0 shows a smaller Demo Key limit.

## Phases

The core-features milestone is 15 November 2026. Phases 0 to 4 are the minimum for a working Google map in `/find`. Phases 5 and 6 can follow before the 22 November full-flow checks.

### Phase 0: Owner setup and server check (owner)

Status: complete on 11 November 2026. Server requests to Compute Routes, Autocomplete, and Place Details accepted the Demo Key. The key has no referrer restriction now. Use the server design. Results are in `context/progress-tracker.md`.

1. Create a Maps Demo Key with a personal Google Account at the [Maps Demo Key page](https://mapsplatform.google.com/maps-demo-key).
2. Put the key in the ignored `.dev.vars` file as both `GOOGLE_MAPS_BROWSER_KEY` and `GOOGLE_MAPS_SERVER_KEY`. Do not commit the key or paste it into chat.
3. Send one Compute Routes request and one Autocomplete request from a terminal. Record whether each request succeeds.
4. Record whether the key accepts HTTP referrer restrictions.

Acceptance: the results of steps 3 and 4 are recorded in `context/progress-tracker.md`, without the key.

### Phase 1: Context and documentation

1. Update `context/architecture.md`. Replace the Geoapify and OpenStreetMap decisions with this architecture and the terms constraints.
2. Update `context/project-overview.md`. Record Google Maps as the selected provider and the Demo Key production limit.
3. Update `context/ui-context.md`. Point visual rules to `DESIGN.md` and keep the interaction rules.
4. Update `context/code-standards.md`. Allow Tailwind CSS and `lucide-react`. Record that `DESIGN.md` tokens define the Tailwind theme.
5. Update `.dev.vars.example` and the README setup section.

Acceptance: no context file still names Geoapify or OpenStreetMap tiles as the selected provider.

### Phase 2: Tailwind foundation

1. Add `tailwindcss` and `@tailwindcss/vite`. Version 4.3.5 of each is current, and its peer range includes Vite 8.
2. Add `lucide-react`. Version 1.71.0 is newer than the three-day `minimumReleaseAge`, so Bun selects an older release. Record the installed version.
3. Add `tailwindcss()` to `vite.config.ts`. Check the Tailwind TanStack Start guide for plugin order.
4. In `src/styles.css`, import the Tailwind theme and utilities layers without Preflight. Preflight resets base styles and would change the existing administration pages.

   ```css
   @layer theme, base, components, utilities;
   @import 'tailwindcss/theme.css' layer(theme);
   @import 'tailwindcss/utilities.css' layer(utilities);
   ```

5. Add an `@theme` block with the `DESIGN.md` colors, radii, and spacing. Keep the legacy properties (`--bg-base` and others) as aliases.
6. Run `npx -p @google/design.md designmd lint DESIGN.md` after each token change.

Acceptance: build, type check, lint, and format checks pass. Existing pages look unchanged at 375px and at desktop width.

### Phase 3: Server adapters

1. Add `routes.server.ts` and `places.server.ts` in `src/integrations/mapping/google/`, with unit tests that mock `fetch`.
2. Replace the Geoapify calls in `publicRoute` and `findLocation`. Add a server function for the selected place.
3. Remove the Geoapify code, links, and environment variable.

Acceptance: tests cover a missing key, a non-OK status, a timeout, an oversized response, malformed fields, coordinates outside Dhaka, an exhausted budget, a cross-origin request, and `duration` parsing. A failure never removes a price or changes the selected location.

### Phase 4: Map component

1. Add `GoogleMapView.tsx` in `src/features/public/`. Remove `GeographicMap.tsx`.
2. Show markers only for listings in the filtered result set that have recorded coordinates. The list and the map use the same array.
3. Synchronize selection between cards and markers. Fit the bounds to the user location and the visible markers.
4. Keep the coordinate form, presets, and browser location as the keyboard alternative to a map click.
5. Show the "map unavailable" notice for a missing key, an authentication failure, or a load failure.

Acceptance: `/find` and `/branches/<id>` work with and without a key. The OpenStreetMap tile URL no longer appears in `src/features/public/`.

### Phase 5: Layout redesign

1. Build the desktop sidebar and map layout and the mobile List/Map switch from `DESIGN.md`.
2. Build listing cards, filter chips, the floating panel, and the bottom sheet with Tailwind utilities and `DESIGN.md` tokens.
3. Put the road estimate and a Google Maps directions link in the panel. Directions links use [Google Maps URLs](https://developers.google.com/maps/documentation/urls/get-started) and need no key.
4. Add the end-user terms links to the footer.

Acceptance: no horizontal page scroll at 375px. All controls are at least 44px high. The panel does not cover the Google attribution.

### Phase 6: Verification

1. Run `bun run typecheck`, `bun run lint`, `bun run format:check`, `bun test`, `bun run test:database`, and `bun run build`.
2. Update `tests/browser/public-integration.browser.ts`. Browser tests run without a key and check the fallback. Add one test that blocks `maps.googleapis.com` and checks the notice.
3. Do one manual check with the Demo Key at desktop width and 375px. Record the result in `docs/public-release-checklist.md`.
4. Update `docs/public-integration.md`, `docs/workers-release-runbook.md`, and `context/progress-tracker.md`.

## Files affected

| Area | Files |
| --- | --- |
| Dependencies | `package.json`, `bun.lock` |
| Build | `vite.config.ts`, `src/styles.css` |
| Configuration | `.dev.vars.example`, `wrangler.jsonc` if a variable is declared there, `worker-configuration.d.ts` (generated) |
| Server | `src/integrations/mapping/google/*`, `src/features/public/catalog.functions.ts`, `src/features/public/provider.server.ts` (kept) |
| UI | `src/features/public/GoogleMapView.tsx` (new), `GeographicMap.tsx` (removed), `FindPage.tsx`, `DetailPage.tsx`, `public.css` |
| Tests | New adapter unit tests, `tests/browser/public-integration.browser.ts` |
| Documentation | `context/*.md`, `docs/public-integration.md`, `docs/public-release-checklist.md`, `docs/workers-release-runbook.md`, `README.md` |

## Risks and open items

- **No branch pins yet.** All reviewed branch coordinates are unknown, according to `docs/public-integration.md`. Until administrators enter verified coordinates, the map shows only the user location, and road estimates stay unavailable.
- **No production map.** The Demo Key is for testing only. Before the 29 November release candidate, the owner must choose between approved billing and a release without a live map.
- **Unknown daily limit.** Google does not publish the Demo Key limit. Phase 0 and the manual checks give the only evidence.
- **`/discovery` page.** The demonstration route keeps its schematic map. The owner can retire it later to remove any question about non-Google maps in the same application.
- **Tailwind migration scope.** This plan migrates only the public pages it changes. The administration pages keep their plain CSS until a separate task migrates them.

## References

Checked on 11 November 2026:

- [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms) and [Service Specific Terms](https://cloud.google.com/maps-platform/terms/maps-service-terms)
- [Google Maps Platform pricing](https://developers.google.com/maps/billing-and-pricing/pricing) and [Routes API usage and billing](https://developers.google.com/maps/documentation/routes/usage-and-billing)
- [Maps Demo Key](https://developers.google.com/maps/documentation/javascript/demo-key)
- [Places API (New) Autocomplete](https://developers.google.com/maps/documentation/places/web-service/place-autocomplete), [Place Details data fields](https://developers.google.com/maps/documentation/places/web-service/data-fields), and [Places policies](https://developers.google.com/maps/documentation/places/web-service/policies)
- [Tailwind CSS Preflight](https://tailwindcss.com/docs/preflight)
- [DESIGN.md format](https://github.com/google-labs-code/design.md)
- npm registry entries for `@vis.gl/react-google-maps` 1.10.2, `tailwindcss` 4.3.5, `@tailwindcss/vite` 4.3.5, and `lucide-react` 1.71.0

This document uses STE-guided prose without a claim of formal ASD-STE100 compliance.
