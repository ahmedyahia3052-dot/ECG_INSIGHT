# Unit Test Report

**Generated:** 2026-07-07

## Execution

```bash
npm run qa:unit
```

## Results

| Metric | Value |
|--------|-------|
| Test files | **16** |
| Passed | **16** |
| Failed | **0** |
| Pass rate | **100%** |

## Files

| File | Domain |
|------|--------|
| `ecg-acquisition.test.ts` | Acquisition math |
| `ecg-ai-overlay-engine.test.ts` | AI overlay engine |
| `ecg-calibration-math.test.ts` | Calibration / grid math |
| `ecg-caliper-geometry.test.ts` | Caliper geometry |
| `ecg-clinical-visualization.test.ts` | Clinical canvas |
| `ecg-clinical-workflow.test.ts` | 16-stage workflow engine |
| `ecg-digitization-engine.test.ts` | Digitization |
| `ecg-enterprise-viewer.test.ts` | Enterprise viewer state |
| `ecg-measurement-engine.test.ts` | Measurements |
| `ecg-pro-viewer-engine.test.ts` | Pro viewer engine |
| `ecg-pro-viewer-workspace.test.ts` | Workspace layout |
| `ecg-rendering-engine.test.ts` | Rendering |
| `ecg-viewer-engine.test.ts` | Viewer engine |
| `ecg-wave-detection-bridge.test.ts` | Wave detection bridge |
| `medical-intelligence-engine.test.ts` | Medical intelligence |
| `qa/config.test.ts` | QA infrastructure config |

## Coverage vs 95% Target

| Measure | Status |
|---------|--------|
| Unit test **file** pass rate | 100% ✓ |
| Line/branch coverage instrumentation | **Not yet enabled** |
| Estimated line coverage | ~35–45% (engines + algorithms only) |

### Gap Analysis

Not yet covered at unit level:

- React hooks (`useEcg*`, `useClinical*`)
- Zustand/context stores
- Server route handlers (isolated)
- Canvas rendering integration paths

### Next Steps

1. Introduce `vitest` + `@testing-library/react-native` for hook tests
2. Add `c8` coverage reporting with 95% threshold (incremental)
3. Prioritize medical algorithm pure functions

## Artifact

`test-results/qa-artifacts/unit-test-summary.json`
