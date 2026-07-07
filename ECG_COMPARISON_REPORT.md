# ECG Comparison Report — Sprint 46

**Date:** 2026-07-07

---

## Modes (Preserved + Extended)

| Mode | Component | testID |
|------|-----------|--------|
| Side-by-side | `EcgCompareViewer` | `sprint165-ecg-compare-viewer` |
| Split | `EcgCompareViewer` | `sprint18-ecg-compare-split` |
| Overlay | `EcgCompareViewer` | `sprint18-ecg-compare-overlay` |

---

## Sprint 46 Enhancements

| Feature | Implementation |
|---------|----------------|
| Difference highlighting | `sprint46-compare-difference` toggle + banner |
| Lead synchronization | `sprint46-compare-lead-sync` |
| Beat synchronization | `sprint46-compare-beat-sync` |
| Prior study selection | Left panel `sprint46-compare-{caseId}` + history tab |

---

## Engine

`ecgDiagnosticCompareEngine.ts` computes difference regions from digitized waveform paths for visual emphasis when compare mode is active.

---

## Validation

Playwright: compare toggle + difference tool visibility in `sprint46-diagnostic-ecg-workstation.spec.ts`
