# Prisma Migration Summary — Medical Intelligence Engine

**Date:** 2026-07-06  
**Reviewer:** Automated schema compatibility review  
**Status:** ⚠️ Review complete — **do not run bare `prisma db push` without reading drift section**

---

## Executive Summary

The Medical Intelligence Engine schema changes are **100% additive** and **backward compatible**. No existing tables or columns are dropped or renamed by our changes.

However, running `prisma db push` against the current database would also apply **pre-existing schema drift** unrelated to this feature (14 `updatedAt` default removals + 1 FK behavior change on `AuditLog`). A **scoped migration** is provided to apply only the safe additive changes.

---

## Changes Introduced (Git Diff)

### Modified Models — Relation Fields Only (No Column Changes)

| Model | Change | Impact |
|-------|--------|--------|
| `User` | +`medicalIntelligenceReports MedicalIntelligenceReport[]` | Prisma back-relation only; **no DB column added** |
| `Patient` | +`medicalIntelligenceReports MedicalIntelligenceReport[]` | Prisma back-relation only; **no DB column added** |
| `ECGCase` | +`medicalIntelligenceReports MedicalIntelligenceReport[]` | Prisma back-relation only; **no DB column added** |

### New Enums (3)

| Enum | Values |
|------|--------|
| `MedicalConfidenceLevel` | HIGH, MEDIUM, LOW, UNKNOWN |
| `MedicalReportSeverity` | NORMAL, MINOR, ABNORMAL, URGENT, CRITICAL |
| `MedicalReportUrgency` | ROUTINE, URGENT, EMERGENT, CRITICAL |

### New Tables (4)

| Table | Purpose | FK Targets |
|-------|---------|------------|
| `MedicalKnowledgeBaseEntry` | Persistent ECG diagnosis knowledge | None |
| `MedicalRuleDefinition` | Rule metadata (future dynamic rules) | None |
| `MedicalIntelligenceReport` | Full analysis reports | `ECGCase`, `Patient`, `User` |
| `MedicalDiagnosisFinding` | Individual findings per report | `MedicalIntelligenceReport` |

---

## Backward Compatibility Checklist

| Check | Result |
|-------|--------|
| Existing tables dropped | ✅ None |
| Existing columns dropped | ✅ None |
| Existing columns renamed | ✅ None |
| Existing column types changed | ✅ None (by our diff) |
| Existing data invalidated | ✅ No |
| Existing API queries broken | ✅ No — all new tables |
| Name collision with existing tables | ✅ None |
| `ECGKnowledgeEntry` conflict | ✅ Separate table (`MedicalKnowledgeBaseEntry`) |
| `MedicalKnowledgeDocument` conflict | ✅ Separate table, different purpose |
| `ClinicalDecisionSupportRun` conflict | ✅ Separate CDSS tables unchanged |

---

## Naming Collision Analysis

| Existing Table | New Table | Conflict? |
|----------------|-----------|-----------|
| `ECGKnowledgeEntry` | `MedicalKnowledgeBaseEntry` | No — different schema, different code path |
| `MedicalKnowledgeDocument` | `MedicalKnowledgeBaseEntry` | No — RAG embeddings vs structured diagnosis KB |
| `ClinicalDecisionSupportRun` | `MedicalIntelligenceReport` | No — parallel CDSS systems |
| `ClinicalDecisionFinding` | `MedicalDiagnosisFinding` | No — different parent report |

---

## Foreign Key Semantics (New Tables Only)

| FK | onDelete | Risk |
|----|----------|------|
| `MedicalIntelligenceReport.caseId → ECGCase` | SET NULL | Safe — reports preserved if case deleted |
| `MedicalIntelligenceReport.patientId → Patient` | SET NULL | Safe — reports preserved if patient deleted |
| `MedicalIntelligenceReport.evaluatedById → User` | CASCADE | Reports deleted if evaluating user deleted (intentional) |
| `MedicalDiagnosisFinding.reportId → MedicalIntelligenceReport` | CASCADE | Findings deleted with parent report (intentional) |

---

## ⚠️ Pre-Existing Drift Detected (NOT from Medical Intelligence)

Running `prisma db push` today would **also** apply these changes detected by:

```bash
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script
```

### 1. AuditLog FK Behavior Change

