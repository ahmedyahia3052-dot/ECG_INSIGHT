import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middleware/error";
import { assertResourceAccess, canAccessCase } from "../../utils/resource-access";
import { loadEcgViewerWorkspace, persistEcgViewerWorkspace, buildMeasurementWorkspacePdf } from "../../cases/ecg-viewer-workspace.service";
import { generateClinicalReport, regenerateClinicalReport } from "../ai-report-generator/ai-report-generator.service";
import {
  exportDigitalEcg,
  getDigitalEcg,
  latestFileForCase,
} from "../ecg-processing/ecg-digitization.service";
import { latestMeasurement, serializeMeasurement } from "../ecg-processing/ecg-processing.service";
import { measureCaseFromStoredLeads } from "../ecg-measurement";
import {
  DEFAULT_OVERLAY_CONFIG,
  DEFAULT_ZOOM_PRESETS,
  ECG_VIEWER_API_ID,
  ECG_VIEWER_API_VERSION,
} from "./types";
import type {
  EcgViewerAnnotationDto,
  EcgViewerBundleDto,
  EcgViewerComparisonDto,
  EcgViewerImageDto,
  EcgViewerLeadDto,
  EcgViewerMetadataDto,
  EcgViewerOverlayConfig,
  EcgViewerWaveformDto,
} from "./types";
import { ecgViewerRepository } from "./repository";
import {
  generateViewerAiOverlay,
  getViewerAiOverlay,
  renderViewerAiOverlay,
  toggleViewerAiOverlay,
} from "../ai-annotation-overlay-engine";

type AuthContext = { id: string; role: string };

export function getEcgViewerApiStatus() {
  return {
    apiId: ECG_VIEWER_API_ID,
    version: ECG_VIEWER_API_VERSION,
    zoomPresets: DEFAULT_ZOOM_PRESETS,
  };
}

async function assertCaseAccess(caseId: string, auth: AuthContext) {
  const ecgCase = await prisma.eCGCase.findUnique({ where: { id: caseId } });
  if (!ecgCase) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
  assertResourceAccess(await canAccessCase(caseId, auth as never));
  return ecgCase;
}

function fileDownloadUrl(fileId: string) {
  return `/api/ecg/files/${fileId}/download`;
}

function processedImageUrl(file: { id: string; metadataJson: unknown }) {
  const metadata = file.metadataJson && typeof file.metadataJson === "object"
    ? file.metadataJson as Record<string, unknown>
    : {};
  const digitization = metadata["digitization"] && typeof metadata["digitization"] === "object"
    ? metadata["digitization"] as Record<string, unknown>
    : {};
  const hasProcessed = Boolean(metadata["enhancedImagePath"] || digitization["enhancedImagePath"] || digitization["processedImagePath"]);
  return hasProcessed ? `/api/ecg/files/${file.id}/processed-image` : fileDownloadUrl(file.id);
}

async function resolveLatestFile(caseId: string) {
  try {
    return await latestFileForCase(caseId);
  } catch {
    return null;
  }
}

export async function getViewerImage(caseId: string, auth: AuthContext): Promise<EcgViewerImageDto | null> {
  await assertCaseAccess(caseId, auth);
  const file = await resolveLatestFile(caseId);
  if (!file || file.deletedAt) return null;
  return {
    caseId,
    checksum: file.checksum,
    downloadUrl: fileDownloadUrl(file.id),
    ecgFileId: file.id,
    mimeType: file.mimeType,
    originalName: file.originalName,
    processedImageUrl: processedImageUrl(file),
    sizeBytes: file.sizeBytes,
  };
}

export async function getViewerMetadata(caseId: string, auth: AuthContext): Promise<EcgViewerMetadataDto | null> {
  await assertCaseAccess(caseId, auth);
  const file = await resolveLatestFile(caseId);
  if (!file) return null;

  let digital;
  try {
    digital = await getDigitalEcg(caseId);
  } catch {
    digital = null;
  }

  const metadata = file.metadataJson && typeof file.metadataJson === "object"
    ? file.metadataJson as Record<string, unknown>
    : {};
  const digitization = metadata["digitization"] && typeof metadata["digitization"] === "object"
    ? metadata["digitization"] as Record<string, unknown>
    : null;

  return {
    acquisitionDate: file.acquisitionDate?.toISOString() ?? null,
    caseId,
    deviceModel: file.deviceModel,
    digitization,
    durationSeconds: digital?.durationSeconds ?? file.duration ?? null,
    ecgFileId: file.id,
    fileType: file.fileType,
    manufacturer: file.manufacturer,
    numberOfLeads: file.numberOfLeads ?? digital?.leads.length ?? null,
    ocrMetadata: digital?.ocrMetadata ? digital.ocrMetadata as Record<string, unknown> : null,
    quality: digital?.quality ?? null,
    samplingRate: file.samplingRate ?? digital?.leads[0]?.samplingRate ?? null,
  };
}

