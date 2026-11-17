---
version: alpha
name: MediMap Clinical Teal
description: Design system for MediMap, a diagnostic-service price-comparison and branch-finder application for Dhaka. Light clinical teal palette with a sidebar-and-map layout.
colors:
  primary: "#117c73"
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
  border-strong: "#9fbdb8"
  focus: "#117c73"
  verified: "#1e6b3a"
  verified-soft: "#e6f4ea"
  disputed: "#8a5a00"
  disputed-soft: "#fdf3dc"
  unknown: "#506b69"
  unknown-soft: "#eef3f2"
  error: "#b3261e"
  error-soft: "#fce8e6"
typography:
  headline-display:
    fontFamily: Georgia, 'Times New Roman', serif
    fontSize: 2.5rem
    fontWeight: 400
    lineHeight: 1.1
  headline-lg:
    fontFamily: system-ui, -apple-system, 'Segoe UI', sans-serif
    fontSize: 1.5rem
    fontWeight: 700
    lineHeight: 1.25
  headline-md:
    fontFamily: system-ui, -apple-system, 'Segoe UI', sans-serif
    fontSize: 1.125rem
    fontWeight: 700
    lineHeight: 1.3
  body-md:
    fontFamily: system-ui, -apple-system, 'Segoe UI', sans-serif
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: system-ui, -apple-system, 'Segoe UI', sans-serif
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.45
  label-md:
    fontFamily: system-ui, -apple-system, 'Segoe UI', sans-serif
    fontSize: 0.875rem
    fontWeight: 600
    lineHeight: 1.2
  label-sm:
    fontFamily: system-ui, -apple-system, 'Segoe UI', sans-serif
    fontSize: 0.75rem
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: 0.02em
  price-lg:
    fontFamily: system-ui, -apple-system, 'Segoe UI', sans-serif
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
components:
  app-header:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    height: "{spacing.header-height}"
    padding: 16px
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.sm}"
    height: "{spacing.touch-target}"
    padding: 12px
  button-primary-hover:
    backgroundColor: "{colors.primary-strong}"
    textColor: "{colors.on-primary}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.sm}"
    height: "{spacing.touch-target}"
    padding: 12px
  button-secondary-hover:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-strong}"
  input-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.sm}"
    height: "{spacing.touch-target}"
    padding: 10px
  chip-filter:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.label-md}"
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
    typography: "{typography.label-sm}"
    rounded: "{rounded.sm}"
    padding: 8px
  price-value:
    textColor: "{colors.ink}"
    typography: "{typography.price-lg}"
  status-verified:
    backgroundColor: "{colors.verified-soft}"
    textColor: "{colors.verified}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: 4px
  status-disputed:
    backgroundColor: "{colors.disputed-soft}"
    textColor: "{colors.disputed}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: 4px
  status-unknown:
    backgroundColor: "{colors.unknown-soft}"
    textColor: "{colors.unknown}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: 4px
  alert-error:
    backgroundColor: "{colors.error-soft}"
    textColor: "{colors.error}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    padding: 12px
  map-pin-branch:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.label-sm}"
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
    typography: "{typography.label-sm}"
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
    typography: "{typography.body-sm}"
  divider:
    backgroundColor: "{colors.border}"
    height: 1px
  field-outline:
    backgroundColor: "{colors.border-strong}"
    size: 1px
  focus-ring:
    backgroundColor: "{colors.focus}"
    size: 3px
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

The palette is a light clinical teal. It extends the original tokens in `src/styles.css`.

- **Clinical Teal (`primary`, `#117c73`)** is for primary actions, links, the selected state, focus rings, and the route line. Its contrast on white is approximately 5.1:1.
- **Deep Teal Ink (`ink`, `#143d3c`)** is for body text, the app header background, the user-location marker, and active filter chips.
- **Slate Teal (`muted`, `#506b69`)** is for secondary text, metadata, and the unknown status.
- **Mist (`background`, `#f2f8f7`)** is the page background. **White (`surface`)** is for cards, panels, and inputs. **`surface-sunken`** is for metric tiles inside cards.
- **`border`** separates cards and fields. **`border-strong`** is for hovered cards and input borders.

Status colors are always paired with a text label. Color alone never carries meaning.

| Status | Token pair | Label text |
| --- | --- | --- |
| Verified price | `verified` on `verified-soft` | "Verified" with the review date |
| Disputed price | `disputed` on `disputed-soft` | "Disputed, under review" |
| Unknown value | `unknown` on `unknown-soft` | "Unknown" or "Not recorded" |
| Error | `error` on `error-soft` | A specific failure message |

