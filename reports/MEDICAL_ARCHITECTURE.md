# ECG Insight Enterprise — Medical Intelligence Architecture

## Overview

The **Medical Intelligence Engine** transforms ECG Insight from an ECG viewer into a **Clinical Decision Support System (CDSS)**. This module is backend-only: no UI, viewer, or workspace components are modified.

**Location:** `server/src/modules/medical-intelligence/`

**Engine ID:** `ecg-medical-intelligence-engine`  
**Version:** `1.0.0`

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                     REST API Layer                                   │
│  /api/medical-intelligence/*                                          │
└────────────────────────────┬────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│                     Orchestrator                                     │
│  runMedicalIntelligenceEngine()                                       │
└──┬────────┬──────────┬──────────┬──────────┬──────────┬────────────┘
   │        │          │          │          │          │
   ▼        ▼          ▼          ▼          ▼          ▼
┌──────┐ ┌──────┐ ┌──────────┐ ┌────────┐ ┌────────┐ ┌──────────────┐
│ Rule │ │Conf. │ │Explain-  │ │Diff.   │ │Recomm. │ │Report        │
│Engine│ │Engine│ │ability   │ │Engine  │ │Engine  │ │Engine        │
└──┬───┘ └──┬───┘ └────┬─────┘ └───┬────┘ └───┬────┘ └──────┬───────┘
   │        │          │           │          │             │
   └────────┴──────────┴───────────┴──────────┴─────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│                     Knowledge Base (37 diagnoses)                    │
│  server/src/modules/medical-intelligence/knowledge-base/             │
└────────────────────────────┬────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│                     Persistence (Prisma / PostgreSQL)                │
│  MedicalIntelligenceReport, MedicalDiagnosisFinding,                 │
│  MedicalKnowledgeBaseEntry, MedicalRuleDefinition                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Module Breakdown

| Module | Path | Responsibility |
|--------|------|----------------|
| Knowledge Base | `knowledge-base/` | Structured clinical content for 37 ECG diagnoses |
| Rule Engine | `rule-engine/` | Deterministic diagnosis from measurements |
| Confidence Engine | `confidence/` | High/Medium/Low/Unknown with explanations |
| Explainability Engine | `explainability/` | Rationale, evidence, conflicts, gaps |
| Differential Engine | `differential/` | Top 5 ranked alternative diagnoses |
| Recommendation Engine | `recommendations/` | Clinical action items with priority |
| Report Engine | `report/` | Structured JSON clinical report |
| Orchestrator | `orchestrator.ts` | Pipeline composition |
| API | `medical-intelligence.routes.ts` | REST endpoints |
| Persistence | `persist.ts` | Prisma write/read helpers |

---

## Input / Output Contract

### Input

```typescript
interface MedicalIntelligenceInput {
  measurement: EcgClinicalMeasurementResult;  // from ecg-measurement module
  caseId?: string;
  patientId?: string;
  clinicalContext?: {
    symptoms?: string[];
    medications?: string[];
    priorDiagnoses?: string[];
    age?: number;
    sex?: "male" | "female" | "other";
  };
}
```

### Output

```typescript
interface MedicalIntelligenceReport {
  version: string;
  generatedAt: string;
  engineId: string;
  measurements: Record<string, number | string>;
  findings: FindingWithConfidenceAndExplainability[];
  primaryDiagnosis: { code, label, confidence };
  recommendations: ClinicalRecommendation[];
  warnings: string[];
  criticalFindings: string[];
  overallSeverity: ClinicalSeverity;
  overallUrgency: ClinicalUrgency;
  overallConfidence: ConfidenceAssessment;
  explainabilitySummary: string;
}
```

---

## Integration with Existing Pipeline

The Medical Intelligence Engine **composes** existing modules without modifying them:

```
ecg-digitization → ecg-measurement → medical-intelligence (NEW)
                                   ↘ ecg-interpretation (unchanged)
                                   ↘ ecg-ai-diagnosis (unchanged)
```

Case-based analysis endpoint runs the full digitization → measurement → medical intelligence chain internally.

---

## Design Principles

1. **Deterministic first** — Rule engine produces reproducible findings; no black-box ML in core path.
2. **Multiple concurrent findings** — A single ECG may yield rhythm + conduction + ischemia findings simultaneously.
3. **Explainability by default** — Every finding includes supporting, conflicting, and missing evidence.
4. **Guideline-aligned** — Knowledge base references AHA/ACC/HRS and ESC guidelines.
5. **Backend-only** — Zero modifications to frontend, viewer, canvas, or workspace components.

---

## Deployment

- Register routes via `server/src/modules/index.ts` at `/medical-intelligence`
- Run `npx prisma generate` after schema migration
- Seed knowledge base: `POST /api/medical-intelligence/knowledge/seed` (SUPER_ADMIN)
- Health check: `GET /api/medical-intelligence/health`

---

## Related Documentation

- [RULE_ENGINE.md](./RULE_ENGINE.md)
- [KNOWLEDGE_BASE.md](./KNOWLEDGE_BASE.md)
- [API_SPEC.md](./API_SPEC.md)
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)
- [AI_ENGINE.md](./AI_ENGINE.md)
- [EXPLAINABILITY.md](./EXPLAINABILITY.md)
- [TEST_REPORT.md](./TEST_REPORT.md)
