# Responsive Report — Sprint 41 Live Monitor

**Date:** 2026-07-07

## Breakpoints

| Viewport | Behavior |
|----------|----------|
| ≥ 900px (desktop) | Full header, alarm bar, toolbar, lead strip, status panel, controls |
| < 900px (compact) | `rootCompact` min-height; header wraps; horizontal scroll on button groups |
| Diagnostic mode | Canvas fills stage; floating controls bottom overlay with max-width 960px |
| Large monitors | Canvas host flex-grow; onLayout drives dynamic canvas dimensions |

## Responsive Patterns

- **Horizontal ScrollView** on lead strip and control groups prevents button overflow on narrow widths.
- **flexWrap** on header and alarm bar chips.
- **minHeight** guards (360px monitor stage, 480px root compact) preserve usable canvas area on tablets.
- **Floating controls** in diagnostic mode use absolute positioning with safe margins.

## Test Matrix

| Device class | Width | Verified |
|--------------|-------|----------|
| Desktop | 1920 | Layout spec + manual |
| Laptop | 1366 | Compact flag at 900px boundary |
| Tablet | 768 | Scroll + wrap |
| Large monitor | 2560+ | Flex canvas expansion |

## Accessibility at All Sizes

- Keyboard shortcuts functional regardless of viewport
- Alarm chips use `accessibilityRole="summary"` and per-chip labels
- Toolbar uses `accessibilityRole="toolbar"`
