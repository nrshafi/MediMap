---
version: alpha
name: MediMap Clinical Teal
description: Design system for MediMap, a diagnostic-service price-comparison and branch-finder application for Dhaka. Light clinical teal palette with a sidebar-and-map layout.
colors:
  primary: "#0f746b"
  primary-strong: "#0d625b"
  primary-soft: "#e3f1ef"
  on-primary: "#ffffff"
  ink: "#143d3c"
  on-ink: "#ffffff"
  muted: "#506b69"
  background: "#f2f8f7"
  surface: "#ffffff"
  surface-sunken: "#f7fbfa"
  border: "#cddedb"
  border-strong: "#557d78"
  focus: "#0f746b"
  verified: "#1e6b3a"
  verified-soft: "#e6f4ea"
  disputed: "#8a5a00"
  disputed-soft: "#fdf3dc"
  unknown: "#506b69"
  unknown-soft: "#eef3f2"
  error: "#b3261e"
  error-soft: "#fce8e6"
typography:
  display:
    fontFamily: Plus Jakarta Sans
    fontSize: 2.75rem
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: -0.03em
  h1:
    fontFamily: Plus Jakarta Sans
    fontSize: 2rem
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: -0.02em
  h2:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.25rem
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: -0.015em
  h3:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.125rem
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.01em
  body:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.55
  small:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: 0.02em
  price:
    fontFamily: Inter
    fontSize: 1.25rem
    fontWeight: 700
    lineHeight: 1.2
    fontFeature: "'tnum' 1"
rounded:
  none: 0px
  sm: 6px
  md: 10px
  lg: 14px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 32px
  touch-target: 44px
  page-gutter-mobile: 16px
  header-height: 64px
  sidebar-width: 440px
  floating-panel-width: 384px
  map-attribution-clearance: 40px
shadows:
  card: 0 1px 2px rgb(20 61 60 / 0.06), 0 2px 6px rgb(20 61 60 / 0.05)
  lift: 0 2px 4px rgb(20 61 60 / 0.07), 0 8px 18px rgb(20 61 60 / 0.1)
  overlay: 0 4px 10px rgb(20 61 60 / 0.1), 0 18px 44px rgb(20 61 60 / 0.18)
motion:
  fast:
    duration: 150ms
    timingFunction: cubic-bezier(0.2, 0, 0, 1)
  base:
    duration: 200ms
    timingFunction: cubic-bezier(0.2, 0, 0, 1)
components:
  app-header:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    height: "{spacing.header-height}"
    padding: 16px
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.small}"
    rounded: "{rounded.sm}"
    height: "{spacing.touch-target}"
    padding: 12px
  button-primary-hover:
    backgroundColor: "{colors.primary-strong}"
    textColor: "{colors.on-primary}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    typography: "{typography.small}"
    rounded: "{rounded.sm}"
    height: "{spacing.touch-target}"
    padding: 12px
  button-secondary-hover:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-strong}"
  input-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    height: "{spacing.touch-target}"
    padding: 10px
  chip-filter:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.small}"
    rounded: "{rounded.full}"
    height: "{spacing.touch-target}"
    padding: 12px
  chip-filter-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
  listing-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: 16px
  listing-card-selected:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.ink}"
  metric-tile:
    backgroundColor: "{colors.surface-sunken}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: 8px
  price-value:
    textColor: "{colors.ink}"
    typography: "{typography.price}"
  status-verified:
    backgroundColor: "{colors.verified-soft}"
    textColor: "{colors.verified}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: 4px
  status-disputed:
    backgroundColor: "{colors.disputed-soft}"
    textColor: "{colors.disputed}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: 4px
  status-unknown:
    backgroundColor: "{colors.unknown-soft}"
    textColor: "{colors.unknown}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: 4px
  alert-error:
    backgroundColor: "{colors.error-soft}"
    textColor: "{colors.error}"
    typography: "{typography.small}"
    rounded: "{rounded.sm}"
    padding: 12px
  map-pin-branch:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    height: 32px
    padding: 8px
  map-pin-branch-selected:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
  map-pin-user:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    rounded: "{rounded.full}"
    size: 20px
  map-hint:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: 8px
  floating-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    width: "{spacing.floating-panel-width}"
    padding: 16px
  route-line:
    backgroundColor: "{colors.primary}"
    size: 5px
  metadata-text:
    textColor: "{colors.muted}"
    typography: "{typography.small}"
  divider:
    backgroundColor: "{colors.border}"
    height: 1px
  field-outline:
    backgroundColor: "{colors.border-strong}"
    size: 1px
  focus-ring:
    backgroundColor: "{colors.focus}"
    size: 2px
