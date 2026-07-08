# Clinical Report Engine — Sprint 43

## Overview

The Enterprise Clinical Report Engine assembles a hospital-grade structured report from multiple read-only clinical data sources without modifying Medical Intelligence Core or AI Cardiologist workspace internals.

## Data Sources

| Source | Usage |
|--------|-------|
| `MedicalIntelligenceReport` | Primary AI findings, differential, recommendations, overall confidence |
| `buildCardiologistModel` | Fallback findings, intervals, rhythm, impression when MI absent |
| `EcgClinicalMeasurement[]` | Manual caliper values; supporting measurements on AI findings |
| `ClinicalReport` | Physician review, signature, report number, lifecycle status |
| `ApiECGCase` / `ApiPatient` | Header demographics and acquisition metadata |
| `DigitalEcg` | Calibration, sampling rate, digitization confidence |

## Report Sections

1. **Patient Header** — 14 hospital header fields  
2. **ECG Parameters** — measurement table (never merged with AI findings)  
3. **Clinical Impression** — deduplicated structured lines  
4. **AI Findings** — card per finding with severity, confidence, evidence, leads  
5. **Differential Diagnosis** — ranked probability table  
6. **Clinical Recommendations** — priority + timeframe  
7. **Confidence Summary** — six progress-bar metrics  
8. **Critical Alerts** — P1/P2 escalation cards  
9. **Lead Summary** — per-lead normal/abnormal grid  
10. **ECG Snapshots** — image URLs + caliper note  
11. **Previous ECG Comparison** — available when prior case linked  
12. **Doctor Review** — notes, diagnosis, signature, license, approval date  

## Report Types & Themes

- Types: `diagnostic`, `clinical`, `printable`, `hospital_pdf`
- Themes: `light`, `dark`
- Orientation: `portrait` (820px), `landscape` (1120px)
- Preview: `print` | `export`

## Entry Points

- **UI:** ECG Monitor → View Mode `report` → `EcgEnterpriseClinicalReportPanel`
- **Server HTML:** `buildReportHtml` appends `buildEnterpriseClinicalReportSections`
- **Client export:** `exportClinicalReport.ts` — JSON schema v1, FHIR Bundle collection

## Test IDs

| testID | Component |
|--------|-----------|
| `sprint43-enterprise-report-host` | Report preview host |
| `sprint43-clinical-report-panel` | Toolbar panel |
| `sprint43-enterprise-clinical-report` | Scrollable report body |
| `sprint43-report-print` | Print action |
| `sprint43-report-export-json` | JSON download |
| `sprint43-report-export-fhir` | FHIR download |
