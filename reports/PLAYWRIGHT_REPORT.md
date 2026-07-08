# Playwright Report — Hospital Grade Rebuild

**Date:** 2026-07-08

## Suite

`tests/e2e/hospital-grade-rebuild.spec.ts` — tag `@hospital-grade @enterprise`

## Tests

| Test | Coverage |
|------|----------|
| Login → Dashboard → ECG Workspace | Auth bootstrap, workspace ready, clinical right panel |
| Live Monitor RE2 + presets + audio | Canvas, Central Station, Bedside, Pro HUD, audio controls |
| Live Monitor → Report path | Report tab visibility smoke |
| Sprint 50 regression | 6×2 layout, lead focus V5 |

## Command

```bash
npx playwright test tests/e2e/hospital-grade-rebuild.spec.ts --grep "@hospital-grade"
```

## Prerequisites

```bash
node scripts/infrastructure/startup-health-manager.mjs --start-servers
```

## Outcome

Full workflow validated from authenticated session through workspace and live monitor surfaces.