export async function getViewerMeasurements(caseId: string, auth: AuthContext) {
  await assertCaseAccess(caseId, auth);
  const [dbMeasurement, clinical, workspace] = await Promise.all([
    latestMeasurement(caseId),
    measureCaseFromStoredLeads(caseId).catch(() => null),
    loadEcgViewerWorkspace(caseId),
  ]);

  const digitalMeasurements = await getDigitalEcg(caseId)
    .then((digital) => digital.measurements as unknown as Record<string, unknown>)
    .catch(() => null);

  return {
    caseId,
    clinicalMeasurements: clinical,
    databaseMeasurement: dbMeasurement ? serializeMeasurement(dbMeasurement) : null,
    digitalMeasurements,
    workspaceMeasurements: workspace,
  };
}

export async function saveViewerMeasurements(
  caseId: string,
  auth: AuthContext,
  measurements: Array<{ lead?: string; name: string; unit: string; value: number }>,
) {
  await assertCaseAccess(caseId, auth);
  const existing = (await loadEcgViewerWorkspace(caseId)) as Record<string, unknown> | null;
  const workspace = {
    ...(existing ?? {}),
    caliperMeasurements: measurements,
    updatedAt: new Date().toISOString(),
  };
  await persistEcgViewerWorkspace(caseId, auth.id, workspace as Prisma.InputJsonValue);
  return { caseId, saved: true, measurementCount: measurements.length };
}

export async function getViewerLeads(caseId: string, auth: AuthContext): Promise<EcgViewerLeadDto[]> {
  await assertCaseAccess(caseId, auth);
  const file = await resolveLatestFile(caseId);
  if (!file) return [];

  const leads = await prisma.eCGLeadSignal.findMany({
    orderBy: { leadName: "asc" },
    where: { ecgFileId: file.id },
  });

  return leads.map((lead) => ({
    durationSeconds: lead.duration,
    gain: lead.gain,
    leadName: lead.leadName,
    metadata: lead.metadataJson && typeof lead.metadataJson === "object"
      ? lead.metadataJson as Record<string, unknown>
      : null,
    paperSpeed: lead.paperSpeed,
    sampleCount: lead.signalData.length,
    samplingRate: lead.samplingRate,
  }));
}

export async function getViewerWaveform(
  caseId: string,
  auth: AuthContext,
  options?: { lead?: string; maxSeconds?: number },
): Promise<EcgViewerWaveformDto | EcgViewerWaveformDto[]> {
  await assertCaseAccess(caseId, auth);
  const file = await resolveLatestFile(caseId);
  if (!file) throw new AppError(404, "No ECG file found for waveform.", "WAVEFORM_NOT_FOUND");

  const leads = await prisma.eCGLeadSignal.findMany({
    orderBy: { leadName: "asc" },
    where: {
      ecgFileId: file.id,
      ...(options?.lead ? { leadName: options.lead } : {}),
    },
  });

  if (!leads.length) {
    const digital = await getDigitalEcg(caseId);
    if (!options?.lead) {
      return digital.leads.map((lead) => ({
        caseId,
        durationSeconds: lead.durationSeconds,
        ecgFileId: file.id,
        lead: lead.lead,
        samples: lead.samples,
        samplingRate: lead.samplingRate,
      }));
    }
    const match = digital.leads.find((lead) => lead.lead === options.lead);
    if (!match) throw new AppError(404, "Lead not found.", "LEAD_NOT_FOUND");
    return {
      caseId,
      durationSeconds: match.durationSeconds,
      ecgFileId: file.id,
      lead: match.lead,
      samples: match.samples,
      samplingRate: match.samplingRate,
    };
  }

  const mapLead = (lead: (typeof leads)[number]): EcgViewerWaveformDto => {
    const maxSamples = options?.maxSeconds
      ? Math.min(lead.signalData.length, lead.samplingRate * options.maxSeconds)
      : lead.signalData.length;
    return {
      caseId,
      durationSeconds: lead.duration,
      ecgFileId: file.id,
      lead: lead.leadName,
      samples: lead.signalData.slice(0, maxSamples),
      samplingRate: lead.samplingRate,
    };
  };

  if (options?.lead) return mapLead(leads[0]!);
  return leads.map(mapLead);
}

