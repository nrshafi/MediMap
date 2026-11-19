# UI audit

Date: 2026-11-19 (Asia/Dhaka)

## Scope and method

Audited every public route and the six administration pages at 375 px and 1280 px:

| Route | 375 px | 1280 px | Result |
| --- | --- | --- | --- |
| `/` | Yes | Yes | HTTP 200, no horizontal overflow, no console errors |
| `/find` | Yes | Yes | HTTP 200, no horizontal overflow, no console errors |
| `/find` results (`q=complete+blood+count`) | Yes | Yes | HTTP 200, no horizontal overflow, no console errors |
| `/services/<id>` | Yes | Yes | HTTP 200, no horizontal overflow, no console errors |
| `/branches/<id>` | Yes | Yes | HTTP 200, no horizontal overflow, no console errors |
| `/compare` | Yes | Yes | HTTP 200, no horizontal overflow, no console errors |
| `/reviews` | Yes | Yes | HTTP 200, no horizontal overflow, no console errors |
| `/report` | Yes | Yes | HTTP 200, no horizontal overflow, no console errors |
| `/sign-in` | Yes | Yes | HTTP 200, no horizontal overflow, no console errors |
| `/account` | Yes | Yes | HTTP 200, no horizontal overflow, no console errors |
| `/discovery` | Yes | Yes | HTTP 200, no horizontal overflow, no console errors |
| `/admin/catalog` | Yes | Yes | HTTP 200, no horizontal overflow, no console errors |
| `/admin/catalog/manage` | Yes | Yes | HTTP 200, no horizontal overflow, no console errors |
| `/admin/providers` | Yes | Yes | HTTP 200, no horizontal overflow, no console errors |
| `/admin/prices` | Yes | Yes | HTTP 200, no horizontal overflow, no console errors |
| `/admin/reports` | Yes | Yes | HTTP 200, no horizontal overflow, no console errors |
| `/admin/reviews` | Yes | Yes | HTTP 200, no horizontal overflow, no console errors |

Method:

- Ran the Vite development server on `http://localhost:3000`.
- Captured 36 PNG files with headless Chromium at 375 × 812 and 1280 × 800.
- Saved the machine-readable results in `.bun-tmp/ui-audit/report.json` and `.bun-tmp/ui-audit/panel-report.json`.
- Confirmed each route returned HTTP 200, had no horizontal document overflow, and logged no console errors.
- Checked the source for repeated status text, duplicate actions, stacked notices, legacy token aliases, and used color pairs.

Screenshots are in `.bun-tmp/ui-audit/`. They are local audit artifacts and are not committed.

## Route observations

### `/`

- The hero used a 36–40 px heading with weight 400 and a Georgia fallback. It did not look stronger than the page body.
- The primary action, popular-test chips, coverage notice, and sign-in link had no clear type hierarchy.
- The mobile header hides "Find services" below the `sm` breakpoint. The home page still links to `/find` through the search form, but the site navigation does not show the destination.
- The emergency-scope sentence and the partial-coverage notice are present. Keep both.

### `/find`

- The page has a clear `h1`, search field, location controls, filters, list, map, and selected-listing panel.
- At 375 px the list is the default view and the selected listing becomes a bottom sheet. The sheet does not cover Google attribution.
- The results state shows two CBC listings. Each card repeats price, verification status, review date, source link, comparison action, branch link, review link, and report link.
- The selected listing panel repeats the same facts and actions as the selected card.
- The mobile header hides the "Find services" link. The page is still reachable from the home search form.

### `/services/<id>` and `/branches/<id>`

- Both pages use the shared `ui.heading1` page title and `ui.heading2` section titles.
- Branch metadata, source links, verification dates, and the emergency-scope footer are present.
- The pages are long at 375 px but do not overflow horizontally.
- The branch page repeats opening hours and contact details in more than one section. The repetition is useful for printing and for screen-reader context. Keep it.

### `/compare`

- The comparison table scrolls inside its own container at 375 px. The page itself does not scroll horizontally.
- Each row repeats status, review date, and source. This repetition is appropriate for a comparison table because each price needs its own source.
- The chart and the table use the same data set. No conflicting values were found.

### `/reviews`

- The review form and the published review list are readable at both widths.
- Rating selects and form hints meet the 44 px touch target.
- The page has no duplicate global actions. Per-review edit controls are record-specific.

### `/report`

- The page stacks an error notice, a sign-in or unavailable notice, a target-details panel, a form panel, and two hint paragraphs.
- The alert border is a light `error` edge at 40% opacity. The role, heading, and text color identify the notice, so the edge is decorative and does not need 3:1 contrast.
- Two hint paragraphs repeat submission limits and dispute behavior below the form.
- The legally required source and verification details remain visible in the target panel.

