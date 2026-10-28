# MediMap

## Overview

MediMap is a diagnostic-service discovery and price-comparison platform for Dhaka, Bangladesh.
Patients, caregivers, and healthcare professionals can compare branch-specific diagnostic services before contacting a provider.
The platform connects service names, abbreviations, and aliases to a canonical service catalog.

This document records the baseline from `PRD.md`, version 1.0, dated 7 October 2026.
Decisions from the context interview will supplement this baseline. New explicit decisions must also update conflicting PRD requirements.

## Goals

1. Let users find diagnostic services through canonical names, abbreviations, and aliases.
2. Show branch-specific base prices with sources, verification status, and verification dates.
3. Support comparison by price, location, estimated travel time, ratings, and opening hours.
4. Let administrators maintain the dataset and resolve incorrect-information reports.
5. Provide a usable mobile experience for the core search and comparison flow.

Select Dhaka hospitals and branches using verifiable official service, standard-price, and location evidence.
No fixed hospital, branch, service, or price-record count applies. A hospital can qualify with one verified diagnostic service.
Include additional branches only when evidence supports their own listings. Exclude hospitals and records that cannot be verified.
These decisions, confirmed on 27 October 2026, replace the earlier ten-hospital and complete-service coverage requirements.

## Core user flow

1. Search for a diagnostic service.
2. Select the matching canonical service.
3. Share a current location, select an area or map location, or enter a location.
4. Choose a radius of 1 km, 3 km, 5 km, or a custom distance.
5. Inspect relevant branches, base prices, and verification information.
6. View price statistics and select branches for comparison.
7. Compare prices, travel estimates, ratings, and available branch information.
8. Read branch details and service-specific reviews.
9. Call the provider, open its website, or request directions.
10. Report incorrect information when necessary.

Browsing and comparison do not require an account. Review submission requires an account.
Incorrect-information reports also require sign-in. Limit each account to five reports per rolling 24 hours and one pending report per target and issue type.

## Features

### Service discovery and comparison

- Canonical diagnostic services with aliases and provider-specific names.
- Separate services for meaningful diagnostic variants.
- Branch-specific service availability and standard/base prices in BDT.
- Search suggestions, filters, and explicit sorting options.
- Location selection, configurable radius, road distance, and estimated travel time.
- Numerical price statistics, comparison charts, and a table with written comparison details.
- Service pages and branch pages with contact information and opening hours.

### Trust and administration

- Price-source records, verification status, and verification dates.
- Service-specific reviews linked to a provider, branch, and diagnostic service.
- One active review per user and branch-service combination, with review editing.
- Incorrect-information reports that administrators review before changing published data.
- Administrative management of services, aliases, providers, branches, prices, reviews, and reports.
- Review subratings, review reporting, and administrator moderation. Visit evidence is deferred from the required release.

## Scope

### In scope

- Dhaka diagnostic services across relevant provider types and diagnostic categories.
- Canonical service discovery, branch-specific base pricing, and provider comparison.
- Public browsing, review accounts, and internal administration.
- Price-source tracking and corrections without direct public edits to core data.

The required release includes all P0 features, map results, review subratings, and review reporting. Verified Visit evidence and bulk import are deferred. Other P1 features remain optional unless explicitly selected.

### Out of scope

- ICU, emergency care, surgery, admission, and bed availability.
- Doctor discovery or consultation booking.
- Medicine-price comparison and ambulance booking.
- Diagnostic appointment booking, online payments, and insurance integration.
- Medical diagnosis, treatment recommendations, and medical advice.
- Promotional, membership, or campaign pricing.
- Provider accounts and provider self-service dashboards.
- Nationwide coverage in the initial release.

## Success criteria

1. A search for `CBC` resolves to Complete Blood Count.
2. A user can select a location and find branches within a chosen radius.
3. Results show branch-specific base prices and their verification information.
4. A user can inspect price statistics and compare multiple branches.
5. A user can inspect contact details, opening hours, and service-specific reviews.
6. An authenticated user can submit and edit a review.
7. A user can report incorrect information for administrator review.
8. Core provider and price information remains available when routing fails.
9. Unknown prices, opening hours, and travel estimates remain distinguishable from known values.
10. The core flow works on mobile devices.

Check collected records against an evidence inventory. Do not claim that partial collection covers every service or branch of a hospital.
Preserve unknown values. Exclude records without verified service, standard-price, and branch-location evidence from the collected price dataset.
Accessibility and performance targets remain open for the UI and implementation phases.

## Pending product decisions

- Additional hospitals and Dhaka branches with verifiable official data. Collection has no fixed count or complete-catalog requirement.
- Exact final delivery date in early December 2026.
- Accessibility and performance acceptance targets.
- Remaining optional P1 features.
- Default sorting. Pending price reports immediately mark prices disputed and exclude them from statistics.

## Delivery constraints

- Submission deadline: early December 2026. The exact date remains unknown.
- Core features by 15 November, dataset and full-flow checks by 22 November, and release candidate by 29 November 2026.
- Team: three people. The project owner expects to do most implementation with AI agents.
- Current version: English interface with English and Bangla service aliases.
- Use free tiers first. Obtain explicit approval before enabling paid services.
- Cloudflare free tiers are the intended hosting budget. The local pilot model is in `docs/workers-release-runbook.md`; production CPU and actual workload remain unverified.
- Selected technologies: React with TanStack Start, one Cloudflare Workers application deployment, and Cloudflare D1 with direct SQL.
- Google sign-in is the only account method for the first version. Assign administrator access separately.
- Add Hono only if required. Select the mapping and routing provider after capability and budget checks.


## Confirmed comparison and data rules

- Filter branches by straight-line radius. Label road distance and estimated travel time separately.
- Require selection for ambiguous service matches and offer typo suggestions.
- Prices do not become stale because of age. Reports trigger review.
- Display verification dates even when prices are old.
- Default statistics require at least three eligible branches and use verified current prices from active branch-service listings.
- Price-report resolution requires fresh official-source review before restoring verified status, including rejection. Other pending price reports keep the price disputed.
- Show eligible branch and distinct provider counts.
- Present written comparison details in a table. Statistics apply to numerical values only.
- Generated narrative summaries are excluded. Comparison charts remain in scope.

