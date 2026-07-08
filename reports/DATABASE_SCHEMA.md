# Database Schema — EMKP

> Isolated schema. Does **not** modify production `prisma/schema.prisma`.

**SQL Source:** `enterprise/emkp/database/schema.sql`  
**Namespace:** `emkp` (PostgreSQL schema)

---

## Summary

| Object Type | Count |
|-------------|-------|
| Schema | 1 (`emkp`) |
| Enums | 7 |
| Tables | 13 |
| Indexes | 15+ |

---

## Tables Reference

### Knowledge Tables
- `emkp.diseases` — Core disease entries
- `emkp.disease_criteria` — Normalized criteria (diagnostic, ECG, measurement, pitfall, differential, clinical_note)
- `emkp.disease_guidelines` — M:N disease ↔ guideline

### Clinical Rules
- `emkp.clinical_rules` — Rule definitions
- `emkp.rule_findings` — Required / supporting / exclusion findings
- `emkp.rule_criteria` — Diagnostic criteria per rule
- `emkp.recommendations` — Recommended actions with priority

### Differential Diagnosis
- `emkp.differential_nodes` — Self-referencing tree structure

### Lead Mapping
- `emkp.lead_knowledge` — 12 standard leads

### Terminology
- `emkp.terminology` — Dictionary entries
- `emkp.terminology_synonyms` — Searchable synonym index

### Evidence & Guidelines
- `emkp.guidelines` — Structured guideline documents
- `emkp.evidence` — Extensible evidence citations

---

## Relationships

```
guidelines ←── disease_guidelines ──→ diseases
                                         │
                    ┌────────────────────┼────────────────────┐
                    ▼                    ▼                    ▼
            disease_criteria      clinical_rules         evidence
                                       │
                         ┌─────────────┼─────────────┐
                         ▼             ▼             ▼
                  rule_findings  rule_criteria  recommendations

differential_nodes.parent_id → differential_nodes.id (tree)
differential_nodes.disease_id → diseases.id (optional)

terminology_synonyms.terminology_id → terminology.id
```

---

## Indexes

| Table | Index | Columns |
|-------|-------|---------|
| diseases | idx_emkp_diseases_category | category |
| diseases | idx_emkp_diseases_code | code (unique) |
| clinical_rules | idx_emkp_rules_disease | disease_id |
| clinical_rules | idx_emkp_rules_enabled | enabled |
| differential_nodes | idx_emkp_diff_parent | parent_id |
| terminology | idx_emkp_terminology_category | category |
| terminology_synonyms | idx_emkp_term_synonym | synonym |
| guidelines | idx_emkp_guidelines_org | organization |

---

## Backward Compatibility

| Check | Result |
|-------|--------|
| Modifies production tables | ❌ No |
| Uses `public` schema | ❌ No — isolated `emkp` schema |
| Foreign keys to production | ❌ No |
| Requires Prisma migration | ❌ No |
| Data loss risk | ❌ None — additive only |

---

## Apply (Future Sprint Only)

```bash
psql $DATABASE_URL -f enterprise/emkp/database/schema.sql
```

See also: [ECG_KNOWLEDGE_DATABASE.md](./ECG_KNOWLEDGE_DATABASE.md)
