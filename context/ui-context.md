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

## Future UI decisions

Define controls, interaction states, error and success colors, and component conventions when functional pages are in scope.
