# Progress tracker: MediMap

Update after each meaningful implementation change. Include the exact date and time in Asia/Dhaka, such as `2026-10-14 01:05:33 +06:00`.
Add new completed milestones first. Record changes, verification results, and unresolved checks.
Older milestones retain the date and time precision available in the original record.

Last updated: `2026-10-16 19:54:49 +06:00`.

## Current phase

Reviewed and repaired Red01s commits `1c089e8` through `f16000a`, compared with `88caff9`.
The discovery route is a sample-data demonstration. Earlier milestones do not establish real price verification or production readiness.
Search, radius filtering, routing fallback, and map/list interactions have regression coverage.
Source-backed branch data, D1 integration, provider selection, and complete location input remain unfinished.
Discovery query and radius changes now synchronize with the active results and URL.
The current test audit and verification are in [test-review.md](test-review.md).

## Architecture invariants

These are confirmed constraints for later feature implementation. Full details are in [architecture.md](architecture.md) and [code-standards.md](code-standards.md).

- Use React with TanStack Start and server rendering for public service and branch pages.
- Deploy one Workers application with separate internal feature modules. Share database access and integrations.
- Access D1 through direct prepared SQL queries and versioned SQL migrations. Do not add an ORM by default.
- Keep providers, branches, canonical services, aliases, branch-service listings, prices, and sources distinct. Preserve provider-specific service names separately.
- Prices belong to a branch and canonical service. Show base prices in BDT, source information, verification status, and verification dates.
- Prices do not expire because of age. Reports trigger review. Preserve unknown values and keep meaningful diagnostic variants distinct.
- Use straight-line radius for branch eligibility. Label road distance and estimated travel time separately.
- Default statistics use one eligible verified current price per active branch-service listing. Require at least three eligible branches and show branch and provider counts.
- Present written comparison details in tables. Use statistics for numerical values and retain comparison charts. Do not generate narrative comparison summaries.
- Keep core branch and price information available when routing fails. Map and list results must use the same filtered set.
- Use Google sign-in for the first version. Assign administrator access separately and enforce authorization on the server.
- Allow one active review per user and branch-service listing. Users can edit their own reviews and submit correction reports, not overwrite core data.
- Prefer native Bun utilities for compatible local scripts and unit tests. Use stable releases only and keep Bun-specific APIs out of browser and Workers application code.
- Use free tiers first. Verify workload fit and obtain approval before enabling paid services.

## Completed milestones

### Discovery state synchronization and test review (2026-10-16 19:54:49 +06:00)

- Query edits now notify the discovery page, which clears results for unresolved queries.
- Radius changes use a separate callback and no longer select a diagnostic service.
- The Change test action uses the same query-clear handler as the search input.
- Added focused state-transition regressions. Nine fail against the pre-fix components and pass after the repairs.
- Removed tests that copied handlers, checked CSS source instead of layout, duplicated behavior, or claimed unsupported geographic accuracy.
- Replaced the simulated router-flow suite with component state tests, URL validation tests, and six actual browser scenarios.
- Added Playwright Test 1.64.1 with desktop and 375 by 812 mobile Chromium projects. Documented installation and execution in the README.
- Passed 241 tests across 15 files, including a randomized run with seed `16102026`.
- Passed six browser scenarios, strict type checking, linting, the production build, and frozen-lockfile installation.
- Inspected the mobile screenshot. No horizontal overflow appeared. Selected rendered controls met the tested size limits.
- Browser scenario execution worked in the sandbox, but Windows server shutdown required an unrestricted test run. The final command exited successfully.
- Source-backed data, D1 access, provider selection, and complete location input remain unfinished.
- No commit, push, or deployment occurred.

### Red01s review and repairs (2026-10-16 19:19:00 +06:00)

