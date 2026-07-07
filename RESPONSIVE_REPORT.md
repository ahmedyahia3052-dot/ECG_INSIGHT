# Sprint 36 — Responsive Report

## Viewports Tested (Playwright)

| Resolution | Left rail | Right panel | Toolbar | Status bar | Workflow ribbon |
|------------|-----------|-------------|---------|------------|-----------------|
| 1366×768 | Visible | Visible | Visible | Visible | Visible |
| 1440×900 | Visible | Visible | Visible | Visible | Visible |
| 1600×900 | Visible | Visible | Visible | Visible | Visible |
| 1920×1080 | Visible | Visible | Visible | Visible | Visible |

## Layout Guards Validated (Static)

- `EcgWorkstationGridShell` — `minmax(0, 1fr)` center column
- `EcgClinicalRightPanel` — tab labels `numberOfLines={1}`
- `EcgWorkstationTooltip` — portal rendering (no parent clipping)
- Pipeline chips / sidebar duplication removed in prior sprints; re-verified present

## Issues Found & Fixed

- Invalid `nativeID` on web layout nodes (console noise, potential layout engine quirks)
- Nested buttons in measurement list (invalid HTML on narrow panels)

## Result

**PASS** — No clipping or overflow failures across tested hospital desktop breakpoints.
