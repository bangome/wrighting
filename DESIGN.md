# wrighting Design System

## 1. Atmosphere & Identity

wrighting is a quiet writing command center: compact, low-glare, and built for long sessions with many manuscript objects open at once. Its signature is layered calm: panels, popovers, and editor surfaces separate through muted tonal shifts, thin borders, and restrained blue affordances rather than decorative graphics.

## 2. Color

### Palette

| Role | Token | Light | Dark | Usage |
|------|-------|-------|------|-------|
| Surface/primary | `--bg` | `#f5f5f4` | `#0e0e11` | Main app background |
| Surface/elevated | `--bg-elev` | `#ffffff` | `#16161a` | Modals, popovers, cards |
| Surface/elevated 2 | `--bg-elev-2` | `#f0f0ef` | `#1c1c22` | Inputs, secondary panels |
| Surface/sidebar | `--bg-sidebar` | `#ececea` | `#131316` | Workspace sidebar |
| Surface/hover | `--bg-hover` | `#e6e6e4` | `#232329` | Hover states |
| Surface/active | `--bg-active` | `#dcdcd9` | `#2b2b33` | Selected navigation/tab states |
| Border/default | `--border` | `#e0e0dd` | `#26262d` | Dividers and outlines |
| Border/strong | `--border-strong` | `#cfcfca` | `#34343d` | Focused or stronger outlines |
| Text/primary | `--text` | `#1c1c1e` | `#e7e7ea` | Main UI text |
| Text/secondary | `--text-muted` | `#6b6b70` | `#9a9aa4` | Labels and secondary text |
| Text/faint | `--text-faint` | `#9a9aa0` | `#6b6b74` | Hints and empty states |
| Accent/primary | `--accent` | `#2563eb` | `#3b82f6` | Links, primary actions, focus accents |
| Accent/soft | `--accent-soft` | `#dbeafe` | `#1e3a5f` | Mention chips and active accent backgrounds |
| Status/error | `--danger` | `#c0492f` | `#cf6a6a` | Destructive actions and errors |
| Status/success | `--ok` | `#2f9e5e` | `#5fae7a` | Saved/complete states |

### Rules

- Use accent only for interaction, links, and focus; never as decoration.
- Error and empty states stay calm and textual, with `--danger` reserved for real failures.
- Do not add raw colors in components; extend this table first.

## 3. Typography

### Scale

| Level | Size | Weight | Line Height | Tracking | Usage |
|-------|------|--------|-------------|----------|-------|
| Page title | 24px | 700 | 1.25 | 0 | Focused document or public title |
| Section title | 18px | 600 | 1.35 | 0 | Settings and workspace pages |
| Panel title | 16px | 600 | 1.4 | 0 | Modal and panel headers |
| Body | 14px | 400 | 1.5 | 0 | Default UI text |
| Body/sm | 13px | 400 | 1.5 | 0 | Dense lists and popovers |
| Caption | 12px | 400-500 | 1.4 | 0 | Counts, hints, metadata |
| Binder label | 11px | 600 | 1.3 | 0.08em | Uppercase sidebar section labels |

### Font Stack

- Primary: `Inter, -apple-system, BlinkMacSystemFont, Pretendard, Apple SD Gothic Neo, Malgun Gothic, system-ui, sans-serif`
- Serif: `Nanum Myeongjo, Apple Myungjo, Batang, serif`
- Mono: `D2Coding, Nanum Gothic Coding, monospace`

### Rules

- Body text never goes below 12px for metadata or 14px for core reading UI.
- Editor body font is user-selectable, but app chrome remains in the primary stack.
- Letter spacing is 0 except uppercase micro labels.

## 4. Spacing & Layout

### Base Unit

All spacing derives from a 4px base. Existing Tailwind spacing maps directly to this rhythm.

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 4px | Tight icon/text proximity |
| `--space-2` | 8px | List rows, small gaps |
| `--space-3` | 12px | Compact padding |
| `--space-4` | 16px | Panel padding, toolbar groups |
| `--space-6` | 24px | Dialog and card padding |
| `--space-8` | 32px | Page gutters |

### Grid

- Workspace desktop grid: fixed 260px sidebar plus flexible main area.
- Mobile workspace: off-canvas sidebar and single primary pane.
- Editor reading width: 720px max.

### Rules

- Prefer dense but scannable layouts over marketing-style hero sections.
- Fixed-format controls keep stable dimensions so labels and icons do not shift layout.
- Avoid nested cards; page sections are unframed layouts or full-height app surfaces.

## 5. Components

### Icon Button
- **Structure**: `button.icon-btn` with a Lucide icon and optional accessible title.
- **States**: transparent default, `--bg-hover` on hover, muted-to-primary text transition.
- **Accessibility**: provide `title` or `aria-label` when the icon is not paired with text.

### Popover
- **Structure**: fixed click-away overlay plus elevated absolute panel.
- **Spacing**: 8px inner padding for dense menus, 12-16px for content.
- **Depth**: `--bg-elev`, `--border`, and `--shadow`.

### Empty/Error State
- **Structure**: centered or page-local text, optionally with a short action link.
- **Tone**: concise and calm; no decorative illustration required.
- **Color**: `--text-faint` for empty, `--danger` for failures.

## 6. Motion & Interaction

### Timing

| Type | Duration | Easing | Usage |
|------|----------|--------|-------|
| Micro | 100-150ms | ease-out | Button hover, color changes |
| Standard | 200ms | ease-in-out | Sidebar drawer and panel transitions |

### Rules

- Animate only transform, opacity, color, and background for app chrome.
- Every button has hover and keyboard focus affordance through native focus or tokenized outline.
- Respect compact workspace ergonomics over decorative motion.

## 7. Depth & Surface

### Strategy

wrighting uses a mixed but restrained depth strategy: tonal-shift for persistent app structure, borders for boundaries, and shadows only for popovers/modals.

| Level | Token | Usage |
|-------|-------|-------|
| Base | `--bg` | Main workspace |
| Raised | `--bg-elev` | Cards, popovers, modals |
| Raised/secondary | `--bg-elev-2` | Inputs and secondary panels |
| Divider | `1px solid var(--border)` | Toolbars, sidebars, list rows |
| Floating | `--shadow` | Menus, overlays, dialogs only |