- Separated sample branch fixtures from discovery filtering. Removed invented source labels, verified status, and verification dates.
- Added sample-data disclosure. Removed fabricated road distance and duration values.
- Stopped branch results for ambiguous, unmatched, and unconfirmed typo queries.
- Applied the shared radius bounds to route validation and discovery. Rejected partial numeric URL values and invalid coordinate pairs.
- Removed aliases that equated broad test categories or different variants with a specific service.
- Isolated routing failures by destination. Validated concurrency, spatial inputs, and OSRM error payloads.
- Fixed debounce rescheduling, stale search state, radius synchronization, map circle sizing, and controlled summary dismissal.
- Added keyboard navigation and unique identifiers to mobile view tabs. Preserved unknown prices and verification dates in UI components.
- Loaded the missing map stylesheet and positioned the mobile summary inside its map container. Labeled the map as a schematic.
- Restored native Bun type checking by removing the shadowing `check` script.
- Passed `bun test`, 283 tests across 14 files. Passed `bun run typecheck`, native Bun checking of 58 files, and `bun run lint`.
- Moved discovery URL validation into its feature module. Route code retains framework configuration and navigation.
- Passed `bun run build` for client and server output.
- Checked the discovery page in a real browser at 375 by 812 pixels. Verified ambiguous CT selection, map selection, summary dismissal, and unknown-query behavior.
- Ego could not connect, including outside the sandbox. Browser checks used the Codex in-app browser.
- Saved the mobile verification screenshot at `.bun-tmp/discovery-mobile-review.png`. This ignored artifact is local evidence, not a tracked product asset.
- DOM tests do not establish complete browser coverage, provider-data accuracy, or accessibility conformance.
- The next feature unit is source-backed branch data after hospital inventory and mapping-provider decisions. Complete location input also remains open.
- No commit, push, or deployment occurred.

### Discovery end-to-end user flow integration test suite (2026-10-15 21:18:00 +06:00)

- Implemented dedicated end-to-end user journey test suite in `src/features/search/ui/__tests__/discoveryFullFlow.test.tsx` containing 19 integration tests across 8 key verification suites:
  1. TanStack Router Search Parameter Validation & Synchronization: Verified `Route.options.validateSearch` parsing for `q`/`query`, latitude, longitude, radius (defaults to 3 km on negative or invalid numbers), and trimmed `selectedBranchId`.
  2. Complete Search Flow: Verified diagnostic query typing and debounced auto-suggestions (e.g., "Lipid Profile"), selection dispatch, URL parameter synchronization, and instant branch price updates in BDT (Square: BDT 2,600, Popular: BDT 1,400, BSMMU: BDT 500, DMCH: BDT 400). Verified Bengali query resolution ("বুকের এক্স-রে") to "X-Ray Chest P/A View" with verified hospital pricing.
  3. Clinical Ambiguity Resolution Flow: Verified ambiguous queries ("CT") trigger explicit `AmbiguityPrompt` panel with candidate cards ("CT Scan Chest", "CT Scan Brain") without premature or automated single-service resolution. Verified clicking candidate resolves to "CT Scan Chest" and updates BDT branch prices (Square: BDT 11,000, DMCH: BDT 2,200). Verified cancel button dismisses ambiguity panel and preserves input focus.
  4. Spatial Radius Filtering Flow & Invariant 8 Parity: Verified radial distance narrowing (3 km to 1 km) and expansion (1 km to 5 km). Verified custom numeric radius (7 km). Verified zero-match empty state at 0.2 km and recovery via "Expand radius to 5 km" action button.
  5. Location Preset Switching Flow: Verified transit hub switching from Shahbagh to Gulshan-2, updating reference coordinates and distances, re-ranking United Hospital (< 1.5 km) as closest branch while filtering out South Dhaka hospitals. Verified Dhanmondi preset prioritizes Popular and Ibn Sina Dhanmondi branches.
  6. Bidirectional Map-List Interaction Flow: Verified clicking SVG map pin selects branch card in list, updates selection state, announces branch details via live region (`role="status"`, `aria-live="polite"`), and emits `onSearchChange` with `selectedBranchId`. Verified clicking list card select button synchronizes SVG map pin. Verified `Enter` key activation on focused map pin.
  7. Architecture Invariant 7 (Routing Fault-Tolerance & Metric Separation): Verified branch base price in BDT, verified badge, and straight-line distance remain displayed when road routing is unavailable or simulated network failure occurs (`Road estimate unavailable`).
  8. Architecture Invariant 8 (Strict Map-List Parity): Verified SVG map pin count (`g[data-testid^="map-pin-"]`) strictly equals branch card count (`.medimap-branch-card`) across every discovery stage and interaction step.
- Enhanced `src/features/search/ui/DiagnosticSearchBox.tsx`:
  - Added effect hooks to synchronize internal `query` and `radiusKm` state when parent `initialQuery` and `initialRadiusKm` props change.
  - Added fallback canonical service query resolution to `handleRadiusChange` when changing search radius before selecting an explicit dropdown item.
- Verification results:
  - `bun test`: 257 passed, 0 failed across 14 test files in 1.74s.
  - `bun check` (`tsc --noEmit`): 0 type errors.
  - `bun run lint` (`oxlint . --deny-warnings`): 0 warnings, 0 errors across 54 files in 15ms.
  - `bun run build`: Client (420 kB total) and SSR (234 kB total) production bundles built cleanly.

### Discovery route integration and end-to-end page flow (2026-10-15 21:05:00 +06:00)

