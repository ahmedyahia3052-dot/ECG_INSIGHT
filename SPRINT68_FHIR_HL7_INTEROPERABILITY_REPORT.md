# Sprint 68 — Enterprise FHIR / HL7 Interoperability Engine

## Scope

Backend only. Zero frontend changes.

## Module

`server/src/modules/fhir-hl7-interoperability-engine/`

Engine version: `sprint68-fhir-hl7-interoperability-v1`

| Component | Path |
|-----------|------|
| FHIR serializers | `fhir/serializers.ts` |
| FHIR validation | `fhir/validators.ts` |
| HL7 parser/builder | `hl7/engine.ts` |
| Export/import services | `services/fhir.service.ts`, `services/hl7.service.ts` |
| Audit + systems | `services/audit.service.ts` |
| REST routes | `controllers/interoperability.routes.ts` |

## Database

Migration: `prisma/migrations/20260708081000_sprint68_fhir_hl7_interoperability`

| Model | Purpose |
|-------|---------|
| `FHIRExportJob` | Persisted FHIR export runs with bundle payload |
| `FHIRImportJob` | Persisted FHIR import runs with validation results |
| `HL7Message` | Stored HL7 v2 messages (ORM, ORU, ADT, MDM, ACK) |
| `InteroperabilityLog` | Operational audit log for all interop events |
| `ExternalSystem` | Registered HIS/EMR/LIS endpoints |
| `ExternalOrganization` | External healthcare organization registry |
| `FHIRAudit` | FHIR-specific audit trail |

## FHIR resources

Serialization and validation for: Patient, Practitioner, Organization, Observation, DiagnosticReport, DocumentReference, Encounter, Device, ServiceRequest, Condition.

Bundle types: full case document bundle, DiagnosticReport bundle, Observation collection bundle.

## HL7 support

Message types: ORM, ORU, ADT, MDM, ACK

Includes segment parser, structural validator, and ACK builder.

## REST API

Mounted at `/api/interop`:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/fhir/export/:caseId` | Export case as validated FHIR Bundle |
| POST | `/fhir/import` | Import FHIR Bundle (`{ payload: Bundle }`) |
| GET | `/hl7/export/:caseId` | Export case as HL7 ORU (or ORM via `?messageType=ORM`) |
| POST | `/hl7/import` | Import HL7 message (`{ rawMessage: string }`) |
| GET | `/logs` | Interoperability event log |
| GET | `/systems` | Registered external systems (auto-seeds default gateway) |

## Validation

- FHIR resource schema checks (required fields per resource type)
- Bundle integrity and reference resolution warnings
- UUID / internal identifier validation
- HL7 required segment validation per message type

## Audit

Logs every import, export, external system access, and validation failure via `InteroperabilityLog`, `FHIRAudit`, and `AuditLog`.

## Tests

- `scripts/sprint68-fhir-hl7-interoperability.test.ts`
- `scripts/sprint68-fhir-hl7-interoperability.integration.ts`
- `scripts/sprint68-fhir-hl7-interoperability-http.integration.ts`

## Validation commands

```bash
npm run lint
npx tsc -p server/tsconfig.json --noEmit
npx prisma migrate deploy
npx tsx scripts/sprint68-fhir-hl7-interoperability.test.ts
npx tsx scripts/sprint68-fhir-hl7-interoperability.integration.ts
npx tsx scripts/sprint68-fhir-hl7-interoperability-http.integration.ts
```

## Note on legacy `/api/fhir`

The existing hospital integration routes at `/api/fhir` remain unchanged. Sprint 68 adds the enterprise interoperability engine at `/api/interop`.
