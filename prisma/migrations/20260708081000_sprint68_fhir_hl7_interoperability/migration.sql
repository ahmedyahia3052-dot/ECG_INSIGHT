-- Sprint 68 — Enterprise FHIR / HL7 Interoperability Engine

CREATE TYPE "InteroperabilityJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'VALIDATION_FAILED');
CREATE TYPE "InteropHl7MessageType" AS ENUM ('ORM', 'ORU', 'ADT', 'MDM', 'ACK');
CREATE TYPE "InteroperabilityDirection" AS ENUM ('EXPORT', 'IMPORT');
CREATE TYPE "ExternalSystemProtocol" AS ENUM ('FHIR', 'HL7', 'HYBRID');
CREATE TYPE "InteroperabilityLogLevel" AS ENUM ('INFO', 'WARNING', 'ERROR', 'AUDIT');

ALTER TYPE "AuditAction" ADD VALUE 'FHIR_INTEROP_EXPORT';
ALTER TYPE "AuditAction" ADD VALUE 'FHIR_INTEROP_IMPORT';
ALTER TYPE "AuditAction" ADD VALUE 'HL7_INTEROP_EXPORT';
ALTER TYPE "AuditAction" ADD VALUE 'HL7_INTEROP_IMPORT';
ALTER TYPE "AuditAction" ADD VALUE 'INTEROPERABILITY_VALIDATION_FAILED';
ALTER TYPE "AuditAction" ADD VALUE 'EXTERNAL_SYSTEM_REQUEST';

