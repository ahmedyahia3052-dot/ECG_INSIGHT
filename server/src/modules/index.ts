import { Router } from "express";
import { apiDocsRouter } from "../api/docs";
import { aiRouter } from "../ai/ai.routes";
import { aiFoundationRouter } from "../ai-foundation/foundation.routes";
import { authRouter } from "../auth/auth.routes";
import { authAdminRouter } from "../auth/auth-admin.routes";
import { casesRouter } from "../cases/cases.routes";
import {
  assistantRouter,
  clinicalAlertsRouter,
  populationAnalyticsRouter,
  riskRouter,
  trendsRouter,
} from "./clinical-intelligence/clinical-intelligence.routes";
import { clinicalAlertsRiskEngineRouter } from "./clinical-alerts-risk-engine";
import { clinicalDecisionSupportRouter } from "./clinical-decision-support";
import { enterpriseEventsRouter } from "./enterprise-notification-engine";
import { clinicalKnowledgeEngineRouter } from "./clinical-knowledge-engine";
import { aiReportGeneratorRouter } from "./ai-report-generator";
import { cdssRouter } from "./clinical-intelligence/cdss.routes";
import { longitudinalEcgRouter } from "./clinical-intelligence/longitudinal-ecg.routes";
import { auditRouter } from "./audit/audit.routes";
import { backupRouter } from "./backup/backup.routes";
import { caseCollaborationRouter } from "./collaboration/case-collaboration.routes";
import { caseManagementEngineRouter } from "./case-management-engine";
import {
  ecgLongitudinalCasesRouter,
  ecgLongitudinalPatientsRouter,
} from "./ecg-longitudinal-timeline-engine";
import { alertsRouter, messagesRouter, syncRouter, tasksRouter, teamsRouter } from "./collaboration/collaboration.routes";
import { complianceRouter } from "./compliance/compliance.routes";
import { copilotRouter } from "./copilot/copilot.routes";
import { documentsRouter } from "./documents/documents.routes";
import { ecgFilesRouter } from "./ecg-files/ecg-files.routes";
import { ecgInterpretationEngineRouter } from "./ecg-interpretation-engine";
import { ecgBenchmarkRouter } from "./ecg-benchmark/ecg-benchmark.routes";
import { ecgProcessingEngineRouter } from "./ecg-processing-engine";
import { ecgProcessingRouter } from "./ecg-processing/ecg-processing.routes";
import { ecgDigitizationEngineRouter } from "./ecg-digitization-engine";
import { aiOrchestrationEngineRouter } from "./ai-orchestration-engine";
import { aiAnnotationOverlayEngineRouter } from "./ai-annotation-overlay-engine";
import { clinicalCaseManagementRouter } from "./clinical-case-management";
import { clinicalMeasurementEngineRouter } from "./clinical-measurement-engine";
import { ecgIngestionPipelineRouter } from "./ecg-ingestion-pipeline";
import { medicalReportEngineRouter } from "./medical-report-engine";
import { liveEcgRouter } from "./live-ecg/live-ecg.routes";
import { ecgViewerApiRouter } from "./ecg-viewer-api";
import { ecgStorageEngineRouter } from "./ecg-storage-engine";
import { ecgDiagnosticPipelineRouter } from "./ecg-diagnostic-pipeline";
import { examinationWorkflowRouter } from "./examination-workflow/examination-workflow.routes";
import { emrRouter } from "./emr/emr.routes";
import { enterpriseRulesEngineRouter } from "./enterprise-rules-engine";
import { interoperabilityEngineRouter } from "./fhir-hl7-interoperability-engine";
import { enterpriseReportEngineRouter } from "./enterprise-report-engine";
import { enterpriseRouter } from "./enterprise/enterprise.routes";
import { fhirRouter, pacsRouter, telecardiologyRouter } from "./hospital-integration/hospital-integration.routes";
import { healthRouter } from "./health/health.routes";
import { knowledgeRouter } from "./knowledge/knowledge.routes";
import { medicalIntelligenceRouter } from "./medical-intelligence/medical-intelligence.routes";
import { micRouter } from "./medical-intelligence-core/mic.routes";
import { organizationPlatformRouter } from "./organization-platform";
import { organizationDomainRouter } from "./organization-domain";
import { notificationsRouter } from "../notifications/notifications.routes";
import { ocrRouter } from "./ocr/ocr.routes";
import { patientsRouter } from "../patients/patients.routes";
import { visitsRouter, patientVisitsRouter } from "../visits/visits.routes";
import { preferencesRouter } from "./preferences/preferences.routes";
import {
  fitnessAssessmentsRouter,
  occupationalRiskRouter,
  workRestrictionsRouter,
} from "./occupational/occupational.routes";
import { reportsRouter } from "./reports/reports.routes";
import { releaseCandidateRouter } from "./release-candidate/release-candidate.routes";
import { searchRouter } from "./search/search.routes";
import { securityRouter } from "./security/security.routes";
import { subscriptionsRouter } from "../subscriptions/subscriptions.routes";
import { superAdminRouter } from "./super-admin/super-admin.routes";
import { supportRouter } from "./support/support.routes";
import { uploadsRouter } from "../uploads/uploads.routes";
import { usersRouter } from "../users/users.routes";
import {
  companiesRouter,
  contractorsRouter,
  departmentsRouter,
  employeesRouter,
  organizationsRouter,
} from "./workforce/workforce.routes";

export const modulesRouter = Router();

modulesRouter.get("/healthz", (_req, res) => {
  res.json({ ok: true, service: "ecg-insight-api" });
});

modulesRouter.use(apiDocsRouter);

