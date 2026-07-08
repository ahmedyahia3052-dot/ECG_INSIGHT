-- Sprint 70 — composite indexes for hot query paths

CREATE INDEX "ECGMeasurement_caseId_createdAt_idx" ON "ECGMeasurement"("caseId", "createdAt");
CREATE INDEX "AIAnalysis_caseId_createdAt_idx" ON "AIAnalysis"("caseId", "createdAt");
CREATE INDEX "ECGFile_caseId_createdAt_idx" ON "ECGFile"("caseId", "createdAt");
CREATE INDEX "ECGClinicalAlert_caseId_sourceEngine_status_idx" ON "ECGClinicalAlert"("caseId", "sourceEngine", "status");
CREATE INDEX "ECGRiskAssessment_caseId_versionNumber_idx" ON "ECGRiskAssessment"("caseId", "versionNumber");
CREATE INDEX "AuditLog_caseId_createdAt_idx" ON "AuditLog"("caseId", "createdAt");
