# UI Polish Report — Sprint 35

## Spacing & Typography

- Panel border radius: 2px
- Toolbar height: 16px; buttons: 20×20px
- Status bar: 22px; 9–10px chip typography
- Tab bar: min-height 30px with horizontal margin spacing
- Workflow steps: min-width 72px, max label width 120px — no cropped labels

## Visual Clutter Reduction

- Removed Patient tab from right panel (content lives on left summary)
- Removed developer-mode toggle and debug chips (Canvas, XY, CPU, API, Quality)
- Floating palette trimmed to essential clinical tools
- Collapsed lead selector by default on left panel

## Tooltips

All toolbar and floating palette icons include:

- Title (label)
- Description
- Keyboard shortcut where applicable

Rendered via `createPortal` to `document.body` — never clipped by panel overflow.

## Accessibility

- Consistent 20–22px touch targets on toolbars
- Tab roles with `accessibilityState.selected`
- Uniform Feather icon sizing (11–12px)
