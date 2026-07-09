import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { assertResourceAccess, canAccessCase } from "../../utils/resource-access";
import {
  addPhysicianNoteOverlay, exportAiOverlayBundle, generateAiOverlayWorkspace, getAiAnnotationOverlayEngineHealth,
  getAiOverlayLayerConfig, getAiOverlayVersionHistory, getAiOverlayWorkspace, patchAiOverlayAnnotation,
  renderAiOverlay, restoreAiOverlayVersion, saveAiOverlayWorkspace, toggleAiOverlay, updateAiOverlayLayerConfig,
} from "./ai-annotation-overlay.service";
import { annotationParamsSchema, caseIdParamsSchema, generateOverlaySchema, patchAnnotationSchema, physicianNoteSchema, restoreVersionSchema, saveOverlayWorkspaceSchema, toggleOverlaySchema, updateLayerConfigSchema, versionParamsSchema } from "./schemas";

export const aiAnnotationOverlayEngineRouter = Router();

aiAnnotationOverlayEngineRouter.get("/health", (_req, res) => { res.json(getAiAnnotationOverlayEngineHealth()); });
aiAnnotationOverlayEngineRouter.use(requireAuth);

async function assertRouteCaseAccess(caseId: string, auth: { id: string; role: string }) {
  assertResourceAccess(await canAccessCase(caseId, auth as never));
}

aiAnnotationOverlayEngineRouter.get("/cases/:caseId/workspace", async (req, res, next) => {
  try { const p = caseIdParamsSchema.parse(req.params); await assertRouteCaseAccess(p.caseId, req.auth!); res.json({ workspace: await getAiOverlayWorkspace(p.caseId, req.auth!) }); } catch (e) { next(e); }
});
aiAnnotationOverlayEngineRouter.put("/cases/:caseId/workspace", requireRole("DOCTOR"), validateBody(saveOverlayWorkspaceSchema), async (req, res, next) => {
  try { const p = caseIdParamsSchema.parse(req.params); await assertRouteCaseAccess(p.caseId, req.auth!); res.json({ workspace: await saveAiOverlayWorkspace(p.caseId, req.auth!, req.body) }); } catch (e) { next(e); }
});
aiAnnotationOverlayEngineRouter.post("/cases/:caseId/generate", requireRole("DOCTOR"), validateBody(generateOverlaySchema), async (req, res, next) => {
  try { const p = caseIdParamsSchema.parse(req.params); await assertRouteCaseAccess(p.caseId, req.auth!); res.status(201).json({ workspace: await generateAiOverlayWorkspace(p.caseId, req.auth!, req.body) }); } catch (e) { next(e); }
});
aiAnnotationOverlayEngineRouter.get("/cases/:caseId/layers", async (req, res, next) => {
  try { const p = caseIdParamsSchema.parse(req.params); await assertRouteCaseAccess(p.caseId, req.auth!); res.json({ layerConfig: await getAiOverlayLayerConfig(p.caseId, req.auth!) }); } catch (e) { next(e); }
});
aiAnnotationOverlayEngineRouter.put("/cases/:caseId/layers", requireRole("DOCTOR"), validateBody(updateLayerConfigSchema), async (req, res, next) => {
  try { const p = caseIdParamsSchema.parse(req.params); await assertRouteCaseAccess(p.caseId, req.auth!); res.json({ layerConfig: await updateAiOverlayLayerConfig(p.caseId, req.auth!, req.body) }); } catch (e) { next(e); }
});
aiAnnotationOverlayEngineRouter.put("/cases/:caseId/toggle", requireRole("DOCTOR"), validateBody(toggleOverlaySchema), async (req, res, next) => {
  try { const p = caseIdParamsSchema.parse(req.params); await assertRouteCaseAccess(p.caseId, req.auth!); res.json({ workspace: await toggleAiOverlay(p.caseId, req.auth!, req.body.enabled) }); } catch (e) { next(e); }
});
aiAnnotationOverlayEngineRouter.get("/cases/:caseId/render", async (req, res, next) => {
  try { const p = caseIdParamsSchema.parse(req.params); await assertRouteCaseAccess(p.caseId, req.auth!); res.json({ render: await renderAiOverlay(p.caseId, req.auth!) }); } catch (e) { next(e); }
});
aiAnnotationOverlayEngineRouter.get("/cases/:caseId/versions", async (req, res, next) => {
  try { const p = caseIdParamsSchema.parse(req.params); await assertRouteCaseAccess(p.caseId, req.auth!); const versions = await getAiOverlayVersionHistory(p.caseId, req.auth!); res.json({ count: versions.length, versions }); } catch (e) { next(e); }
});
aiAnnotationOverlayEngineRouter.post("/cases/:caseId/versions/:versionNumber/restore", requireRole("DOCTOR"), validateBody(restoreVersionSchema), async (req, res, next) => {
  try { const p = versionParamsSchema.parse(req.params); await assertRouteCaseAccess(p.caseId, req.auth!); res.json({ workspace: await restoreAiOverlayVersion(p.caseId, req.auth!, p.versionNumber) }); } catch (e) { next(e); }
});
aiAnnotationOverlayEngineRouter.patch("/cases/:caseId/annotations/:annotationId", requireRole("DOCTOR"), validateBody(patchAnnotationSchema), async (req, res, next) => {
  try { const p = annotationParamsSchema.parse(req.params); await assertRouteCaseAccess(p.caseId, req.auth!); res.json({ workspace: await patchAiOverlayAnnotation(p.caseId, req.auth!, p.annotationId, req.body) }); } catch (e) { next(e); }
});
aiAnnotationOverlayEngineRouter.post("/cases/:caseId/physician-notes", requireRole("DOCTOR"), validateBody(physicianNoteSchema), async (req, res, next) => {
  try { const p = caseIdParamsSchema.parse(req.params); await assertRouteCaseAccess(p.caseId, req.auth!); res.status(201).json({ workspace: await addPhysicianNoteOverlay(p.caseId, req.auth!, req.body) }); } catch (e) { next(e); }
});
aiAnnotationOverlayEngineRouter.get("/cases/:caseId/export", async (req, res, next) => {
  try { const p = caseIdParamsSchema.parse(req.params); await assertRouteCaseAccess(p.caseId, req.auth!); res.json({ export: await exportAiOverlayBundle(p.caseId, req.auth!) }); } catch (e) { next(e); }
});
