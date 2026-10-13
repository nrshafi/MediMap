# Code standards

## General

- Keep modules focused on one responsibility.
- Group application code by feature. Share database access and external integrations.
- Keep product behavior consistent with `project-overview.md` and the invariants in `architecture.md`.
- Fix the cause of a defect. Do not hide invalid data or failed operations.
- Preserve unknown values. Do not replace missing prices, ratings, hours, or travel estimates with zero or invented defaults.

## TypeScript

- Enable strict mode throughout application code.
- Avoid `any`. Use explicit types and narrow `unknown` before use.
- Validate unknown external data at system boundaries.
- Do not use type assertions to bypass missing validation.
- Keep client-visible data types separate from secrets and server-only records.

## React and TanStack Start

- Use React with TanStack Start as defined in `architecture.md`.
- Use server rendering for public service and branch pages.
- Keep database access, authentication checks, and server secrets out of browser code.
- Keep route code focused on request handling and feature orchestration.
- Keep search rules, statistics, and other domain calculations separate from rendering code.
- Verify framework APIs against current official documentation and selected package versions before use.

## Validation and access control

- Validate server input before database writes or external calls.
- Validate forms to give immediate feedback. Client validation does not replace server validation.
- Validate external responses before using them as trusted application data.
- Enforce authentication, administrator access, and review ownership on the server.
- Use consistent error responses. Do not expose secrets or internal diagnostic details to users.
- Choose validation libraries and response contracts during implementation, after documentation checks.

## Data and SQL

- Access D1 through direct prepared SQL queries with bound input values.
- Do not concatenate user input into SQL.
- Keep queries in server-side repositories, outside UI components.
- Store schema changes in versioned SQL migrations.
- Preserve price sources and verification metadata.
- Apply the report-based freshness policy. Do not add an age-based expiry rule.
- Keep one eligible price per branch-service listing in default statistics.
- Test query results and relationships against the documented data rules.

## File organization

Organize modules by feature, such as search, catalog, prices, comparison, reviews, reports, and administration.
Keep shared database access, authentication, external integrations, and reusable UI separate from feature-specific code.
Finalize directory names when the application scaffold is selected. The following responsibilities are required:

| Area | Responsibility |
| --- | --- |
| Routes | Public and administrative page entry points and request handling. |
| Feature modules | Feature-specific components, validation, orchestration, and domain rules. |
| Database access | Shared D1 access and server-side repositories. |
| Integrations | Authentication, mapping, geocoding, and routing adapters. |
| Shared UI | Reusable presentation components. |
| Migrations | Versioned SQL schema changes. |
| Tests | Domain, integration, and browser verification. |

## Styling and UI

The initial static page uses the design conventions in `ui-context.md`. Functional UI conventions remain pending.
Do not treat example values in the UI template as selected fonts, colors, component libraries, or layout rules.
Check changed screens on mobile before considering a feature complete.

## Required automated tests

- Verify canonical names, aliases, match priority, and ambiguous service selection.
- Verify price statistics, record eligibility, sample thresholds, and branch/provider counts.
- Verify public access, authenticated actions, administrator restrictions, and review ownership.
- Verify one active review per user and branch-service listing, including editing.
- Verify report submission and the selected administrative resolution workflow.
- Add browser tests for the core search, location, results, comparison, review, and report flows.
- Test failure states that can break core flows, including routing failure and missing values.
- Select test tools after checking compatibility with the installed framework and Workers environment.

## Completion checks

Before completing a feature:

1. Run type checking.
2. Run linting.
3. Run relevant automated tests.
4. Run the production build.
5. Check changed screens manually on mobile.
6. Record completed work and any unresolved checks in `progress-tracker.md`.

The initial application uses `npm run typecheck`, `npm run lint`, and `npm run build`.
Use Oxlint for linting. Preserve supported rules and exclusions when migrating the existing ESLint configuration.
Run `npm run lint:fix` to apply safe fixes. Lint warnings must fail the command.
TanStack Start generates `src/routeTree.gen.ts`. Exclude this generated file from linting and do not edit it manually.
Do not claim a check passed unless it ran successfully.
Documentation-only changes require document review. Application checks apply when application code exists or changes.

## Documentation verification and writing

- Verify third-party APIs, libraries, frameworks, SDKs, and CLI tools against current documentation.
- Match implementation details to selected or installed package versions.
- Core language built-ins do not require documentation lookups.
- Apply `.agents/skills/unslop/SKILL.md` to prose.
- Apply `.agents/skills/asd-ste100/SKILL.md` to English technical prose.
- Preserve exact identifiers, commands, paths, and externally controlled wording.

## Documentation checked

Checked on 8 October 2026:

- [TypeScript strict mode](https://www.typescriptlang.org/tsconfig/strict.html).
- [D1 prepared statements](https://developers.cloudflare.com/d1/worker-api/prepared-statements/).
- [TanStack Start on Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/).

## Pending decisions

- Additional feature paths, formatter, validation library, and test tools. The application uses npm and Oxlint.
- Migration review and production application rules.
- UI conventions, accessibility targets, and performance thresholds.
