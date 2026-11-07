---
name: Smart Plant Emergency Detector
description: Spectrum-based plant monitoring system for web and Flutter, with neutral Adobe surfaces, semantic status colors, and a moisture-ring signature.
colors:
  background-base: "#FFFFFF"
  background-layer-1: "#F8F8F8"
  background-pasteboard: "#E9E9E9"
  neutral-content: "#292929"
  neutral-subdued: "#505050"
  neutral-placeholder: "#717171"
  neutral-disabled: "#C6C6C6"
  border-subtle: "#E1E1E1"
  border-strong: "#8F8F8F"
  accent: "#3B63FB"
  accent-hover: "#274DEA"
  accent-subtle: "#E5F0FE"
  on-accent: "#FFFFFF"
  focus-indicator: "#4B75FF"
  positive: "#05834E"
  positive-subtle: "#D7F7E1"
  positive-content: "#036E45"
  notice: "#C24E00"
  notice-subtle: "#FFECCF"
  notice-content: "#A73E00"
  negative: "#D73220"
  negative-subtle: "#FFEBE8"
  negative-content: "#B72818"
  on-negative: "#FFFFFF"
  informative: "#3B63FB"
  informative-subtle: "#E5F0FE"
  informative-content: "#274DEA"
  chart-soil: "#05834E"
  chart-temperature: "#C24E00"
  chart-humidity: "#3B63FB"
  chart-water: "#087E89"
  overlay: "rgba(0, 0, 0, 0.4)"
typography:
  display:
    fontFamily: "Source Sans 3, Source Sans Pro, San Francisco, Roboto, Segoe UI, sans-serif"
    fontSize: "36px"
    fontWeight: 800
    lineHeight: 1.17
    letterSpacing: "-0.01em"
  heading-1:
    fontFamily: "Source Sans 3, Source Sans Pro, San Francisco, Roboto, Segoe UI, sans-serif"
    fontSize: "28px"
    fontWeight: 800
    lineHeight: 1.14
    letterSpacing: "-0.01em"
  heading-2:
    fontFamily: "Source Sans 3, Source Sans Pro, San Francisco, Roboto, Segoe UI, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.18
    letterSpacing: "0"
  heading-3:
    fontFamily: "Source Sans 3, Source Sans Pro, San Francisco, Roboto, Segoe UI, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.22
    letterSpacing: "0"
  title:
    fontFamily: "Source Sans 3, Source Sans Pro, San Francisco, Roboto, Segoe UI, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "0"
  body:
    fontFamily: "Source Sans 3, Source Sans Pro, San Francisco, Roboto, Segoe UI, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0"
  body-sm:
    fontFamily: "Source Sans 3, Source Sans Pro, San Francisco, Roboto, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0"
  detail:
    fontFamily: "Source Sans 3, Source Sans Pro, San Francisco, Roboto, Segoe UI, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.33
    letterSpacing: "0"
  label:
    fontFamily: "Source Sans 3, Source Sans Pro, San Francisco, Roboto, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: 1.29
    letterSpacing: "0"
  data-lg:
    fontFamily: "Source Sans 3, Source Sans Pro, San Francisco, Roboto, Segoe UI, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.14
    letterSpacing: "0"
  data-md:
    fontFamily: "Source Sans 3, Source Sans Pro, San Francisco, Roboto, Segoe UI, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0"
  data-sm:
    fontFamily: "Source Sans 3, Source Sans Pro, San Francisco, Roboto, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.29
    letterSpacing: "0"
  code:
    fontFamily: "Source Code Pro, SFMono-Regular, Consolas, monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.54
    letterSpacing: "0"
