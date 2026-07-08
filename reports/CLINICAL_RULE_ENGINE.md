# Clinical Rule Engine — EMKP

## Overview

Structured clinical rules for 47 ECG diagnoses. Each rule contains definition, diagnostic criteria, required/supporting/exclusion findings, severity, clinical significance, risk level, urgency, and recommended actions.

**Source:** `enterprise/emkp/src/rules/clinical-rules.ts`

---

## Rule Schema

```typescript
interface EmkpClinicalRule {
  ruleId: string;              // EMKP-R-001 through EMKP-R-047
  diagnosisCode: string;
  definition: string;
  diagnosticCriteria: string[];
  requiredFindings: string[];   // Must be present
  supportingFindings: string[]; // Corroborating evidence
  exclusionFindings: string[];  // Argues against / pitfalls
  severity: EmkpSeverityLevel;
  clinicalSignificance: string;
  riskLevel: EmkpRiskCategory;
  urgency: EmkpUrgencyLevel;
  recommendedAction: string[];
  evidenceLevel: EmkpEvidenceLevel;
  confidence: EmkpClinicalConfidence;
  guidelineRefs: EmkpGuidelineReference[];
}
```

---

## Rule Catalog Summary

| Range | Category | Count |
|-------|----------|-------|
| EMKP-R-001 – 015 | Rhythm / arrest | 15 |
| EMKP-R-016 – 023 | Conduction / fascicular | 8 |
| EMKP-R-024 – 025 | Hypertrophy | 2 |
| EMKP-R-026 – 031 | Ischemia / MI territories | 6 |
| EMKP-R-032 – 035 | Electrolytes | 4 |
| EMKP-R-036 – 042 | Other / channelopathy | 7 |
| EMKP-R-043 – 047 | Device / escape rhythms | 5 |

---

## Example: STEMI Rule (EMKP-R-026)

| Field | Value |
|-------|-------|
| Required Findings | ST elevation ≥1 mm in ≥2 contiguous leads |
| Supporting | Hyperacute T waves, reciprocal depression |
| Exclusion | Pericarditis diffuse pattern, early repolarization |
| Severity | critical |
| Risk | critical |
| Urgency | critical |
| Actions | Activate cath lab, dual antiplatelet therapy |
| Guidelines | UDMI-4TH-2018, ESC-ACS-2023 |

---

## Example: LBBB Rule (EMKP-R-021)

| Field | Value |
|-------|-------|
| Exclusion | Standard STEMI criteria unreliable — use Sgarbossa |
| Actions | Echo for new LBBB, modified Sgarbossa for ACS |

---

## API Access (Future)

```
GET /api/v2/emkp/rules
GET /api/v2/emkp/rules/{ruleId}
```

Not integrated. See `enterprise/emkp/api/openapi.yaml`.

---

## Validation

Every rule references a valid diagnosis code. Validated by `validateEmkpPlatform()`.