### `/sign-in` and `/account`

- Both use the shared header, footer, card, and heading styles.
- The sign-in and account states are readable at 375 px.
- The emergency-scope sentence and the account status message are present.
- No duplicate global actions were found.

### `/discovery`

- The route has no `h1`. The first heading is an `h2` in the empty state or the search card.
- The route uses its own header, footer, and legacy stylesheet. It does not use `PageShell`.
- The sample-data label is visible. The route remains a demonstration.
- "View on map" appears once per branch (7 times in the sample set). This is a per-record action, not a global duplicate.
- The legacy stylesheet declared its own `:root` aliases with old font and color values. Those values are now synchronized with `src/styles.css`.

### Administration pages

- `/admin/catalog`, `/admin/catalog/manage`, `/admin/providers`, `/admin/prices`, `/admin/reports`, and `/admin/reviews` all render at both widths.
- The administration navigation scrolls horizontally at 375 px (`AdminLayout.tsx:18-25`). It remains usable and does not cause page overflow.
- Status badges, source details, and record actions repeat per record. These are record-level controls, not duplicate page-level actions.
- Dense forms and long catalog records are readable, but the pages are visually heavy. Grouping record actions and moving secondary fields behind disclosure would reduce scan cost in a later pass.

## Findings and decisions

| Page | File and line | Problem | Decision |
| --- | --- | --- | --- |
| Global | `src/styles.css:26-27` (before this pass) | Body text used the system stack and display text used Georgia. The two families did not share a hierarchy. | Loaded Plus Jakarta Sans 600/700/800 for display and headings, and Inter 400/500/600 for body and labels. Kept the system fallback stack. |
| Global | `src/routes/__root.tsx:17-24` | No web-font request or preconnect existed. | Added two `preconnect` links and one Google Fonts `css2` link with `display=swap`. |
| Global | `src/styles.css:39-40` (before this pass) | The type scale had only `display`; page and card titles used ad hoc sizes. | Added `h1`, `h2`, `h3`, `body`, `small`, and `label` tokens. Tightened heading tracking. |
| Global | `src/routes/index.tsx:28` | The hero was 36–40 px with weight 400 and no line-length limit. | Changed it to `text-display` (2.75rem, weight 700) with `max-w-[16ch]`. |
| Global | `src/ui/styles.ts:17-20` | `ui.heading1` was 24 px and `ui.heading2` was 18 px with no display family. | Mapped both, and new `ui.heading3`, to the display family and the new scale. |
| Global | `src/ui/SiteChrome.tsx:9,14` | The header brand and navigation used fixed text sizes. | Moved the brand to `text-h3` and the navigation to `text-small`. |
| Global | `src/ui/SiteChrome.tsx:36-39` (before this pass) | The footer label was "Google Maps Terms", not the required "Google Maps End User Additional Terms". | Restored the full label. Kept the Google Privacy Policy link. |
| Global | `src/features/administration/adminUi.tsx:8-20` | Admin labels, hints, legends, and card titles used fixed `text-sm`/`text-lg` values. | Moved them to `text-small`, `text-label`, and `ui.heading3`. |
| Global | `src/styles.css:14-15` (before step 1a) | One border token served both control boundaries and decorative edges. Raising it to 3:1 made card outlines, dividers, and table rules dark and heavy. | Restored `border` to the light `#cddedb` for decorative edges. Kept `border-strong` at `#557d78` for control boundaries and moved every control edge to it. |
| Global | `src/ui/styles.ts:12` | The toggle chip used `border-border` as its only control boundary. | Changed it to `border-border-strong`. |
| Global | `src/features/administration/adminUi.tsx:51` | The alert variant used `border-error/30`. | Changed it to `border-error/40`. The role, heading, and text color identify the alert, so the border is decorative. |
| Global | `src/features/corrections/ReportView.tsx:48` | The report alert used `border-error/30`. | Changed it to `border-error/40`. The role, heading, and text color identify the alert, so the border is decorative. |
| Global | `src/features/public/ComparisonPage.tsx:179` | The branch heading in the chart used an untokenized `font-bold`. | Changed it to `ui.heading3`. |
| `/` | `src/ui/PageShell.tsx:9` | "Find services" is hidden below `sm`. | Keep the current behavior in this pass. Follow-up: add a compact search link or an icon-only link with an accessible name for small screens. |
| `/find` | `src/features/public/ListingCard.tsx:81-93` | Each card repeats status, review date, and source. | Keep. A price must show its status and source beside it. |
| `/find` | `src/features/public/ListingPanel.tsx:156-167` | The selected panel repeats the same status, review date, and source as the selected card. | Keep for this pass. Follow-up: when the panel is open, hide the selected card's fact/action row so the same record does not show two complete action sets on desktop. |
| `/find` | `src/features/public/ListingCard.tsx:95-131` | The card has "Show details", "Select for comparison", "Branch details", "Service reviews", and "Report incorrect information". | Keep the actions on the card. They are needed when the panel is closed or off-screen. |
| `/find` | `src/features/public/ListingPanel.tsx:204-259` | The panel repeats "Select for comparison", "Branch details", "Service reviews", and "Report incorrect information". | Keep for this pass. Follow-up: make the panel the primary action surface when it is open and reduce the selected card to its summary. |
| `/find` | `src/features/public/FindPage.tsx:192-203` | The mobile bottom sheet can cover the lower part of the list. | Keep. It does not cover Google attribution and the list adds bottom padding while the sheet is open. |
| `/find` results | `src/features/map/ui/BranchResultCard.tsx:159-180` | The legacy result card repeats verified/unverified text and source text per branch. | Keep while `/discovery` remains a sample route. Migrate it to the shared status badge in a later pass. |
| `/discovery` | `src/features/search/ui/DiscoveryView.tsx:175-264` | The route has no `h1`. | Follow-up: add an `h1` that names the page, then keep the search card and empty-state headings as `h2`. |
| `/discovery` | `src/features/search/ui/discoveryView.css:6-19` | The route declared its own old font and color aliases. | Synchronized the alias values with `src/styles.css` and `DESIGN.md`. Did not change the page structure. |
| All | `src/features/map/ui/mapUi.css`, `src/features/search/ui/searchUi.css`, `src/features/search/ui/discoveryView.css` (before step 1a) | Control edges used the legacy `--border-default` alias. | Added a local `--border-strong` alias and moved the select button, close button, search input, ambiguity card, radius pills, preset buttons, and coordinate inputs to it. Decorative edges stayed on `--border-default`. |
| `/discovery` | `src/features/map/ui/BranchResultCard.tsx:182-192` | "View on map" appears once per branch. | Keep. This is a per-record action. If the route becomes map-first, replace it with one shared "Show on map" control. |
| `/compare` | `src/features/public/ComparisonPage.tsx:67-80` | Every row repeats status, review date, and source. | Keep. Each compared price needs its own source and date. |
| `/report` | `src/features/corrections/ReportView.tsx:44-55`, `158-165`, `206-224` | An error notice, a sign-in or unavailable notice, and a form can stack. | Follow-up: use one page-level notice and keep only field-level hints below it. No behavior change in this pass. |
| `/report` | `src/features/corrections/ReportView.tsx:301-308` | Two hint paragraphs repeat submission limits and dispute behavior. | Follow-up: merge them into one short hint block. |
| Admin | `src/features/administration/AdminLayout.tsx:18-25` | The administration navigation scrolls horizontally at 375 px. | Keep. It remains usable and does not cause page overflow. Follow-up: use a disclosure menu if the item count grows. |
| Admin | `src/features/administration/CatalogManager.tsx:364`, `CatalogInspector.tsx:114` | Nested record titles use fixed sizes. | Left as record-local `h3`/`text-sm` styles. Follow-up: move them to the shared heading tokens when the catalog views are next revised. |
| All | `src/features/search/ui/searchUi.css` (before this pass) | Search badges used 9 px, 10.5 px, 11 px, and 11.5 px text. `mapUi.css` used 11 px price labels. | Raised all of them to 12 px (`0.75rem`) or 14 px (`0.875rem`). The minimum is now 12 px. |
| All | `src/features/map/ui/DhakaMap.tsx:273, 389, 419, 424` (before this pass) | The schematic map labels used 9 px to 11 px text, and the district labels used 60% opacity. | Raised every SVG label to 12 px and removed the extra opacity. Replaced the river, radius, and pin colours with palette tokens. |
| All | `src/features/search/ui/searchUi.css:234` (before this pass) | Dropdown separators used the old border color with 40% opacity. | Changed to the full `--border-default` border. |
| All | `src/features/map/ui/mapUi.css:340` (before this pass) | The branch-card footer divider used `--border-default` at 45% opacity. | Changed to the full `--border-default` border. |
| All | `src/features/search/ui/searchUi.css:120` (before this pass) | The focus ring used the old teal RGB value. | Changed to the new primary RGB value. |
| All | `src/ui/styles.ts:25-26` (before this pass) | The floating panel hardcoded `0 8px 24px rgb(20 61 60 / 0.16)`. | Changed it to `shadow-overlay`. |
| All | `src/features/map/ui/mapUi.css`, `src/features/search/ui/searchUi.css`, `src/features/search/ui/discoveryView.css` (before this pass) | Transitions used `0.12s`, `0.15s`, and several easing curves. | Replaced them with `duration-fast` (150 ms), `duration-base` (200 ms) where the surface change is larger, and one `ease-standard` curve. |
| All | `src/styles.css:130-138` | There was no reduced-motion rule. | Added a rule that removes transitions and animations and sets `scroll-behavior: auto`. |
| All | `src/features/public/GoogleMapView.tsx:65, 184, 219` | The route-line fallback and the position halo used old primary values, and the map hint hardcoded the old overlay shadow. | Changed both colours to the new primary value and replaced the hint shadow with `shadow-overlay`. |

