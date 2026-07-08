# ECG Knowledge Database — EMKP

## Overview

Normalized PostgreSQL schema for the ECG Medical Knowledge Platform, isolated in the `emkp` schema namespace. **Not applied to production.**

**Source:** `enterprise/emkp/database/schema.sql`

---

## Schema Namespace

All EMKP tables live under `emkp.*` — completely separate from production `public` schema tables.

---

## Entity Relationship Diagram

```
emkp.guidelines ──────┐
                      │
emkp.diseases ────────┼──► emkp.disease_guidelines
  │                   │
  ├── disease_criteria│
  │                   │
  └── clinical_rules ─┼──► rule_findings
                      │    rule_criteria
                      │    recommendations
                      │
emkp.differential_nodes (self-referencing tree)
emkp.lead_knowledge (standalone)
emkp.terminology ──────► terminology_synonyms
emkp.evidence (links to diseases/rules)
```

---

## Tables

| Table | Rows (seed target) | Purpose |
|-------|-------------------|---------|
| `emkp.guidelines` | 10 | ESC/AHA/ACC/UDMI/IEC references |
| `emkp.diseases` | 47 | Core disease knowledge |
| `emkp.disease_criteria` | ~300 | Normalized criteria arrays |
| `emkp.disease_guidelines` | ~80 | M:N disease ↔ guideline |
| `emkp.clinical_rules` | 47 | Structured clinical rules |
| `emkp.rule_findings` | ~200 | Required/supporting/exclusion |
| `emkp.rule_criteria` | ~150 | Diagnostic criteria per rule |
| `emkp.recommendations` | ~100 | Recommended actions |
| `emkp.differential_nodes` | ~40 | Differential diagnosis trees |
| `emkp.lead_knowledge` | 12 | 12-lead clinical knowledge |
| `emkp.terminology` | 43+ | ECG dictionary |
| `emkp.terminology_synonyms` | ~60 | Searchable synonyms |
| `emkp.evidence` | extensible | Evidence citations |

---

## Enums

- `emkp.knowledge_category` — 10 categories
- `emkp.evidence_level` — A, B, C, D, expert_consensus
- `emkp.clinical_confidence` — 5 levels
- `emkp.risk_category` — 5 levels
- `emkp.recommendation_level` — 5 levels
- `emkp.severity_level` — 5 levels
- `emkp.urgency_level` — 4 levels

---

## Indexes

All foreign keys indexed. Additional indexes on:
- `diseases.category`, `diseases.code`
- `clinical_rules.disease_id`, `clinical_rules.enabled`
- `differential_nodes.parent_id`
- `terminology.category`, `terminology_synonyms.synonym`
- `guidelines.organization`

---

## Deployment (Future Sprint)

```bash
psql $DATABASE_URL -f enterprise/emkp/database/schema.sql
# Then run seed script (future) to populate from in-memory knowledge
```

---

## Separation from Production

| Production Table | EMKP Equivalent | Relationship |
|-----------------|-----------------|--------------|
| `ECGKnowledgeEntry` | `emkp.diseases` | Independent — different schema |
| `MedicalKnowledgeDocument` | `emkp.guidelines` | Independent — RAG vs structured |
| `MedicalKnowledgeBaseEntry` | `emkp.diseases` | Independent — future merge candidate |

No foreign keys between `public.*` and `emkp.*` schemas.
