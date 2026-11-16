# Public application verification

Local verification on 28 October 2026 covers the public application and existing administrator workflows.
The implementation adds migrations `0009` through `0011`. Earlier migrations remain unchanged.

## Completed local checks

- 299 unit/component tests passed.
- 108 Workers/D1 integration tests passed, including review ownership, duplicate writes, quotas, moderation, and retained history.
- 90 desktop/mobile browser scenarios passed. These include discovery, details, reviews, moderation, comparison, and existing correction workflows.
- Eight focused desktop/mobile scenarios passed again after selected-area navigation, cancellation protection, map-boundary, and mobile-table changes.
- Type checking, lint, formatting, production builds, and dry-run Worker packaging passed.
- All eight milestone patches passed ordered replay. Each isolated milestone passed type checking and a production build.
- The eleven-migration backup/restore rehearsal passed, including the expected invalid-migration rejection and matching restored catalog audit.
- Local setup applied all eleven migrations. Catalog reconciliation retained 196 verified current listings without issues or overrides.
- Mobile screenshots confirmed readable detail pages, explicit unknown values, and horizontally scrollable comparison tables.
- Provider tests covered failed requests, malformed responses, and oversized bodies. D1 tests covered the shared request ceiling.

Synthetic browser fixtures use a separate local database. They do not establish real Google login or live provider accuracy.
The browser suite tests selected keyboard and layout behavior. It does not establish full accessibility conformance.

## Required external acceptance

- Configure the Google OAuth client and verify live consent, callback, sign-out, and owner-granted administrator access.
- Configure `GEOAPIFY_API_KEY`. Check Dhaka address accuracy, driving estimates, attribution, account quotas, and failure behavior.
- Add independently verified branch coordinates. The reviewed dataset currently has no coordinates for its three branches.
- Verify map pins, radius membership, and routing against those coordinates. Unknown locations must remain excluded from geographic statistics.
- Confirm authorized account, D1 binding, HTTPS origin, secret storage, backup storage, and deployment approval.
- Measure production CPU, startup, database usage, and provider usage against the selected workload.
- Verify query-string redaction before enabling automatic request traces that contain OAuth codes or user locations.

These checks prevent a production-readiness claim. No production migration or deployment occurred.
See [public contracts and setup](public-integration.md) and [the Workers release runbook](workers-release-runbook.md).

This checklist uses STE-guided prose without claiming formal ASD-STE100 compliance.