## Repeated status text

Status text is repeated in these places:

- `ListingCard.tsx:81-82` shows the badge and "Website review" date.
- `ListingPanel.tsx:157-160` shows the same badge and date for the selected listing.
- `ComparisonPage.tsx:69-78` shows the badge, review date, and official source in every table row.
- `BranchResultCard.tsx:159-180` shows verified/unverified text and source text in the legacy discovery list.
- `DetailPage.tsx` repeats verification and source details in branch-service sections.

Decision: keep the status, review date, and source beside every price. This is a product and legal requirement. Reduce visual duplication in a later pass by hiding the selected card's fact row while the detail panel is open. Do not remove the status from a price.

## Duplicate actions

- `/find` selected card and panel both offer comparison, branch details, reviews, and report. This is two complete action sets for one record on desktop.
- `/discovery` repeats "View on map" per branch. This is a record-level action, not a page-level duplicate.
- Admin pages repeat edit, review, and status actions per record. These are record-level controls.

Decision: keep record-level actions. Follow-up for `/find`: make the open panel the primary action surface and reduce the selected card to a summary. Do not remove actions from the card while the panel is closed.

## Stacked notices

- `/report` can show an error notice above a target panel and a form.
- `/report` can show a sign-in notice above the form when the session is missing or expired.
- `/report` shows two hint paragraphs under the form fields.
- `/find` can show a map-unavailable notice plus listing notices for branches without coordinates.
- `/discovery` shows a sample-data notice above the demonstration results.

