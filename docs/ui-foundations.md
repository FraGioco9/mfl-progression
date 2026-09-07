# MFL Front Office UI foundations

This document defines the global visual and structural defaults for MFL Front Office. New UI should reuse these contracts instead of introducing page-specific literals for the same semantic role.

The goal is **shared ownership, not forced sameness**. Responsive geometry, Player/Evaluation-specific sizing, compact table controls, and other intentionally specialized behavior remain domain-owned.

## Ownership map

| Foundation | Canonical owner |
| --- | --- |
| Cross-site shared control/surface/page-rhythm tokens | `site/ui-foundations.css` |
| Theme palette and desktop shell geometry | `site/styles-base.css` |
| Table geometry and Uniform Width | `site/styles.css` |
| Motion timings | `site/motion.css` |
| Dropdown mechanics | `site/dropdowns.css` |
| Scrollbars | `site/scrollbars.css` |
| Cross-site stacking | `site/stacking.css` |
| Responsive scaling | `site/responsive-sources/*.css.inc` -> generated `responsive.css` |

Generated `site/styles-runtime.css`, `site/responsive.css`, and `site/index.html` are projections. Edit their canonical sources instead.

## Colors and theme

### Light

- Page background: `#f6f7f9`
- Surface: `#ffffff`
- Muted surface: `#fbfcfe`
- Border: `#d9dee7`
- Strong border: `#c9d1dc`
- Text: `#172026`
- Muted text: `#5f6b76`
- Soft text: `#687581`
- Header background: `#eef3f7`
- Row hover: `#f4f8fb`
- Contracts-cell hover: `#dbe8f1`
- Primary: `#1d5f8a`
- Primary hover: `#174d70`
- Danger: `#b42318`

### Dark

- Page background: `#101418`
- Surface: `#171d22`
- Muted surface: `#1d252c`
- Border: `#303b44`
- Strong border: `#46535e`
- Text: `#e8eef3`
- Muted text: `#a9b4bd`
- Soft text: `#8f9ba5`
- Header background: `#222b33`
- Row hover: `#202a32`
- Contracts-cell hover: `#31404b`
- Primary: `#4aa3df`
- Primary hover: `#65b5ea`
- Danger: `#ff8a80`

`--danger` is the only global destructive/error-color source. Destructive actions, validation errors, invalid-field borders, and destructive hover/focus states must derive from it rather than introducing a separate red.

Data visualization and game-state colors are intentionally not part of this rule. For example, negative progression, Training deltas, and difficulty/status colors may keep domain-owned reds because they communicate data meaning rather than an error or destructive action.

## Typography

- Font: `"Titillium Web", Arial, Helvetica, sans-serif`
- `font-size-adjust`: `0.500`
- Shared page/table title size: `20px` (`--mfl-page-title-font-size`)
- Shared page-title minimum height: `32px` (`--mfl-page-title-min-height`)
- Phone and compact-phone title scaling override the same token to `18px` / `17px`
- Page-title block margins: `6px` before / `8px` after (`--mfl-page-title-margin-block-start` / `--mfl-page-title-margin-block-end`)
- Page-title line-height: `1.2` (`--mfl-page-title-line-height`)
- Numeric/count values use tabular figures where stable alignment matters

## Layout and chrome

- Desktop pinned sidebar: `190px`
- Desktop topbar: `102px`
- Mobile navigation: `58px`
- Repeated desktop page-section rhythm: `6px` (`--mfl-page-section-gap`)
- Phone page-section rhythm: `5px`, expressed by overriding the same shared token
- Responsive page padding remains breakpoint-owned
- There is intentionally no global content max-width because table-heavy routes use the available width

The page-rhythm tokens are semantic foundations: use them only when two sections play the same structural role. Component-internal gaps, Player/Evaluation geometry, and deliberate exceptions remain locally owned.

## Controls

Cross-site semantic values live in `ui-foundations.css`:

- Standard control height: `40px` (`--mfl-control-height`)
- Compact control height: `36px` (`--mfl-control-compact-height`)
- Standard control radius: `6px` (`--mfl-radius-control`)
- Checkbox size: `16px` (`--mfl-checkbox-size`)
- Checkbox radius: `4px` (`--mfl-radius-checkbox`)