function mapAiAnnotations(caseId: string, fileId: string): Promise<EcgViewerAnnotationDto[]> {
  return prisma.eCGAnnotation.findMany({ where: { ecgFileId: fileId } }).then((rows) =>
    rows.map((row) => ({
      createdAt: row.createdAt.toISOString(),
      endMs: row.endIndex,
      id: row.id,
      lead: row.leadName,
      peakMs: row.peakIndex,
      source: "ai" as const,
      startMs: row.startIndex,
      type: row.annotationType,
    })),
  );
}

export async function getViewerAnnotations(caseId: string, auth: AuthContext) {
  await assertCaseAccess(caseId, auth);
  const file = await resolveLatestFile(caseId);
  const [aiAnnotations, physicianAnnotations, digital] = await Promise.all([
    file ? mapAiAnnotations(caseId, file.id) : Promise.resolve([]),
    ecgViewerRepository.listPhysicianAnnotations(caseId),
    getDigitalEcg(caseId).catch(() => null),
  ]);

  const pipelineAnnotations: EcgViewerAnnotationDto[] = (digital?.annotations ?? []).map((item, index) => ({
    endMs: item.endMs,
    id: `pipeline-${index}`,
    label: item.label,
    lead: item.lead,
    peakMs: item.peakMs,
    source: "ai" as const,
    startMs: item.startMs,
    type: item.type,
  }));

  const physician: EcgViewerAnnotationDto[] = physicianAnnotations.map((row) => ({
    authorId: row.authorId,
    createdAt: row.createdAt.toISOString(),
    geometry: row.geometry as Record<string, unknown>,
    id: row.id,
    label: row.label ?? undefined,
    lead: row.lead,
    source: "physician" as const,
    type: row.type,
    visible: row.visible,
  }));

  return {
    ai: [...aiAnnotations, ...pipelineAnnotations],
    caseId,
    physician,
  };
}

export async function createPhysicianAnnotation(
  caseId: string,
  auth: AuthContext,
  input: {
    color?: string;
    ecgFileId?: string;
    geometry: Record<string, unknown>;
    label?: string;
    lead: string;
    metadata?: Record<string, unknown>;
    type: string;
    visible?: boolean;
  },
) {
  await assertCaseAccess(caseId, auth);
  const file = input.ecgFileId ? null : await resolveLatestFile(caseId);
  const annotation = await ecgViewerRepository.createPhysicianAnnotation({
    authorId: auth.id,
    caseId,
    color: input.color,
    ecgFileId: input.ecgFileId ?? file?.id,
    geometry: input.geometry as Prisma.InputJsonValue,
    label: input.label,
    lead: input.lead,
    metadata: input.metadata as Prisma.InputJsonValue | undefined,
    type: input.type,
    visible: input.visible,
  });
  return annotation;
}

export async function updatePhysicianAnnotation(
  caseId: string,
  annotationId: string,
  auth: AuthContext,
  input: Partial<{
    color: string;
    geometry: Record<string, unknown>;
    label: string;
    lead: string;
    metadata: Record<string, unknown>;
    type: string;
    visible: boolean;
  }>,
) {
  await assertCaseAccess(caseId, auth);
  const existing = await ecgViewerRepository.findPhysicianAnnotation(annotationId, caseId);
  if (!existing) throw new AppError(404, "Physician annotation not found.", "ANNOTATION_NOT_FOUND");
  if (existing.authorId !== auth.id && auth.role !== "ADMIN" && auth.role !== "SUPER_ADMIN") {
    throw new AppError(403, "Cannot edit another clinician's annotation.", "FORBIDDEN");
  }
  return ecgViewerRepository.updatePhysicianAnnotation(annotationId, {
    color: input.color,
    geometry: input.geometry as Prisma.InputJsonValue | undefined,
    label: input.label,
    lead: input.lead,
    metadata: input.metadata as Prisma.InputJsonValue | undefined,
    type: input.type,
    visible: input.visible,
  });
}