modulesRouter.use("/health", healthRouter);
modulesRouter.use("/auth", authRouter);
modulesRouter.use("/admin", authAdminRouter);
modulesRouter.use("/audit", auditRouter);
modulesRouter.use("/assistant", assistantRouter);
modulesRouter.use("/ai", aiRouter);
modulesRouter.use("/ai-foundation", aiFoundationRouter);
modulesRouter.use("/alerts", alertsRouter);
modulesRouter.use("/clinical-alerts", clinicalAlertsRouter);
modulesRouter.use("/clinical-alerts-risk-engine", clinicalAlertsRiskEngineRouter);
modulesRouter.use("/clinical-decision-support", clinicalDecisionSupportRouter);
modulesRouter.use("/events", enterpriseEventsRouter);
modulesRouter.use("/clinical-knowledge-engine", clinicalKnowledgeEngineRouter);
modulesRouter.use("/ai-report-generator", aiReportGeneratorRouter);
modulesRouter.use("/cdss", cdssRouter);
modulesRouter.use("/longitudinal-ecg", longitudinalEcgRouter);
modulesRouter.use("/companies", companiesRouter);
modulesRouter.use("/analytics", populationAnalyticsRouter);
modulesRouter.use("/backup", backupRouter);
modulesRouter.use("/cases", casesRouter);
modulesRouter.use("/cases", ecgLongitudinalCasesRouter);
modulesRouter.use("/cases", caseManagementEngineRouter);
modulesRouter.use("/cases", examinationWorkflowRouter);
modulesRouter.use("/case-collaboration", caseCollaborationRouter);
modulesRouter.use("/tasks", tasksRouter);
modulesRouter.use("/messages", messagesRouter);
modulesRouter.use("/teams", teamsRouter);
modulesRouter.use("/sync", syncRouter);
modulesRouter.use("/compliance", complianceRouter);
modulesRouter.use("/copilot", copilotRouter);
modulesRouter.use("/documents", documentsRouter);
modulesRouter.use("/departments", departmentsRouter);
modulesRouter.use("/ecg", ecgInterpretationEngineRouter);
modulesRouter.use("/ecg", ecgProcessingRouter);
modulesRouter.use("/live-ecg", liveEcgRouter);
modulesRouter.use("/ecg-processing-engine", ecgProcessingEngineRouter);
modulesRouter.use("/ecg-digitization-engine", ecgDigitizationEngineRouter);
modulesRouter.use("/ai-orchestration-engine", aiOrchestrationEngineRouter);
modulesRouter.use("/ai-annotation-overlay-engine", aiAnnotationOverlayEngineRouter);
modulesRouter.use("/clinical-case-management", clinicalCaseManagementRouter);
modulesRouter.use("/clinical-measurement-engine", clinicalMeasurementEngineRouter);
modulesRouter.use("/ecg-ingestion-pipeline", ecgIngestionPipelineRouter);
modulesRouter.use("/medical-report-engine", medicalReportEngineRouter);
modulesRouter.use("/ecg-storage", ecgStorageEngineRouter);
modulesRouter.use("/ecg-viewer", ecgViewerApiRouter);
modulesRouter.use("/ecg/diagnostic-pipeline", ecgDiagnosticPipelineRouter);
modulesRouter.use("/ecg/benchmark", ecgBenchmarkRouter);
modulesRouter.use("/ecg", ecgFilesRouter);
modulesRouter.use("/employees", employeesRouter);
modulesRouter.use("/emr", emrRouter);
modulesRouter.use("/interop", interoperabilityEngineRouter);
modulesRouter.use("/enterprise-report-engine", enterpriseReportEngineRouter);
modulesRouter.use("/enterprise-rules-engine", enterpriseRulesEngineRouter);
modulesRouter.use("/enterprise", enterpriseRouter);
modulesRouter.use("/fitness-assessments", fitnessAssessmentsRouter);
modulesRouter.use("/knowledge", knowledgeRouter);
modulesRouter.use("/medical-intelligence", medicalIntelligenceRouter);
modulesRouter.use("/mic", micRouter);
modulesRouter.use("/notifications", notificationsRouter);
modulesRouter.use("/ocr", ocrRouter);
modulesRouter.use("/occupational-risk", occupationalRiskRouter);
modulesRouter.use("/organization-platform", organizationPlatformRouter);
modulesRouter.use("/organization-domain", organizationDomainRouter);
modulesRouter.use("/organizations", organizationsRouter);
modulesRouter.use("/patients", ecgLongitudinalPatientsRouter);
modulesRouter.use("/patients/:patientId/visits", patientVisitsRouter);
modulesRouter.use("/patients", patientsRouter);
modulesRouter.use("/visits", visitsRouter);
modulesRouter.use("/preferences", preferencesRouter);
modulesRouter.use("/pacs", pacsRouter);
modulesRouter.use("/fhir", fhirRouter);
modulesRouter.use("/reports", reportsRouter);
modulesRouter.use("/release-candidate", releaseCandidateRouter);
modulesRouter.use("/risk", riskRouter);
modulesRouter.use("/search", searchRouter);
modulesRouter.use("/security", securityRouter);
modulesRouter.use("/users", usersRouter);
modulesRouter.use("/subscriptions", subscriptionsRouter);
modulesRouter.use("/super-admin", superAdminRouter);
modulesRouter.use("/support", supportRouter);
modulesRouter.use("/contractors", contractorsRouter);
modulesRouter.use("/uploads", uploadsRouter);
modulesRouter.use("/telecardiology", telecardiologyRouter);
modulesRouter.use("/trends", trendsRouter);
modulesRouter.use("/work-restrictions", workRestrictionsRouter);
