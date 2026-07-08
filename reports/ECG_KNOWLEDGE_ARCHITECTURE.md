# ECG Knowledge Architecture — EMKP

## Module Identity

| Property | Value |
|----------|-------|
| Module ID | `ecg-medical-knowledge-platform` |
| Version | `1.0.0` |
| Location | `enterprise/emkp/` |
| Integration Status | **Isolated — not wired to production** |

---

## Purpose

The **ECG Medical Knowledge Platform (EMKP)** is the structured clinical knowledge backbone for ECG Insight Medical Intelligence. It provides normalized disease definitions, clinical rules, guideline mappings, differential diagnosis trees, lead-specific knowledge, and terminology — entirely decoupled from the production application.

---

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│  Phase 9 — API Design (Future)                               │
│  enterprise/emkp/api/openapi.yaml + schemas.ts               │
│  NOT mounted — specification only                            │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  Knowledge Layer                                             │
│  diagnoses · rules · differential · leads · terminology      │
│  enterprise/emkp/src/                                        │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  Knowledge Model (Phase 1)                                   │
│  enterprise/emkp/src/model/knowledge-model.ts                │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  Database Schema (Phase 8 — Future)                          │
│  enterprise/emkp/database/schema.sql (emkp.* namespace)      │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1 — Knowledge Model Entities

| Entity | Description |
|--------|-------------|
| **Knowledge Categories** | 10 taxonomy categories (rhythm, conduction, ischemia, etc.) |
| **Medical Concepts** | Hierarchical clinical concepts with synonyms |
| **Clinical Rules** | Structured rule definitions with required/supporting/exclusion findings |
| **Evidence Levels** | A / B / C / D / expert_consensus |
| **Guideline References** | ESC, AHA, ACC, UDMI, IEC structured citations |
| **Clinical Confidence** | definitive → indeterminate scale |
| **Risk Categories** | critical → benign stratification |
| **Recommendation Levels** | immediate → none priority |
| **Severity Levels** | normal → critical |
| **Urgency Levels** | routine → critical |

---

## Module Structure

```
enterprise/emkp/
├── src/
│   ├── index.ts                 # Public exports
│   ├── model/knowledge-model.ts   # Canonical types
│   ├── knowledge/
│   │   ├── diagnoses.ts         # 47 disease entries
│   │   ├── leads.ts             # 12-lead knowledge
│   │   └── terminology.ts       # 43+ dictionary entries
│   ├── rules/clinical-rules.ts  # 47 clinical rules
│   ├── guidelines/registry.ts   # 10 guideline documents
│   ├── differential/trees.ts      # 6 differential trees
│   └── validation/validator.ts  # Integrity validation
├── database/schema.sql          # Normalized PostgreSQL (emkp schema)
└── api/
    ├── openapi.yaml             # Future REST spec
    └── schemas.ts               # Zod validation models
```

---

## Isolation Guarantees

| Constraint | Status |
|------------|--------|
| Production UI modified | ❌ No |
| ECG Viewer modified | ❌ No |
| Live Monitor modified | ❌ No |
| Measurement Engine modified | ❌ No |
| AI Findings UI modified | ❌ No |
| AI Cardiologist UI modified | ❌ No |
| Application routing modified | ❌ No |
| Existing APIs modified | ❌ No |
| Runtime behavior changed | ❌ No |
| `server/src/modules/index.ts` modified | ❌ No |
| `prisma/schema.prisma` modified | ❌ No |

---

## Future Integration Path

1. Import `buildEmkpPlatform()` from `enterprise/emkp/src`
2. Seed `emkp.*` database schema from `database/schema.sql`
3. Mount `/api/v2/emkp/*` routes per `api/openapi.yaml`
4. Connect to Medical Intelligence Core orchestrator

---

## Validation

```bash
npx tsx scripts/emkp-validation.test.ts
```

Current stats: 47 diseases, 47 rules, 6 differential trees, 12 leads, 43 terminology entries, 10 guidelines.