export async function deletePhysicianAnnotation(caseId: string, annotationId: string, auth: AuthContext) {
  await assertCaseAccess(caseId, auth);
  const existing = await ecgViewerRepository.findPhysicianAnnotation(annotationId, caseId);
  if (!existing) throw new AppError(404, "Physician annotation not found.", "ANNOTATION_NOT_FOUND");
  if (existing.authorId !== auth.id && auth.role !== "ADMIN" && auth.role !== "SUPER_ADMIN") {
    throw new AppError(403, "Cannot delete another clinician's annotation.", "FORBIDDEN");
  }
  await ecgViewerRepository.deletePhysicianAnnotation(annotationId);
  return { deleted: true, id: annotationId };
}

export async function getZoomPresets() {
  return { presets: DEFAULT_ZOOM_PRESETS, version: ECG_VIEWER_API_VERSION };
}

export async function getViewerPreferences(userId: string) {
  const pref = await ecgViewerRepository.getPreference(userId);
  if (!pref) {
    return {
      defaultZoom: 1,
      gainMmPerMv: 10,
      layoutJson: null,
      overlayDefaults: null,
      paperSpeedMmSec: 25,
      zoomPresets: [...DEFAULT_ZOOM_PRESETS],
    };
  }
  return {
    defaultZoom: pref.defaultZoom,
    gainMmPerMv: pref.gainMmPerMv,
    layoutJson: pref.layoutJson,
    overlayDefaults: pref.overlayDefaults,
    paperSpeedMmSec: pref.paperSpeedMmSec,
    zoomPresets: Array.isArray(pref.zoomPresets) ? pref.zoomPresets : [...DEFAULT_ZOOM_PRESETS],
  };
}

export async function saveViewerPreferences(userId: string, input: Prisma.EcgViewerPreferenceUpdateInput) {
  const pref = await ecgViewerRepository.upsertPreference(userId, input);
  return {
    defaultZoom: pref.defaultZoom,
    gainMmPerMv: pref.gainMmPerMv,
    layoutJson: pref.layoutJson,
    overlayDefaults: pref.overlayDefaults,
    paperSpeedMmSec: pref.paperSpeedMmSec,
    zoomPresets: pref.zoomPresets,
  };
}

export async function getOverlayConfig(caseId: string, auth: AuthContext): Promise<EcgViewerOverlayConfig> {
  await assertCaseAccess(caseId, auth);
  const overlay = await ecgViewerRepository.getOverlay(caseId);
  if (!overlay?.config || typeof overlay.config !== "object") return DEFAULT_OVERLAY_CONFIG;
  return { ...DEFAULT_OVERLAY_CONFIG, ...(overlay.config as unknown as EcgViewerOverlayConfig) };
}

export async function saveOverlayConfig(
  caseId: string,
  auth: AuthContext,
  config: EcgViewerOverlayConfig,
) {
  await assertCaseAccess(caseId, auth);
  const saved = await ecgViewerRepository.upsertOverlay(caseId, auth.id, config as unknown as Prisma.InputJsonValue);
  return { caseId, config: saved.config };
}

function measurementNumbers(source: Record<string, unknown> | null) {
  if (!source) return {};
  const keys = ["heartRate", "heartRateBpm", "prIntervalMs", "qrsDurationMs", "qtIntervalMs", "qtcBazettMs", "rrIntervalMs", "stDeviationMm"];
  const out: Record<string, number> = {};
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number") out[key] = value;
  }
  return out;
}

