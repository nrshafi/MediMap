# Progress tracker

Update this file after each meaningful implementation change. Include the current date and time in Asia/Dhaka.

Last updated: 13 October 2026, 23:46 Asia/Dhaka.

## Current phase

The initial React and TypeScript application is complete.
The application shows a static "Coming soon" page.

## Current goal

The ESLint replacement with Oxlint is complete.
No application feature is currently in progress.

## Completed

- Replaced ESLint, `@eslint/js`, and typescript-eslint with Oxlint 1.88.0.
- Migrated 83 supported rules and preserved exclusions in `.oxlintrc.json`.
- Added `npm run lint:fix`. The lint commands fail on warnings.
- Passed Oxlint, TypeScript checking, and the production build after migration.
- Verified Oxlint selects all five application and configuration source files and excludes generated files.
- Created the React, strict TypeScript, TanStack Start, and Vite application with npm and a package lockfile.
- Added the responsive "Coming soon" page and short README with local commands.
- Recorded the static page design in `ui-context.md` and the setup in `architecture.md`.
- Passed `npm run typecheck`, `npm run lint`, and `npm run build`.
- Inspected desktop and 375 px mobile screenshots. Content remained readable without horizontal overflow.
- Checked browser error logs. No errors were recorded.
- Dependency installation reported no known vulnerabilities.
- Read the PRD and six context files in the required order.
- Apply the available workspace writing guidance.
- Complete the 25-question interview across product, architecture, code standards, and AI workflow.
- Fill `project-overview.md`, `architecture.md`, `code-standards.md`, and `ai-workflow-rules.md` from confirmed decisions.
- Synchronize newer product and architecture decisions with the PRD.
- Remove academic references from product documentation.
- Record the delivery schedule and implementation checks.

## In progress

- No application feature is in progress.

## Next up

1. Define the next functional unit and its acceptance criteria when requested.
2. Select authentication integration and the mapping provider before use.
3. Resolve open behavior before implementing each affected feature.

## Delivery targets

| Milestone | Date |
| --- | --- |
| Core features | 15 November 2026 |
| Dataset and full-flow checks | 22 November 2026 |
| Release candidate | 29 November 2026 |
| Final delivery | Early December 2026, exact date open |

## Open questions

- Exact inventory of 10 hospitals and their Dhaka branches, including unavailable source data.
- Exact final delivery date in early December 2026.
- Functional UI conventions and interaction states. The initial static page design is recorded.
- Accessibility and performance acceptance targets.
- Authentication library, sessions, administrator assignment, and report-submission access.
- Mapping, geocoding, and routing provider with suitable Dhaka coverage and free usage.
- Free-tier workload fit for the selected services.
- Effect of an incorrect-price report on verification status and statistics eligibility.
- Default sorting, comparison limits, price history, and rating aggregation.
- Validation, formatting, and test tools for functional features. Initial package versions are recorded in the package files.
- Exact folder paths and migration review and production application rules.
- Remaining optional P1 features.

## Architecture decisions

- React with TanStack Start, with server rendering for public service and branch pages.
- One Workers application deployment with separate internal feature modules.
- Cloudflare D1 through direct prepared SQL queries and versioned SQL migrations. No ORM by default.
- Google sign-in only for the first version. Assign administrator access separately.
- Hono only if required. Mapping provider remains open pending research.
- Keep providers, branches, canonical services, aliases, branch-service listings, prices, and sources distinct.
- Use straight-line radius for branch eligibility. Display road distance and travel time separately.
- Prices do not expire because of age. Reports trigger review. Display verification dates.
- Default statistics use one eligible price per active branch-service listing and require at least three eligible branches.
- Show eligible branch and distinct provider counts.
- Written comparison uses tables. Numerical statistics apply to numerical values. Retain comparison charts.
- Core search and pricing must tolerate routing failures. Map and list results must represent the same filtered set.

## Workflow decisions

- Complete one small feature through database, backend, UI, and tests before starting the next.
- Proceed with routine implementation within scope. Ask about ambiguity, scope changes, paid services, destructive actions, and production deployment.
- Work on the current branch. Commit or push only when requested.
- Prefer existing packages. Verify necessary additions and explain the choice.
- Require type checking, linting, relevant tests, production build, and manual mobile checks for feature completion.

## Session notes

