# Architecture context

## Decision status

This document records confirmed constraints. Unanswered architecture questions remain open and do not authorize implementation choices.

## Stack

| Layer | Selected technology | Role and pending decisions |
| --- | --- | --- |
| UI | React | User-selected UI technology. |
| Application framework | TanStack Start with React | Server rendering for public service and branch pages. |
| Runtime and hosting | Cloudflare Workers | One application deployment with separate internal modules. |
| Database | Cloudflare D1 | Direct prepared SQL queries and versioned SQL migrations. No ORM selected. |
| HTTP routing | Hono if required | Optional. Decide after the application structure is selected. |
| Authentication | Google sign-in | Only sign-in method for the first version. Authentication library and session implementation remain open. |
| Mapping and routing | Pending provider research | Check Dhaka coverage, maps, geocoding, road distance, travel time, and free usage before selecting a provider. |

Package versions are not selected. Verify current official documentation and installed versions before implementation.

## System boundaries

Separate the user interface, search logic, application logic, database access, location integration, authentication, and administration.
Use one Workers application deployment. Keep public pages, administration, backend logic, database access, and integrations in separate internal modules. Organize application modules by feature. Share database access and integrations. Exact folder names remain open.
The browser must not access D1 directly or receive server secrets.

## Storage model

D1 stores relational application records for providers, branches, categories, canonical services, aliases, branch-service listings, prices, sources, reviews, and reports.
Keep original provider service names separate from canonical service names.
Keep price sources and verification information associated with branch-specific prices.
Verified Visit evidence uploads are deferred from the required release. No evidence-storage product is selected.

## Authentication and access

- Browsing, service search, and comparison are public.
- Review submission, review editing, and review reporting require an account.
- Users can edit their own reviews.
- Administrators maintain core published data and moderate reviews and reports.
- Users submit data corrections as reports. Users cannot directly overwrite published core data.
- Google sign-in is the only account method for the first version. Assign administrator access separately from ordinary sign-in.
- Authentication library, sessions, report-submission access, and administrator assignment rules remain open.

## Invariants

1. Prices apply to a specific branch and canonical diagnostic service.
2. Show standard/base prices in BDT. Exclude promotional prices.
3. Keep clinically meaningful service variants distinct.
4. Reviews apply to a specific branch-service listing.
5. Allow one active review per user and branch-service listing.
6. Show price-verification status and verification dates without inventing missing values.
7. Core branch and pricing information must remain available when routing fails.
8. Map results and list results must represent the same filtered result set.
9. Enforce administrative access on the server.
10. Do not infer medical suitability from price or ratings.

## Budget constraints

Use free tiers first. Obtain explicit approval before enabling a paid service.
Cloudflare free-tier suitability must be checked against the expected workload.
Map, geocoding, and routing services require separate capability and billing checks.

## Documentation checked

Checked on 8 October 2026. These sources establish available integration options, not final selections.

- [Cloudflare D1 overview](https://developers.cloudflare.com/d1/).
- [Cloudflare Workers static assets](https://developers.cloudflare.com/workers/static-assets/).
- [TanStack Start on Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/).
- [TanStack Router](https://tanstack.com/router/latest).
- [Hono on Workers](https://hono.dev/docs/getting-started/cloudflare-workers).
- [D1 prepared statements](https://developers.cloudflare.com/d1/worker-api/prepared-statements/).
- [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/).

## Open decisions

- Additional TanStack packages and selected package versions.
- Need for Hono within the single application deployment.
- Exact SQL repository paths and migration review rules. Use server-side repositories and versioned SQL migrations.
- Authentication library, session handling, and administrator assignment rules.
- Mapping, geocoding, and routing provider selection.
- Price history and rating aggregation. Define how reports affect verification status and statistics eligibility.
- Default sorting, comparison limits, and the definition of current records.


## Location and search rules

- Use straight-line distance to determine eligibility within the selected radius.
- Label radius filtering as straight-line distance. Display road distance and estimated travel time separately.
- Prioritize exact canonical names, exact aliases, prefixes, and keywords in that order.
- Offer typo suggestions. Require user selection when a match is ambiguous.
- Do not automatically resolve an ambiguous query to a clinically different service.

## Price verification and statistics

- A price does not become stale because of elapsed time.
- Reports trigger review of price information. The status transition on report submission remains open.
- Continue to display the actual last verification date. Do not describe an old verification date as recent.
- Default statistics use one current, verified, non-stale price per active branch-service listing within the selected area.
- Show the number of eligible branches and distinct providers.
- Require at least three eligible branches for aggregate statistics.
- Do not apply an age cutoff to statistics under the selected report-based freshness policy.
- How disputed or reported prices affect statistics remains open until the report workflow is defined.

## Comparison output

- Present written comparison details in a table.
- Use numerical statistics for numerical values only.
- Do not add generated narrative comparison summaries or an external AI service for this feature.
- Retain the required comparison charts alongside the table.