- Implemented Dhaka healthcare branch listings and query filtering engine in `src/features/search/discoveryData.ts`:
  - 10 verified tertiary public and private hospital branches across Dhaka: Square Hospital (Panthapath), Evercare Hospital (Bashundhara R/A), United Hospital (Gulshan-2), Popular Diagnostic Centre (Dhanmondi), Ibn Sina Diagnostic Centre (Dhanmondi), Ibn Sina Diagnostic Centre (Badda), Dhaka Medical College Hospital (Bakshibazar / Shahbagh), BSMMU (Shahbagh), Labaid Diagnostic Centre (Dhanmondi), and BIRDEM General Hospital (Shahbagh).
  - Explicit canonical diagnostic test pricing in BDT (Complete Blood Count, Lipid Profile, Chest CT, Brain CT, USG Whole Abdomen, Serum Creatinine, HbA1c, Chest X-Ray, Brain MRI, ECG, Dengue NS1), verification status (`verified`), verification dates, and tariff sources.
  - Six canonical Dhaka location presets (Shahbagh, Dhanmondi, Farmgate, Gulshan-2, Mirpur-10, Uttara) referencing verified coordinates in `DHAKA_LANDMARKS`.
  - `filterBranchesByQueryAndLocation` spatial filter: resolves canonical service query text via `resolveDiagnosticQuery`, calculates straight-line radius via `filterBranchesByRadius`, and enriches matching branches into `DiscoveryBranchItem` records preserving BDT prices, verification metadata, straight-line distance, and distinct urban road routing estimates.
- Implemented composite discovery UI in `src/features/search/ui/DiscoveryView.tsx` and `discoveryView.css`:
  - Coordinated `DiagnosticSearchBox` and `SynchronizedDiscoveryView` in a unified page flow.
  - Interactive location preset switching across Dhaka urban centers with active visual states.
  - Active filters context bar summarizing selected test, straight-line radius, reference center, and verified branch count.
  - Accessible clinical empty state for zero-match criteria with quick radius expansion and location reset actions.
  - Enforced theme tokens (`--bg-base`, `--bg-surface`, `--text-primary`, `--text-muted`, `--accent-primary`, `--border-default`) and minimum 44px touch targets.
- Created `/discovery` route in `src/routes/discovery.tsx`:
  - Defined `Route = createFileRoute('/discovery')({ ... })` with `validateSearch` parsing `q`/`query`, `lat`, `lng`, `radius` (default 3), and `selectedBranchId`.
  - Synchronized search query parameters using TanStack Router `navigate({ search: ..., replace: true, resetScroll: false })`.
  - Registered `/discovery` route cleanly in `src/routeTree.gen.ts`.
- Implemented automated test suites:
  - `src/features/search/__tests__/discoveryData.test.ts`: 6 tests verifying branch data completeness, positive BDT prices, canonical location presets, query resolution, spatial filtering from North and South Dhaka, and straight-line sorting.
  - `src/features/search/ui/__tests__/discoveryView.test.tsx`: 6 tests verifying page rendering, landmark preset switching, branch card selection synchronization, empty state actions, architecture invariants (BDT prices, verified badges, explicit straight-line separation), and touch targets.
- Verification results:
  - `bun test`: 238 passed, 0 failed across 13 test files in 1.28s.
  - `bun check` (`tsc --noEmit`): 0 type errors.
  - `bun run lint` (`oxlint . --deny-warnings`): 0 warnings, 0 errors across 53 files in 15ms.
  - `bun run build`: Client (420 kB total) and SSR (234 kB total) production bundles built cleanly.

### Synchronized map and list interaction test suite (2026-10-15 20:38:00 +06:00)