- Selected Oxlint after checking the official Oxlint and Biome documentation. The requested change concerns linting; formatting remains open.
- The migration skipped experimental `no-undef` and `no-useless-assignment`, plus unsupported `no-dupe-args` and `no-octal`.
- The project source is TypeScript. Keep strict `tsc` checks for undeclared names and compiler diagnostics. The migration does not preserve every ESLint rule.
- Removed the ESLint configuration and dependencies. Updated the lockfile, README, architecture, and code standards.
- No UI code changed during the lint migration. No additional browser or behavior tests were required.
- Removed the decorative "+" mark beside the header product name at the user's request.
- Type checking, linting, and the production build passed after the removal. Checked the updated header at desktop and mobile widths.
- Created the static application on 13 October 2026. No product functionality, hosting configuration, commit, push, or deployment was added.
- Verified dependency APIs through official React, TanStack, Vite, TypeScript, ESLint, typescript-eslint, and npm documentation.
- Context7 tools were unavailable. Used the official documentation fallback.
- No automated behavior tests were added for this static page. Type checking, linting, build, and visual checks passed.
- The default npm entry point is broken on this machine. Checks used `C:/Program Files/nodejs/npm.cmd` and a project-local npm cache.
- Ego browser could not connect. Used the Codex in-app browser for visual checks and left the development preview open.
- Preserved the existing presentation files and earlier progress notes.
- Created a seven-slide project presentation at `artifacts/presentation/output/MediMap.pptx` on 13 October 2026.
- Covered the project description, solution approach, selected stack, technology choices, delivery status, and existing commit evidence.
- Identified selected technologies and delivery milestones as planned work. The two existing commits contain project setup and documentation.
- Reviewed all slides visually. Package, layout, font, import, and XML schema checks passed for the final presentation.
- Added speaker notes with project sources and links to both commits. No application implementation, commit, push, or deployment occurred.

- All 25 interview questions are answered. The remaining questions belong to UI planning or affected implementation units.
- Record proposals as proposals until selected. Do not invent answers to open questions.
- Preserve unrelated changes. No commits, pushes, merges, or deployments were performed.
- Reviewed the completed documents for placeholders, outdated interview status, terminology, and conflicting decisions. Application checks were not applicable to these documentation-only changes.
- Context7 tools were unavailable. Current official documentation provided the verification fallback.
- The unslop skill references a missing companion file. Apply the available unslop and ASD-STE100 guidance without claiming formal STE compliance.
- Keep documentation product-focused and follow the user's terminology restrictions.

## Interview decisions recorded on 8 October 2026
- Q1: All P0 features plus maps, review subratings, and review reporting are required. Defer visit evidence and bulk import.
- Q2: Cover 10 hospitals, their Dhaka branches, and all their in-scope diagnostic services.
- Q3: English interface with English and Bangla service aliases for the current version.
- Q4: Early December 2026 submission. Develop before submission. Three-person team, with most implementation by the owner and AI agents.
- Q4: React, TanStack, Workers, D1, and Hono only if required. Mapping provider remains open.
- Q5: Use free tiers first. Ask before enabling paid services. Verify Cloudflare workload fit rather than assuming sufficiency.
- Updated the PRD with these newer explicit decisions.
- Context7 tools are unavailable in this session. Use current official documentation as the verification fallback.

- Q6: TanStack Start with React, with server rendering for public service and branch pages.
- Q7: One Workers application deployment with separate internal public, administration, and backend modules.
- Q8: Direct D1 prepared SQL queries and versioned SQL migrations. Do not add an ORM by default.
- Q9: Google sign-in only for the first version. Assign administrator access separately.
- Q10: Research providers before selection. Verify Dhaka coverage, maps, typed-location lookup, road distance, travel time, and free usage.
- Extend the interview to 25 questions to cover architecture, code standards, and workflow in five-question batches.

- Q11: Straight-line radius determines branch eligibility. Road distance and travel time are separate labeled values.
- Q12: Canonical names, aliases, prefixes, then keywords. Offer typo suggestions and require selection for ambiguous matches.
- Q13: Never mark a price stale because of age. Reports trigger review; the exact report-driven status change remains open.
- Q14: One current verified non-stale price per active branch-service listing. Show branch and provider counts. Require three eligible branches for aggregate statistics.
- Q14: The selected freshness policy has no age cutoff. Clarify disputed-record eligibility before implementation.
- Q15: Written comparison in tables, with statistics for numerical values only. No generated narrative summaries. Retain comparison charts.

- Q16: Strict TypeScript, explicit types, avoid `any`, and validate unknown data.
- Q17: Server validation before writes or external calls, plus form validation for immediate feedback.
- Q18: Feature-based code organization with shared database access and integrations.
- Q19: Automated tests for search, statistics, access control, reviews, and reports. Browser tests cover the core flow.
- Q20: Type checking, linting, relevant tests, production build, and manual mobile checks are required for feature completion.
- Filled `code-standards.md` from the confirmed interview decisions and existing project requirements.

- Q21: Complete one small feature across database, backend, UI, and tests before starting the next.
- Q22: Proceed with routine implementation. Ask about ambiguity, scope changes, paid services, destructive actions, and production deployment.
- Q23: Work on the current branch. Commit or push only when requested.
- Q24: Prefer existing packages. Add necessary dependencies after documentation, compatibility, and maintenance checks. Explain the choice.
- Q25: Core features by 15 November, dataset and full-flow checks by 22 November, release candidate by 29 November 2026.
- Keep prose product-focused and omit academic references.

