import { prisma } from "../../config/prisma";
import { AppError } from "../../middleware/error";
import type { DigitizedLead, GridCalibration } from "../ecg-digitization/types";
import {
  createDefaultDiagnosticPipelineDependencies,
  type EcgDiagnosticPipelineDependencies,
} from "./dependencies";
import { runEcgDiagnosticPipelineAsync } from "./orchestrator";
import type { EcgDiagnosticCasePipelineInput, EcgDiagnosticCasePipelineResult } from "./types";

async function loadStoredCaseLeads(caseId: string): Promise<{ calibration: GridCalibration; leads: DigitizedLead[] } | null> {
  const file = await prisma.eCGFile.findFirst({ orderBy: { createdAt: "desc" }, where: { caseId } });
  if (!file) return null;
  const leads = await prisma.eCGLeadSignal.findMany({ orderBy: { leadName: "asc" }, where: { ecgFileId: file.id } });
  if (!leads.length) return null;
  const calibration: GridCalibration = {
    confidence: 0.5,
    gainMmPerMv: (leads[0]?.gain ?? 10) as 5 | 10 | 20,
    gridDetected: true,
    paperSpeedMmPerSec: (leads[0]?.paperSpeed ?? 25) as 25 | 50,
  };
  return {
    calibration,
    leads: leads.map((lead) => ({
      durationSeconds: lead.duration,
      lead: lead.leadName,
      samples: lead.signalData,
      samplingRate: lead.samplingRate,
    })),
  };
}

async function loadLatestCaseFile(caseId: string) {
  return prisma.eCGFile.findFirst({ orderBy: { createdAt: "desc" }, where: { caseId } });
}

/** Case-scoped pipeline: digitize (optional), analyze, persist, and optionally generate reports. */
export async function runEcgDiagnosticCasePipeline(
  input: EcgDiagnosticCasePipelineInput,
  deps: EcgDiagnosticPipelineDependencies = createDefaultDiagnosticPipelineDependencies(),
): Promise<EcgDiagnosticCasePipelineResult> {
  const options = input.options ?? {};
  const ecgCase = await prisma.eCGCase.findUnique({
    include: {
      patient: {
        select: {
          company: true,
          dateOfBirth: true,
          departmentName: true,
          firstName: true,
          gender: true,
          id: true,
          lastName: true,
          middleName: true,
          occupation: true,
          patientCode: true,
        },
      },
    },
    where: { id: input.caseId },
  });
  if (!ecgCase) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");

  let calibration: GridCalibration;
  let leads: DigitizedLead[];
  let qualityScore = 0.75;
  let digitizationQuality: EcgDiagnosticCasePipelineResult["digitizationQuality"];

  if (options.digitize !== false) {
    const file = await loadLatestCaseFile(input.caseId);
    if (!file) throw new AppError(404, "ECG file not found for case.", "ECG_FILE_NOT_FOUND");
    const digitized = await deps.runDigitizationPipeline(file);
    if (!digitized.leads.length) throw new AppError(422, "Digitization produced no leads.", "DIGITIZATION_FAILED");
    calibration = digitized.calibration;
    leads = digitized.leads;
    qualityScore = digitized.quality.score;
    digitizationQuality = digitized.quality;
  } else {
    const loaded = await loadStoredCaseLeads(input.caseId);
    if (!loaded) throw new AppError(404, "Digitized leads not found for case.", "LEADS_NOT_FOUND");
    calibration = loaded.calibration;
    leads = loaded.leads;
  }

  const pipeline = await runEcgDiagnosticPipelineAsync(
    {
      calibration,
      imageAvailable: true,
      leads,
      qualityScore,
    },
    deps,
    {
      ecgCase: {
        caseId: ecgCase.caseId,
        caseNumber: ecgCase.caseNumber,
        clinicalNotes: ecgCase.clinicalNotes,
        finalDiagnosis: ecgCase.finalDiagnosis,
      },
      patient: ecgCase.patient,
    },
  );

  let generatedReportId: string | undefined;
  let enterpriseReportId: string | undefined;

  if (options.persist !== false) {
    await deps.persistCaseMeasurement(input.caseId, leads, calibration);
    await deps.persistMeasurementEngineResult(input.caseId, pipeline.artifacts.measurementEngine);
    await deps.persistCaseInterpretation(
      input.caseId,
      input.actorId,
      pipeline.artifacts.interpretation,
      pipeline.artifacts.measurementLegacy,
    );
    await deps.persistAiDiagnosis(
      input.caseId,
      input.actorId,
      pipeline.artifacts.aiDiagnosis,
      pipeline.artifacts.measurementLegacy.heartRate,
    );
    await deps.persistMedicalIntelligenceReport(pipeline.artifacts.medicalIntelligence, {
      caseId: input.caseId,
      evaluatedById: input.actorId,
    });
  }

  if (options.generateAiReport) {
    const generated = await deps.generateAiReport({
      caseId: input.caseId,
      clinicalIndication: options.clinicalIndication,
      generatedById: input.actorId,
    });
    generatedReportId = generated.report.id;
  }

  if (options.generateEnterpriseReport) {
    const enterprise = await deps.generateEnterpriseReport({
      authorId: input.actorId,
      caseId: input.caseId,
    });
    enterpriseReportId = enterprise.report.id;
  }

  return {
    ...pipeline,
    caseId: input.caseId,
    digitizationQuality,
    enterpriseReportId,
    generatedReportId,
  };
}