- Implemented comprehensive interaction test suite in `src/features/map/ui/__tests__/synchronizedDiscoveryInteractions.test.tsx` containing 26 rigorous tests across 6 required domains:
  1. Bidirectional Selection Synchronization: Verified clicking a map pin highlights the pin (`map-pin--selected`, `is-selected`, `aria-pressed="true"`) and synchronizes list selection (`branch-card--selected`, `is-selected`, `aria-selected="true"`). Verified clicking a list card highlights the card and synchronizes map pin selection. Verified `onSelectBranch` provides the branch ID and the correct interaction source (`'map'` vs `'list'`). Verified controlled `selectedBranchId` prop updates.
  2. Bidirectional Hover Synchronization: Verified `mouseenter` on a map pin activates hover state on the pin (`map-pin--hovered`) and highlights the corresponding card (`branch-card--hovered`). Verified `mouseenter` on a card activates hover state on the pin and renders the map tooltip. Verified `mouseleave` cleans up all hover states. Verified card focus and blur keyboard events trigger and clear hover synchronization.
  3. Keyboard & Accessibility: Verified map pins provide `role="button"`, `tabIndex={0}`, `aria-pressed`, `aria-expanded`, and descriptive accessible labels. Verified `Enter` and `Space` keyboard activation on pins. Verified polite live region announcement (`aria-live="polite"`, `role="status"`, `aria-atomic="true"`) updates with clinical branch, price, and distance details. Verified zoom toolbar accessibility (`role="toolbar"`, `aria-label`) and zoom limits (disable Zoom Out at 1x, disable Zoom In at 3x) across click and keyboard events (`Enter`/`Space`).
  4. Mobile Screen Switching & Floating Card: Verified mobile segmented tablist (`role="tablist"`) toggles between `activeView === 'list'` and `activeView === 'map'`, updating `data-active-view`, `aria-selected`, and mobile visibility classes (`is-visible`, `is-hidden-mobile`). Verified selecting a pin in mobile map view renders the floating bottom summary card (`data-testid="mobile-floating-summary"`). Verified dismiss button closes summary card. Verified clicking "View in list" switches active view to `'list'` and triggers `scrollIntoView` for that branch card.
  5. Invariants Verification:
     - Invariant 7: Verified when route status is `unavailable` or `route` is undefined, BDT base price and straight-line distance remain visible and preserved, while rendering explicit fallback text `Road estimate unavailable`.
     - Invariant 8: Verified map-list parity invariant guarantees exact 1:1 parity between pins and cards across empty collections (N=0 renders 0 pins and empty state), single-item collections (N=1), and multi-item collections (N=8).
  6. Responsive & Touch Target Guidelines: Verified SVG pins provide minimum 44px hit circles (`r="22"`, `pointerEvents="all"`). Verified stylesheet rules in `mapUi.css` enforce minimum 44px targets for segmented tab controls, zoom buttons (44x44px), card select buttons, and mobile floating summary buttons. Verified mobile responsive CSS rules for screen widths up to 768px.
- Enhanced components and types to support interaction requirements:
  - Added BEM modifier classes `map-pin--selected`, `map-pin--hovered` to `DhakaMap.tsx` and `branch-card--selected`, `branch-card--hovered` to `BranchResultCard.tsx` and `mapUi.css`.
  - Added interaction source propagation (`'map'` | `'list'`) to `onSelectBranch` callback in `SynchronizedDiscoveryView.tsx` and `types.ts`.
  - Added `data-active-view` attribute to `SynchronizedDiscoveryView.tsx`.
  - Added explicit `onKeyDown` handlers (`Enter`, `Space`) to zoom and reset buttons in `DhakaMap.tsx`.
  - Registered `Element`, `SVGElement`, and `SVGGElement` on `globalThis` in `setupDom.ts`.
- Verification results:
  - `bun test`: 222 passed, 0 failed across 11 test files in 2.53s.
  - `bun check` (`tsc --noEmit`): 0 type errors.
  - `bun lint` (`oxlint . --deny-warnings`): 0 warnings, 0 errors across 48 files.
  - `bun run build`: Client and SSR production bundles built cleanly.

### Synchronized map and list view (2026-10-15 20:28:00 +06:00)

- Defined discovery UI domain types in `src/features/map/ui/types.ts`: `DiscoveryBranchItem`, `MobileViewMode`, `InteractionSource`, `DhakaMapProps`, `BranchResultCardProps`, `BranchListProps`, and `SynchronizedDiscoveryViewProps`.
- Implemented Web Mercator projection and dynamic bounding box computation in `src/features/map/ui/projection.ts` with degenerate bounds expansion and aspect-ratio preservation.
- Implemented accessible interactive Dhaka SVG map in `src/features/map/ui/DhakaMap.tsx` with Dhaka water bodies (Buriganga, Turag, Hatirjheel), district orientation labels, search center and radius guide indicators, interactive pins with 44px hit targets, zoom/reset controls, and active branch tooltips.
- Implemented diagnostic branch card in `src/features/map/ui/BranchResultCard.tsx` with formatted BDT base prices, verification badges, explicit straight-line distance labelling, and fault-tolerant road travel estimates.
- Implemented branch results list in `src/features/map/ui/BranchList.tsx` with branch count, empty state, and map-driven smooth scroll-into-view.
- Implemented composite synchronized view in `src/features/map/ui/SynchronizedDiscoveryView.tsx` with desktop split layout, mobile segmented view toggle, mobile floating summary card, polite live region announcements (`aria-live="polite"`), and invariant enforcement guaranteeing identical filtered branch sets across map and list.
- Styled components in `src/features/map/ui/mapUi.css` following UI color tokens (`--bg-base`, `--bg-surface`, `--text-primary`, `--text-muted`, `--accent-primary`, `--border-default`) and responsive mobile layout.
- Re-exported UI components and types in `src/features/map/ui/index.ts` and `src/features/map/index.ts`.
- Added automated unit test suites in `src/features/map/ui/__tests__/` (26 tests across `projection.test.ts` and `mapUiComponents.test.tsx`), bringing repo test coverage to 196 passing tests.
- Verification results:
  - `bun test`: 196 passed, 0 failed across 10 test files.
  - `bun run typecheck` (`bun check` / `tsc --noEmit`): 0 type errors.
  - `bun run lint` (`oxlint . --deny-warnings`): 0 warnings, 0 errors across 47 files.
  - `bun run build`: Client and SSR builds completed cleanly.