CREATE TABLE "ExternalOrganization" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fhirEndpoint" TEXT,
    "hl7Endpoint" TEXT,
    "identifierSystem" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ExternalOrganization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExternalSystem" (
    "id" TEXT NOT NULL,
    "externalOrganizationId" TEXT,
    "organizationId" TEXT,
    "name" TEXT NOT NULL,
    "protocol" "ExternalSystemProtocol" NOT NULL,
    "baseUrl" TEXT,
    "aeTitle" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "supportedResources" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "supportedHl7Types" "InteropHl7MessageType"[] DEFAULT ARRAY[]::"InteropHl7MessageType"[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ExternalSystem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FHIRExportJob" (
    "id" TEXT NOT NULL,
    "caseId" TEXT,
    "patientId" TEXT,
    "externalSystemId" TEXT,
    "requestedById" TEXT NOT NULL,
    "organizationId" TEXT,
    "status" "InteroperabilityJobStatus" NOT NULL DEFAULT 'QUEUED',
    "resourceTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bundleType" TEXT,
    "payloadJson" JSONB,
    "validationErrors" JSONB,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FHIRExportJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FHIRImportJob" (
    "id" TEXT NOT NULL,
    "caseId" TEXT,
    "patientId" TEXT,
    "externalSystemId" TEXT,
    "requestedById" TEXT NOT NULL,
    "organizationId" TEXT,
    "status" "InteroperabilityJobStatus" NOT NULL DEFAULT 'QUEUED',
    "sourcePayload" JSONB NOT NULL,
    "importedResources" JSONB,
    "validationErrors" JSONB,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FHIRImportJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HL7Message" (
    "id" TEXT NOT NULL,
    "caseId" TEXT,
    "patientId" TEXT,
    "externalSystemId" TEXT,
    "messageType" "InteropHl7MessageType" NOT NULL,
    "direction" "InteroperabilityDirection" NOT NULL,
    "rawMessage" TEXT NOT NULL,
    "parsedSegments" JSONB,
    "status" "InteroperabilityJobStatus" NOT NULL DEFAULT 'COMPLETED',
    "validationErrors" JSONB,
    "ackMessage" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HL7Message_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InteroperabilityLog" (
    "id" TEXT NOT NULL,
    "externalSystemId" TEXT,
    "caseId" TEXT,
    "patientId" TEXT,
    "actorId" TEXT NOT NULL,
    "level" "InteroperabilityLogLevel" NOT NULL DEFAULT 'INFO',
    "operation" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "validationFailed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InteroperabilityLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FHIRAudit" (
    "id" TEXT NOT NULL,
    "externalSystemId" TEXT,
    "externalOrganizationId" TEXT,
    "organizationId" TEXT,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "caseId" TEXT,
    "patientId" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FHIRAudit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExternalOrganization_externalId_key" ON "ExternalOrganization"("externalId");
CREATE INDEX "ExternalOrganization_organizationId_idx" ON "ExternalOrganization"("organizationId");
CREATE INDEX "ExternalOrganization_name_idx" ON "ExternalOrganization"("name");
CREATE INDEX "ExternalOrganization_createdAt_idx" ON "ExternalOrganization"("createdAt");

CREATE INDEX "ExternalSystem_externalOrganizationId_idx" ON "ExternalSystem"("externalOrganizationId");
CREATE INDEX "ExternalSystem_organizationId_idx" ON "ExternalSystem"("organizationId");
CREATE INDEX "ExternalSystem_protocol_idx" ON "ExternalSystem"("protocol");
CREATE INDEX "ExternalSystem_status_idx" ON "ExternalSystem"("status");
CREATE INDEX "ExternalSystem_createdAt_idx" ON "ExternalSystem"("createdAt");

CREATE INDEX "FHIRExportJob_caseId_idx" ON "FHIRExportJob"("caseId");
CREATE INDEX "FHIRExportJob_patientId_idx" ON "FHIRExportJob"("patientId");
CREATE INDEX "FHIRExportJob_externalSystemId_idx" ON "FHIRExportJob"("externalSystemId");
CREATE INDEX "FHIRExportJob_requestedById_idx" ON "FHIRExportJob"("requestedById");
CREATE INDEX "FHIRExportJob_organizationId_idx" ON "FHIRExportJob"("organizationId");
CREATE INDEX "FHIRExportJob_status_idx" ON "FHIRExportJob"("status");
CREATE INDEX "FHIRExportJob_createdAt_idx" ON "FHIRExportJob"("createdAt");

CREATE INDEX "FHIRImportJob_caseId_idx" ON "FHIRImportJob"("caseId");
CREATE INDEX "FHIRImportJob_patientId_idx" ON "FHIRImportJob"("patientId");
CREATE INDEX "FHIRImportJob_externalSystemId_idx" ON "FHIRImportJob"("externalSystemId");
CREATE INDEX "FHIRImportJob_requestedById_idx" ON "FHIRImportJob"("requestedById");
CREATE INDEX "FHIRImportJob_organizationId_idx" ON "FHIRImportJob"("organizationId");
CREATE INDEX "FHIRImportJob_status_idx" ON "FHIRImportJob"("status");
CREATE INDEX "FHIRImportJob_createdAt_idx" ON "FHIRImportJob"("createdAt");

CREATE INDEX "HL7Message_caseId_idx" ON "HL7Message"("caseId");
CREATE INDEX "HL7Message_patientId_idx" ON "HL7Message"("patientId");
CREATE INDEX "HL7Message_externalSystemId_idx" ON "HL7Message"("externalSystemId");
CREATE INDEX "HL7Message_messageType_idx" ON "HL7Message"("messageType");
CREATE INDEX "HL7Message_direction_idx" ON "HL7Message"("direction");
CREATE INDEX "HL7Message_status_idx" ON "HL7Message"("status");
CREATE INDEX "HL7Message_createdAt_idx" ON "HL7Message"("createdAt");

CREATE INDEX "InteroperabilityLog_externalSystemId_idx" ON "InteroperabilityLog"("externalSystemId");
CREATE INDEX "InteroperabilityLog_caseId_idx" ON "InteroperabilityLog"("caseId");
CREATE INDEX "InteroperabilityLog_patientId_idx" ON "InteroperabilityLog"("patientId");
CREATE INDEX "InteroperabilityLog_actorId_idx" ON "InteroperabilityLog"("actorId");
CREATE INDEX "InteroperabilityLog_level_idx" ON "InteroperabilityLog"("level");
CREATE INDEX "InteroperabilityLog_operation_idx" ON "InteroperabilityLog"("operation");
CREATE INDEX "InteroperabilityLog_validationFailed_idx" ON "InteroperabilityLog"("validationFailed");
CREATE INDEX "InteroperabilityLog_createdAt_idx" ON "InteroperabilityLog"("createdAt");

CREATE INDEX "FHIRAudit_externalSystemId_idx" ON "FHIRAudit"("externalSystemId");
CREATE INDEX "FHIRAudit_externalOrganizationId_idx" ON "FHIRAudit"("externalOrganizationId");
CREATE INDEX "FHIRAudit_actorId_idx" ON "FHIRAudit"("actorId");
CREATE INDEX "FHIRAudit_action_idx" ON "FHIRAudit"("action");
CREATE INDEX "FHIRAudit_resourceType_idx" ON "FHIRAudit"("resourceType");
CREATE INDEX "FHIRAudit_caseId_idx" ON "FHIRAudit"("caseId");
CREATE INDEX "FHIRAudit_patientId_idx" ON "FHIRAudit"("patientId");
CREATE INDEX "FHIRAudit_organizationId_idx" ON "FHIRAudit"("organizationId");
CREATE INDEX "FHIRAudit_success_idx" ON "FHIRAudit"("success");
CREATE INDEX "FHIRAudit_createdAt_idx" ON "FHIRAudit"("createdAt");

ALTER TABLE "ExternalOrganization" ADD CONSTRAINT "ExternalOrganization_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExternalSystem" ADD CONSTRAINT "ExternalSystem_externalOrganizationId_fkey" FOREIGN KEY ("externalOrganizationId") REFERENCES "ExternalOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExternalSystem" ADD CONSTRAINT "ExternalSystem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FHIRExportJob" ADD CONSTRAINT "FHIRExportJob_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ECGCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FHIRExportJob" ADD CONSTRAINT "FHIRExportJob_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FHIRExportJob" ADD CONSTRAINT "FHIRExportJob_externalSystemId_fkey" FOREIGN KEY ("externalSystemId") REFERENCES "ExternalSystem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FHIRExportJob" ADD CONSTRAINT "FHIRExportJob_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FHIRExportJob" ADD CONSTRAINT "FHIRExportJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FHIRImportJob" ADD CONSTRAINT "FHIRImportJob_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ECGCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FHIRImportJob" ADD CONSTRAINT "FHIRImportJob_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FHIRImportJob" ADD CONSTRAINT "FHIRImportJob_externalSystemId_fkey" FOREIGN KEY ("externalSystemId") REFERENCES "ExternalSystem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FHIRImportJob" ADD CONSTRAINT "FHIRImportJob_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FHIRImportJob" ADD CONSTRAINT "FHIRImportJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HL7Message" ADD CONSTRAINT "HL7Message_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ECGCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HL7Message" ADD CONSTRAINT "HL7Message_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HL7Message" ADD CONSTRAINT "HL7Message_externalSystemId_fkey" FOREIGN KEY ("externalSystemId") REFERENCES "ExternalSystem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HL7Message" ADD CONSTRAINT "HL7Message_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InteroperabilityLog" ADD CONSTRAINT "InteroperabilityLog_externalSystemId_fkey" FOREIGN KEY ("externalSystemId") REFERENCES "ExternalSystem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InteroperabilityLog" ADD CONSTRAINT "InteroperabilityLog_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ECGCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InteroperabilityLog" ADD CONSTRAINT "InteroperabilityLog_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InteroperabilityLog" ADD CONSTRAINT "InteroperabilityLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FHIRAudit" ADD CONSTRAINT "FHIRAudit_externalSystemId_fkey" FOREIGN KEY ("externalSystemId") REFERENCES "ExternalSystem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FHIRAudit" ADD CONSTRAINT "FHIRAudit_externalOrganizationId_fkey" FOREIGN KEY ("externalOrganizationId") REFERENCES "ExternalOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FHIRAudit" ADD CONSTRAINT "FHIRAudit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FHIRAudit" ADD CONSTRAINT "FHIRAudit_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FHIRAudit" ADD CONSTRAINT "FHIRAudit_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ECGCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FHIRAudit" ADD CONSTRAINT "FHIRAudit_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
