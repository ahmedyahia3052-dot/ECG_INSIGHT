# Sprint 87 — Clinical Case Management Report

**Module:** `server/src/modules/clinical-case-management`  
**Version:** `sprint87-v1`  
**Mode:** Production backend (no UI changes)

## Summary

Sprint 87 delivers a unified **Clinical Case Management** backend module that extends the existing Sprint 60 case-management-engine with a production-ready lifecycle API, enforced review locking, unified timeline, typed clinical notes, and version restore — all behind a dedicated `/clinical-case-management` route prefix.

## Case Lifecycle

Seven-state unified lifecycle exposed via API:

| Lifecycle | Management Status | ECG Case Status |
|-----------|-------------------|-----------------|
| `draft` | DRAFT | NEW |
| `uploaded` | UPLOADED | UPLOADED |
| `processing` | PROCESSING | PROCESSING |
| `pending_review` | PENDING_REVIEW | UNDER_REVIEW |
| `reviewed` | REVIEWED | REVIEWED |
| `finalized` | FINALIZED | FINALIZED |
| `archived` | ARCHIVED | ARCHIVED |

Forward transitions are validated; archive is allowed from any non-archived state.

## Features Implemented

### Timeline & History
- **Unified timeline** — merges `CaseHistory` events and `CaseAudit` entries (`GET /cases/:caseId/timeline`)
- **Case events** — paginated `CaseHistory` (`GET /cases/:caseId/events`)
- **Audit history** — paginated `CaseAudit` (`GET /cases/:caseId/audit`)
- **Status history** — filtered status/archive/restore events (`GET /cases/:caseId/status-history`)

### Notes
- **Clinical notes** — `noteType: clinical`
- **Doctor comments** — `noteType: doctor`
- **Internal notes** — `noteType: internal`
- Prisma `CaseCommentNoteType` enum + `noteType` column (migration included)

### Assignment & Metadata
- Assign reviewer (`POST /cases/:caseId/reviewer`)
- Reassign case (`POST /cases/:caseId/reassign`)
- Priority updates with `PRIORITY_CHANGED` history (`PATCH /cases/:caseId/priority`)
- Critical flag (`PATCH /cases/:caseId/critical`)
- Labels/tags (`PATCH /cases/:caseId/labels`)

### Lock Enforcement
- Acquire/release review locks (`POST /lock`, `POST /unlock`, `GET /lock`)
- **All mutating operations** assert the case is not locked by another clinician before proceeding

### Version History
- List/create versions
- **Restore version** with pre-restore snapshot (`POST /cases/:caseId/versions/:versionId/restore`)

### Attachments
- List and add case attachments with audit trail

## Architecture

```
clinical-case-management/
├── domain/          lifecycle state machine, serializers
├── dto/             Zod request schemas
├── validators/      transition + lock enforcement
├── repository/      Prisma data access (case, history, comment, attachment, lock, version)
├── service/         lifecycle, timeline, notes, assignment, locking, version
└── routes/          Express router mounted at /clinical-case-management
```

## Database Migration

`prisma/migrations/20260709030000_sprint87_clinical_case_management/`

- Extends `CaseManagementStatus` with `UPLOADED`, `PROCESSING`, `FINALIZED`
- Adds `CaseCommentNoteType` enum and `CaseComment.noteType`

## API Endpoints

Base path: `/api/v1/clinical-case-management`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/cases/:caseId` | Case with lifecycle state |
| POST | `/cases/:caseId/lifecycle` | Transition lifecycle |
| POST | `/cases/:caseId/archive` | Archive case |
| POST | `/cases/:caseId/restore` | Restore archived case |
| GET | `/cases/:caseId/timeline` | Unified timeline |
| GET | `/cases/:caseId/events` | Case events |
| GET | `/cases/:caseId/audit` | Audit history |
| GET | `/cases/:caseId/status-history` | Status history |
| GET/POST | `/cases/:caseId/notes` | List/add notes |
| POST | `/cases/:caseId/reviewer` | Assign reviewer |
| POST | `/cases/:caseId/reassign` | Reassign reviewer |
| PATCH | `/cases/:caseId/priority` | Update priority |
| PATCH | `/cases/:caseId/critical` | Set critical flag |
| PATCH | `/cases/:caseId/labels` | Update labels |
| GET/POST | `/cases/:caseId/attachments` | Attachments |
| POST/GET | `/cases/:caseId/lock` | Lock management |
| GET/POST | `/cases/:caseId/versions` | Version history |
| POST | `/cases/:caseId/versions/:versionId/restore` | Restore version |

## Tests

- **Unit (vitest):** `tests/unit/server/clinical-case-management/`
- **Unit (scripts):** `scripts/sprint87-clinical-case-management.test.ts`
- **Integration:** `scripts/sprint87-clinical-case-management.integration.ts`

## Validation

```bash
npm run lint
npm run typecheck
npm run build
npx vitest run tests/unit/server/clinical-case-management
npx tsx scripts/sprint87-clinical-case-management.test.ts
npx tsx scripts/sprint87-clinical-case-management.integration.ts
```

## Relationship to Sprint 60

The existing `case-management-engine` module (`/api/v1/cases/*`) remains unchanged for backward compatibility. Sprint 87 provides the unified lifecycle and lock-enforced mutation layer at `/clinical-case-management`. Both modules share the same Prisma models (`CaseHistory`, `CaseAudit`, `CaseComment`, `CaseLock`, `CaseVersion`).

## Out of Scope

- No frontend/UI changes (per sprint requirements)
- No changes to ECG Viewer