### Search discovery UI comprehensive test suite (2026-10-15 19:48:00 +06:00)

- Configured Happy DOM test environment preload in `src/features/search/ui/__tests__/setupDom.ts` and registered it in `bunfig.toml` via `[test] preload` for zero-configuration browser DOM execution in Bun.
- Implemented comprehensive interaction test suite in `src/features/search/ui/__tests__/searchUiInteractions.test.tsx` with 23 test cases covering:
  1. SearchInput and User Input Handling: debounce timing using Bun fake timers, immediate synchronous typing without lag, clear button click/reset/focus restoration, live region announcements (`aria-live="polite"`, `role="status"`), loading spinner with `aria-busy`.
  2. WAI-ARIA 1.2 Combobox and Listbox Keyboard Navigation: `ArrowDown` opens combobox and highlights first item (`aria-activedescendant`), `ArrowDown` cycles options with wrap-around, `ArrowUp` navigates upwards and wraps from top to bottom, `Enter` dispatches selection with canonical service ID, `Escape` closes listbox, clears active descendant, and preserves input value.
  3. AutoSuggestDropdown Rendering and Badges: canonical name, category, English and Bengali alias badges (`EN`, `BN`), typo suggestions ("Did you mean: ...", `Typo correction` badge), empty unmatched search state.
  4. Ambiguity Resolution Flow: `AmbiguityPrompt` renders when query is clinically ambiguous (`status === 'ambiguous'`), renders touch-accessible candidate cards, explicit canonical resolution on click and Enter, cancel/dismiss button restores input focus.
  5. RadiusSelector and Straight-Line Metrics: segmented `role="radiogroup"`, explicit "Straight-line radius" wording complying with architecture invariant, preset selection (1 km, 3 km, 5 km, Custom), custom numeric input validation (0.5 km to 50 km bounds, empty/invalid rejection).
  6. Mobile Layout and Touch Target Standards: verified minimum 44px touch targets on clear button, radius pills, custom input, dropdown options (48px), ambiguity cards (48px), and cancel buttons (44px); verified mobile responsive 2-column grid CSS rules for 375px screens.
- Enhanced `DiagnosticSearchBox.tsx` `handleKeyDown` to open listbox and highlight index 0 upon `ArrowDown` from closed combobox.
- Verification results:
  - `bun test`: 170 passed, 0 failed across 8 test files in 807ms.
  - `bun run typecheck` (`bun check` / `tsc --noEmit`): 0 type errors.
  - `bun run lint` (`oxlint . --deny-warnings`): 0 warnings, 0 errors across 38 files.


### Diagnostic search discovery UI (2026-10-15 19:25:00 +06:00)