```sql
-- Current DB:  ON DELETE RESTRICT  (migration 20260623174900)
-- Schema expects: ON DELETE SET NULL
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_patientId_fkey";
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

**Impact:** Deleting a `Patient` would no longer be blocked by `AuditLog` rows; instead `patientId` becomes NULL.  
**Data loss:** None.  
**Behavior change:** Yes — review before applying.

### 2. updatedAt DEFAULT Removal (14 tables)

Prisma `@updatedAt` does not use DB-level defaults. Old migrations added `DEFAULT CURRENT_TIMESTAMP` which the current schema omits. `db push` would run:

```sql
ALTER TABLE "CaseClinicalNote" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "CaseDiscussionMessage" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "CaseDiscussionThread" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "CaseLock" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "ClinicalDecisionRule" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "CopilotAttachment" ALTER COLUMN "warnings" DROP DEFAULT;
ALTER TABLE "CopilotAttachment" ALTER COLUMN "recommendations" DROP DEFAULT;
ALTER TABLE "Notification" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "NotificationDeliveryLog" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "NotificationPreference" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "NotificationTemplate" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "Organization" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "PaymentMethod" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "PaymentTransaction" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "Refund" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "support_tickets" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "user_preferences" ALTER COLUMN "updatedAt" DROP DEFAULT;
```

**Impact:** Metadata-only; Prisma still manages `updatedAt` at application level.  
**Data loss:** None.  
**Risk:** Low.

---

## Recommended Apply Strategy

### Option A — Scoped Migration (Recommended)

Apply **only** the Medical Intelligence changes using the provided migration file:

```
prisma/migrations/20260706190000_medical_intelligence_engine/migration.sql
```

```bash
# Apply scoped SQL directly (review file first)
psql $DATABASE_URL -f prisma/migrations/20260706190000_medical_intelligence_engine/migration.sql

# Regenerate client (already done)
npx prisma generate
```

**Pros:** Zero drift side-effects; fully additive; auditable SQL.  
**Cons:** Does not update `_prisma_migrations` table unless run via `prisma migrate deploy`.

### Option B — Prisma Migrate Deploy

If `migration_lock.toml` is added and migration history is reconciled:

```bash
npx prisma migrate deploy
```

### Option C — Full db push (Not Recommended Without Drift Review)

```bash
npx prisma db push
```

**Warning:** Applies Medical Intelligence **plus** all drift fixes above. Accept only after reviewing AuditLog FK behavior change.

---

## Scoped Migration Contents

The scoped migration (`20260706190000_medical_intelligence_engine`) contains:

| Operation | Count |
|-----------|-------|
| CREATE TYPE (enums) | 3 |
| CREATE TABLE | 4 |
| CREATE INDEX | 13 |
| ADD FOREIGN KEY | 4 |
| DROP TABLE | 0 |
| DROP COLUMN | 0 |
| ALTER TABLE (existing) | 0 |
| RENAME | 0 |

**Estimated apply time:** < 1 second on empty tables.

---

## Rollback Plan

If rollback is needed after applying the scoped migration:

```sql
DROP TABLE IF EXISTS "MedicalDiagnosisFinding" CASCADE;
DROP TABLE IF EXISTS "MedicalIntelligenceReport" CASCADE;
DROP TABLE IF EXISTS "MedicalRuleDefinition" CASCADE;
DROP TABLE IF EXISTS "MedicalKnowledgeBaseEntry" CASCADE;
DROP TYPE IF EXISTS "MedicalReportUrgency";
DROP TYPE IF EXISTS "MedicalReportSeverity";
DROP TYPE IF EXISTS "MedicalConfidenceLevel";
```

No existing tables or data are affected by rollback.

---

## Post-Migration Verification

```bash
# 1. Confirm tables exist
npx prisma db execute --stdin <<< "SELECT tablename FROM pg_tables WHERE tablename LIKE 'Medical%';"

# 2. Regenerate client
npx prisma generate

# 3. Seed knowledge base (optional, via API)
POST /api/medical-intelligence/knowledge/seed

# 4. Run engine tests (no DB required for in-memory path)
npx tsx scripts/medical-intelligence-engine.test.ts
```

---

## Decision

| Action | Approved? |
|--------|-----------|
| Apply scoped migration (`20260706190000_medical_intelligence_engine`) | ✅ Yes — safe, additive only |
| Run `prisma db push` without drift review | ❌ No — includes unrelated FK/default changes |
| Drop/rename existing tables | ❌ Not required |

**`prisma db push` has NOT been applied.** Awaiting explicit approval to apply either the scoped migration or full push after drift review.
