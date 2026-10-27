# Hospital tariff collection

Collected on 27 October 2026 from official hospital websites.
The collection has no fixed hospital, branch, or service count. One verified diagnostic listing can qualify a hospital.

## Collected records

| Hospital location                                                      | Source-checked listings | Location evidence                                                                                                  |
| ---------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Holy Family Red Crescent Medical College Hospital, Eskatan Garden Road | 584                     | [Official contact page](https://holyfamily.com.bd/contact-us), 1, Eskatan Garden Road, Dhaka-1000.                 |
| BMU Super Specialized Hospital Ltd., Shahbag                           | 829                     | [Official contact page](https://ssh.bmu.ac.bd/bn/contact), Shahbag, Dhaka-1000.                                    |
| Farabi General Hospital, Dhanmondi                                     | 97                      | [Official contact page](https://farabigeneralhospital.com/contacts/), House 8, Road 14 New, Dhanmondi, Dhaka-1205. |
| Monowara Orthopedic and General Hospital, Kamalapur                    | 111                     | [Official contact page](https://www.mogh.com.bd/contact), 35/7, 1 Kamalapur Road, Dhaka-1203.                      |
| Ad-din Medical College Hospital, Moghbazar                             | 469                     | [Official contact page](https://awmch.addinhospital.org/contact/), 2 Bara Maghbazar, Dhaka-1217.                   |

The parser read 2,301 source rows. It retained 2,090 listings, excluded 201 rows, and combined ten repeated rows with their evidence.
These counts describe provider listings. They do not describe distinct canonical services or complete hospital coverage.
Each listing belongs to the inspected hospital location. No price was copied to another branch.
The expansion added 677 retained listings from three hospitals. Two earlier BMU catch-all descriptions now remain excluded as unspecified variants.

- [hospital-tariffs.json](hospital-tariffs.json) contains retained listings, branch addresses, source metadata, and limitations.
- [tariff-review.json](tariff-review.json) contains every extracted row and each excluded row's reason.
- [Extraction script](../../scripts/data/hospitalTariffs.ts) reproduces parsing and filtering.
- [Extraction tests](../../scripts/data/hospitalTariffs.test.ts) check parser failures, conflicting rates, evidence, and artifact integrity.

## Evidence and limits

The [Holy Family pathology table](https://holyfamily.com.bd/service/pathology-services) and [radiology table](https://holyfamily.com.bd/service/radiology-services) label prices as `Normal Rate`.
The [BMU investigation list](https://ssh.bmu.ac.bd/bn/investigation-all-list) labels its amounts as `Price` under `Test Price` navigation.
The [Farabi test page](https://farabigeneralhospital.com/medical-tests-and-packages/) pairs individual diagnostic names with prices.
The [Monowara diagnostic directory](https://www.mogh.com.bd/available_tests) gives taka prices and categories. Its visible values match the directory metadata.
Ad-din publishes thirteen diagnostic tariff pages through its [service-charge directory](https://awmch.addinhospital.org/service-charge/).
These include [biochemistry](https://awmch.addinhospital.org/biochemistry-service-charge/), [hematology](https://awmch.addinhospital.org/hematology-service-charge), and [radiology](https://awmch.addinhospital.org/service-charge/radiology-imaging/).
Ad-din's collected tables explicitly label amounts as taka and show `Updated on 23 February 2026`.
These pages provide individual tariff rows. Discounted package totals were not divided into individual test prices.

Each retained listing preserves its provider wording and published amount.
Department names qualify short labels. For example, `CHEST (PLAIN)` appears under `CT SCAN` at Holy Family.
Do not drop the department when using that listing.
Canonical service IDs remain null. No parser rule equates differently named clinical services or splits alternative tests into individual listings.

Each source record now states its `currencyEvidence`.
Ad-din's tables explicitly use `Taka` or `Tk`. Monowara's directory displays `৳`.
Holy Family, BMU, and Farabi use amounts without explicit currency labels in the collected item rows.
Their BDT assignment follows domestic tariff context and still requires confirmation before publication.
Provider effective dates remain null because the inspected pages do not supply them.
`sourceUpdatedDate` records a published site-update date when available. It is separate from the tariff effective date.
`retrievedAt` records when this research captured a source. It is not a hospital verification or tariff effective date.
Coordinates and opening hours remain null. Published addresses do not establish verified geographic coordinates.
Live appointment availability and phone confirmation were not checked.
Monowara's government-rate wording remains provider wording. This collection does not independently verify government fee schedules.
Hospital opening claims do not establish the operating hours of each diagnostic unit.

The export has `publicationReady: false` until canonical mapping and the stated publication checks are complete.
No records have been imported into D1 or connected to public discovery.
The existing demonstration retains its separate sample fixtures.

## Excluded rows

The review export records zero or invalid prices, conflicting rates, therapies, ancillary fees, and unclear variants.
Zero does not mean free. A source's appearance in this collection does not verify every row on its site.
For example, BMU publishes `PT` at both 480 and 420. Both rows remain excluded.
Holy Family publishes `ICT FOR T.B. (MYCODOT)` at conflicting rates. Those rows also remain excluded.
Ad-din publishes conflicting pelvis X-ray and CT-guided FNAC amounts. Those entries remain in the review export.
The parser does not choose the lower amount or assume that the later row replaces the earlier row.
Repeated rows with the same label, department, and price retain all source-row references.
Punctuation-only label collisions with different prices require review. Identical prices do not cause different punctuated labels to merge.
Clinically related aliases and provider spelling errors still require canonical-mapping review.

## Other candidates inspected

These outcomes describe the inspected pages. They do not prove that a hospital has no other public tariff source.
These hospitals contribute no listings to the retained dataset.

| Candidate                                   | Outcome and source                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Square Hospitals                            | The [current homepage](https://www.squarehospital.com/) shows website maintenance. The earlier indexed [tumor profile page](https://www.squarehospital.com/post/118/tumor-profile-%28male%29) describes a package, not individual standard rates.                                                                                       |
| Evercare Hospital Dhaka                     | The [Dhaka site](https://www.evercarebd.com/en/dhaka) lists health packages. The previously indexed molecular test PDF returned HTTP 404. No branch-specific item tariff was established.                                                                                                                                               |
| BIRDEM General Hospital                     | The [investigation list](https://www.birdembd.org/mrdServiceDetail) provides service names and departments without a price column. Names alone do not qualify a price listing.                                                                                                                                                          |
| Bangladesh Medical University main hospital | The general university contact address does not establish that the Super Specialized Hospital tariff applies to other university units. Only the explicitly identified Super Specialized Hospital is included.                                                                                                                          |
| Dhaka Medical College Hospital              | The [college site](https://dmc.gov.bd/) timed out during retrieval. No official branch-specific tariff was established from the inspected material.                                                                                                                                                                                     |
| Ibn Sina                                    | The [official site](https://www.ibnsinatrust.com/) lists services and branches. No branch-specific individual base price was established from the inspected pages.                                                                                                                                                                      |
| Bangladesh Specialized Hospital             | The [pandemic price notice](https://www.bdspecializedhospital.com/news/93) has a pandemic-specific scope. Its current applicability as an ordinary tariff was not established.                                                                                                                                                          |
| Asgar Ali Hospital                          | The [health-check page](https://www.asgaralihospital.com/page/health-check-up-packages) gives discounted and original bundle totals. Neither total establishes a component test's base price.                                                                                                                                           |
| LABAID                                      | The [hospital health-check page](https://www.labaid.com.bd/en/department/health-check-up-services) gives packages. The [diagnostic catalog](https://labaiddiagnostics.com/item/type/pathology) lists tests without public item prices in the inspected output. Hospital and diagnostic branch prices were not inferred from each other. |

## Reproduce the collection

Use the repository's selected Bun version and installed dependencies.
Run these commands from the repository root.

```powershell
bun scripts/data/hospitalTariffs.ts --fetch
bun test scripts/data/hospitalTariffs.test.ts
bun check --no-script scripts/data/hospitalTariffs.ts scripts/data/hospitalTariffs.test.ts
```

The first command fetches 23 public HTML pages and rewrites both research exports.
It does not submit forms or make authenticated requests.
Review the changed data before accepting a refresh. Website changes can alter counts, prices, or parser compatibility.
To parse existing cached pages without network access, omit `--fetch`.
Cached HTML stays in the ignored `.bun-tmp/hospital-research/` directory.
Each source record includes a SHA-256 hash of its local captured HTML and its retrieval time.
The parser stops if expected headings, row structures, or contact addresses are missing.

The script uses the existing Happy DOM 21.0.1 dependency with JavaScript evaluation and external asset loading disabled.
Its documented [DOM support](https://github.com/capricorn86/happy-dom/wiki) and installed parser types were checked before use.
No dependencies were added. The extractor runs locally and is not deployed application code.

## Verification

On 27 October 2026, a fresh download reproduced the expanded 2,301-row collection and its filtering counts.
The expanded collector has twelve parser and artifact integrity tests. All 256 unit, component, and data tests passed across 17 files.
Application and collector type checks, linting, formatting checks, and client/server production builds passed.
No application UI changed. Additional browser and mobile layout checks did not run for this data-collection unit.
