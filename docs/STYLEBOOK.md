# Stylebook — web shell (PIP / terminal)

**Source of truth for colors & type:** `web/theme.css` + Storybook stories (`web/stories/HKTMChrome.stories.js`).

## Palette (CSS variables)

| Token | Default | Usage |
|-------|---------|--------|
| `--bg` | `#0a0f0c` | Page background |
| `--panel` | `#0d1510` | Terminal panel |
| `--text` | `#c8e6d0` | Primary text |
| `--dim` | `#5a7a66` | Secondary / borders |
| `--green` | `#3dff7a` | Prompt, accent, focus |
| `--cyan` | `#5ce1e6` | Ghost buttons, links |
| `--magenta` | `#e070ff` | Badge, LINK bar label |
| `--yellow` | `#e6d04a` | Warnings |
| `--red` | `#ff6b6b` | SOC / alerts |
| `--blue` | `#6eb5ff` | Node ids |

## Typography

- **Font stack:** `Cascadia Code`, `Fira Code`, `Consolas`, monospace.
- **Body:** 14px base; **terminal** (`.term`): 13px, `line-height` 1.4, `white-space: pre-wrap`.

## Components

### Ghost button (`.ghost`)

- Transparent fill, `1px` border `var(--dim)`, text `var(--cyan)`.
- **Hover:** border + text `var(--green)`.
- **Disabled:** reduced opacity, dim border/text.
- **`.sound-off`:** muted variant.

### Header

- `.title` — green, bold, letter-spacing.
- `.badge` — magenta border, small caps feel.

### Step history toolbar

- Flex row, gap `0.5rem`; buttons tabbable; **focus-visible** cyan outline.

### `.input-row`

- Flex; `#cmd` flex 1; dark field `#050807`, border `#1f3328`.
- **`.cmd-enter`:** inline-flex, `↵` icon + `ENTER` label, small caps, **no** `title` tooltip (icon is the hint).

### Terminal output

- `.hktm-out-line` — completed lines; `.hktm-out-live` — spinner / `\r` line (`white-space: pre`).

## Interaction patterns

- **Enter** in terminal area (outside `#cmd`) flushes **Enter** waiters (pager / splash).
- **Sound** toggle persists in `localStorage` (`hktm_web_sound`).
- **Step history:** Ctrl/Cmd+arrows + PgUp/PgDn; empty `#cmd` allows Ctrl+← for history.

## Storybook

Run `npm run storybook --prefix web` to preview isolated chrome fragments against the same CSS.
