# UI context

## Current page

The initial page is a static "Coming soon" hero for MediMap.
Use a light clinical palette, dark teal text, and a simple location mark.
Show the product name and a short description of its planned purpose.
Do not add forms, buttons, navigation, or product functionality to this page.

## Color tokens

Define colors as CSS custom properties. Use the tokens in component styles.

| Role | CSS variable | Value |
| --- | --- | --- |
| Page background | `--bg-base` | `#f2f8f7` |
| Surface | `--bg-surface` | `#ffffff` |
| Primary text | `--text-primary` | `#143d3c` |
| Muted text | `--text-muted` | `#506b69` |
| Primary accent | `--accent-primary` | `#117c73` |
| Border | `--border-default` | `#cddedb` |

## Typography and layout

- Use the system sans-serif stack for body text and the product name.
- Use Georgia for the hero heading.
- Define `--font-sans` and `--font-display` in the stylesheet.
- Center the hero in the available page height. Keep the header and footer visually quiet.
- Use fluid heading sizes and responsive padding. Check the page at mobile widths.
- Use an inline SVG for the decorative location mark. Hide decorative graphics from assistive technology.
- Use plain CSS and semantic React components. No component or icon library is required for this page.
- Keep the page static, without animation.

## Discovery demonstration

Use the existing color and font tokens for `/discovery`.
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

Use the existing teal, surface, border, system sans-serif, and Georgia tokens for the read-only catalog inspector.
Show the selected service, provider label, branch address, price, source, and review date in a single readable record.
Use a service selector with an explicit apply button. Preserve selection in the URL.
Show unknown fields as unknown. Distinguish website review from provider confirmation.
Use visible keyboard focus and controls at least 44 px high. Stack record fields at 375 px without horizontal scrolling.
Show separate empty, invalid-request, and database-error states. Provide a retry link for read failures.
Keep core navigation separate from the reusable layout. Accept extension entries through a typed prop.

## Future UI decisions

Define remaining controls, interaction states, error and success colors, and component conventions when functional pages are in scope.