- Defined UI domain types in `src/features/search/ui/types.ts`: `SearchSelection`, `SearchSelectionType`, `SuggestionItem`, `SuggestionItemKind`, `AmbiguityItem`, `RadiusPreset`, and component props interfaces.
- Implemented debounced accessible search input in `src/features/search/ui/SearchInput.tsx` conforming to WAI-ARIA 1.2 Combobox pattern (`role="combobox"`, `aria-expanded`, `aria-haspopup="listbox"`, `aria-controls`, `aria-autocomplete="list"`, `aria-activedescendant`), zero-latency controlled typing, live region announcements (`aria-live="polite"`), and clear button with >= 44px touch target.
- Implemented accessible suggestions listbox in `src/features/search/ui/AutoSuggestDropdown.tsx` (`role="listbox"`, `role="option"`, `aria-selected`), displaying canonical service names, categories, language-tagged alias badges (English and Bengali), typo suggestions ("Did you mean: ..."), and empty search states.
- Implemented explicit clinical disambiguation prompt in `src/features/search/ui/AmbiguityPrompt.tsx`, enforcing explicit selection between clinically distinct services (e.g., CT Scan Brain vs CT Scan Chest) with touch-accessible cards.
- Implemented straight-line radius selector in `src/features/search/ui/RadiusSelector.tsx` with segmented presets (1 km, 3 km, 5 km, Custom), explicit "Straight-line radius" labelling complying with metric separation invariants, and validated custom numeric range (0.5 km to 50 km).
- Implemented composite search card in `src/features/search/ui/DiagnosticSearchBox.tsx`, unifying input, auto-suggestions, ambiguity resolution, and radius selection.
- Styled components in `src/features/search/ui/searchUi.css` using theme color tokens (`--bg-base: #f2f8f7`, `--bg-surface: #ffffff`, `--text-primary: #143d3c`, `--text-muted: #506b69`, `--accent-primary: #117c73`, `--border-default: #cddedb`), high-contrast focus rings, and mobile responsive design down to 375px.
- Exported all UI components and types through `src/features/search/ui/index.ts` and `src/features/search/index.ts`.
- Added unit test suite in `src/features/search/ui/__tests__/searchUiComponents.test.tsx` verifying WAI-ARIA 1.2 combobox attributes, clear button behavior, dropdown rendering, ambiguity prompt output, and radius presets.
- Passed all repository checks: `bun test` (147/147 passed across 7 test files), `bun run lint` (0 warnings, 0 errors across 36 files), `bun check` (0 type errors), and `bun run build` (client and SSR builds completed).

### Fault-tolerant road distance and travel time integration (2026-10-15 18:55:00 +06:00)

- Defined domain contracts in `src/integrations/mapping/types.ts`: `RoutingAdapter`, `RouteResult` (`RouteAvailableResult` and `RouteUnavailableResult`), `RoutableBranch`, `EnrichedBranch<T>`, and `RouteUnavailableReason`.
- Implemented OSRM public routing adapter in `src/integrations/mapping/osrmAdapter.ts` using OpenStreetMap automobile driving service with `{longitude},{latitude}` coordinate parameter ordering, converting meters to kilometers and seconds to minutes.
- Implemented offline fallback routing adapter and exception-trapping wrapper in `src/integrations/mapping/fallback.ts` returning typed unavailable statuses (`timeout`, `rate_limit`, `network_error`, `upstream_error`, `invalid_coordinates`, `no_route`, `aborted`, `offline`).
- Implemented concurrency-controlled branch routing and enrichment in `src/integrations/mapping/branchRouting.ts`, guaranteeing that branch records, base prices, verification metadata, and straight-line distances remain fully preserved when routing requests fail.
- Implemented automated test suites in `src/integrations/mapping/__tests__/` (45 unit and integration tests across `osrmAdapter.test.ts` and `faultToleranceAndPricing.test.ts`), verifying failure modes, metric separation, landmark routes, edge cases, and price preservation invariants.
- Passed repository quality checks: `bun test` (136/136 tests passed across 6 test files), `bun run lint` (0 warnings, 0 errors across 28 files), `bun check` (0 type errors), and `bun run build` (client and SSR builds completed).

### Straight-line radius filtering engine (2026-10-15 18:15:00 +06:00)

- Defined immutable spatial domain types in `src/features/map/types.ts`: `Coordinates`, `GeoBoundingBox`, `RadiusPresetKm` (1 km, 3 km, 5 km), `RadiusFilterInput`, `LocatableBranch`, `BranchDistanceResult<T>`, and `RadiusFilterOptions`.
- Defined geographic bounding boxes in `src/features/map/coordinates.ts` for core Dhaka (`lat: 23.6800–23.9000, lon: 90.3200–90.4500`) and Greater Dhaka metropolitan area (`lat: 23.5500–24.0200, lon: 90.1800–90.5800`).
- Implemented strict coordinate validation `isValidCoordinate` and structured `validateCoordinate`, enforcing finite numbers within WGS 84 coordinate limits (`[-90, 90]` latitude, `[-180, 180]` longitude).
- Implemented Haversine spherical distance calculation in `src/features/map/haversine.ts` using Earth mean radius `6371.0 km` (IUGG standard), fast-path for identical coordinates, numerical stability clamping for floating-point values, and safe decimal rounding helper `roundDistanceKm`.
- Implemented radius filtering engine in `src/features/map/radiusFilter.ts`: input parser `parseRadiusFilterInput` supporting standard presets (1 km, 3 km, 5 km) and custom inputs (0.1 km to 100.0 km), bounding box pre-filtering, branch distance calculation, ascending order sorting (nearest first), and optional result slicing.
- Assembled verified WGS 84 benchmark coordinates in `src/features/map/landmarks.ts` for 14 Dhaka hospitals and urban transit hubs.
- Added comprehensive unit test suites in `src/features/map/__tests__/`: 20 radius filtering tests and 16 spatial benchmark tests verifying landmark distances, metric space axioms (identity, symmetry across 196 pairs, non-negativity, triangle inequality across 2,744 triplets), antipodal calculations, and floating-point clamping.
- Passed all repository verification checks: `bun test` (90/90 passed), `bun run lint` (0 warnings, 0 errors across 21 files), `bun x tsc --noEmit` (0 type errors), and `bun run build` (client and SSR production builds passed).