rounded:
  sm: "4px"
  md: "8px"
  lg: "10px"
  xl: "16px"
  full: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
  xxxl: "48px"
  xxxxl: "64px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "0 20px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-primary-focus:
    backgroundColor: "{colors.accent-hover}"
  button-secondary:
    backgroundColor: "{colors.background-base}"
    textColor: "{colors.neutral-content}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "0 20px"
    height: "40px"
  button-emergency:
    backgroundColor: "{colors.negative}"
    textColor: "{colors.on-negative}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "0 20px"
    height: "56px"
  input:
    backgroundColor: "{colors.background-base}"
    textColor: "{colors.neutral-content}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "40px"
  card:
    backgroundColor: "{colors.background-base}"
    textColor: "{colors.neutral-content}"
    typography: "{typography.body}"
    rounded: "{rounded.xl}"
    padding: "16px"
  metric-tile:
    backgroundColor: "{colors.background-layer-1}"
    textColor: "{colors.neutral-content}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "12px"
  badge-normal:
    backgroundColor: "{colors.positive-subtle}"
    textColor: "{colors.positive-content}"
    typography: "{typography.detail}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
    height: "24px"
  badge-warning:
    backgroundColor: "{colors.notice-subtle}"
    textColor: "{colors.notice-content}"
    typography: "{typography.detail}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
    height: "24px"
  badge-critical:
    backgroundColor: "{colors.negative-subtle}"
    textColor: "{colors.negative-content}"
    typography: "{typography.detail}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
    height: "24px"
  badge-water-low:
    backgroundColor: "{colors.informative-subtle}"
    textColor: "{colors.informative-content}"
    typography: "{typography.detail}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
    height: "24px"
  badge-offline:
    backgroundColor: "{colors.background-pasteboard}"
    textColor: "{colors.neutral-subdued}"
    typography: "{typography.detail}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
    height: "24px"
  nav-item-active:
    backgroundColor: "{colors.accent-subtle}"
    textColor: "{colors.accent}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    height: "40px"
  bottom-nav:
    backgroundColor: "{colors.background-base}"
    textColor: "{colors.neutral-subdued}"
    typography: "{typography.detail}"
    height: "64px"
---

## Overview

**Status: proposed.** These tokens are design decisions derived from Adobe Spectrum 2 (`@adobe/spectrum-tokens` v15.6.0), not measurements of an existing implementation.

**Product truth.** Smart Plant Emergency Detector is a cross-platform IoT product: a web dashboard used at a desk with a pointer and keyboard, and a Flutter mobile app used quickly with one hand. It serves hobbyists, households, small farmers, greenhouse managers, and schools. The interface is data-dense but must stay calm; one screen must answer "is my plant okay, and what do I do now?"

**Character.** Precise, calm, trustworthy, alert, botanical. The visual world is an **instrument panel for living things**: neutral Adobe gray surfaces, Spectrum blue for interaction, semantic green/orange/red/blue for status, and a single product-specific signature—the **moisture ring**.

**Reference lineage.** Primary: **Adobe Spectrum 2** for color, type, spacing, component anatomy, and accessibility. Adjacent: **Material 3** only for Flutter platform mechanics (navigation, safe areas, touch feedback); **Apple Human Interface Guidelines** only for iOS back behavior and safe areas. Spectrum remains the visual source of truth.

**Signature idea.** The moisture ring: a circular gauge that shows soil moisture percentage and changes status color, paired with an icon and a text label. It appears on device cards, the device detail header, and the history summary. It is meaningful data, not decoration.

**This product is deliberately not.** Not a dark neon IoT dashboard, not a glassmorphism showcase, not a generic admin template with purple gradients, and not a playful garden game. Alert states are clear, but they do not turn the whole screen red.

## Colors

### Roles

