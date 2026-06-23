import { Router } from "express";
import { aiRouter } from "../ai/ai.routes";
import { authRouter } from "../auth/auth.routes";
import { casesRouter } from "../cases/cases.routes";
import { documentsRouter } from "./documents/documents.routes";
import { ecgProcessingRouter } from "./ecg-processing/ecg-processing.routes";
import { emrRouter } from "./emr/emr.routes";
import { enterpriseRouter } from "./enterprise/enterprise.routes";
import { notificationsRouter } from "../notifications/notifications.routes";
import { patientsRouter } from "../patients/patients.routes";
import { reportsRouter } from "./reports/reports.routes";
import { subscriptionsRouter } from "../subscriptions/subscriptions.routes";
import { uploadsRouter } from "../uploads/uploads.routes";
import { usersRouter } from "../users/users.routes";

export const modulesRouter = Router();

modulesRouter.get("/healthz", (_req, res) => {
  res.json({ ok: true, service: "ecg-insight-api" });
});

modulesRouter.use("/auth", authRouter);
modulesRouter.use("/ai", aiRouter);
modulesRouter.use("/cases", casesRouter);
modulesRouter.use("/documents", documentsRouter);
modulesRouter.use("/ecg", ecgProcessingRouter);
modulesRouter.use("/emr", emrRouter);
modulesRouter.use("/enterprise", enterpriseRouter);
modulesRouter.use("/notifications", notificationsRouter);
modulesRouter.use("/patients", patientsRouter);
modulesRouter.use("/reports", reportsRouter);
modulesRouter.use("/users", usersRouter);
modulesRouter.use("/subscriptions", subscriptionsRouter);
modulesRouter.use("/uploads", uploadsRouter);
