# Database Schema — Sprint 40 MIC

## Migration

`prisma/migrations/20260707180000_medical_intelligence_core/migration.sql`

Additive-only: creates seven new `Mic*` tables. No changes to existing Medical Intelligence Engine tables from Sprint 38.

## Tables

### MicDiagnosisEntry

Normalized ECG diagnosis catalog (Module 1).

| Column | Type | Notes |
|--------|------|-------|
| id | String (cuid) | PK |
| code | String | Unique diagnosis code (e.g. `AF`, `STEMI_ANT`) |
| name | String | Display name |
| category | String | rhythm, arrhythmia, conduction, ischemia, hypertrophy |
| definition | String | Full clinical definition |
| diagnosticCriteria | String[] | ECG diagnostic criteria |
| typicalFindings | String[] | Typical ECG findings |
| clinicalSignificance | String | Clinical impact |
| differentialDiagnosis | String[] | Differential list |
| possibleCauses | String[] | Etiologies |
| associatedSymptoms | String[] | Clinical symptoms |
| severity | String | normal → critical |
| emergencyLevel | String | routine → critical |
| recommendedNextSteps | String[] | Clinical actions |
| references | Json | Structured citation objects |
| icd10Code | String? | ICD-10 placeholder |
| snomedCode | String? | SNOMED placeholder |
| libraryTags | String[] | arrhythmia, ischemia, etc. |

**Indexes:** `category`, `name`, unique `code`

### MicArrhythmiaEntity

Arrhythmia library (Module 2). Links to `diagnosisCode`.

### MicIschemiaEntity

STEMI/ischemia territory library (Module 3). Includes `pattern`, `territory`, `affectedLeads`, `stCriteria`.

### MicMeasurementReference

ECG interval and hypertrophy reference ranges (Module 4). Unique `parameter`.

### MicGuidelineEntry

Guideline registry (Module 8). String `id` primary key for stable external references (`esc-af-2024`, etc.).

### MicRecommendationMapping

Diagnosis → recommendation rows (Module 5). Indexed by `diagnosisCode` and `type`.

### MicRiskRule

Configurable risk stratification rules (Module 7). JSON `criteriaJson` for category/severity/emergency filters.

## Seeding

```typescript
import { seedMicCoreDatabase } from "server/src/modules/medical-intelligence-core/persist/seed";
await seedMicCoreDatabase();
```

Or via API: `POST /api/mic/seed` (authenticated).

Seed uses upsert semantics — safe to re-run for catalog updates.

## Relationship to Sprint 38 Schema

| Sprint 38 | Sprint 40 MIC |
|-----------|---------------|
| MedicalKnowledgeBaseEntry | MicDiagnosisEntry (richer fields) |
| MedicalRuleDefinition | MicRiskRule + in-memory engines |
| MedicalIntelligenceReport | Unchanged — analysis runtime |
| MedicalDiagnosisFinding | Unchanged — persisted findings |

MIC tables are the long-term normalized knowledge store; Sprint 38 analysis engine remains independent until explicitly bridged.

## Expected Seed Counts

| Table | Count |
|-------|-------|
| MicDiagnosisEntry | 26 |
| MicArrhythmiaEntity | 12 |
| MicIschemiaEntity | 9 |
| MicMeasurementReference | 8 |
| MicGuidelineEntry | 6 |
| MicRecommendationMapping | ~40+ |
| MicRiskRule | 6 |
