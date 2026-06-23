import { Router } from "express";
import { aiRouter } from "../ai/ai.routes";
import { authRouter } from "../auth/auth.routes";
import { casesRouter } from "../cases/cases.routes";
import {
  assistantRouter,
  clinicalAlertsRouter,
  populationAnalyticsRouter,
  riskRouter,
  trendsRouter,
} from "./clinical-intelligence/clinical-intelligence.routes";
import { auditRouter } from "./audit/audit.routes";
import { backupRouter } from "./backup/backup.routes";
import { complianceRouter } from "./compliance/compliance.routes";
import { documentsRouter } from "./documents/documents.routes";
import { ecgFilesRouter } from "./ecg-files/ecg-files.routes";
import { ecgProcessingRouter } from "./ecg-processing/ecg-processing.routes";
import { emrRouter } from "./emr/emr.routes";
import { enterpriseRouter } from "./enterprise/enterprise.routes";
import { fhirRouter, pacsRouter, telecardiologyRouter } from "./hospital-integration/hospital-integration.routes";
import { knowledgeRouter } from "./knowledge/knowledge.routes";
import { notificationsRouter } from "../notifications/notifications.routes";
import { ocrRouter } from "./ocr/ocr.routes";
import { patientsRouter } from "../patients/patients.routes";
import {
  fitnessAssessmentsRouter,
  occupationalRiskRouter,
  workRestrictionsRouter,
} from "./occupational/occupational.routes";
import { reportsRouter } from "./reports/reports.routes";
import { searchRouter } from "./search/search.routes";
import { securityRouter } from "./security/security.routes";
import { subscriptionsRouter } from "../subscriptions/subscriptions.routes";
import { uploadsRouter } from "../uploads/uploads.routes";
import { usersRouter } from "../users/users.routes";
import {
  contractorsRouter,
  departmentsRouter,
  employeesRouter,
  organizationsRouter,
} from "./workforce/workforce.routes";

export const modulesRouter = Router();

modulesRouter.get("/healthz", (_req, res) => {
  res.json({ ok: true, service: "ecg-insight-api" });
});

modulesRouter.use("/auth", authRouter);
modulesRouter.use("/audit", auditRouter);
modulesRouter.use("/assistant", assistantRouter);
modulesRouter.use("/ai", aiRouter);
modulesRouter.use("/alerts", clinicalAlertsRouter);
modulesRouter.use("/analytics", populationAnalyticsRouter);
modulesRouter.use("/backup", backupRouter);
modulesRouter.use("/cases", casesRouter);
modulesRouter.use("/compliance", complianceRouter);
modulesRouter.use("/documents", documentsRouter);
modulesRouter.use("/departments", departmentsRouter);
modulesRouter.use("/ecg", ecgProcessingRouter);
modulesRouter.use("/ecg", ecgFilesRouter);
modulesRouter.use("/employees", employeesRouter);
modulesRouter.use("/emr", emrRouter);
modulesRouter.use("/enterprise", enterpriseRouter);
modulesRouter.use("/fitness-assessments", fitnessAssessmentsRouter);
modulesRouter.use("/knowledge", knowledgeRouter);
modulesRouter.use("/notifications", notificationsRouter);
modulesRouter.use("/ocr", ocrRouter);
modulesRouter.use("/occupational-risk", occupationalRiskRouter);
modulesRouter.use("/organizations", organizationsRouter);
modulesRouter.use("/patients", patientsRouter);
modulesRouter.use("/pacs", pacsRouter);
modulesRouter.use("/fhir", fhirRouter);
modulesRouter.use("/reports", reportsRouter);
modulesRouter.use("/risk", riskRouter);
modulesRouter.use("/search", searchRouter);
modulesRouter.use("/security", securityRouter);
modulesRouter.use("/users", usersRouter);
modulesRouter.use("/subscriptions", subscriptionsRouter);
modulesRouter.use("/contractors", contractorsRouter);
modulesRouter.use("/uploads", uploadsRouter);
modulesRouter.use("/telecardiology", telecardiologyRouter);
modulesRouter.use("/trends", trendsRouter);
modulesRouter.use("/work-restrictions", workRestrictionsRouter);
