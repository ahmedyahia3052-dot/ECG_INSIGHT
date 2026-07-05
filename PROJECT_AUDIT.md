# ECG Insight Enterprise — Project Audit (Viewer Recovery)

**Date:** 2026-07-05  
**Scope:** Locate all ECG viewer, engine, and workspace modules for recovery sprint.

---

## Executive Finding

The **enterprise ECG Pro Clinical Workspace** (`EcgMonitorViewerFoundation`) was fully implemented under `/ecg-monitor/[caseId]` but **never wired to the primary nav route** `/ecg-workspace`. The nav item opened a **legacy minimal upload UI** (`EcgImageImport` + `EcgWorkspaceViewer`) with no viewer engines, calipers, overlay, or clinical panels.

**Recovery action:** Reconnect `/ecg-workspace` → `EcgMonitorViewerFoundation` via new `EcgEnterpriseWorkspaceScreen`.

---

## Active Routes (Before Recovery)

| Route | Component | Status |
|-------|-----------|--------|
| `/ecg-workspace` | `EcgWorkspaceRoute` → legacy import UI | **Wrong — legacy default** |
| `/ecg-monitor/[caseId]` | `EcgMonitorScreen` → `EcgMonitorViewerFoundation` | Enterprise viewer (hidden from nav) |
| `/clinical-workspace/[caseId]` | `ClinicalWorkspaceScreen` → `EcgProViewer` | Older unified workspace |
| `/ecg-cases/[id]` | Case detail + link to monitor | Partial entry point |

---

## Enterprise Viewer Modules (Sprint 13–16.5)

| Module | Path | Purpose |
|--------|------|---------|
| **Orchestrator** | `EcgMonitorViewerFoundation.tsx` | Wires all engines into one workspace |
| **Viewer Engine** | `EcgProViewerEngine.tsx` | Image, grid, zoom, pan, contain scaling |
| **Canvas** | `EcgImageCanvas.tsx` | Image + grid + digitized + measurements |
| **Toolbar** | `EcgViewerToolbar.tsx` | Enterprise toolbar (Open, Lead, Compare, AI…) |
| **Left Rail** | `EcgViewerLeftRail.tsx` | Patient, study, lead selector, compare |
| **Right Rail** | `EcgViewerRightRail.tsx` | Quality, intervals, measurements, AI |
| **Digitization Quality** | `EcgDigitizationQualityPanel.tsx` | Signal quality, validation metrics |
| **Waveform Layer** | `EcgDigitizedWaveformLayer.tsx` | Digitized overlay sync |
| **Waveform Sync** | `ecgDigitizedWaveformSync.ts` | Segment-aligned waveform paths |
| **Measurement Overlay** | `EcgMeasurementOverlay.tsx` | Calipers on canvas |
| **Measurement Engine** | `ecgMeasurementEngine.ts` | Presets, geometry, live values |
| **Measurement Workspace** | `useEcgMeasurementWorkspace.ts` | Caliper state machine |
| **AI Overlay** | `EcgAiClinicalOverlay.tsx` | P/Q/R/S/T annotations |
| **AI Overlay Engine** | `ecgAiOverlayEngine.ts` | Interval/ST/axis overlay logic |
| **AI Workspace** | `useEcgAiOverlayWorkspace.ts` | Overlay toggle/state |
| **Compare Viewer** | `EcgCompareViewer.tsx` | Side-by-side prior study |
| **Rhythm Strip** | `EcgRhythmStripPanel.tsx` | Live digitized lead preview |
| **Settings Panel** | `EcgViewerSettingsPanel.tsx` | Grid/image/overlay preferences |
| **Enterprise State** | `useEcgEnterpriseViewerState.ts` | Compare, waveform toggle |
| **Clinical Findings** | `useEcgClinicalFindings.ts` | HR/PR/QRS/QT/axis merge |
| **Controls** | `useEcgViewerControls.ts` | Zoom, pan, fit, fullscreen |
| **Persistence** | `useEcgViewerPersistence.ts` | Workspace state save |
| **Resizable Layout** | `EcgViewerResizableWorkspace.tsx` | Dockable panel layout |
| **Paper Grid** | `EcgPaperGrid.tsx` | Professional SVG grid |
| **Timeline/Status** | `EcgViewerTimeline.tsx` | Study timeline + status bar |

---

## Legacy / Disconnected Components

| Component | Path | Issue |
|-----------|------|-------|
| `EcgWorkspaceViewer` | `components/ecg/EcgWorkspaceViewer.tsx` | Simple zoom/pan viewer — **was default on /ecg-workspace** |
| `EcgImageImport` | `components/ecg/EcgImageImport.tsx` | Upload-only pipeline — **was default on /ecg-workspace** |
| `EcgProViewer` | `components/ecg/EcgProViewer.tsx` | Used only on `/clinical-workspace/[caseId]` |
| `ClinicalWorkspaceScreen` | `clinical-workspace/[caseId].tsx` | Alternate workspace, not linked from main nav |

---

## Server Engines (Not Modified — Integration Only)

| Engine | Server Path |
|--------|-------------|
| Digitization | `server/src/modules/ecg-digitization/` |
| Measurement | `server/src/modules/ecg-processing/` |
| Overlay/AI | `server/src/modules/ai/` |
| Grid/Lead detection | `server/src/modules/ecg-digitization/grid-detector/` |

---

## APIs Used by Viewer

| Endpoint | Service |
|----------|---------|
| `GET /api/cases/:id` | `getCase` |
| `GET /api/patients/:id` | `getPatient` |
| `GET /api/patients/:id/ecg-history` | `getPatientEcgHistory` |
| `GET /api/ecg/digital/:caseId` | `getDigitalECG` |
| `POST /api/ecg/digitize` | `digitizeECG` |
| `GET /api/ai/cases/:id` | `getAIResult` |
| `GET /api/ai/cases/:id/explainability` | `getAIExplainability` |

---

## Feature Flags / Lazy Routes

- No feature flags gate the enterprise viewer — routing was the only blocker.
- `/ecg-monitor/[caseId]` is a dynamic Expo Router segment (not lazy-loaded separately).
- Shell treats `/ecg-monitor` as full-bleed; `/ecg-workspace` was **not** until recovery.

---

## Duplicate Pages

| Page A | Page B | Resolution |
|--------|--------|------------|
| `/ecg-workspace` (legacy) | `/ecg-monitor/[caseId]` (enterprise) | **Merged** — workspace uses enterprise screen |
| `/clinical-workspace/[caseId]` | `/ecg-monitor/[caseId]` | Clinical workspace retained for collaboration tabs |

---

## Components Never Rendered (Before Fix)

All Sprint 13–16.5 viewer components listed above were **only reachable via `/ecg-monitor/[caseId]`**, not from sidebar "ECG Workspace" nav item.

---

## Recovery Files Added

| File | Role |
|------|------|
| `EcgEnterpriseWorkspaceScreen.tsx` | Shared screen wrapping `EcgMonitorViewerFoundation` |
| `useEcgWorkspaceCaseResolver.ts` | Demo mode + caseId/patientId resolution |

---

## Navigation After Recovery

- Sidebar **ECG Workspace** → `/ecg-workspace` → Enterprise viewer + demo mode
- Case detail **ECG Monitor** → `/ecg-workspace?caseId=…`
- Study history navigation → `/ecg-workspace?caseId=…`
- `/ecg-monitor/[caseId]` retained for backward compatibility (same screen component)
