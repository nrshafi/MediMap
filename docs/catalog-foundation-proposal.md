# Catalog foundation proposal

Prepared on 27 October 2026. Data-collection scope updated after the project owner's instructions on the same date.

The project owner authorized collection from official hospital sites with verifiable services, standard prices, and locations.
Hospital and branch counts are unrestricted. A hospital can qualify with one verified diagnostic service.
Exclude hospitals and records that cannot be verified. Complete service coverage is not required.
Mapping-provider and current-price/history decisions remain open.
Implementation recommendations remain proposed. Data collection follows the updated project scope.
The [source review and collected data](../data/catalog/README.md) record the current research results and limitations.

## Recommended first implementation unit

Build local Workers/D1 support, catalog migrations, validated read repositories, and a read-only administration data view.
Start the development database empty. Show an explicit empty state until approved records exist.
Use synthetic records only in an isolated test database. Label them as test data and exclude them from development seeds.
Never use discovery fixtures as database fallback data.

This sequence needs an explicit change to the current prerequisite order.
The existing workflow requires hospital inventory and mapping-provider selection before the source-backed branch-data unit.
The proposal defers those decisions until data collection and mapping integration, respectively.
Source-backed acceptance remains incomplete until an approved branch-service record has supporting evidence.
An empty database or synthetic test record cannot satisfy that acceptance check.

## Proposed current-price and history rule

- Keep one branch-service listing for each branch and canonical service pair.
- Keep price revisions as separate records. Retain previous revisions when prices change.
- Let each listing reference at most one current revision. A missing reference means the price is unknown.
- Enforce that the current revision belongs to the same listing.
- Change the current reference and insert the revision in one atomic operation.
- Store monetary amounts as integer minor units in BDT. Convert them for display.
- Preserve missing source references and verification dates as null.
- Require evidence and an actual verification date before a price can have verified status.
- Exclude inactive listings and unknown or unverified prices from default price statistics.
- Never change verification status because time has elapsed.

Report-related status changes remain undecided. Do not implement them in this unit.
The SQL constraints and concurrent-update tests must establish these rules before administrator price writes become available.

## Hospital research shortlist

These candidates have official location sources. They are research starting points, not a complete branch list.
The sources below support identity or location only. They do not establish individual services, prices, hours, or coordinates.
Collect each Dhaka branch and service only when its standard price and location can be verified.
The shortlist can expand. Missing service or branch coverage does not disqualify an otherwise verified listing.

| Candidate | Location evidence | Collection gap |
| --- | --- | --- |
| Square Hospitals | The [official overview](https://www.squarehospital.com/about-us) lists West Panthapath, Gulshan, Uttara, and Mirpur locations. | Determine which locations provide diagnostics and enumerate their services separately. |
| Evercare Hospital Dhaka | The [official contact page](https://www.evercarebd.com/en/dhaka/query) lists Plot 81, Block E, Bashundhara R/A. | Confirm the complete Dhaka diagnostic-location inventory and collect service-level sources. |
| BIRDEM General Hospital | The [official website](https://www.birdembd.org/) lists 122 Kazi Nazrul Islam Avenue, Shahbagh. | Enumerate other Dhaka locations and distinguish their diagnostic catalogs. |
| Bangladesh Medical University | The [official contact page](https://www.bmu.ac.bd/contact) lists Shahbag, Dhaka. Its [Super Specialized Hospital page](https://ssh.bmu.ac.bd/bn/contact) identifies a separate hospital unit. | Confirm physical branch boundaries and service catalogs. Do not merge units by address alone. |
| Dhaka Medical College Hospital | The [government facility registry](https://hrm.dghs.gov.bd/public/facility-registry/facilities/31/profile?tab=detailed-information) identifies the hospital at Secretariat Road, Shahbag. | Confirm diagnostic locations and published tariffs. Do not substitute college administration details for hospital records. |
| Ibn Sina Medical College Hospital | The [official hospital page](https://www.ibnsinatrust.com/Medical_College_Hospital.php) lists 1/1-B, Mirpur Road, Kallyanpur. | Decide whether the collection boundary includes the wider trust's Dhaka diagnostic branches. |
| Holy Family Hospital | The [official contact page](https://holyfamily.com.bd/contact-us) lists 1, Eskatan Garden Road. | Confirm the diagnostic catalog and any additional Dhaka locations. |
| Bangladesh Specialized Hospital | The [official contact page](https://bdspecializedhospital.com/contact) lists 21 Shyamoli, Mirpur Road. | Confirm the diagnostic catalog and branch inventory. |
| Asgar Ali Hospital | The [official website](https://www.asgaralihospital.com/) lists 111/1/A Distillery Road, Gandaria. | Confirm the diagnostic catalog and branch inventory. |
| LABAID Specialized Hospital | The [official hospital page](https://www.labaid.com.bd/en/hospital/labaid-specialized-hospital) identifies the hospital and lists a Dhanmondi contact address. | Distinguish hospital, cardiac, cancer, and diagnostic units before defining provider and branch records. |

Check source changes during collection. A website address does not prove the location of a diagnostic service.
Do not transfer prices between branches, infer individual prices from packages, or infer availability from a department name.

## Proposed unavailable-data handling

Record collected branches and services in a separate evidence inventory.
For each item, record its source, collection date, mapping decision, and unresolved gaps.
If service availability or its base price cannot be verified, record the gap and omit the listing from the collected price dataset.
Preserve unknown values in research records. Do not publish an available-service claim without evidence.
Describe collection as partial unless complete coverage has been established independently.
Provider contact requires separate authorization. This research sent no messages and made no calls.

## Implementation documentation

The current repository has TanStack Start and Vite, but no Workers integration or D1 binding configuration.
Check installed package compatibility before selecting additional stable development dependencies.

Official sources checked on 27 October 2026:

- [TanStack Start on Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/) describes the framework integration.
- [D1 prepared statements](https://developers.cloudflare.com/d1/worker-api/prepared-statements/) documents bound query parameters and result methods.
- [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/) documents ordered SQL files and migration tracking.
- [D1 limits](https://developers.cloudflare.com/d1/platform/limits/) provides limits for the later workload assessment. Workload fit is not established.

No dependencies, migrations, runtime bindings, or application behavior changed during this preparation.
No application checks ran because this change contains documentation only.

## Decisions needed next

1. Approve the empty-database implementation unit and defer inventory/provider selection as described above, or retain the existing prerequisite order.
2. Approve or revise the proposed current-price/history rule.
3. Collect verifiable records under the approved evidence-based policy. Resolve provider boundaries before assigning stored IDs.

After approval, update the existing architecture and workflow records before application implementation.
Keep the mapping provider unresolved until its coverage, licensing, attribution, free usage, and workload have been reviewed.

This document uses STE-guided technical prose. It does not claim formal ASD-STE100 compliance.
