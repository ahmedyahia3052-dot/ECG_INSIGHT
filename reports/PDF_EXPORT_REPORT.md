# PDF Export Report — Sprint 43

**Date:** 2026-07-07

## Client Export Paths

| Format | Implementation | Status |
|--------|----------------|--------|
| Print | `window.print()` via `printClinicalReport()` | ✅ Functional (web) |
| JSON | `downloadClinicalReportJson` — schema v1 with full model | ✅ Functional |
| FHIR | `downloadClinicalReportFhir` — Bundle type `collection` | ✅ Functional |
| PNG | Browser print-to-PNG / screenshot of report scroll view | ✅ Via print preview |

## Server PDF / HTML

| Path | Enhancement |
|------|-------------|
| `buildReportHtml` | Appends enterprise sections from `clinical-report-html-sections.ts` |
| MI integration | Reads latest `MedicalIntelligenceReport.reportJson` for case (read-only) |
| Sections added | ECG Parameters table, Clinical Impression, AI Findings, Differential, Recommendations, Confidence Summary, Critical Alerts, Doctor Review |
| `buildReportPdf` | Unchanged text-extraction engine; inherits richer HTML content |

## Hospital PDF Layout

- A4-oriented CSS in existing report template (`max-width: 1040px`, print media queries)
- Enterprise panel toolbar label **Hospital PDF** selects `hospital_pdf` report type for client rendering
- Dark/light themes apply to client report view; server HTML remains light theme for print consistency

## Verification

- Existing report generate → finalize → sign → download PDF workflow preserved
- Enterprise panel export buttons visible in Export Preview mode (`sprint43-report-export-*`)
- Integration marker validates `clinical-report-html-sections.ts` presence

## Known Limitations

- Server PDF is not a pixel-perfect raster render of the React report view; it is HTML-derived text layout.
- Full WYSIWYG PDF rasterization (headless Chromium) is out of scope for Sprint 43.
