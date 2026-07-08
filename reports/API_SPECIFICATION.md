# API Specification — EMKP (Design Only)

> **NOT INTEGRATED.** This specification defines future REST endpoints. No routes are mounted in production.

**OpenAPI:** `enterprise/emkp/api/openapi.yaml`  
**Zod Schemas:** `enterprise/emkp/api/schemas.ts`  
**Future Base URL:** `/api/v2/emkp`

---

## Design Principles

1. Read-only knowledge endpoints (no mutation in v1)
2. Versioned under `/api/v2/` to avoid collision with existing `/api/*`
3. JWT authentication (same as production) when integrated
4. No integration with existing `/api/medical-intelligence` or `/api/ecg` routes

---

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Module health + version |
| GET | `/diseases` | List diseases (filter: category, query) |
| GET | `/diseases/{code}` | Single disease entry |
| GET | `/rules` | List all clinical rules |
| GET | `/rules/{ruleId}` | Single rule (EMKP-R-NNN) |
| GET | `/differential` | Differential diagnosis trees |
| GET | `/leads` | 12-lead clinical knowledge |
| GET | `/terminology?q=` | Search terminology dictionary |
| GET | `/guidelines` | List guideline references |
| POST | `/validate` | Platform integrity check |

---

## Response Models

### DiseaseEntry
Full structured disease with diagnostic criteria, ECG characteristics, measurements, differentials, pitfalls, severity, urgency, risk, guidelines.

### ClinicalRule
Rule with required/supporting/exclusion findings, severity, risk, urgency, recommended actions, evidence level.

### DifferentialNode
Recursive tree node with optional diagnosisCode and distinguishingFeatures.

### LeadKnowledge
Territory, clinical importance, view vector, common findings, associated diseases.

### TerminologyEntry
Term, category, definition, synonyms, abbreviations, related terms.

### ValidationResult
```json
{
  "ok": true,
  "errors": [],
  "warnings": [],
  "stats": { "diseases": 47, "rules": 47, "leads": 12 }
}
```

---

## Validation Models (Zod)

| Schema | Purpose |
|--------|---------|
| `diseaseQuerySchema` | Query params for disease list |
| `diseaseCodeParamSchema` | Path param validation |
| `ruleIdParamSchema` | EMKP-R-NNN format |
| `terminologyQuerySchema` | Search query |
| `diseaseEntrySchema` | Full disease response |
| `clinicalRuleSchema` | Full rule response |
| `validationResultSchema` | Validation endpoint response |

---

## Integration Checklist (Future Sprint)

- [ ] Create `server/src/modules/emkp/` route handler
- [ ] Register at `/api/v2/emkp` in modules router
- [ ] Add authentication middleware
- [ ] Seed `emkp.*` database from in-memory knowledge
- [ ] Add integration tests
- [ ] Update Orval/OpenAPI codegen in `lib/api-spec`

---

## Explicit Non-Goals

- No modification to existing `/api/medical-intelligence/*`
- No modification to `/api/ecg/*`
- No modification to `/api/copilot/*`
- No frontend API client generation until integration sprint