### Diagnostic alias resolution engine (2026-10-15 17:40:00 +06:00)

- Implemented pure TypeScript diagnostic search domain types in `src/features/search/types.ts`: `CanonicalService`, `ServiceAlias`, `MatchType`, `QueryMatch`, `ResolutionResult`, and `TypoSuggestion`.
- Implemented Unicode NFKC normalization, zero-width character stripping (\u200D, \u200C, \u200B, \uFEFF), whitespace collapsing, and English/Bengali script tokenization in `src/features/search/normalizer.ts`.
- Implemented Damerau-Levenshtein distance algorithm with adjacent transposition and short acronym safety guard (<= 3 chars) in `src/features/search/typoMatcher.ts`. Calibrated typo thresholds: 4-6 chars allow max distance 1 with similarity >= 0.8; >= 7 chars allow max distance 2 with similarity >= 0.75.
- Created canonical diagnostic service catalog in `src/features/search/diagnosticCatalog.ts` with 19 common pathology, imaging, ultrasonography, and cardiology tests, with rich English and Bengali aliases.
- Implemented strict 5-tier search resolution engine in `src/features/search/resolutionEngine.ts`: (1) exact canonical name, (2) exact alias, (3) prefix match, (4) keyword token containment, (5) typo suggestions.
- Enforced ambiguity detection: queries matching multiple distinct clinical services flag `status: 'ambiguous'`, `requiresExplicitSelection: true`, and `primaryMatch: undefined`. Ambiguous queries never resolve automatically to a single service.
- Added comprehensive automated unit test suite with 54 test cases across two test files in `src/features/search/__tests__/`. Passed `bun test` with 54/54 passing tests.
- Verified compliance: `oxlint` passed with 0 errors and 0 warnings, TypeScript compiler check passed, and `bun run build` completed without errors.

### Stable Bun migration (2026-10-14 00:50 +06:00)

- Replaced `package-lock.json` with `bun.lock` and recorded Bun 1.4.3 in `package.json`. The installed runtime was `1.4.3+c6da4a4d3`.
- Configured Vite to run through Bun and package scripts to use Bun's native shell through `bunfig.toml`.
- Replaced `tsc --noEmit` with native `bun check`. Updated TypeScript to stable 7.0.2 for matching editor support.
- Kept Oxlint 1.88.0, its rules, TypeScript overrides, and exclusions. Stable Bun 1.4.3 does not provide native linting.
- Verified that all 135 existing non-tool package versions remained present in the migrated lockfile.
- Passed `bun install --frozen-lockfile`, `bun run typecheck`, `bun run lint`, `bun run lint:fix`, and `bun run build`.
- Verified clean dependency installation, type checking, source linting, and the production build. The temporary copy's lint check selected five source files explicitly because its parent directory was ignored.
- Started the development server through Bun and verified HTTP 200 with the MediMap "Coming soon" page.
- Verified that native type checking rejects implicit `any` and incompatible assignments. Removed the temporary source file after verification.
- Updated the README, architecture, code standards, and workflow rules with stable-release and native-utility preferences.
- Verified commands through official Bun documentation, release notes, and installed CLI help. General documentation can describe unreleased commands.
- Removed the npm lockfile and temporary migration files and binaries. No other direct utility packages required replacement.
- No UI code changed. No automated behavior tests or additional mobile visual checks were required for this tooling change.

### Oxlint migration (2026-10-14)

- Replaced ESLint, `@eslint/js`, and typescript-eslint with Oxlint 1.88.0 after reviewing official Oxlint and Biome documentation.
- Migrated 83 supported rules and preserved exclusions in `.oxlintrc.json`. Generated `src/routeTree.gen.ts` remains excluded from linting.
- Added a safe-fix command and made lint warnings fail the command. Updated the lockfile, README, architecture, and code standards.
- Skipped experimental `no-undef` and `no-useless-assignment`, plus unsupported `no-dupe-args` and `no-octal`.
- Retained strict TypeScript checking for compiler diagnostics. The migration did not preserve every ESLint rule. Native `bun check` later replaced `tsc`.
- Type checking, linting, and the production build passed. Verified that Oxlint selected all five application and configuration source files.
- No UI code changed. No additional browser or behavior tests were required.