export async function compareViewerCases(
  caseId: string,
  auth: AuthContext,
  baselineCaseId?: string,
): Promise<EcgViewerComparisonDto> {
  await assertCaseAccess(caseId, auth);
  const currentDigital = await getDigitalEcg(caseId).catch(() => null);
  const current = measurementNumbers(currentDigital?.measurements as Record<string, unknown> ?? null);

  let baseline: Record<string, number> = {};
  if (baselineCaseId) {
    await assertCaseAccess(baselineCaseId, auth);
    const baselineDigital = await getDigitalEcg(baselineCaseId).catch(() => null);
    baseline = measurementNumbers(baselineDigital?.measurements as Record<string, unknown> ?? null);
  }

  const keys = new Set([...Object.keys(current), ...Object.keys(baseline)]);
  const deltas: Record<string, number> = {};
  const trendDirection: Record<string, "up" | "down" | "stable"> = {};
  for (const key of keys) {
    const delta = Number(((current[key] ?? 0) - (baseline[key] ?? 0)).toFixed(3));
    deltas[key] = delta;
    trendDirection[key] = Math.abs(delta) < 0.01 ? "stable" : delta > 0 ? "up" : "down";
  }

  return { baseline, baselineCaseId, caseId, current, deltas, trendDirection };
}

export async function generateViewerReport(
  caseId: string,
  auth: AuthContext,
  input?: { clinicalIndication?: string; regenerate?: boolean },
) {
  await assertCaseAccess(caseId, auth);
  if (input?.regenerate) {
    const latest = await prisma.clinicalGeneratedReport.findFirst({
      orderBy: { createdAt: "desc" },
      where: { caseId },
    });
    if (latest) {
      return regenerateClinicalReport(latest.id, auth.id, input.clinicalIndication);
    }
  }
  return generateClinicalReport({
    caseId,
    clinicalIndication: input?.clinicalIndication,
    generatedById: auth.id,
  });
}

export async function exportViewerCase(
  caseId: string,
  auth: AuthContext,
  format: "pdf" | "json" | "csv" | "png" | "svg" | "binary",
  options?: { includeAnnotations?: boolean; includeMeasurements?: boolean },
) {
  await assertCaseAccess(caseId, auth);

  if (format === "pdf" && options?.includeMeasurements) {
    const workspace = await loadEcgViewerWorkspace(caseId);
    const measurements = Array.isArray((workspace as Record<string, unknown> | null)?.caliperMeasurements)
      ? (workspace as { caliperMeasurements: Array<{ lead?: string; name: string; unit: string; value: number }> }).caliperMeasurements
      : [];
    const ecgCase = await prisma.eCGCase.findUnique({
      include: { patient: true },
      where: { id: caseId },
    });
    const pdf = buildMeasurementWorkspacePdf({
      caseNumber: ecgCase?.caseNumber ?? undefined,
      doctorName: auth.id,
      measurements,
      patientName: ecgCase?.patient ? `${ecgCase.patient.firstName} ${ecgCase.patient.lastName}` : undefined,
    });
    return { contentType: "application/pdf", data: pdf, format: "pdf" };
  }

  const digital = await getDigitalEcg(caseId);
  const exported = exportDigitalEcg(digital, format);
  return {
    annotations: options?.includeAnnotations ? await getViewerAnnotations(caseId, auth) : undefined,
    exported,
    format,
  };
}

export async function getViewerBundle(caseId: string, auth: AuthContext): Promise<EcgViewerBundleDto> {
  await assertCaseAccess(caseId, auth);
  const [image, metadata, measurements, leads, annotations, overlay, aiOverlay] = await Promise.all([
    getViewerImage(caseId, auth),
    getViewerMetadata(caseId, auth),
    getViewerMeasurements(caseId, auth),
    getViewerLeads(caseId, auth),
    getViewerAnnotations(caseId, auth),
    getOverlayConfig(caseId, auth),
    getViewerAiOverlay(caseId, auth).catch(() => null),
  ]);

  const [pendingJobs, completedJobs] = await Promise.all([
    prisma.aiOrchestrationJob.count({ where: { caseId, status: { in: ["QUEUED", "PROCESSING", "RETRY_SCHEDULED"] } } }),
    prisma.aiOrchestrationJob.count({ where: { caseId, status: "COMPLETED" } }),
  ]);

  return {
    aiJobStatus: { completed: completedJobs, pending: pendingJobs },
    aiOverlay: aiOverlay ?? null,
    annotations: [...annotations.ai, ...annotations.physician],
    caseId,
    image,
    leads,
    measurements: measurements as unknown as Record<string, unknown>,
    metadata,
    overlay,
    version: ECG_VIEWER_API_VERSION,
  };
}

export { getViewerAiOverlay, generateViewerAiOverlay, renderViewerAiOverlay, toggleViewerAiOverlay };
