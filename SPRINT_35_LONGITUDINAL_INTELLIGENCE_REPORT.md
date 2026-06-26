# Sprint 35 Enterprise Longitudinal ECG Intelligence Platform

## Summary

Sprint 35 adds production-grade longitudinal ECG intelligence to ECG Insight. The platform can compare the current ECG against the previous ECG, a baseline ECG, or multiple historical ECGs, then generate interval-change findings, trend dashboards, disease progression signals, occupational surveillance summaries, and traceable audit/timeline records.

## Backend

- Added persisted longitudinal ECG entities:
  - `LongitudinalECGComparison`
  - `LongitudinalECGFinding`
- Added enums for comparison scope, change type, occupational surveillance type, and finding category.
- Added `LONGITUDINAL_ECG_COMPARISON_COMPLETED` audit action.
- Implemented `longitudinal-ecg.service.ts` with:
  - Current ECG vs previous ECG comparison.
  - Current ECG vs baseline ECG comparison.
  - Current ECG vs multiple historical ECG comparison.
  - Heart rate, PR, QRS, QT/QTc, rhythm, electrical axis, abnormality, and risk progression timelines.
  - Detection of improvement, worsening, new abnormalities, resolved abnormalities, persistent abnormalities, and no significant interval change.
  - Disease progression signals for progressive AV block, progressive ischemia, persistent AF, recurrent arrhythmias, and worsening conduction disease.
  - Occupational surveillance support for pre-employment, periodic examination, return-to-work, post-incident, and exit examination workflows.
  - AI trend statements such as "No significant interval change" and "QT interval progressively prolonged."

## APIs

- `POST /api/v1/longitudinal-ecg/cases/:caseId/compare`
- `GET /api/v1/longitudinal-ecg/cases/:caseId/comparisons`
- `GET /api/v1/longitudinal-ecg/patients/:patientId/dashboard`
- `POST /api/v1/longitudinal-ecg/patients/:patientId/surveillance/:caseId`

All endpoints require authentication. Write operations require doctor-level permissions. Case and patient access are enforced through existing resource access utilities.

## Frontend

- Extended `clinicalIntelligence.ts` with longitudinal ECG API types and client functions.
- Added `LongitudinalECGPanel` to the enterprise ECG case workspace.
- The panel includes:
  - Comparison workspace.
  - Historical timeline.
  - Trend chart summaries.
  - Abnormality timeline.
  - Risk progression timeline.
  - Occupational surveillance selectors.
  - Clinical disclaimer.

## Security & Audit

- Every generated comparison is linked to the patient, current ECG case, baseline case, evaluating clinician, compared historical cases, and generated findings.
- The system writes audit records and clinical timeline events for traceability.
- The UI displays a clinical disclaimer emphasizing physician review against original ECG tracings.

## Testing

- Added `scripts/sprint35-longitudinal-ecg.integration.ts`.
- The Sprint 35 regression test validates schema, migration, service logic, REST routes, frontend service APIs, UI panel wiring, and this report.
- Added Sprint 35 to `npm run test`.

## Key Files

- `prisma/schema.prisma`
- `prisma/migrations/20260626190500_sprint35_longitudinal_ecg_intelligence/migration.sql`
- `server/src/modules/clinical-intelligence/longitudinal-ecg.service.ts`
- `server/src/modules/clinical-intelligence/longitudinal-ecg.routes.ts`
- `server/src/modules/index.ts`
- `artifacts/ecg-insight/services/clinicalIntelligence.ts`
- `artifacts/ecg-insight/components/clinical/LongitudinalECGPanel.tsx`
- `artifacts/ecg-insight/app/(protected)/ecg-cases/[id].tsx`
- `scripts/sprint35-longitudinal-ecg.integration.ts`
