# Test Metrics — SAT Coverage Expansion

**Generated:** 2026-07-07

## Quality Gate Results

| Gate | Status | Details |
|------|--------|---------|
| `npm run lint` | **PASS** | ESLint clean |
| `npm run typecheck` | **PASS** | Server + ecg-insight TS |
| `npm run build` | **PASS** | Prisma generate + typecheck |
| `npm run qa:unit` | **PASS** | 17 legacy scripts + 31 Vitest files (**156** total tests) |
| `npm run qa:coverage` | **PASS** | v8 instrumentation, reports emitted |
| `npm run qa:integration` | **Pending** | Full suite (~95 min); not re-run this increment |
| Playwright smoke (`@smoke`) | **14/15 PASS** | 1 timeout on `login-screen-stability.spec.ts` (pre-existing flake) |
| Full Playwright regression | **Pending** | Schedule via `npm run qa:regression` |

## Coverage Summary

| Metric | Before (baseline) | After | Delta |
|--------|-------------------|-------|-------|
| **Statements / Lines** | 14.8% | **27.3%** | **+12.5%** |
| **Branches** | 65.0% | **69.9%** | **+4.9%** |
| **Functions** | 51.8% | **71.0%** | **+19.2%** |

- **Instrumented files:** 86 production modules (viewer `.ts`, hooks, medical-intelligence)
- **Covered lines:** 2,285 / 8,370
- **HTML report:** `test-results/coverage/index.html`

## Coverage by Priority Module

| Priority | Module | Statement Coverage | Notes |
|----------|--------|-------------------|-------|
| 1 | ECG Viewer (`ecgImageEngine`, zoom/pan) | **94–100%** on core engines | Image zoom, filters, hero fit |
| 2 | Live Monitor | **100%** path + beat markers | Canvas hook layer still 0% |
| 3 | Measurement Engine | **58–100%** on pure functions | Hooks (`useEcgMeasurementWorkspace`) untested |
| 4 | AI Findings | **24%** overlay engine | Helpers + state CRUD covered |
| 5 | AI Cardiologist | **76%** | Model + lead map |
| 6 | Medical Intelligence | **98%** confidence engine | Routes/orchestrator still 0% |
| 7 | Rendering Engine | **23%** overall; viewport/vector **97–100%** | Canvas/WebGL renderers pending |
| 8 | ECG Utilities | **45–100%** calibration/geometry | Token files excluded by nature |
| 9 | Hooks | **0%** | Requires RTL harness — next increment |
| 10 | Context Providers | **0%** | Next increment |
| 11 | Services | Partial via bridge tests | |
| 12 | Stores | N/A in instrumented set | |

## Test Count Growth

| Suite | Before SAT | After SAT |
|-------|------------|-----------|
| Legacy assert scripts | 17 | 17 |
| Vitest unit/component | 0 | **31 files / 139 tests** |
| **Total automated unit** | 17 | **156** |

## Performance Sanity

| Suite | Duration |
|-------|----------|
| Vitest (139 tests) | ~16–20 s |
| Legacy unit scripts | ~2 min |
| Full `qa:unit` | ~2.5 min |

## Next Milestone (>70% production coverage)

1. Hook tests: `useEcgViewerControls`, `useEcgMeasurementWorkspace`, `useEcgEnterpriseViewerState`
2. Canvas renderers: `ecgMonitorCanvas`, `canvas2dRenderer`, `webglRenderer`
3. Medical intelligence: differential, explainability, rule-engine engines (pure functions)
4. Component tests with `@testing-library/react` for overlay/viewer shells (no UI changes)
5. Expand `vitest.config.ts` include globs if additional production dirs qualify
