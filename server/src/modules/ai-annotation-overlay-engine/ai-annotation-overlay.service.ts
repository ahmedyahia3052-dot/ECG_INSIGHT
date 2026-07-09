import { prisma } from "../../config/prisma";
import { AppError } from "../../middleware/error";
import { assertResourceAccess, canAccessCase } from "../../utils/resource-access";
import { latestFileForCase } from "../ecg-processing/ecg-digitization.service";
import { latestMeasurement } from "../ecg-processing/ecg-processing.service";
import type { AiOverlayWorkspaceDto } from "../ai-overlay/ai-overlay.contracts";
import type { AiOverlayExportBundleDto, AiOverlayLayerConfigDto, PersistedAiOverlayWorkspaceDto } from "./dto";
import { DEFAULT_AI_OVERLAY_LAYER_CONFIG, DEFAULT_AI_OVERLAY_SETTINGS, emptyWorkspace } from "./dto";
import { renderMultiLayerOverlay } from "./layer-renderer";
import { buildMeasurementOverlayAnnotations, buildPhysicianNoteAnnotation, mapDatabaseAnnotationsToOverlay, mergeOverlayAnnotations } from "./overlay-builder";
import { createOverlayVersion, findOverlayVersion, findOverlayWorkspace, listOverlayVersions, toPersistedOverlayDto, upsertOverlayWorkspace } from "./repository";
import { AI_ANNOTATION_OVERLAY_ENGINE_VERSION, AI_OVERLAY_EXPORT_FORMAT } from "./types";
import { validateLayerConfig, validateOverlayWorkspace, validatePhysicianNote } from "./validators";

type AuthContext = { id: string; role: string };

export function getAiAnnotationOverlayEngineHealth() {
  return { engineVersion: AI_ANNOTATION_OVERLAY_ENGINE_VERSION, exportFormat: AI_OVERLAY_EXPORT_FORMAT, status: "ready" };
}

async function assertCaseAccess(caseId: string, auth: AuthContext) {
  const ecgCase = await prisma.eCGCase.findUnique({ where: { id: caseId } });
  if (!ecgCase) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
  assertResourceAccess(await canAccessCase(caseId, auth as never));
  return ecgCase;
}

export async function getAiOverlayWorkspace(caseId: string, auth: AuthContext): Promise<PersistedAiOverlayWorkspaceDto> {
  await assertCaseAccess(caseId, auth);
  const existing = await findOverlayWorkspace(caseId);
  if (!existing) return { caseId, enabled: true, layerConfig: DEFAULT_AI_OVERLAY_LAYER_CONFIG, updatedAt: new Date().toISOString(), updatedById: auth.id, version: 0, workspace: emptyWorkspace() };
  return toPersistedOverlayDto(existing);
}

export async function saveAiOverlayWorkspace(caseId: string, auth: AuthContext, input: { layerConfig?: AiOverlayLayerConfigDto; workspace: AiOverlayWorkspaceDto }) {
  await assertCaseAccess(caseId, auth);
  if (!validateOverlayWorkspace(input.workspace).valid) throw new AppError(400, "Invalid overlay workspace.", "OVERLAY_WORKSPACE_INVALID");
  const layerConfig = input.layerConfig ?? DEFAULT_AI_OVERLAY_LAYER_CONFIG;
  const saved = await upsertOverlayWorkspace({ authorId: auth.id, caseId, layerConfig, workspace: input.workspace });
  await createOverlayVersion({ authorId: auth.id, caseId, layerConfig, snapshot: input.workspace, versionNumber: saved.version, workspaceId: saved.id });
  return toPersistedOverlayDto(saved);
}

export async function generateAiOverlayWorkspace(caseId: string, auth: AuthContext, input?: { imageHeight?: number; imageWidth?: number }) {
  const ecgCase = await assertCaseAccess(caseId, auth);
  const measurement = await latestMeasurement(caseId).catch(() => null) as Record<string, unknown> | null;
  const generated = buildMeasurementOverlayAnnotations({
    createdBy: auth.id, ecgCase, imageHeight: input?.imageHeight ?? 1200, imageWidth: input?.imageWidth ?? 1600,
    measurement: { heartRate: ecgCase.heartRate ?? undefined, prInterval: ecgCase.prInterval ?? undefined, qrsDuration: ecgCase.qrsDuration ?? undefined, qtInterval: ecgCase.qtInterval ?? undefined, qtcInterval: ecgCase.qtcInterval ?? undefined },
  });
  const file = await latestFileForCase(caseId).catch(() => null);
  const mapped = file ? mapDatabaseAnnotationsToOverlay({ annotations: await prisma.eCGAnnotation.findMany({ where: { ecgFileId: file.id } }), confidence: ecgCase.confidenceScore ?? 0.75, createdBy: auth.id, imageHeight: input?.imageHeight ?? 1200, imageWidth: input?.imageWidth ?? 1600 }) : [];
  return saveAiOverlayWorkspace(caseId, auth, { workspace: { annotations: mergeOverlayAnnotations(generated, mapped), selectedAnnotationIds: [], settings: { ...DEFAULT_AI_OVERLAY_SETTINGS, enabled: true }, version: 1 } });
}

