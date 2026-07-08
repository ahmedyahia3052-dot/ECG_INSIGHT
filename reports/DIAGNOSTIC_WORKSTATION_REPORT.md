# Diagnostic Workstation Report — Sprint 46

**Date:** 2026-07-07

---

## Architecture

```
EcgMonitorViewerFoundation
├── Left: EcgUnifiedClinicalLeftPanel (patient, history, compare)
├── Center: EcgDiagnosticWorkstationShell
│   ├── EcgDiagnosticPanelsRibbon
│   ├── EcgDiagnosticLeadToolsBar
│   ├── EcgImageCanvas / EcgCompareViewer
│   └── EcgDiagnosticRhythmStrip
└── Right: EcgClinicalRightPanel (measurements, AI, CDSS, reports, history)
```

---

## Module: `diagnostic-workstation/`

| File | Role |
|------|------|
| `useDiagnosticWorkstationEngine.ts` | Lead tools, compare sync, report linking state |
| `EcgDiagnosticWorkstationShell.tsx` | Hospital-grade center column wrapper |
| `EcgDiagnosticLeadToolsBar.tsx` | 12-lead chips + isolate/magnifier/sync/diff |
| `EcgDiagnosticRhythmStrip.tsx` | Long rhythm strip canvas (Lead II default) |
| `EcgDiagnosticPanelsRibbon.tsx` | Intervals, rhythm, ST, AI, differential, notes |
| `ecgDiagnosticReportLinking.ts` | Finding → lead/beat/measurement resolution |
| `ecgDiagnosticCompareEngine.ts` | Difference region computation |

---

## testIDs

- `sprint46-diagnostic-workstation-ready`
- `sprint46-diagnostic-center-canvas`
- `sprint46-diagnostic-lead-tools`
- `sprint46-diagnostic-rhythm-strip`
- `sprint46-diagnostic-panels-ribbon`
- `sprint46-compare-difference`
- `sprint46-compare-{caseId}`

---

## Clinical Workflow

Open ECG → Review waveform → Measure → AI findings → CDSS → Report → Export

All stages remain accessible via existing workflow ribbon and right-panel tabs.
