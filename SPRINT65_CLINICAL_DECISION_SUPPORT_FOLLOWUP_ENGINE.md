# Sprint 65 — Clinical Decision Support & Follow-up Engine

Backend-only enterprise CDSS module for ECG Insight Enterprise.

## Module

`server/src/modules/clinical-decision-support/`

## Database models

| Model | Purpose |
|-------|---------|
| `CaseClinicalRecommendation` | Case-scoped clinical recommendation (Sprint 65; distinct from AI report `ClinicalRecommendation`) |
| `FollowUpPlan` | Next ECG date, interval, priority, review/completed status |
| `FollowUpReminder` | Reminder schedule linked to follow-up plan |
| `DecisionSupportRule` | Configurable decision rules and recommendation mappings |

Migration: `prisma/migrations/20260708060000_sprint65_clinical_decision_support/`

## Recommendation types

- Repeat ECG
- Holter Monitor
- Echocardiography
- Troponin
- Electrolytes
- Cardiology Referral
- Emergency Evaluation
- Hospital Admission
- Observation
- Repeat Measurements
- Manual Review Required

## API (mounted at `/api/clinical-decision-support`)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/recommendations/:caseId` | List active recommendations |
| POST | `/recommendations/regenerate/:caseId` | Regenerate recommendations |
| POST | `/recommendations/:recommendationId/accept` | Accept recommendation |
| POST | `/recommendations/:recommendationId/reject` | Reject recommendation |
| GET | `/followup/:caseId` | Latest follow-up plan |
| POST | `/followup/generate/:caseId` | Generate follow-up plan + reminders |

## Audit actions

- `CLINICAL_RECOMMENDATION_GENERATED`
- `CLINICAL_RECOMMENDATION_ACCEPTED`
- `CLINICAL_RECOMMENDATION_REJECTED`
- `FOLLOW_UP_PLAN_CREATED`

## Engine flow

1. Load case measurements (`measureCaseFromStoredLeads`)
2. Enrich with medical intelligence findings
3. Evaluate `DecisionSupportRule` catalog
4. Persist `CaseClinicalRecommendation` records
5. Derive `FollowUpPlan` + `FollowUpReminder` from top priority recommendation

## Tests

- `scripts/sprint65-clinical-decision-support.test.ts`
- `scripts/sprint65-clinical-decision-support.integration.ts`
- `tests/unit/server/clinical-decision-support/engine.test.ts`

## Version

`sprint65-v1`