Decision: keep the map-unavailable and sample-data notices because they describe a changed data state. Follow-up for `/report`: use one page-level notice and one compact hint block. Alert borders are light decorative edges because the role, heading, and text color identify the notice.

## Legacy token aliases

`grep` still finds uses of the legacy custom properties. Keep the aliases and synchronize their values.

| Legacy property | New token | Remaining users |
| --- | --- | --- |
| `--bg-base` | `--color-background` | `DhakaMap.tsx`, `mapUi.css`, `searchUi.css`, `discoveryView.css` |
| `--bg-surface` | `--color-surface` | `DhakaMap.tsx`, `mapUi.css`, `searchUi.css`, `discoveryView.css` |
| `--text-primary` | `--color-ink` | `DhakaMap.tsx`, `mapUi.css`, `searchUi.css`, `discoveryView.css` |
| `--text-muted` | `--color-muted` | `DhakaMap.tsx`, `mapUi.css`, `searchUi.css`, `discoveryView.css` |
| `--accent-primary` | `--color-primary` | `DhakaMap.tsx`, `mapUi.css`, `searchUi.css`, `discoveryView.css` |
| `--accent-hover` | `--color-primary-strong` | `mapUi.css`, `searchUi.css`, `discoveryView.css` |
| `--accent-subtle` | `--color-primary-soft` | `mapUi.css`, `searchUi.css`, `discoveryView.css` |
| `--border-default` | `--color-border` | `DhakaMap.tsx`, `mapUi.css`, `searchUi.css`, `discoveryView.css` |
| `--border-strong` (stylesheet-local) | `--color-border-strong` | `mapUi.css`, `searchUi.css`, `discoveryView.css` |
| `--border-focus` | `--color-focus` | `mapUi.css`, `searchUi.css`, `discoveryView.css` |

`src/styles.css:105-121` defines the shared aliases. The three legacy stylesheets also declare `:root` blocks, including a local `--border-strong` alias, so their values must stay in sync until the stylesheets are migrated.

## Contrast

WCAG 2.2 AA requires 4.5:1 for body text and 3:1 for large text. Success criterion 1.4.11 (Non-text Contrast) requires 3:1 only for visual information that is necessary to identify a component or its state. A card outline, a divider, a table rule, or a notice edge is decorative when the content, role, heading, or text color also identifies it. These edges use the light `border` token.

