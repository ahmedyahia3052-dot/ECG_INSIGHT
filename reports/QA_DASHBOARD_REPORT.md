# QA Dashboard Report

**Generated:** 2026-07-07

## Dashboard Location

| Format | Path |
|--------|------|
| HTML | `test-results/qa-dashboard/index.html` |
| JSON | `test-results/qa-dashboard/dashboard.json` |
| History | `test-results/qa-history/dashboard-*.json` |

## Generate

```bash
npm run qa:dashboard
```

## Panels

| Panel | Source Artifact |
|-------|-----------------|
| Unit test pass rate | `unit-test-summary.json` |
| Playwright workflow coverage | `playwright-coverage-matrix.json` |
| Integration domain coverage | `integration-coverage.json` |
| Accessibility gate | `accessibility-summary.json` |
| Performance gate | `performance/benchmark.json` |
| Regression orchestrator | `regression-summary.json` |

## Trend Tracking

Each dashboard generation appends a timestamped JSON snapshot to `test-results/qa-history/` for historical comparison.

## CI Artifact

GitHub Actions job `quality-dashboard` uploads `test-results/qa-dashboard` (30-day retention).

## Orchestrator

Full pipeline including dashboard:

```bash
npm run qa:enterprise:full
```
