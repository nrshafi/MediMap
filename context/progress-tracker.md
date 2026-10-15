# Progress tracker: MediMap

Update after each meaningful implementation change. Include the exact date and time in Asia/Dhaka, such as `2026-10-14 01:05:33 +06:00`.
Add new completed milestones first. Record changes, verification results, and unresolved checks.
Older milestones retain the date and time precision available in the original record.

Last updated: `2026-10-15 18:15:00 +06:00`.

## Current phase

Straight-line radius filtering engine implemented in `src/features/map/`.
Diagnostic search and alias resolution engine operational in `src/features/search/`.
Static landing page and client routing remain operational.

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
- Validation, formatting, and integration and browser test tools for functional features.
- Exact folder paths, migration review rules, and production migration application rules.
- Remaining optional P1 features.

## Next steps

1. Define the next functional unit and its acceptance criteria when requested.
2. Select authentication integration and the mapping provider before implementing affected features.
3. Resolve open behavior in the relevant context files before implementing dependent features.
