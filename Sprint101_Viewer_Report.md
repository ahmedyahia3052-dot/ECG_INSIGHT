# Sprint 101 — ECG Pro Viewer Clinical Polish

## Mission

Deliver enterprise-grade diagnostic polish for the ECG Pro Viewer route (`/ecg-viewer`) while preserving the existing rendering engine and leaving workspace, live monitor, and backend APIs unchanged.

## Delivered Improvements

### Viewer & Canvas

- **Layout:** Responsive three-column workspace with tools rail, canvas column, and study info / AI findings sidebar.
- **Fit width / zoom / pan:** Fit Width, Fit Screen, zoom controls, pan mode toggle, arrow-key panning, and wheel zoom on web canvas.
- **Rendering performance:** Canvas repaint scheduled with `requestAnimationFrame` to reduce redundant paints during pan/zoom.
- **Grid alignment:** ECG paper grid overlay now follows the same pan/zoom/rotation transform as the image canvas.
- **Image centering:** Canvas draw path uses centered transform with pan offset (unchanged engine contract, grid synced).

### Clinical Measurements Panel

Replaced horizontal placeholder chips with **professional clinical cards** for:

| Metric | Source priority |
|--------|-----------------|
| HR | Live calipers → saved record → bundle/case |
| RR | Live calipers → record → bundle |
| PR | Live calipers → record → bundle/case |
| QRS | Live calipers → record → bundle/case |
| QT | Live calipers → record → bundle/case |
| QTc | Live calipers → record → bundle/case |
| Axis | Record → bundle |
| ST | Live calipers → record → bundle |
| P Duration | Record → bundle |
| T Duration | Record → bundle |

Cards show source attribution and abnormal highlighting from validation issues.

### Compare Mode

- Side-by-side, split, and overlay layouts via toolbar + `O` shortcut.
- Compare opacity control (35% → 85% cycle).
- Digitized waveform overlay wired through `buildSegmentAlignedDigitizedWaveformLeads`.
- Comparison panel uses clinical metric labels, delta coloring, and baseline/current values.

### Overlay & AI Findings

- **AI overlay:** Reuses `useEcgAiOverlayWorkspace` + `EcgAiClinicalOverlay` (web) and native `EcgAiOverlayLayer` regions.
- **AI findings sidebar:** Case diagnosis, severity/rhythm, bundle annotations, and overlay annotation list.
- Toggle via toolbar and `L` / `A` keyboard shortcuts.

### Toolbar & Tools

- Pan, snapshot, clinical JSON export, AI overlay, AI findings, compare layout/opacity.
- Mobile tools panel exposes calipers, snapshot, and export.

### Waveform Clinical Data

- `buildDigitalEcgFromWaveforms` merges bundle measurements and case clinical fields (no backend changes).
- Wave detection configured for caliper snap via `configureWaveDetection`.

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `F` | Fullscreen |
| `Space` | Toggle pan |
| `+` / `-` | Zoom |
| `0` | Fit width |
| `C` | Compare toggle |
| `O` | Cycle compare layout |
| `W` | Waveform mode |
| `G` | Image + grid |
| `R` | Reset view |
| `S` | Snapshot |
| `Ctrl/Cmd+E` | Export clinical JSON |
| `A` | AI findings sidebar |
| `L` | AI overlay |
| `1/2/3` | Layout presets |
| Arrows | Pan |

## Files Added / Updated

### New

- `artifacts/ecg-insight/components/ecg/viewer/pro-foundation/clinicalMeasurementCards.ts`
- `artifacts/ecg-insight/components/ecg/viewer/pro-foundation/compareMetricLabels.ts`
- `artifacts/ecg-insight/components/ecg/viewer/pro-foundation/proViewerExport.ts`
- `artifacts/ecg-insight/components/ecg/viewer/pro-foundation/EcgProViewerAiFindingsSidebar.tsx`
- `scripts/sprint101-ecg-pro-viewer.test.ts`
- `scripts/sprint101-ecg-pro-viewer.integration.ts`
- `tests/e2e/sprint101-ecg-pro-viewer.spec.ts`

### Updated

- `EcgProViewerFoundationScreen.tsx`
- `EcgProViewerClinicalMeasurementsPanel.tsx`
- `EcgProViewerToolbar.tsx`
- `EcgProViewerToolsPanel.tsx`
- `EcgProViewerCanvas.tsx`
- `EcgProViewerComparisonPanel.tsx`
- `EcgProViewerInfoPanel.tsx`
- `digitalEcgFromWaveform.ts`
- `useEcgProViewerWaveform.ts`
- `useEcgProViewerShortcuts.ts`
- `clinicalMeasurementMapper.ts`
- `index.ts`
- `scripts/integration/pipeline.mjs`

## Out of Scope (Preserved)

- Enterprise ECG workspace (`/ecg-workspace`)
- Live monitor routes and HMI
- Backend API modules and Prisma schema

## Validation

```bash
npm run lint
npm run typecheck
npm run build
npm test
npx playwright test tests/e2e/sprint101-ecg-pro-viewer.spec.ts
```

## Production Readiness

- Zero placeholder measurement strings in the clinical cards pipeline (values show `—` only when no live, record, or bundle/case data exists).
- Waveform clinical seed uses real bundle + case fields.
- AI overlay generated from case clinical data via existing overlay engine.
- All sprint markers use `sprint101-*` test IDs for E2E verification.

## Git

- Branch: `feature/sprint101-pro-viewer-polish`
- Commit: `Sprint101_Viewer_Polish`