export async function getAiOverlayLayerConfig(caseId: string, auth: AuthContext) { return (await getAiOverlayWorkspace(caseId, auth)).layerConfig; }
export async function updateAiOverlayLayerConfig(caseId: string, auth: AuthContext, layerConfig: AiOverlayLayerConfigDto) {
  const persisted = await getAiOverlayWorkspace(caseId, auth);
  return saveAiOverlayWorkspace(caseId, auth, { layerConfig, workspace: persisted.workspace });
}
export async function toggleAiOverlay(caseId: string, auth: AuthContext, enabled: boolean) {
  const persisted = await getAiOverlayWorkspace(caseId, auth);
  const saved = await upsertOverlayWorkspace({ authorId: auth.id, caseId, enabled, layerConfig: { ...persisted.layerConfig, enabled }, workspace: { ...persisted.workspace, settings: { ...persisted.workspace.settings, enabled } } });
  return toPersistedOverlayDto(saved);
}
export async function renderAiOverlay(caseId: string, auth: AuthContext) {
  const persisted = await getAiOverlayWorkspace(caseId, auth);
  return renderMultiLayerOverlay({ annotations: persisted.workspace.annotations, caseId, layerConfig: persisted.layerConfig });
}
export async function getAiOverlayVersionHistory(caseId: string, auth: AuthContext) { await assertCaseAccess(caseId, auth); return listOverlayVersions(caseId); }
export async function restoreAiOverlayVersion(caseId: string, auth: AuthContext, versionNumber: number) {
  const version = await findOverlayVersion(caseId, versionNumber);
  if (!version) throw new AppError(404, "Overlay version not found.", "OVERLAY_VERSION_NOT_FOUND");
  return saveAiOverlayWorkspace(caseId, auth, { layerConfig: version.layerConfig as AiOverlayLayerConfigDto, workspace: version.snapshot as AiOverlayWorkspaceDto });
}
export async function patchAiOverlayAnnotation(caseId: string, auth: AuthContext, annotationId: string, patch: { confirmed?: boolean; doctorNotes?: string; rejected?: boolean; visible?: boolean }) {
  const persisted = await getAiOverlayWorkspace(caseId, auth);
  const annotations = persisted.workspace.annotations.map((a) => a.id === annotationId ? { ...a, ...patch, updatedAt: new Date().toISOString() } : a);
  return saveAiOverlayWorkspace(caseId, auth, { layerConfig: persisted.layerConfig, workspace: { ...persisted.workspace, annotations } });
}
export async function addPhysicianNoteOverlay(caseId: string, auth: AuthContext, input: { lead?: string; note: string }) {
  if (!validatePhysicianNote(input.note).valid) throw new AppError(400, "Invalid physician note.", "PHYSICIAN_NOTE_INVALID");
  const persisted = await getAiOverlayWorkspace(caseId, auth);
  const noteAnnotation = buildPhysicianNoteAnnotation({ authorId: auth.id, imageHeight: 1200, imageWidth: 1600, lead: input.lead, note: input.note.trim() });
  return saveAiOverlayWorkspace(caseId, auth, { layerConfig: persisted.layerConfig, workspace: { ...persisted.workspace, annotations: [...persisted.workspace.annotations, noteAnnotation] } });
}
export async function exportAiOverlayBundle(caseId: string, auth: AuthContext): Promise<AiOverlayExportBundleDto> {
  const persisted = await getAiOverlayWorkspace(caseId, auth);
  const multiLayer = renderMultiLayerOverlay({ annotations: persisted.workspace.annotations, caseId, layerConfig: persisted.layerConfig });
  return { annotations: persisted.workspace.annotations, caseId, enabled: persisted.enabled, engineVersion: AI_ANNOTATION_OVERLAY_ENGINE_VERSION, exportedAt: new Date().toISOString(), format: AI_OVERLAY_EXPORT_FORMAT, layerConfig: persisted.layerConfig, multiLayer, settings: persisted.workspace.settings };
}
export async function loadAiOverlayForReport(caseId: string) {
  const existing = await findOverlayWorkspace(caseId);
  if (!existing?.enabled) return null;
  const persisted = toPersistedOverlayDto(existing);
  const multiLayer = renderMultiLayerOverlay({ annotations: persisted.workspace.annotations, caseId, layerConfig: persisted.layerConfig });
  return {
    annotations: persisted.workspace.annotations,
    caseId,
    enabled: persisted.enabled,
    engineVersion: AI_ANNOTATION_OVERLAY_ENGINE_VERSION,
    exportedAt: new Date().toISOString(),
    format: AI_OVERLAY_EXPORT_FORMAT,
    layerConfig: persisted.layerConfig,
    multiLayer,
    settings: persisted.workspace.settings,
  };
}
export async function getViewerAiOverlay(caseId: string, auth: AuthContext) { return getAiOverlayWorkspace(caseId, auth); }
export async function generateViewerAiOverlay(caseId: string, auth: AuthContext, input?: { imageHeight?: number; imageWidth?: number }) { return generateAiOverlayWorkspace(caseId, auth, input); }
export async function toggleViewerAiOverlay(caseId: string, auth: AuthContext, enabled: boolean) { return toggleAiOverlay(caseId, auth, enabled); }
export async function renderViewerAiOverlay(caseId: string, auth: AuthContext) { return renderAiOverlay(caseId, auth); }
