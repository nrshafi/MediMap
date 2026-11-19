# UI context

## Current page

The home page is a functional entry to source-backed service discovery, account access, and public detail pages.
Use a light clinical palette, dark teal text, and a simple location mark.
Show the product name and a short description of its planned purpose.
Use clear service-search navigation and explicit source coverage. Retain the clinical color tokens and touch-target conventions.

## Visual tokens

`DESIGN.md` at the repository root is the visual source of truth. It defines colors, typography, layout, elevation, shapes, components, and icons. Do not copy its token values into this file.
The Tailwind theme in `src/styles.css` mirrors these tokens. Legacy properties such as `--bg-base` remain as aliases until each stylesheet is migrated.
Use `border` for decorative card outlines, dividers, table rules, panel edges, and notice boxes. Use `border-strong` for text inputs, selects, textareas, checkboxes, and any control whose border is the only visual cue. Alert notices use a light `error` edge; the role, heading, and text color identify them.
The `/discovery` demonstration keeps its own CSS.

## Typography and layout

- Use Inter for body text, labels, controls, and prices.
- Use Plus Jakarta Sans for the product name, the hero heading, and section headings.
- Define `--font-sans` and `--font-display` in the stylesheet. Keep the system fallback stack.
- Center the hero in the available page height. Keep the header and footer visually quiet.
- Use the `display`, `h1`, `h2`, `h3`, `body`, `small`, and `label` type scale. Check the page at mobile widths.
- Use an inline SVG for the decorative location mark. Hide decorative graphics from assistive technology.
- Use Tailwind utilities and the shared class strings in `src/ui/styles.ts`. Use semantic React components. Use `lucide-react` icons beside text labels, and hide decorative icons from assistive technology.
- Use the shared motion tokens for hover, focus, and selection only. Remove transitions and animations under `prefers-reduced-motion: reduce`.

## Discovery demonstration

Use the existing color and font tokens for `/discovery`. This page keeps its own CSS.
Identify sample data before the search controls and on each sample price card.
Show explicit empty states for ambiguous queries, missing matches, and missing branch listings.
Require selection before showing results for ambiguous queries or typo suggestions.
Keep search suggestions closed after selection or dismissal until the query changes or the user reopens them.
Clear previous branch results when an edited query is ambiguous, unmatched, blank, or an unconfirmed typo.
Update the radius independently of service selection. Keep the edited query when the radius changes.
Synchronize radius controls, result filtering, URL parameters, and the schematic map circle.
Support keyboard selection and visible focus on search options, map pins, and branch controls.
At mobile widths, show list and map view controls and allow dismissal of the selected branch summary.
Label the schematic map as a preview. Do not imply that its decorative geography is verified.

### Discovery location controls

Group presets, browser location, and manual coordinates in a location section.
Use visible latitude and longitude labels, coordinate bounds, and validation feedback beside the manual form.
Show a pending location message with a cancel button. Keep presets and manual input available during acquisition.
Explain permission denial, timeout, unavailable location, and unsupported browser location. Keep the current results on failure.
Use a polite status region for location feedback. Use existing color tokens, visible focus, and controls at least 44 px high.
Stack coordinate fields on mobile. Disclose that coordinates appear in the page URL and shared links.

## Catalog inspector

Use the existing teal, surface, border, Inter, and Plus Jakarta Sans tokens for the read-only catalog inspector.
Show the selected service, provider label, branch address, price, source, and review date in a single readable record.
Use a service selector with an explicit apply button. Preserve selection in the URL.
Show unknown fields as unknown. Distinguish website review from provider confirmation.
Use visible keyboard focus and controls at least 44 px high. Stack record fields at 375 px without horizontal scrolling.
Show separate empty, invalid-request, and database-error states. Provide a retry link for read failures.
Keep core navigation separate from the reusable layout. Accept extension entries through a typed prop.

## Catalog administration

Reuse the administration layout and existing color tokens for catalog forms.
Separate category and service creation from record correction. Show stable IDs as read-only text after creation.
Provide English and Bangla alias fields with an explicit language selector.
Require confirmation that service and alias corrections preserve diagnostic meaning.
Show active status and explain that inactive categories hide their services.
Use ordinary POST forms, visible labels, browser validation, and fixed server feedback.
Keep controls at least 44 px high and stack form fields at 375 px.
Provide reload links for outdated edits and explicit access, validation, collision, and database-error states.

