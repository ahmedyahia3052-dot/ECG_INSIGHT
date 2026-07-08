# CDSS Engine Report — Sprint 44

## Overview

The Clinical Decision Support Engine (`cdss-workspace/`) provides explainable, deterministic clinical reasoning in the ECG Monitor without modifying Medical Intelligence Core or server modules.

## Pipeline Stages

1. **ECG Image** — digitization quality from `DigitalEcg.validation`
2. **Digitization** — cardiologist model intervals from measurement engine
3. **Measurements** — manual calipers from Measurement Studio
4. **AI Findings** — Medical Intelligence + AI analysis (read-only)
5. **Clinical Rules** — `evaluateClinicalRules()` — 31 conditions
6. **Differential Diagnosis** — MI differential or rule-ranked fallback
7. **Recommendations** — emergent/urgent/routine actions linked to diagnoses
8. **Final Clinical Assessment** — severity, triage, overall confidence

## Entry Points

- **Viewer:** ECG Monitor → Right Panel → **CDSS** tab (`sprint44-cdss-workspace`)
- **Report:** Enterprise Clinical Report → **Clinical Decision Support** section (`sprint44-report-clinical-decision`)

## Test IDs

| testID | Component |
|--------|-----------|
| `sprint44-cdss-tab-pane` | CDSS tab container |
| `sprint44-cdss-workspace` | Scrollable CDSS workspace |
| `sprint44-cdss-triage-badge` | Hospital triage badge |
| `sprint44-report-clinical-decision` | Report CDSS section |

## Data Flow

`buildCdssWorkspaceModel({ analysis, digitalEcg, explainability, measurements, medicalReport })` returns `CdssWorkspaceModel` with all panels pre-computed and memoized at panel level.
