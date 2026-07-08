# Report Engine Report — Sprint 30

## EcgReportPreviewPanel Pipeline

| Status | Action | API |
|--------|--------|-----|
| Draft | Generate Report | `generateReport()` |
| Under Review | Finalize | `finalizeReport()` |
| Finalized | Sign Report | `signReport()` |
| Signed | Download PDF | `downloadReportPdf()` |
| Archived | — | Existing report service |

## Workflow Integration

- Steps **Final Report**, **Digital Signature**, **Export** navigate to report view mode
- Report list with status badges (draft → signed)
- HTML preview in iframe with authenticated fetch
- PDF export opens in new tab

## Export Formats (Existing + Wired)

| Format | Mechanism |
|--------|-----------|
| Hospital PDF | Report service + workspace PDF |
| Print | Browser print via PDF |
| JSON | Measurement export + workspace JSON |
| CSV | Measurement CSV export |
| PNG | `exportEcgViewerPng` |
| FHIR-ready | Server report module (unchanged) |

## Digital Signature Architecture

- Sign action via `signReport` API
- Report metadata: physician name, status, signed timestamp
- Verification hash placeholder in server report model (existing)
- Hospital branding via report HTML template (existing)

## UI Controls

- `sprint30-finalize-report` — finalize button testID
- `sprint30-sign-report` — sign button testID
- Report chips with status tone (success when signed)