Specialized tiny steppers, table action buttons, mobile-only touch geometry, and other domain-specific controls keep their own sizes.

## Dialogs and overlays

- Canonical dialog radius: `8px` (`--mfl-radius-dialog`)
- Canonical modal/dialog shadow: `0 20px 80px rgba(0, 0, 0, 0.28)` (`--mfl-shadow-modal`)
- Tooltip shadow: `0 10px 26px rgba(0, 0, 0, 0.28)` (`--mfl-shadow-tooltip`)
- Mobile navigation surface shadow: `0 10px 28px rgba(0, 0, 0, 0.18)` (`--mfl-shadow-mobile-navigation`)
- Ordinary dialogs remain fixed application-layer elements rather than browser top-layer popovers
- Main scrolling is locked while a modal backdrop is open
- Toasts remain above every modal/overlay

## Tables

Uniform Width remains the only numeric player-table column-width contract.

- Header height: `38px`
- Body row height: `34px`
- Outer row pitch: `39px`
- Column percentages remain owned by the `--mfl-table-col-*` variables
- Responsive table geometry may scale at its existing breakpoints

## Motion

`motion.css` owns the timing scale:

- Fast: `120ms`
- Tooltip: `170ms`
- Standard: `180ms`
- Expand: `200ms`
- Slow: `220ms`

Equivalent transitions should consume these tokens when the semantic timing is the same.

## Dropdowns

`dropdowns.css` remains the specialist owner:

- Gap: `8px`
- Picker radius: `8px`
- Shadow: `0 12px 36px rgba(0, 0, 0, 0.16)`
- Maximum height: `min(320px, calc(100vh - 16px))`
- Chevron inset: `10px`

Inline selectors such as the Evaluation position selector may intentionally use different geometry.

## Scrollbars

`scrollbars.css` owns:

- Normal size: `8px`
- Compact size: `5px`
- Track end inset: `4px`
- Theme-derived thumb, hover, and active colors

## Stacking

`stacking.css` owns the semantic global z-index scale:

- Content: `0`
- Navigation: `300`
- Mobile navigation: `310`
- Dropdown: `400`
- Chrome: `500`
- Floating tooltip: `600`
- Selection: `700`
- Table action menu: `720`
- Busy shield: `740`
- Highest ordinary UI: `780`
- Modal: `900`
- Critical modal: `1000`
- Toast: `1100`

Component-local z-index values stay below the global application layers.

## Chosen normalizations for v1.127.12

1. Filter-rule removal uses the theme-aware global `--danger` value instead of hard-coded `#ff2020`.
2. Bug Report uses the same `8px` dialog radius as the other shared dialogs instead of `10px`.
3. Semantic destructive/error UI uses `--danger` end to end. This includes Bug Report errors, Watchlist and Evaluation delete actions, Add Watchlist validation, Settings invalid/discard states, wallet opt-out, and destructive hover/focus states that previously used separate fixed reds such as `#e06b6b`, `#ff8a8a`, `#c92a2a`, `#d84b4b`, `#ff6b6b`, and `#e95656`.
4. Page/table title typography and repeated page-section vertical rhythm use the shared `--mfl-page-title-*` / `--mfl-page-section-gap` contracts. Phone and compact-phone title sizes override the same semantic token instead of redefining `.tablePageTitle`.

## What must remain intentionally separate

Do not globalize a value merely because two numbers or colors match. In particular, preserve intentional differences between:

- desktop / tablet / phone / compact layouts
- standard `40px` and compact `36px` controls
- normal controls and tiny steppers/table actions
- control, dialog/popover, and pill radii
- tooltip, dropdown, modal, and mobile-navigation shadows
- Player/Evaluation-specific geometry
- page-level semantic rhythm and component-internal spacing
- data visualization/game-state colors such as progression, Training deltas, and difficulty/status scales

When a new value is genuinely global, add it to the appropriate canonical owner and update validation so a competing one-off literal cannot silently reappear.
