# AI Engine — Medical Intelligence Platform

## Overview

The ECG Medical Intelligence Engine is a **deterministic clinical decision support system** that transforms raw ECG measurements into structured diagnoses, confidence assessments, explainability artifacts, differential diagnoses, and clinical recommendations.

Unlike the deep-learning path in `ecg-ai-diagnosis`, this engine prioritizes **reproducibility, explainability, and guideline alignment**.

---

## Engine Pipeline

```
Input: EcgClinicalMeasurementResult
         │
         ▼
┌─────────────────────┐
│  1. Rule Engine     │  37 rules → concurrent RuleFinding[]
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│  2. Confidence      │  Per-finding + overall confidence
│     Engine          │  Levels: high | medium | low | unknown
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│  3. Explainability  │  Rationale, supporting/conflicting/
│     Engine          │  missing evidence, alternatives
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│  4. Differential    │  Top 5 ranked alternatives per finding
│     Engine          │
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│  5. Recommendation  │  Priority-ordered clinical actions
│     Engine          │
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│  6. Report Engine   │  Structured JSON MedicalIntelligenceReport
└─────────────────────┘
```

---

## Confidence Engine

**Source:** `server/src/modules/medical-intelligence/confidence/engine.ts`

### Levels

| Level | Score Range | Meaning |
|-------|-------------|---------|
| High | ≥ 0.75 | Strong evidence alignment, good signal quality |
| Medium | 0.55 – 0.74 | Moderate evidence, some uncertainty |
| Low | 0.35 – 0.54 | Weak evidence or poor signal quality |
| Unknown | < 0.35 | Insufficient data for reliable assessment |

### Scoring Factors

1. **Raw rule confidence** — Base score from rule match strength
2. **Evidence ratio** — Proportion of diagnostic criteria met
3. **Measurement quality** — Signal confidence from digitization/measurement
4. **Rule trigger count** — Multiple independent triggers increase confidence

### Output

```typescript
interface ConfidenceAssessment {
  level: "high" | "medium" | "low" | "unknown";
  score: number;           // 0.05 – 0.98
  explanation: string;     // Human-readable why
  factors: Array<{
    factor: string;
    impact: "positive" | "negative" | "neutral";
    weight: number;
  }>;
}
```

---

## Relationship to Other AI Modules

| Module | Role | Integration |
|--------|------|-------------|
| `ecg-measurement` | Input provider | Measurements feed rule engine |
| `ecg-interpretation` | Legacy rules | Unchanged; parallel interpretation path |
| `ecg-ai-diagnosis` | DL ensemble | Unchanged; can consume same measurements |
| `knowledge-engine` | RAG/education | Separate; medical-intelligence has own KB |
| `copilot` | Conversational AI | Can reference medical intelligence reports |
| `clinical-intelligence/cdss` | Existing CDSS | Complementary; different rule set |

---

## Future AI Enhancements (Not in Scope)

The architecture supports future integration without modifying core engines:

1. **LLM reasoning layer** — Post-process explainability with natural language
2. **ONNX model ensemble** — Blend DL probabilities with rule confidence
3. **Longitudinal comparison** — Trend analysis across serial ECGs
4. **Patient context fusion** — Weight findings by symptoms, medications, history

These would plug into the orchestrator as optional stages after the deterministic pipeline.

---

## Performance Characteristics

- **Latency:** < 50ms for rule evaluation (in-memory, no I/O)
- **Memory:** ~2MB for knowledge base (37 entries)
- **Determinism:** 100% — same input always produces same output
- **Concurrency:** Supports multiple concurrent findings per analysis

---

## Entry Points

```typescript
import {
  runMedicalIntelligenceEngine,
  runMedicalIntelligenceFromMeasurements,
} from "server/src/modules/medical-intelligence";

const report = runMedicalIntelligenceFromMeasurements(measurement);
```

```bash
POST /api/medical-intelligence/analyze
POST /api/medical-intelligence/cases/:caseId/analyze
```
