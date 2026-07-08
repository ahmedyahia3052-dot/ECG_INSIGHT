# Sprint 34 Enterprise Clinical Decision Support Engine

## Summary

Sprint 34 adds a production-grade Clinical Decision Support System (CDSS) to ECG Insight. The platform now generates traceable cardiovascular risk stratification, red flag detection, occupational fitness decisions, clinical recommendations, longitudinal trend interpretation, and explainable rule-based evidence for each ECG case.

## Backend

- Added CDSS schema entities:
  - `ClinicalDecisionRule`
  - `ClinicalDecisionSupportRun`
  - `ClinicalDecisionFinding`
- Added CDSS enums for rule categories, risk categories, recommendation priority, occupational decisions, run status, and finding type.
- Added `CDSS_DECISION_GENERATED` audit action.
- Implemented `cdss.service.ts` with:
  - Configurable default rules for bradycardia, tachycardia, QT prolongation, conduction abnormalities, STEMI, ischemia, arrhythmia, occupational fitness, recommendations, and trends.
  - Cardiovascular risk scoring from age, sex, occupational exposure, ECG findings, symptoms/history proxies, hypertension, diabetes, smoking, obesity, and cardiac history.
  - Occupational fitness decision logic for safety-sensitive profiles such as drivers, crane operators, heavy equipment operators, working at heights, confined spaces, and custom profiles.
  - Recommendation generation for cardiology referral, emergency referral, stress ECG/coronary workup, Holter consideration, repeat ECG, medication/electrolyte review, and follow-up.
  - Red flag detection for STEMI, complete heart block/conduction severity, ventricular tachycardia, extreme QT prolongation, AF/RVR text patterns, and severe bradycardia.
  - Explainability payloads with triggering findings, rule IDs, confidence, supporting evidence, and rationale.
  - Longitudinal ECG comparison for QTc, heart rate, and new/worsening abnormalities.

## APIs

- `GET /api/v1/cdss/rules`
- `PUT /api/v1/cdss/rules/:ruleId`
- `GET /api/v1/cdss/cases/:caseId/runs`
- `POST /api/v1/cdss/cases/:caseId/evaluate`

All case-level APIs require authentication and case access. CDSS evaluation requires doctor-level permissions. Rule updates require admin-level permissions.

## Frontend

- Extended `artifacts/ecg-insight/services/clinicalIntelligence.ts` with CDSS API functions and types.
- Added `CDSSDecisionPanel` to display:
  - Risk panel.
  - Red flag alerts.
  - Recommendations.
  - Occupational decision.
  - Explainability.
  - Trend intelligence.
- Mounted the CDSS dashboard in the enterprise ECG case detail workspace.

## Security & Audit

- Every CDSS run is persisted with input snapshots, explainability, findings, and the evaluating user.
- CDSS generation writes an audit log with the run ID, rule identifiers, red flag count, case ID, and patient ID.
- CDSS decisions are added to the clinical timeline for longitudinal traceability.
- Critical CDSS red flags generate clinical notifications for doctors.

## Testing

- Added `scripts/sprint34-cdss.integration.ts`.
- The regression test validates schema, migration, rule IDs, service logic, routes, frontend API, UI panel wiring, and this report.
- Added Sprint 34 to the full `npm run test` chain.

## Key Files

- `prisma/schema.prisma`
- `prisma/migrations/20260626184000_sprint34_cdss/migration.sql`
- `server/src/modules/clinical-intelligence/cdss.service.ts`
- `server/src/modules/clinical-intelligence/cdss.routes.ts`
- `server/src/modules/index.ts`
- `artifacts/ecg-insight/services/clinicalIntelligence.ts`
- `artifacts/ecg-insight/components/clinical/CDSSDecisionPanel.tsx`
- `artifacts/ecg-insight/app/(protected)/ecg-cases/[id].tsx`
- `scripts/sprint34-cdss.integration.ts`
