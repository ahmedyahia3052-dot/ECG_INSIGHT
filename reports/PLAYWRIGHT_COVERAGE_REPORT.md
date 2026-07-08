# Playwright Coverage Report

**Generated:** 2026-07-07

## Summary

| Metric | Value |
|--------|-------|
| Spec files | 48+ |
| Critical workflows mapped | **28/28 (100%)** |
| New consolidated spec | `enterprise-workflow-matrix.spec.ts` |
| Visual regression spec | `visual-regression-enterprise.spec.ts` |
| Performance probe | `performance-viewer-ready.spec.ts` |

## Workflow Coverage Matrix

| Workflow | Primary Specs |
|----------|---------------|
| Authentication | `auth-navigation`, `auth-logout-regression`, `login-screen-stability` |
| Dashboard | `auth-navigation`, `enterprise-full-validation` |
| Patients / Details | `clinical-workflows`, `enterprise-workflow-matrix` |
| ECG Upload | `clinical-workflows`, `enterprise-full-validation` |
| Image Processing / Grid / Lead | Sprint 14–16 specs + QA matrix |
| Digitization | `sprint16-ecg-digitization` |
| Signal Reconstruction | Sprint 27–28 rendering specs |
| Viewer / Zoom / Pan | `ecg-workspace-restoration`, QA matrix |
| Measurements | Sprint 15, 34 |
| AI Findings | Sprint 14 + QA matrix |
| AI Cardiologist | `sprint38-ai-cardiologist` (parallel agent; excluded from default QA) |
| Live Monitor | Sprint 37, 13 |
| Fullscreen / Overlay / Compare | Sprint 29, 18, QA matrix |
| Reports / Export | `clinical-workflows`, QA matrix |
| Settings / History | `auth-navigation`, Sprint 30, QA matrix |
| Dark Theme | QA matrix (enterprise dark shell validation) |
| Responsive | `mobile-responsive`, Sprint 36 |
| Error Recovery / Empty States | `enterprise-full-validation`, QA matrix, restoration |

## Shared Infrastructure

- `tests/e2e/utils/qa.ts` — auth, fixtures, navigation
- `tests/e2e/utils/ecg-workspace-locators.ts` — Sprint 35-aware selectors

## Audit Command

```bash
node scripts/qa/audit-playwright-coverage.mjs
```

Output: `test-results/qa-artifacts/playwright-coverage-matrix.json`

## Tags

| Tag | Purpose |
|-----|---------|
| `@smoke` | PR fast path |
| `@enterprise` | Full clinical validation |
| `@qa-matrix` | 28-workflow consolidated spec |
| `@visual-regression` | Snapshot layout checks |
| `@performance` | Timing probes |
| `@accessibility` | axe scans |
| `@sprint38` | Excluded during parallel SAT |