---

# MediMap design system

This file is the visual source of truth for MediMap. It uses the [DESIGN.md format](https://github.com/google-labs-code/design.md) (version `alpha`). The YAML tokens above are normative. The prose below explains how to apply them.

`context/ui-context.md` records feature-level interaction rules, such as validation, empty states, and URL behavior. This file records the visual system. If the two documents conflict, update both before implementation.

## Overview

MediMap helps people in Dhaka compare standard prices for diagnostic services, such as blood tests and imaging, at specific hospital branches. The interface must read as calm, factual, and clinical. It is a price and location reference, not an emergency tool.

The layout comes from an earlier emergency routing prototype that is not part of this repository. The prototype had a sidebar list, a full-height map, cards with metric tiles, pill filters, and a floating detail panel. MediMap keeps that structure. It does not keep the prototype's slate and rose palette, emergency vocabulary, triage scores, bed counts, or animated beacons. Those signal emergency care, which is out of product scope. Google's Maps Platform terms also prohibit use for High Risk Activities.

Design principles:

1. Show the source and verification state beside every price.
2. Show unknown values as unknown. Never show `0`, a blank, or an estimate in place of a missing price, rating, opening hour, or travel time.
3. Keep straight-line radius distance and road distance visibly separate, with explicit labels.
4. Keep the list usable when the map, the routing provider, or JavaScript fails.

## Colors

The palette is a light clinical teal. It extends the original tokens in `src/styles.css`. Do not add new hues. The only chromatic accents are teal, the status colors, and `error` for real failures.

- **Clinical Teal (`primary`, `#0f746b`)** is for primary actions, links, the selected state, focus rings, and the route line. Its contrast on white is 5.63:1 and on `primary-soft` is 4.85:1.
- **Deep Teal Ink (`ink`, `#143d3c`)** is for body text, the app header background, the user-location marker, and active filter chips. Its contrast on white is 11.91:1.
- **Slate Teal (`muted`, `#506b69`)** is for secondary text, metadata, and the unknown status. Its contrast on white is 5.76:1 and on `primary-soft` is 4.96:1.
- **Mist (`background`, `#f2f8f7`)** is the page background. **White (`surface`)** is for cards, panels, and inputs. **`surface-sunken`** is for metric tiles inside cards.
Status colors are always paired with a text label. Color alone never carries meaning.

| Status | Token pair | Label text |
| --- | --- | --- |
| Verified price | `verified` on `verified-soft` | "Verified" with the review date |
| Disputed price | `disputed` on `disputed-soft` | "Disputed, under review" |
| Unknown value | `unknown` on `unknown-soft` | "Unknown" or "Not recorded" |
| Error | `error` on `error-soft` | A specific failure message |

Each status pair has a contrast ratio above 5:1: verified 5.74:1, disputed 5.37:1, unknown 5.14:1, and error 5.55:1. Do not add red, rose, or orange accents for emphasis. Use `error` only for real failures.

### Borders

Use two border tokens. The choice depends on whether the edge carries information that is necessary to identify a control.

- **`border` (`#cddedb`)** is a light decorative edge. Use it for card outlines, dividers, table rules, panel edges, and notice boxes. These edges do not need 3:1 contrast because the content, heading, role, or text color also identifies the element. WCAG 2.2 SC 1.4.11 requires contrast only for visual information that is necessary to identify a component or its state.
- **`border-strong` (`#557d78`)** is a control boundary. Use it for text inputs, selects, textareas, checkboxes, and any button or toggle whose border is the only visual cue that it is a control. It measures 4.57:1 on `surface`, 4.26:1 on `background`, 4.39:1 on `surface-sunken`, and 3.94:1 on `primary-soft`.

Hovered cards may use `border-strong` as a state cue. Selected cards use `primary` and an outline, not a heavier neutral edge. Alert notices use a light `error` edge at 40% opacity; the role, heading, and text color identify the notice.

### Legacy token aliases

Existing stylesheets use these custom properties. Keep them as aliases until each stylesheet is migrated. `src/styles.css` defines the aliases once. `src/features/map/ui/mapUi.css`, `src/features/search/ui/searchUi.css`, and `src/features/search/ui/discoveryView.css` also declare `:root` alias blocks, so keep those files in sync with the values above.

| Legacy property | DESIGN.md token |
| --- | --- |
| `--bg-base` | `colors.background` |
| `--bg-surface` | `colors.surface` |
| `--text-primary` | `colors.ink` |
| `--text-muted` | `colors.muted` |
| `--accent-primary` | `colors.primary` |
| `--accent-hover` | `colors.primary-strong` |
| `--accent-subtle` | `colors.primary-soft` |
| `--border-default` | `colors.border` |
| `--border-strong` (stylesheet-local) | `colors.border-strong` |
| `--border-focus` | `colors.focus` |

`grep` still finds uses of these properties in `DhakaMap.tsx`, `mapUi.css`, `searchUi.css`, and `discoveryView.css`. Do not remove the aliases until those uses are migrated.

## Typography

Load two families from Google Fonts with one `css2` link in `src/routes/__root.tsx` and `display=swap`:

- **Plus Jakarta Sans** 600, 700, and 800 for `display`, `h1`, `h2`, and `h3`.
- **Inter** 400, 500, and 600 for body copy, labels, controls, and prices.

Keep the system fallback stack in `src/styles.css`: `system-ui, -apple-system, 'Segoe UI', sans-serif`. If the font request fails, the fallback must keep the same hierarchy and line lengths.

- `display` is only for the home-page hero heading. Limit it to about 16 characters per line with `max-w-[16ch]`.
- `h1` is for page titles. `h2` is for section and card titles. `h3` is for nested titles and record headers.
- `body` is the default. `small` is for addresses, source notes, metadata, and form hints.
- `label` is for status badges, metric-tile labels, map pins, and compact field labels. Buttons and chips use `small` with weight 600.
- `price` is for BDT prices. It uses tabular figures so that prices align in lists and tables.

Heading letter spacing is negative: `-0.03em` for `display`, `-0.02em` for `h1`, `-0.015em` for `h2`, and `-0.01em` for `h3`. Do not add tracking to headings.

The minimum text size is 12px (`label`). Do not set text below 12px. Headings use `text-wrap: balance`; do not apply it to long paragraphs.

Write prices as `৳ 1,250` or `BDT 1,250`. Use one format across the application.

## Layout

### Desktop (1024px and wider)

```
+--------------------------------------------------------------+
| App header (ink, 64px): logo, product name, nav, account      |
+------------------+-------------------------------------------+
| Sidebar 440px    | Google map (fills remaining space)        |
| - service search | [map hint, top left]                       |
| - location       |                                           |
| - radius chips   |                                           |
| - sort + filters |                   +---------------------+ |
| - result count   |                   | Floating panel 384px| |
| - listing cards  |                   | selected listing    | |
|   (scrolls)      |                   +---------------------+ |
|                  | (40px clearance for Google attribution)    |
+------------------+-------------------------------------------+
```

- The sidebar scrolls independently. The map fills the remaining height of the viewport.
- The floating panel shows the selected listing: price, verification, source, hours, road estimate, and actions.
- Keep the floating panel at least `map-attribution-clearance` (40px) above the bottom edge of the map. The Google logo, terms link, and keyboard-shortcut link must stay visible. Do not cover any Google attribution.

### Mobile (below 1024px)

- Show a two-option switch, "List" and "Map", below the search and location controls. The list is the default view.
- In the map view, the map uses `60svh`. The selected listing shows as a dismissible bottom sheet that does not cover the Google attribution.
- Use a 16px page gutter. Stack form fields. Do not allow horizontal page scroll at 375px.
- Comparison tables can scroll horizontally inside their own container.

### Spacing

Use the `spacing` scale (4, 8, 12, 16, 24, 32px). Cards use 16px internal padding. Gaps between cards are 12px. Every interactive element is at least 44px high (`touch-target`), including filter chips and map pins with their hit areas.

## Elevation & Depth

The interface is mostly flat. Borders separate content. Shadows are reserved for depth, not decoration.

- Level 0: page background and sidebar. No shadow.
- Level 1: cards and inputs. Cards use a 1px `border`. Inputs use a 1px `border-strong`. Neither uses a shadow. Hovered cards use `border-strong`.
- Level 2: raised elements such as the selected card, dropdown, and map controls. Use `shadow-card`.
- Level 3: items that float above the map, such as the floating panel, bottom sheet, and popovers. Use `shadow-overlay`. Use `shadow-lift` for hover and selected states that need more separation than `shadow-card`.

The shadow values are:

- `shadow-card`: `0 1px 2px rgb(20 61 60 / 0.06), 0 2px 6px rgb(20 61 60 / 0.05)`
- `shadow-lift`: `0 2px 4px rgb(20 61 60 / 0.07), 0 8px 18px rgb(20 61 60 / 0.1)`
- `shadow-overlay`: `0 4px 10px rgb(20 61 60 / 0.1), 0 18px 44px rgb(20 61 60 / 0.18)`

Each value has two layers and uses the `ink` color (`20 61 60`) as the tint. Do not copy values from another project. Do not use gradients, glow effects, or shadows in other colors.

## Shapes

- `rounded.sm` (6px) for buttons, inputs, metric tiles, and alerts.
- `rounded.md` (10px) for listing cards and content sections.
- `rounded.lg` (14px) for the floating panel and bottom sheet.
- `rounded.full` for chips, status badges, and map pins.

## Motion & Micro-interaction

Use `duration-fast` (150ms) for hover, focus, and selection, and `duration-base` (200ms) for larger surface changes. Use one easing token for all transitions: `cubic-bezier(0.2, 0, 0, 1)`.

Do not use looping animations such as `animate-ping` or `animate-pulse`. The search loading spinner is the only exception; stop it under reduced motion and keep the loading text.

Under `prefers-reduced-motion: reduce`, remove transitions and animations, and set `scroll-behavior: auto`. Map camera moves use the Google Maps default behavior.

## Components

### Button

Use buttons to trigger actions or navigate to routes.

- Purpose: Execute user commands or open internal paths.
- Variants: `primary` for primary actions, `secondary` for secondary actions, `ghost` for subtle actions, and `danger` for destructive actions.
- Sizes: `default` and `small`. Both sizes keep the 44 px touch height.
- States: Normal, hover, focus, disabled, and pending with a spinner and `aria-busy`. Link variant renders an `<a>` element with button appearance.

### Card

Use cards to group related information on one surface.

- Purpose: Container for grouped content, metrics, or records.
- Variants: `default` with a decorative edge, `raised` with `shadow-card`, and `sunken` with a sunken background.
- Interaction: A raised card lifts to `shadow-lift` on hover only when interactive.

### Badge and StatusBadge

Use badges to display compact labels and verification states.

- Purpose: Show categorical tags and diagnostic price verification status.
- Variants: Badge provides `verified`, `disputed`, `unknown`, `error`, and `neutral` tones. StatusBadge displays verified, disputed, or unknown price states.

### Notice

Use notices to display contextual messages and system feedback.

- Purpose: Present important messages, operational status, or system errors.
- Variants: `info` with a status role, `warning` with a status role, and `error` with an alert role.

### Listing card

A listing card represents one branch-service listing. It contains, in this order:

1. Provider and branch name (`h2`), with the provider's original service label in `small` if it differs from the canonical name.
2. Address (`small`, `muted`).
3. A row of three metric tiles: price (`price-value`), straight-line distance, and road travel time. Label each tile. An unrequested road estimate shows "Not requested". A failed estimate shows "Unavailable".
4. Status badge for verification, with the review date. Source link.
5. Actions: "Select for comparison" (secondary), "View branch" (link), and "Report incorrect information" (link).

The selected card uses `listing-card-selected` and a 2px `primary` outline. Selection on the card and on the map pin is synchronized.

The prototype's "Match" score, trauma level, bed count, and capability tags have no equivalent in MediMap. Do not add a composite or AI-generated score.

### Map markers

Use Google Maps `AdvancedMarker` elements with HTML content styled with these tokens.

- `map-pin-branch` shows the branch name or price in a pill. Only branches with recorded, verified coordinates get a marker.
- `map-pin-branch-selected` marks the selected listing and raises its z-index.
- `map-pin-user` is a solid `ink` circle with a white 2px border. It marks the chosen search location. It does not pulse or animate.
- Every marker has an accessible name, such as "Select Ad-din Moghbazar".

Map markers and list cards must show the same filtered result set.

### Map hint

A small `map-hint` label at the top left of the map says "Click the map to choose your search location". The location form is the keyboard alternative. Hide the hint after the first selection.

### Floating panel and bottom sheet

These show one selected listing. Include a close button with the accessible name "Close listing details". Include the road estimate action "Get driving estimate". After a result arrives, show "Road distance 4.2 km · Estimated travel time 18 minutes". Label the source of the estimate.

### Filter chips

Radius presets (1 km, 3 km, 5 km, Custom) and sort options use `chip-filter`. The active chip uses `chip-filter-active` and `aria-pressed="true"`. Label the radius group "Straight-line radius".

### Lines and outlines

The format has no border property, so `divider`, `field-outline`, and `focus-ring` record line color in `backgroundColor` and line width in `height` or `size`. Apply them as CSS borders and outlines: `divider` for decorative card, section, and table edges; `field-outline` for input borders, hovered cards, and any control whose edge is the only cue; and `focus-ring` for `:focus-visible` outlines with a 2px offset.

### Map provider notices

When the map cannot load (no key, a rejected key, a used-up daily limit, or a network failure), replace the map area with an `alert-error` notice. Say that the map is unavailable and that prices and branch details remain available. Do not show raw provider error text.

### Icons

Use `lucide-react` icons at 16px or 20px, with `stroke-width` 2, in `currentColor`. Use icons beside text labels, not in place of them. Mark decorative icons with `aria-hidden="true"`. Do not use sparkle, siren, ambulance, helicopter, or alert-triangle icons for ordinary content.

## Do's and Don'ts

- Do show the verification status and review date beside every price.
- Do label radius distance as "straight-line" and route values as "road distance" and "estimated travel time".
- Do keep core prices, contacts, and hours visible when the map or routing fails.
- Do keep Google attribution visible on every map.
- Do keep all controls at least 44px high, with a visible `focus` outline of 2px and a 2px offset.
- Do keep control boundaries on `border-strong` and decorative edges on `border`.
- Do check every changed screen at 375px and at desktop width.
- Don't use emergency vocabulary or styling, such as "dispatch", "triage", "golden hour", "ETA ambulance", red beacons, or siren icons.
- Don't show `0`, a dash, or an estimate for an unknown price, rating, hour, or travel time.
- Don't invent travel times from straight-line distance multipliers.
- Don't use text smaller than 12px.
- Don't use color as the only signal for status.
- Don't place floating UI over the bottom 40px of the map.
- Don't add new hues, gradients, or AI-score badges.
- Don't add a second web-font request or a second easing curve.
