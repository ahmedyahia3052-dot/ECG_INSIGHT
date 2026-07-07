# Sprint 36 — Fix Report

## Runtime Stability

| File | Fix |
|------|-----|
| `useHistoryStack.ts` | Skip history mutation when commit resolves to same reference; bail-out in `syncMeta` |
| `useEnterpriseStatusMetrics.ts` | Remove `metrics.memory` from effect deps; use ref for memory snapshot |
| `useEcgViewerPersistence.ts` | Stable `scheduleSave` via refs for snapshot/onHydrate |
| `useEcgAiOverlayWorkspace.ts` | Stable `commit`-based `updateSlice`; no-op guards; idempotent `setSettings` |
| `useEcgMeasurementWorkspace.ts` | No-op `updateSlice`; stable `onPersist` ref; idempotent `setActiveLead` |
| `EcgMonitorViewerFoundation.tsx` | Effect deps use stable method refs + primitives; grid sync no-op guard |
| `ecgAiOverlayEngine.ts` | `mergeGeneratedAnnotations` preserves existing annotations |

## DOM / Web Compatibility

| File | Fix |
|------|-----|
| `ecgNativeId.ts` | New helpers: `ecgNativeId`, `ecgAnchorId` |
| `EcgWorkstationGridShell.tsx` | HTML `id` instead of `nativeID` on layout div |
| `EcgWorkstationTooltip.tsx` | Web `id` for tooltip anchor |
| `EcgProViewerEngine.tsx` | `ecgAnchorId` for canvas DOM queries (wheel/pan) |
| `server/src/app.ts` | `crossOriginResourcePolicy: cross-origin` |

## UI / QA

| File | Fix |
|------|-----|
| `EcgMeasurementsPanel.tsx` | Unique preset keys; fix nested buttons in `MeasurementRow` |
| `tests/e2e/utils/ecg-workspace-locators.ts` | Palette label aliases; mouse move before palette interaction |
| `tests/e2e/sprint36-clinical-validation.spec.ts` | Sprint 36 QA suite (8 tests, zero console errors) |
| `scripts/sprint36-clinical-validation.integration.ts` | 14-phase integration validation |
| `scripts/integration/pipeline.mjs` | Register Sprint 36 clinical validation script |
