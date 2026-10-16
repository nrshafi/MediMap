# Red01s change review

Reviewed on 16 October 2026. The scope is six commits from `1c089e8` through `f16000a`, compared with `88caff9`.
The refreshed GitHub `origin/main` reference ends at `f16000a`.
Requirements came from `PRD.md` and the six context documents. No originating issue reference was available.
The review evaluates code and behavior. The commit history does not establish which model generated the code.

## Standards

| Priority | Finding | Repair |
| --- | --- | --- |
| P1 | Discovery chose the first ambiguous match and substituted CBC for unknown queries. | Return no branches until the query resolves without ambiguity or the user selects a suggestion. |
| P1 | Discovery invented road distance and duration with multipliers. | Preserve unavailable routing values. Disable automatic external routing until provider selection. |
| P1 | Sample prices carried invented source labels, verified status, and verification dates. | Separate fixtures, remove unsupported metadata, and label sample data on the page and cards. |
| P2 | One rejected adapter request discarded the complete batch result. | Apply fallback handling to each destination. Preserve branch and price records. |
| P2 | Numeric URL parsing accepted trailing garbage and inconsistent radius bounds. | Parse complete numbers, validate coordinate pairs, and reuse the domain radius bounds. |
| P2 | OSRM classified every HTTP 400 as invalid coordinates. Invalid JSON became a network error. | Read OSRM error codes and classify malformed payloads as upstream errors. |
| P2 | Invalid distances became zero. Spatial functions accepted invalid coordinates, limits, and radius tags. | Validate inputs, reject invalid calculations, and omit branches without usable coordinates. |

The fixture extraction also separates sample records from filtering. Discovery domain types no longer depend on UI-owned types.
Search rejects queries longer than 256 normalized characters before fuzzy matching. Length checks avoid unnecessary edit-distance matrices.

## Spec

| Priority | Requirement and defect | Repair |
| --- | --- | --- |
| P1 | "Require user selection when a match is ambiguous." Discovery bypassed this rule. | Ambiguous direct URLs show selection instructions and no branch results. |
| P1 | "Show branch-specific base prices with sources, verification status, and verification dates." Samples appeared verified. | Mark the route as a demonstration. Preserve actual source and date fields when provided. Support unknown prices and dates. |
| P1 | "Unknown ... travel estimates remain distinguishable from known values." Discovery fabricated available estimates. | Display routing as unavailable and preserve the branch results. |
| P1 | "Keep clinically meaningful service variants distinct." Aliases equated panels, broad categories, and specific tests. | Remove unsupported equivalences, including Thyroid Profile to TSH, KFT to creatinine, and HRCT Chest to CT Chest. |
| P2 | Search suggestions repeatedly reopened after selection or dismissal. | Decouple debounce timing from callback identity. Clear stale suggestions and external selection state. |
| P2 | The map circle always represented approximately 3 km. | Pass the active radius through the map components. |
| P2 | Radius controls retained old state after external radius changes. | Synchronize controls with the controlled radius and share the 0.1 to 100 km range. |
| P2 | Controlled mobile selection made summary dismissal ineffective. | Track dismissed summaries independently and reset dismissal after a new selection. |

Browser checks found two additional layout defects. The map stylesheet was never imported, so mobile panels and icons rendered incorrectly.
The mobile summary used an unpositioned parent and appeared outside the map. Both defects are repaired.
Mobile view tabs now have unique identifiers, keyboard navigation, and one tab stop. Nested keyboard events no longer select a branch twice.
The route has a discovery-specific title and a `noindex` directive because its records are samples.
Removed the `check` package script that shadowed native `bun check`. The documented type-check command now uses Bun's native checker.

## Verification

- Automated tests cover domain rules and DOM interactions. They do not replace real-browser checks or verify provider data.
- Browser checks cover a 375 by 812 viewport, explicit CT variant selection, map selection, summary dismissal, and unknown-query behavior.
- Mobile inspection confirmed that the stylesheet loads, the map and list switch, and the summary stays inside the map.
- All 283 tests pass across 14 files. Native Bun type checking and linting pass.
- The production build result is recorded in `progress-tracker.md`.

## Remaining product work

The discovery route remains a demonstration. It has no source-backed price dataset or D1 repository integration.
Current-location access, typed location input, and map-location selection remain unfinished. Mapping-provider selection remains open.
The location schematic uses illustrative geography. Its landmark coordinates have not been verified against provider sources.
Automated DOM tests do not establish complete accessibility conformance or real-device touch-target acceptance.
No commit, push, or deployment is part of this repair.

## Documentation checked

- [React effect dependencies](https://react.dev/reference/react/useEffect), matched to installed React 19.3.1 definitions.
- [TanStack Router search parameters](https://tanstack.com/router/latest/docs/framework/react/guide/search-params), checked with installed Router types.
- [OSRM API](https://project-osrm.org/docs/v5.24.0/api/) for response codes, distances, and durations.
- [Bun test documentation](https://bun.com/docs/test/writing-tests) and installed Bun 1.4.3 command help.
- [NHS thyroid function test definitions](https://www.gloshospitals.nhs.uk/our-services/services-we-offer/pathology/tests-and-investigations/thyroid-function-tests-tsh-ft4-ft3/) distinguish TSH, FT4, and FT3.

Initial review findings: seven Standards findings and eight Spec findings. Each axis contained P1 data-integrity defects, repaired as described.
