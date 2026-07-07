# Sprint 36 — Visual Regression Report

## Method

- Playwright screenshots on failure (artifact retention)
- Responsive layout assertions via test IDs (no pixel-diff baseline in CI for Sprint 36)
- Static inspection of viewer tokens and overflow guards

## Areas Inspected

| Surface | Status |
|---------|--------|
| Enterprise toolbar (compact) | PASS |
| Clinical left summary panel | PASS |
| Four-tab right panel | PASS |
| Floating tool palette | PASS |
| Diagnostic fullscreen + ESC restore | PASS |
| AI findings tab (no overlap with measurements) | PASS |
| Measurement overlay after zoom | PASS |

## Known Visual Notes

- Floating palette auto-hides when idle; mouse movement required for visibility (by design)
- Diagnostic mode hides main toolbar; floating palette remains

## Result

**PASS** — No layout regressions detected in Sprint 36 automated visual checks.