Each status pair has a contrast ratio above 5:1. Do not add red, rose, or orange accents for emphasis. Use `error` only for real failures.

### Legacy token aliases

Existing stylesheets use these custom properties. Keep them as aliases until each stylesheet is migrated.

| Legacy property | DESIGN.md token |
| --- | --- |
| `--bg-base` | `colors.background` |
| `--bg-surface` | `colors.surface` |
| `--text-primary` | `colors.ink` |
| `--text-muted` | `colors.muted` |
| `--accent-primary` | `colors.primary` |
| `--border-default` | `colors.border` |

## Typography

Use the system sans-serif stack for all interface text. Use Georgia (`headline-display`) only for the home-page hero heading. Do not load web fonts. The prototype loaded Plus Jakarta Sans and JetBrains Mono from Google Fonts. MediMap does not use them.

- `headline-lg` is for page titles. `headline-md` is for card titles and panel titles.
- `body-md` is the default. `body-sm` is for addresses, source notes, and metadata.
- `label-md` is for buttons, chips, and field labels. `label-sm` is for status badges, metric-tile labels, and map pins.
- `price-lg` is for BDT prices. It uses tabular figures so that prices align in lists and tables.

The minimum text size is 12px (`label-sm`). The prototype used 9px to 11px text. Do not copy those sizes.

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

The interface is mostly flat. Borders separate content.

- Level 0: page background and sidebar. No shadow.
- Level 1: cards and inputs. A 1px `border`, no shadow. Hovered cards use `border-strong`.
- Level 2: items that float above the map (floating panel, bottom sheet, map hint). Use `0 8px 24px rgb(20 61 60 / 0.16)`.

Do not use gradients, glow effects, or colored shadows.

## Shapes

- `rounded.sm` (6px) for buttons, inputs, metric tiles, and alerts.
- `rounded.md` (10px) for listing cards and content sections.
- `rounded.lg` (14px) for the floating panel and bottom sheet.
- `rounded.full` for chips, status badges, and map pins.

## Components

### Listing card

A listing card represents one branch-service listing. It contains, in this order:

1. Provider and branch name (`headline-md`), with the provider's original service label in `body-sm` if it differs from the canonical name.
2. Address (`body-sm`, `muted`).
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

The format has no border property, so `divider`, `field-outline`, and `focus-ring` record line color in `backgroundColor` and line width in `height` or `size`. Apply them as CSS borders and outlines: `divider` for card and section borders, `field-outline` for input borders and hovered cards, and `focus-ring` for `:focus-visible` outlines with a 3px offset.

### Map provider notices

When the map cannot load (no key, a rejected key, a used-up daily limit, or a network failure), replace the map area with an `alert-error` notice. Say that the map is unavailable and that prices and branch details remain available. Do not show raw provider error text.

### Icons

Use `lucide-react` icons at 16px or 20px, with `stroke-width` 2, in `currentColor`. Use icons beside text labels, not in place of them. Mark decorative icons with `aria-hidden="true"`. Do not use sparkle, siren, ambulance, helicopter, or alert-triangle icons for ordinary content.

### Motion

Use transitions of 150ms or less for hover, focus, and selection only. Do not use looping animations, such as `animate-ping` or `animate-pulse`. Respect `prefers-reduced-motion: reduce` by removing transitions. Map camera moves use the Google Maps default behavior.

## Do's and Don'ts

- Do show the verification status and review date beside every price.
- Do label radius distance as "straight-line" and route values as "road distance" and "estimated travel time".
- Do keep core prices, contacts, and hours visible when the map or routing fails.
- Do keep Google attribution visible on every map.
- Do keep all controls at least 44px high, with a visible `focus` outline of 3px and a 3px offset.
- Do check every changed screen at 375px and at desktop width.
- Don't use emergency vocabulary or styling, such as "dispatch", "triage", "golden hour", "ETA ambulance", red beacons, or siren icons.
- Don't show `0`, a dash, or an estimate for an unknown price, rating, hour, or travel time.
- Don't invent travel times from straight-line distance multipliers.
- Don't use text smaller than 12px.
- Don't use color as the only signal for status.
- Don't place floating UI over the bottom 40px of the map.
- Don't add web fonts, gradients, or AI-score badges.