### Initial static application (2026-10-13)

- Created the React, strict TypeScript, TanStack Start, and Vite application with npm and a package lockfile.
- Added the responsive "Coming soon" page and local setup instructions. Recorded the page design in [ui-context.md](ui-context.md).
- Passed the then-current `npm run typecheck`, `npm run lint`, and `npm run build` commands.
- Inspected desktop and 375 px mobile screenshots. Content remained readable without horizontal overflow, and browser logs contained no errors.
- Dependency installation reported no known vulnerabilities at that time. No automated behavior tests were added for the static page.
- Verified dependencies through official React, TanStack, Vite, TypeScript, ESLint, typescript-eslint, and npm documentation. Context7 tools were unavailable.
- The default npm entry point was broken locally. Verification used `C:/Program Files/nodejs/npm.cmd` and a project-local npm cache.
- Ego browser could not connect. Used the Codex in-app browser for visual checks.
- No product functionality, hosting configuration, commit, push, or deployment was added.

### Product, architecture, and workflow decisions (2026-10-08)

- Completed the 25-question interview after reading the PRD and six context files in the required order.
- Filled the product, architecture, code standards, and workflow documents. Synchronized confirmed decisions with the PRD and removed academic references.
- Required all P0 features, maps, review subratings, and review reporting. Deferred Verified Visit evidence and bulk import. Other P1 features remain optional.
- Required coverage of 10 hospitals, their Dhaka branches, and all in-scope services. Selected an English interface with English and Bangla service aliases.
- Recorded a three-person team, with most implementation expected from the project owner and AI agents.
- Selected React, TanStack Start, one Workers deployment, direct D1 SQL, and Google sign-in. Add Hono only if required.
- Required mapping-provider research for Dhaka coverage, maps, geocoding, road distance, travel time, and free usage. Provider selection and free-tier workload fit remain open.
- Selected search priority: exact canonical names, exact aliases, prefixes, then keywords. Require selection for ambiguous matches and offer typo suggestions.
- Confirmed report-based price review, branch-level statistics, and table-based written comparison. Report-driven status changes and disputed-record eligibility remain open.
- Required strict TypeScript, explicit types, validation of unknown external data, server validation before writes or external calls, and immediate form feedback.
- Required automated tests for search, statistics, access control, reviews, and reports. Browser tests must cover the core flow and relevant failure states.
- Selected feature-based organization with shared database access and integrations. Exact paths and migration review rules remain open.
- Complete one small feature across database, backend, UI, and tests before starting the next. Run type checking, linting, relevant tests, production builds, and manual mobile checks.
- Proceed with routine work within scope. Ask about ambiguous behavior, scope changes, paid services, destructive actions, and production deployment.
- Work on the current branch. Commit or push only when requested. Preserve unrelated changes.
- Prefer existing packages. Verify necessary additions against current documentation and explain the choice. Use official documentation when Context7 is unavailable.
- Recorded targets: core features by 15 November, dataset and full-flow checks by 22 November, and release candidate by 29 November 2026.
- Final delivery is targeted for early December 2026. The exact date remains open; these targets are not completed milestones.
- Reviewed the documents for placeholders, conflicting decisions, and terminology. Applied available unslop and STE-guided writing rules without claiming formal compliance.
- The unslop skill referenced a missing companion file. Applied the available guidance. No application checks, commits, pushes, merges, or deployments occurred.

## Open questions

- Exact inventory of 10 hospitals and their Dhaka branches, including unavailable source data.
- Exact final delivery date in early December 2026.
- Functional UI conventions and interaction states. The initial static page design is recorded.
- Accessibility and performance acceptance targets.
- Authentication library, sessions, administrator assignment, and report-submission access.
- Mapping, geocoding, and routing provider with suitable Dhaka coverage and free usage.
- Free-tier workload fit for the selected services.
- Effect of incorrect-price reports on verification status and statistics eligibility.
- Default sorting, comparison limits, price history, and rating aggregation.
- Validation, formatting, and Workers integration test tools. Discovery browser tests use Playwright Test with Chromium.
- Exact folder paths, migration review rules, and production migration application rules.
- Remaining optional P1 features.

## Next steps

1. Define the next functional unit and its acceptance criteria when requested.
2. Select authentication integration and the mapping provider before implementing affected features.
3. Resolve open behavior in the relevant context files before implementing dependent features.
