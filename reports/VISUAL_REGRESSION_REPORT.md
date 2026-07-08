# Visual Regression Report

**Generated:** 2026-07-07

## Suite

**Spec:** `tests/e2e/visual-regression-enterprise.spec.ts`  
**Tag:** `@visual-regression @enterprise`

## Snapshots

| Snapshot | Viewport | Detects |
|----------|----------|---------|
| `dashboard-desktop.png` | 1440×900 | Layout shift, KPI alignment |
| `dashboard-laptop.png` | 1366×768 | Responsive dashboard |
| `dashboard-tablet.png` | 1024×768 | Tablet layout |
| `ecg-workspace-shell.png` | 1920×1080 | Toolbar, ribbon, panel alignment |
| `login-screen.png` | default | Typography, auth card spacing |

**Storage:** `tests/e2e/__snapshots__/visual-regression-enterprise.spec.ts/`

## Configuration

- `playwright.config.ts` — `snapshotPathTemplate` for deterministic paths
- `maxDiffPixelRatio`: 0.02–0.03 (layout tolerance)

## Commands

```bash
# Compare against baselines
npm run qa:visual

# Refresh baselines after intentional UI change (SAT agent only)
npm run qa:visual:update
```

## Detected Issue Classes

- Layout shift
- Alignment drift
- Spacing inconsistencies
- Typography regression
- Cropped text (pixel diff)
- Broken icons (visual diff)
- Dark theme shell drift
- Responsive breakpoint breaks

## CI

Visual regression runs in `enterprise-qa.yml` playwright job. First CI run may require baseline seeding via artifact upload.

## Production Impact

**None** — snapshot comparison is test-only; no UI components modified.