## Account access

Use the existing teal palette and the Inter and Plus Jakarta Sans typography tokens for sign-in and account screens.
Keep Google as the only sign-in option. Explain that browsing does not require an account.
Use ordinary POST forms for sign-in initiation and sign-out so both actions work without JavaScript.
Show distinct messages for expired sessions, cancelled or failed sign-in, missing configuration, and denied administrator access.
Do not show secrets, tokens, provider errors, or raw database messages.
Keep form controls at least 44 px high and stack account actions at 375 px.
The administration inspector requires server-confirmed administrator access. Hidden navigation does not establish authorization.

## Provider and branch administration

Reuse the administration layout, form styles, visible labels, and 44 px minimum controls.
Separate provider identity and contacts from branch address, contacts, coordinates, and weekly hours.
Show fixed IDs and revisions on correction forms. Keep missing contacts and coordinates blank.
Label blank weekly days as unknown. Accept `closed` or comma-separated `HH:mm-HH:mm` periods for each day.
Explain overnight periods and `00:00-24:00` before the weekly fields. Do not infer hours from other branches.
Require official contact evidence and confirmation before an active branch save.
Show source links, inactive status, saved feedback, rejected values, and outdated-edit recovery.
Keep native forms usable without JavaScript. Stack fields and schedule rows at 375 px.

## Price and source administration

Reuse administration form styles, native POST forms, fixed server feedback, and visible labels.
Separate source snapshot creation, branch-service mapping, availability correction, new price revisions, and explicit price clearing.
Explain that sources are retained snapshots and a source URL alone does not verify a price.
Label collection timestamps as UTC. Keep collector references, website-update dates, review dates, and tariff-effective dates distinct.
Require diagnostic-mapping confirmation and review confirmation for verified prices.
Show BDT decimal input with at most two decimal places. Never display zero for an unknown price.
Show retained price revisions, their source IDs, status, review dates, and creation dates.
Use 44 px controls and stack forms at 375 px. Preserve current selection after rejected correction requests when possible.

## Incorrect-information reporting

Use a standalone report page with the existing teal palette and the Inter and Plus Jakarta Sans typography tokens.
Identify the provider, branch, service, and observed price before the form when applicable.
Limit issue choices to the selected target type. Keep user details and an optional correction/evidence link separate.
Use native form validation and ordinary POST forms. Keep submitted text visible on rejected or failed requests.
Use server-rendered error responses with the same form and styles, without hydration scripts on those responses.
Show explicit target-changed, missing-target, access, duplicate, limit, success, and database-failure states.
Receipts show details recorded at submission. Do not label an observed snapshot as the current published record.
Keep controls at least 44 px high and stack fields at 375 px.

## Administrator report review

Administrator report review uses the existing administration layout, stacked native forms, and 44 px controls.
Show pending, accepted, rejected, and all-report filters. Keep report selection when paging through the queue or its official sources.
Show the original submission beside current target details. Link existing editors for non-price corrections, then require a reviewed resolution.
Retain typed resolution reasons on recoverable errors. Show completed decisions as history with no repeat-resolution form.

## Public discovery map

The `/find` layout follows `DESIGN.md`. On desktop, the sidebar lists results with filter chips, the map fills the page, and a floating panel shows the selected branch.
On mobile, a List and Map switch changes the view. The selected branch appears in a bottom sheet that the user can dismiss.
Enter a location by address search, browser location, or map click. Put Dhaka presets and manual coordinates under "More location options".
The address search runs only after the user submits the address form. Selecting a suggestion sets the location.
Keep the list and the map on the same filtered result set. Selecting a card or a marker selects the same branch.
Keep presets and manual coordinates as the keyboard alternative to map clicks. Show visible latitude and longitude labels with validation feedback.
Show the "map unavailable" notice when the browser key is missing, Google rejects the key, or the map fails to load. Say that prices and branch details remain available. Do not show raw provider errors.
Show unknown road distances and travel times as unknown. Label straight-line distance and road distance separately.
Show "Google Maps" attribution beside suggestion lists when no Google map is visible. The panel and bottom sheet never cover the map attribution row.
Link the Google Maps End User Additional Terms and the Google Privacy Policy in the footer.
Keep 44 px controls, visible focus, and no horizontal scroll at 375 px.

## Future UI decisions

Define remaining controls, interaction states, error and success colors, and component conventions when functional pages are in scope.