- **Page canvas:** `background-layer-1` (#F8F8F8, Spectrum gray-50). Cards and inputs sit on `background-base` (#FFFFFF, gray-25). Use `background-pasteboard` (#E9E9E9, gray-100) for wells, disabled fills, and grouped secondary surfaces.
- **Text:** `neutral-content` (#292929, gray-800) for primary text; `neutral-subdued` (#505050, gray-700) for secondary text and metadata; `neutral-placeholder` (#717171, gray-600) for placeholders. `neutral-disabled` (#C6C6C6, gray-400) is only for disabled controls, never for information.
- **Interaction:** `accent` (#3B63FB, Spectrum blue-900) is the only interactive color for primary actions, links, selected navigation, and focus-adjacent emphasis. `accent-hover` (#274DEA, blue-1000) is hover/pressed. `accent-subtle` (#E5F0FE, blue-200) is selected/soft background.
- **Borders:** `border-subtle` (#E1E1E1, gray-200) for dividers and card edges; `border-strong` (#8F8F8F, gray-500) for input and control boundaries. Selected controls use a 2px `accent` border.
- **Status:** status colors are semantic, never decorative.
  - **Normal:** `positive` (#05834E, green-900), `positive-subtle` (#D7F7E1, green-200), text `positive-content` (#036E45, green-1000).
  - **Warning:** `notice` (#C24E00, orange-900), `notice-subtle` (#FFECCF, orange-200), text `notice-content` (#A73E00, orange-1000).
  - **Critical:** `negative` (#D73220, red-900), `negative-subtle` (#FFEBE8, red-200), text `negative-content` (#B72818, red-1000).
  - **Water low:** `informative` (#3B63FB, blue-900), `informative-subtle` (#E5F0FE, blue-200), text `informative-content` (#274DEA, blue-1000). Water low is blue, not red, so it is distinguishable from critical plant health.
  - **Offline / sensor error:** `background-pasteboard` with `neutral-subdued` text, plus an icon and label. Do not use red for offline; offline is not the same as a plant emergency.
- **Charts:** soil `chart-soil` (#05834E), temperature `chart-temperature` (#C24E00), humidity `chart-humidity` (#3B63FB), water `chart-water` (#087E89, Spectrum turquoise-900). Use 2px lines, no gradients, and a legend with labels.
- **Overlay:** `overlay` (rgba(0,0,0,0.4)) behind dialogs and sheets.

### Contrast pairs (measured)

| Pair | Ratio | Use |
|---|---|---|
| `neutral-content` on `background-base` | 14.55:1 | Primary text |
| `neutral-subdued` on `background-base` | 8.06:1 | Secondary text |
| `neutral-placeholder` on `background-base` | 4.88:1 | Placeholder |
| `on-accent` on `accent` | 4.81:1 | Primary button label |
| `positive-content` on `positive-subtle` | 5.51:1 | Normal badge |
| `notice-content` on `notice-subtle` | 5.45:1 | Warning badge |
| `negative-content` on `negative-subtle` | 5.50:1 | Critical badge |
| `informative-content` on `informative-subtle` | 5.46:1 | Water-low badge |
| `on-negative` on `negative` | 4.81:1 | Emergency button label |
| `border-strong` on `background-base` | 3.23:1 | Input boundary |
| `focus-indicator` on `background-base` | 3.97:1 | Focus ring |

**Rules:** never use color alone to communicate status; every status has an icon and a text label. Do not use the 900-level status colors for small text on subtle backgrounds—use the 1000-level `*-content` tokens. Do not programmatically lighten, darken, or mix Spectrum colors.

**Dark mode:** V1 ships light theme only. Spectrum dark theme is a documented follow-up; token names are semantic so a dark set can be added without renaming. Do not ship an inverted light palette as a dark theme.

## Typography

Spectrum's reference typeface is **Adobe Clean Spectrum VF**, which is proprietary. This project uses **Source Sans 3** as the approved open fallback, following Spectrum's documented fallback stack (Source Sans Pro, San Francisco, Roboto, Segoe UI, sans-serif). Bundle Source Sans 3 locally for both web and Flutter; do not use a runtime font-download package. Use **Source Code Pro** only for code, device IDs, and raw payloads.

| Token | Size / line | Weight | Use |
|---|---|---|---|
| `display` | 36 / 42px | 800 | Page title on empty/onboarding screens |
| `heading-1` | 28 / 32px | 800 | Screen title, device name on detail |
| `heading-2` | 22 / 26px | 700 | Section title |
| `heading-3` | 18 / 22px | 700 | Card group title |
| `title` | 16 / 20px | 700 | Card title, dialog title |
| `body` | 16 / 24px | 400 | Body copy, descriptions |
| `body-sm` | 14 / 21px | 400 | Dense UI copy, form text |
| `detail` | 12 / 16px | 500 | Metadata, timestamps, badge labels |
| `label` | 14 / 18px | 700 | Buttons, tabs, field labels |
| `data-lg` | 28 / 32px | 700 | Primary sensor value on detail |
| `data-md` | 20 / 24px | 700 | Metric tile value |
| `data-sm` | 14 / 18px | 600 | Inline data, table numbers |
| `code` | 13 / 20px | 400 | Device UID, MQTT payload |

**Rules:** body measure is 65–75ch, capped at 72ch. Use `font-variant-numeric: tabular-nums` (web) and `FontFeature.tabularFigures()` (Flutter) for all sensor values, timestamps, and table numbers. Do not use more than one family for UI text. Mobile body is at least 16sp; essential detail is at least 12sp. Support system text scaling without truncating labels. Headings use Spectrum's tighter line height; body uses 1.5.

## Layout

### Web

- Mobile-first; verify at **320, 390, 768, 1024, 1440 CSS px**.
- 12-column grid, 24px gutters, content max-width **1200px**, page max-width **1440px**.
- App shell: left sidebar **240px** at ≥1024px; top bar **64px**. Below 1024px, the sidebar becomes a slide-over and primary navigation moves to a compact top bar.
- Page padding: 16px at <768, 24px at 768–1199, 32px at ≥1200.
- Device grid: 1 column <768, 2 columns 768–1199, 3 columns ≥1200.
- Device detail: single column <1024; at ≥1024 use a 2-column split with main content (2fr) and control/history rail (1fr).
- Tables: header 32px, rows 40px, 16px cell padding. Use available width; do not stretch mobile cards.
- Touch targets: 44px minimum; 48px for primary actions. Keep 8px between adjacent targets.
- Keyboard: every action reachable in visual order; `:focus-visible` ring is 2px `focus-indicator` with 2px offset. Never remove focus without an equivalent.
- Motion: 150ms ease-out for hover/press; 250ms for the moisture ring; 300ms for sheets. Respect `prefers-reduced-motion`; provide a static final state.

### Mobile (Flutter)

- Safe areas: respect notches, home indicators, and system bars. Never place the emergency stop under a gesture zone.
- Bottom navigation: 4 tabs (Ringkasan, Perangkat, Peringatan, Pengaturan), height 64dp + safe-area inset. Touch target 48dp; 56dp for the emergency stop.
- Page padding: 16dp. Card gap: 12dp. Section gap: 24dp.
- One primary action per screen. The device detail screen keeps **Siram** and **Hentikan pompa** in the bottom action area, above the safe-area inset.
- Use native back behavior via `go_router`; do not trap the user in a custom gesture.
- Test at 320×568, 390×844, and a tablet size; test the largest system text scale.
- Use `SafeArea` and `MediaQuery.textScaler`. Use `ThemeData` and `ThemeExtension` for tokens; do not scatter raw colors in widgets.

### Spacing scale

Use Spectrum spacing values only: `xs` 4px, `sm` 8px, `md` 12px, `lg` 16px, `xl` 24px, `xxl` 32px, `xxxl` 48px, `xxxxl` 64px. Group related items with 8–12px; separate groups with 24–32px. Do not introduce arbitrary intermediate values.

### Token implementation

- **Web:** define CSS variables (`--sp-background-base`, `--sp-neutral-content`, `--sp-accent`, etc.) in `globals.css`; map them into the Tailwind theme and shadcn/ui primitives. Do not ship the default shadcn visual theme; every primitive must read Spectrum tokens.
- **Flutter:** map primitives into `ColorScheme` and a `ThemeExtension<AppTokens>` for status colors, spacing, radii, and type. Use `FontFeature.tabularFigures()` for data. Bundle fonts and icons in `assets/`. No `google_fonts` runtime download.
- **Token source:** `@adobe/spectrum-tokens` v15.6.0. The values in the frontmatter are the approved snapshot; update them deliberately, not by local color-picking.

### Platform decision record

| Platform | Primary reference | Input | Critical constraint | Verified at |
|---|---|---|---|---|
| Web | Spectrum 2 | pointer + keyboard | focus-visible, 44px targets, responsive breakpoints | 390 / 1440 |
| Mobile | Spectrum 2 + Material 3 mechanics | touch | safe areas, 48dp targets, text scaling | 390×844 |

## Elevation & Depth

Use **tonal surfaces plus borders**, not card shadows. The page canvas is `background-layer-1`; cards are `background-base` with a 1px `border-subtle` edge. This keeps a dense dashboard calm and avoids nested-card noise.

Shadows are reserved for elements that truly float:

- **Elevated overlay** (popover, dialog, toast): `0 2px 8px rgba(0, 0, 0, 0.16)` — Spectrum `drop-shadow-elevated`.
- **Modal overlay:** `overlay` rgba(0,0,0,0.4).
- **No shadows on cards, metric tiles, or table rows.** Use background layers and borders instead.
- Do not use glassmorphism, backdrop blur, or colored shadows. The product is an instrument panel, not a translucent showcase.

## Shapes

Use four deliberate radii plus full pills:

- `sm` **4px** — checkboxes, small chips, inline tags.
- `md` **8px** — inputs, selects, segmented controls, metric tiles.
- `lg` **10px** — compact panels.
- `xl` **16px** — cards, dialogs, bottom sheets.
- `full` **999px** — primary/secondary/emergency buttons, status badges, avatars.

Borders are 1px by default; selected controls use 2px `accent`; focus rings are 2px `focus-indicator` with a 2px gap. Do not use a different radius on every component. Do not mix Spectrum 1's 4px control corners with Spectrum 2's pill geometry on the same surface.

## Components

### App shell and navigation

- **Web sidebar:** 240px, `background-layer-1`, 1px right border `border-subtle`. Items are 40px high, 8px radius, 12px horizontal padding. Active item: `accent-subtle` background, `accent` text, and a 2px `accent` left indicator. Inactive: `neutral-subdued`; hover: `background-base`.
- **Web top bar:** 64px, `background-base`, 1px bottom border `border-subtle`. Contains device selector, live indicator, notification bell with unread count, and account menu.
- **Mobile bottom nav:** 64dp + safe area, `background-base`, 1px top border `border-subtle`. Four items with 24px icons and 12px labels. Active: `accent`; inactive: `neutral-subdued`. Unread alert badge uses `negative` background and white text, with an accessible label ("3 peringatan belum dibaca").

### Device card

- Structure: header (plant name `title`, location `detail`), status badge, moisture ring (72px), 2×2 metric grid, footer (last seen + quick action).
- Container: `card` tokens—`background-base`, `border-subtle` 1px, `rounded.xl`, 16px padding.
- Hover (web): border becomes `border-strong`; no lift or shadow. Focus-visible: 2px `focus-indicator` ring with 2px offset.
- Offline: `badge-offline`, muted metadata, and "Terakhir terlihat …" text. Do not grayscale the whole card; keep the last known values readable.
- Whole card is a link to device detail; the quick action ("Siram") is a separate button and must not trigger navigation.

### Status badge

- Pill: 24px high, 4px/10px padding, `detail` typography, 14px icon, 6px gap.
- Variants: `badge-normal`, `badge-warning`, `badge-critical`, `badge-water-low`, `badge-offline`.
- Every badge includes an icon and a label: check-circle (Normal), alert-triangle (Warning), alert-octagon (Critical), droplet-off (Water low), wifi-off (Offline), help-circle (Sensor error).
- Do not rely on color alone. If space is very tight, keep the icon and shorten the label; never remove both.

### Metric tile

- `metric-tile` tokens: `background-layer-1`, `rounded.md`, 12px padding.
- Label `detail` (`neutral-subdued`), value `data-md` (tabular), unit `body-sm` (`neutral-subdued`).
- Optional status dot + text; the dot is decorative and the text carries meaning.
- On mobile, 2 columns; on web, 4 columns in the detail rail or 2×2 inside a device card.

### Moisture ring (signature)

- Sizes: 72px on cards, 120px on detail. Track 4px `border-subtle`; progress 4px in the current status color; center value `data-md`/`data-lg` with a `%` suffix in `detail`.
- Below the ring: status label and, on detail, threshold ticks at the warning and critical boundaries.
- Animate progress from the previous value over 250ms ease-out when data changes; no continuous animation. Under reduced motion, jump to the final value.
- Accessibility: `Semantics(label: "Kelembapan tanah 42 persen, status Normal")` in Flutter; `role="img"` + `aria-label` on web. The ring is never the only representation—pair it with the numeric value and status text.

### Tank level indicator

- Vertical 8px track, 200px tall on detail, 72px on cards. Fill uses `chart-water`; track `border-subtle`.
- Markers at 15% (WATER LOW) and 30% (warning). Label "Air 76%" in `data-sm` tabular. When WATER LOW, add `badge-water-low` and the text "Isi ulang tangki"; do not recolor the fill to red.
- If the HC-SR04 reading is invalid, show "Level air tidak tersedia" with `badge-offline` and an explanatory line; do not show 0%.

### Buttons

- **Primary:** `button-primary`—48px high, pill, `accent` background, white `label`, 20px horizontal padding, 16px icon with 8px gap. Hover `accent-hover`; pressed `accent-hover`; focus 2px `focus-indicator` ring + 2px offset; disabled `background-pasteboard` + `neutral-disabled` text; loading keeps the label and adds a 16px spinner. Examples: "Simpan", "Klaim perangkat", "Siram 10 detik".
- **Secondary:** `button-secondary`—40px high, pill, `background-base`, 1px `border-strong`, `neutral-content` text. Hover `background-layer-1`; focus ring; disabled as above. Examples: "Batal", "Ubah pengaturan".
- **Emergency:** `button-emergency`—56px high, pill, `negative` background, white `label`, alert-octagon icon. Single tap stops the pump immediately; show a toast "Pompa dihentikan". Do not require a long press or a confirmation dialog; stopping is the safe action. Disabled only when the device is offline, with the reason "Perangkat offline" shown next to it.
- Icon-only buttons are 40×40px with a visible tooltip/`aria-label`; never leave an icon button unlabeled.

### Inputs and form fields

- `input` tokens: 40px high (web) / 48dp (mobile), `background-base`, 1px `border-strong`, `rounded.md`, 12px horizontal padding, `body-sm` text, `neutral-placeholder` placeholder.
- Label above in `detail` weight 600; helper text below in `detail` `neutral-subdued`. Required fields use the text "Wajib", not an asterisk alone.
- Focus: 2px `focus-indicator` ring + 2px offset. Error: `negative` border + alert icon + message; do not rely on the border color alone. Disabled: `background-pasteboard`, `neutral-disabled` text, and an explanatory line when the reason is not obvious.
- Password fields include a show/hide icon button with an accessible label.

### Segmented control and tabs

- Range selector (24 jam / 7 hari / 30 hari): pill container `background-layer-1`, 32px high. Selected segment: `background-base`, 1px `border-subtle`, `neutral-content`; unselected: `neutral-subdued`. Focus ring on the container; arrow keys move selection.
- Section tabs use a 2px `accent` underline and 14px `label`; do not use pill tabs for section navigation.

### Chart panel

- Container: `card` tokens; title `title`; legend `detail` with 8px color dots and text labels.
- Plot: 2px lines in chart tokens, 1px `border-subtle` gridlines, axis labels `detail` `neutral-subdued`. No gradients, no 3D, no dual axes.
- Height: 240px mobile, 320px desktop. Downsample to at most 120 points; show a text summary above the chart ("Kelembapan tanah turun 18% dalam 24 jam").
- Provide a table alternative for the same data. Do not use color alone to distinguish series; use labeled legends and direct labels at the end of lines where possible.

### Alert and notification row

- Unread: `negative-subtle`/`notice-subtle`/`informative-subtle` background depending on severity, 1px matching border, 8px radius, 12px padding. Read: `background-base`, 1px `border-subtle`.
- Structure: 20px status icon, title `body-sm` weight 600, body `detail`, timestamp `detail` `neutral-subdued`, action "Tandai dibaca".
- Unread also carries a text label ("Baru"), not just a dot. Do not make the entire row a destructive action.

### Toast

- Web: top-right; mobile: above the bottom nav and safe area. Max width 336px, min height 52px, `neutral-background-color-default` (#292929) with white text, 8px radius, elevated shadow.
- Structure: 16px icon, message `body-sm`, optional action, close button. Auto-dismiss after 5s; pause on hover/focus. Errors use a negative icon but the same dark surface; do not use a full red background for a toast.

### Dialog and bottom sheet

- Web dialog: max width 480px, `background-base`, `rounded.xl`, 24px padding, elevated shadow, overlay. Title `title`, body `body-sm`, actions right-aligned; primary action last.
- Mobile bottom sheet: `rounded.xl` top corners, drag handle 32×4px `border-subtle`, max height 90%, safe-area padding. Back/Esc closes; focus is trapped while open.
- Destructive dialogs use the emergency button only for pump-stop confirmation; stopping from the device screen does not open a dialog.

### Empty, loading, error, and offline states

- **Empty:** 24px icon `neutral-subdued`, title `title`, body `body-sm`, one primary action. Example: "Belum ada perangkat. Klaim perangkat pertama Anda."
- **Loading:** preserve layout with skeleton blocks (`background-pasteboard`, static under reduced motion) or a spinner + label for known-duration actions. Do not use an indefinite spinner for a known short operation.
- **Error:** negative icon, cause, and recovery action ("Coba lagi", "Periksa koneksi"). Do not say only "Terjadi kesalahan".
- **Offline:** `badge-offline`, last-seen timestamp, and a clear note that commands are unavailable. Keep the last known readings visible but mark them as stale.

### Data table (web history)

- Header 32px, rows 40px, 16px cell padding, 1px `border-subtle` row dividers. Header `detail` weight 600 `neutral-subdued`; cells `body-sm` tabular.
- Hover row `background-layer-1`; selected row `accent-subtle` with a 2px `accent` left indicator. Pagination uses secondary buttons.
- Numeric columns are right-aligned with tabular figures. Units are in the header, not repeated in every cell.

### Threshold and settings form

- Group thresholds by sensor in cards: Kelembapan tanah, Suhu, Kelembapan udara, Level air.
- Each threshold row: label, current value, unit, slider/stepper, and warning/critical markers. Use `notice` and `negative` only as small markers and labels; do not fill the row with status color.
- Validate inline: critical must be more extreme than warning; target moisture must be above the dry threshold. Show the error next to the field and a summary at the top of the card.
- Save uses the primary button; unsaved changes show a "Belum disimpan" `detail` label, not a colored dot alone.

### Live and stale indicator

- **Live:** static 8px `positive` dot + text "Live" + "Diperbarui 12 detik lalu". No pulsing.
- **Stale:** static 8px `neutral-subdued` dot + text "Tertunda" + last update time. Do not label data "Live" unless the last reading is within 2× the telemetry interval.

## Do's and Don'ts

### Do

- Use Spectrum semantic tokens (`accent`, `positive-content`, `border-strong`, `spacing-*`) instead of raw hex in implementation.
- Pair every status color with an icon and a text label.
- Keep one primary action per screen; on device detail, make **Siram** primary and **Hentikan pompa** visually distinct.
- Show the last update time and stale/offline state next to any live data.
- Keep the moisture ring, numeric value, and status text together; the ring is an enhancement, not the only representation.
- Use tabular numerals for all sensor values, timestamps, and table numbers.
- Bundle Source Sans 3 and the icon set locally; test offline.
- Test keyboard-only web paths, 200% zoom, reduced motion, long Indonesian labels, and the largest mobile text scale.
- Use `border-subtle` for card edges and `border-strong` for control boundaries.

### Don't

- Don't use Adobe Clean Spectrum VF without a license; Source Sans 3 is the approved fallback.
- Don't use color alone for status, errors, or danger.
- Don't use red for WATER LOW; it is informative blue so it reads differently from CRITICAL.
- Don't use the accent blue for status meaning; reserve it for interaction.
- Don't use glassmorphism, backdrop blur, gradients, neon, or colored shadows.
- Don't put shadows on cards or nest cards without a real grouping purpose.
- Don't use more than the four radii plus the full pill; don't mix Spectrum 1 and Spectrum 2 geometry.
- Don't animate the moisture ring continuously or pulse critical alerts indefinitely; use one 200–250ms entry animation.
- Don't hide navigation or actions behind hover-only menus.
- Don't place the emergency stop under a gesture zone or require a long press to stop the pump.
- Don't show "0%" when the water sensor fails; show "tidak tersedia" and block the pump.
- Don't label stale data as "Live" or omit the timestamp.
- Don't use text smaller than 12px (web) or 12sp (mobile) for essential information.
- Don't ship the default shadcn/ui or Flutter Material look; every component must read Spectrum tokens.