Form controls, selects, toggles, and buttons whose edge is the only cue use `border-strong`, which meets 3:1 on every surface it touches. Reference: [Understanding SC 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).

The earlier pass raised one shared border token to 3:1. That made every decorative edge heavy. Step 1a split the token: `border` is light again, and `border-strong` keeps the 3:1 requirement for controls.

### Fixed text failures

| Foreground / background | Before | After | Requirement | Result |
| --- | --- | --- | --- | --- |
| `primary` on `primary-soft` | 4.36:1 (`#117c73` / `#e3f1ef`) | 4.85:1 (`#0f746b` / `#e3f1ef`) | 4.5:1 body | Pass |

### Control boundaries (3:1 required)

| Foreground / background | Ratio | Requirement | Result |
| --- | --- | --- | --- |
| `border-strong` on `surface` | 4.57:1 | 3:1 UI | Pass |
| `border-strong` on `background` | 4.26:1 | 3:1 UI | Pass |
| `border-strong` on `surface-sunken` | 4.39:1 | 3:1 UI | Pass |
| `border-strong` on `primary-soft` | 3.94:1 | 3:1 UI | Pass |
| `focus` on `surface` | 5.63:1 | 3:1 UI | Pass |
| `primary` on `surface` (selected outline) | 5.63:1 | 3:1 UI | Pass |
| `primary` on `primary-soft` (selected fill) | 4.85:1 | 3:1 UI | Pass |
| `error` on `error-soft` (invalid field) | 5.55:1 | 3:1 UI | Pass |

### Decorative edges (no requirement)

| Foreground / background | Ratio | Requirement | Result |
| --- | --- | --- | --- |
| `border` on `surface` | 1.39:1 | None | Not required |
| `border` on `background` | 1.30:1 | None | Not required |
| `border` on `surface-sunken` | 1.34:1 | None | Not required |
| `border` on `primary-soft` | 1.20:1 | None | Not required |
| `error` at 40% opacity on `error-soft` (alert edge) | 1.94:1 | None | Not required |

### Current text pairs

| Foreground / background | Ratio | Requirement | Result |
| --- | --- | --- | --- |
| `ink` on `surface` | 11.91:1 | 4.5:1 body | Pass |
| `ink` on `background` | 11.09:1 | 4.5:1 body | Pass |
| `ink` on `primary-soft` | 10.27:1 | 4.5:1 body | Pass |
| `on-ink` on `ink` | 11.91:1 | 4.5:1 body | Pass |
| `muted` on `surface` | 5.76:1 | 4.5:1 body | Pass |
| `muted` on `background` | 5.36:1 | 4.5:1 body | Pass |
| `muted` on `surface-sunken` | 5.52:1 | 4.5:1 body | Pass |
| `muted` on `primary-soft` | 4.96:1 | 4.5:1 body | Pass |
| `primary` on `surface` | 5.63:1 | 4.5:1 body | Pass |
| `primary` on `background` | 5.24:1 | 4.5:1 body | Pass |
| `primary` on `primary-soft` | 4.85:1 | 4.5:1 body | Pass |
| `on-primary` on `primary` | 5.63:1 | 4.5:1 body | Pass |
| `on-primary` on `primary-strong` | 7.20:1 | 4.5:1 body | Pass |
| `error` on `error-soft` | 5.55:1 | 4.5:1 body | Pass |
| `error` on `surface` | 6.54:1 | 4.5:1 body | Pass |
| `verified` on `verified-soft` | 5.74:1 | 4.5:1 body | Pass |
| `disputed` on `disputed-soft` | 5.37:1 | 4.5:1 body | Pass |
| `unknown` on `unknown-soft` | 5.14:1 | 4.5:1 body | Pass |
| Amber text on `amber-subtle` | 6.84:1 | 4.5:1 body | Pass |
| Amber border on `amber-subtle` | 4.84:1 | 3:1 UI | Pass |

Disabled controls use reduced opacity. WCAG does not require disabled controls to meet contrast. Placeholder text now uses full `muted` opacity and meets 4.5:1 on white.

## Open items

1. Add an `h1` to `/discovery` and align its header and footer with `PageShell`.
2. Add a compact "Find services" link for 375 px headers.
3. Reduce duplicate fact and action rows on `/find` when the detail panel is open.
4. Merge the report submission hints and reduce stacked notices.
5. Move `CatalogManager` and `CatalogInspector` record titles to the shared heading tokens.
6. Migrate `DhakaMap.tsx`, `mapUi.css`, `searchUi.css`, and `discoveryView.css` off the legacy aliases, then remove the aliases.
