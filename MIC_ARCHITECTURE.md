# MIC Architecture — Sprint 40

## Overview

The **Medical Intelligence Core (MIC)** is an independent, server-side medical knowledge backbone for ECG Insight. It provides structured diagnosis catalogs, specialty libraries, clinical engines, and lookup APIs without coupling to the ECG viewer or UI layers.

```
server/src/modules/medical-intelligence-core/
├── types.ts                 # Canonical MIC domain types
├── mic-core.ts              # Facade for all lookup services
├── mic.routes.ts            # REST API (/api/mic)
├── mic.schemas.ts           # Zod validation
├── data/                    # Structured in-memory catalogs (Modules 1–4, 8)
│   ├── diagnoses.ts
│   ├── arrhythmias.ts
│   ├── ischemia.ts
│   ├── measurements.ts
│   └── guidelines.ts
├── engines/                 # Clinical logic (Modules 5–8)
│   ├── recommendation-engine.ts
│   ├── differential-engine.ts
│   ├── risk-stratification.ts
│   └── guideline-registry.ts
└── persist/
    └── seed.ts              # Normalized DB seed (Module 10)
```

## Design Principles

1. **Independence** — MIC is separate from Sprint 38 `medical-intelligence` analysis orchestration. Future sprints can connect ECG engines via API contracts only.
2. **Structured medical models** — Every diagnosis includes definition, criteria, findings, clinical significance, differential, causes, symptoms, severity, emergency level, next steps, references, ICD-10, and SNOMED placeholders.
3. **Extensibility** — New diagnoses, arrhythmia entities, ischemia patterns, guidelines, and risk rules are added via typed data files and upserted through the seed pipeline.
4. **Dual runtime** — In-memory catalogs power low-latency lookups; Prisma-normalized tables support persistence, auditing, and future admin tooling.

## Module Map

| Module | Responsibility | Implementation |
|--------|----------------|----------------|
| 1 — Diagnosis KB | Rich ECG diagnosis catalog | `data/diagnoses.ts` |
| 2 — Arrhythmia Library | Rhythm entity definitions | `data/arrhythmias.ts` |
| 3 — STEMI/Ischemia Library | Territory-based ischemia entities | `data/ischemia.ts` |
| 4 — Measurement Reference | PR, QRS, QT, QTc, HR, axis, voltage, hypertrophy | `data/measurements.ts` |
| 5 — Recommendation Engine | Finding → clinical action mapping | `engines/recommendation-engine.ts` |
| 6 — Differential Engine | Ranked multi-diagnosis from findings | `engines/differential-engine.ts` |
| 7 — Risk Stratification | Low / intermediate / high / critical rules | `engines/risk-stratification.ts` |
| 8 — Guideline Structure | ESC, ACC/AHA, AHA registry | `data/guidelines.ts`, `engines/guideline-registry.ts` |
| 9 — API | Lookup services over HTTP | `mic.routes.ts` → `/api/mic` |
| 10 — Database | Normalized schema + seed | Prisma `Mic*` models, `persist/seed.ts` |

## Integration Boundary

```
┌─────────────────────┐     HTTP (future)      ┌──────────────────────────┐
│  ECG Analysis Engine │ ─────────────────────► │  Medical Intelligence Core │
│  (Sprint 38+ viewer) │                        │  /api/mic/*                │
└─────────────────────┘                        └──────────────────────────┘
                                                          │
                                                          ▼
                                               ┌──────────────────────────┐
                                               │  PostgreSQL Mic* tables    │
                                               └──────────────────────────┘
```

MIC does **not** modify viewer components, Playwright specs, authentication middleware, or existing UI routes.

## Engine Identity

- **Engine ID:** `ecg-medical-intelligence-core`
- **Version:** `1.0.0`

## Quality

- TypeScript-first with Zod-validated API inputs
- Integration test: `scripts/sprint40-medical-intelligence-core.integration.ts`
- Registered in integration pipeline after Sprint 38
