import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import {
  compareViewerCases,
  createPhysicianAnnotation,
  deletePhysicianAnnotation,
  exportViewerCase,
  generateViewerAiOverlay,
  generateViewerReport,
  getEcgViewerApiStatus,
  getOverlayConfig,
  getViewerAiOverlay,
  getViewerAnnotations,
  getViewerBundle,
  getViewerImage,
  getViewerLeads,
  getViewerMeasurements,
  getViewerMetadata,
  getViewerPreferences,
  getViewerWaveform,
  getZoomPresets,
  renderViewerAiOverlay,
  saveOverlayConfig,
  saveViewerMeasurements,
  saveViewerPreferences,
  toggleViewerAiOverlay,
  updatePhysicianAnnotation,
} from "./ecg-viewer-api.service";
import { toggleOverlaySchema } from "../ai-annotation-overlay-engine/schemas";
import {
  annotationIdParamsSchema,
  caseIdParamsSchema,
  compareQuerySchema,
  exportBodySchema,
  measurementsBodySchema,
  overlayConfigBodySchema,
  physicianAnnotationBodySchema,
  reportBodySchema,
  updateAnnotationBodySchema,
  viewerPreferenceBodySchema,
  waveformQuerySchema,
} from "./schemas";

export const ecgViewerApiRouter = Router();

ecgViewerApiRouter.get("/health", (_req, res) => {
  res.json(getEcgViewerApiStatus());
});

ecgViewerApiRouter.get("/zoom-presets", async (_req, res, next) => {
  try {
    res.json(await getZoomPresets());
  } catch (error) {
    next(error);
  }
});

ecgViewerApiRouter.use(requireAuth);

ecgViewerApiRouter.get("/preferences", async (req, res, next) => {
  try {
    res.json({ preferences: await getViewerPreferences(req.auth!.id) });
  } catch (error) {
    next(error);
  }
});

ecgViewerApiRouter.put("/preferences", validateBody(viewerPreferenceBodySchema), async (req, res, next) => {
  try {
    res.json({ preferences: await saveViewerPreferences(req.auth!.id, req.body) });
  } catch (error) {
    next(error);
  }
});

ecgViewerApiRouter.get("/cases/:caseId/bundle", async (req, res, next) => {
  try {
    const params = caseIdParamsSchema.parse(req.params);
    res.json({ bundle: await getViewerBundle(params.caseId, req.auth!) });
  } catch (error) {
    next(error);
  }
});

ecgViewerApiRouter.get("/cases/:caseId/image", async (req, res, next) => {
  try {
    const params = caseIdParamsSchema.parse(req.params);
    res.json({ image: await getViewerImage(params.caseId, req.auth!) });
  } catch (error) {
    next(error);
  }
});

ecgViewerApiRouter.get("/cases/:caseId/metadata", async (req, res, next) => {
  try {
    const params = caseIdParamsSchema.parse(req.params);
    res.json({ metadata: await getViewerMetadata(params.caseId, req.auth!) });
  } catch (error) {
    next(error);
  }
});

ecgViewerApiRouter.get("/cases/:caseId/measurements", async (req, res, next) => {
  try {
    const params = caseIdParamsSchema.parse(req.params);
    res.json(await getViewerMeasurements(params.caseId, req.auth!));
  } catch (error) {
    next(error);
  }
});

ecgViewerApiRouter.put(
  "/cases/:caseId/measurements",
  requireRole("DOCTOR"),
  validateBody(measurementsBodySchema),
  async (req, res, next) => {
    try {
      const params = caseIdParamsSchema.parse(req.params);
      res.json(await saveViewerMeasurements(params.caseId, req.auth!, req.body.measurements));
    } catch (error) {
      next(error);
    }
  },
);

ecgViewerApiRouter.get("/cases/:caseId/waveform", async (req, res, next) => {
  try {
    const params = caseIdParamsSchema.parse(req.params);
    const query = waveformQuerySchema.parse(req.query);
    res.json({ waveform: await getViewerWaveform(params.caseId, req.auth!, query) });
  } catch (error) {
    next(error);
  }
});

ecgViewerApiRouter.get("/cases/:caseId/leads", async (req, res, next) => {
  try {
    const params = caseIdParamsSchema.parse(req.params);
    res.json({ leads: await getViewerLeads(params.caseId, req.auth!) });
  } catch (error) {
    next(error);
  }
});

ecgViewerApiRouter.get("/cases/:caseId/annotations", async (req, res, next) => {
  try {
    const params = caseIdParamsSchema.parse(req.params);
    res.json(await getViewerAnnotations(params.caseId, req.auth!));
  } catch (error) {
    next(error);
  }
});

ecgViewerApiRouter.post(
  "/cases/:caseId/annotations",
  requireRole("DOCTOR"),
  validateBody(physicianAnnotationBodySchema),
  async (req, res, next) => {
    try {
      const params = caseIdParamsSchema.parse(req.params);
      const annotation = await createPhysicianAnnotation(params.caseId, req.auth!, req.body);
      res.status(201).json({ annotation });
    } catch (error) {
      next(error);
    }
  },
);

ecgViewerApiRouter.patch(
  "/cases/:caseId/annotations/:annotationId",
  requireRole("DOCTOR"),
  validateBody(updateAnnotationBodySchema),
  async (req, res, next) => {
    try {
      const params = annotationIdParamsSchema.parse(req.params);
      const annotation = await updatePhysicianAnnotation(params.caseId, params.annotationId, req.auth!, req.body);
      res.json({ annotation });
    } catch (error) {
      next(error);
    }
  },
);

ecgViewerApiRouter.delete("/cases/:caseId/annotations/:annotationId", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const params = annotationIdParamsSchema.parse(req.params);
    res.json(await deletePhysicianAnnotation(params.caseId, params.annotationId, req.auth!));
  } catch (error) {
    next(error);
  }
});

ecgViewerApiRouter.get("/cases/:caseId/overlay", async (req, res, next) => {
  try {
    const params = caseIdParamsSchema.parse(req.params);
    res.json({ overlay: await getOverlayConfig(params.caseId, req.auth!) });
  } catch (error) {
    next(error);
  }
});

ecgViewerApiRouter.put(
  "/cases/:caseId/overlay",
  requireRole("DOCTOR"),
  validateBody(overlayConfigBodySchema),
  async (req, res, next) => {
    try {
      const params = caseIdParamsSchema.parse(req.params);
      res.json(await saveOverlayConfig(params.caseId, req.auth!, req.body.config));
    } catch (error) {
      next(error);
    }
  },
);

ecgViewerApiRouter.get("/cases/:caseId/ai-overlay", async (req, res, next) => {
  try {
    const params = caseIdParamsSchema.parse(req.params);
    res.json({ aiOverlay: await getViewerAiOverlay(params.caseId, req.auth!) });
  } catch (error) {
    next(error);
  }
});

ecgViewerApiRouter.post("/cases/:caseId/ai-overlay/generate", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const params = caseIdParamsSchema.parse(req.params);
    res.status(201).json({ aiOverlay: await generateViewerAiOverlay(params.caseId, req.auth!, req.body) });
  } catch (error) {
    next(error);
  }
});

ecgViewerApiRouter.put("/cases/:caseId/ai-overlay/toggle", requireRole("DOCTOR"), validateBody(toggleOverlaySchema), async (req, res, next) => {
  try {
    const params = caseIdParamsSchema.parse(req.params);
    res.json({ aiOverlay: await toggleViewerAiOverlay(params.caseId, req.auth!, req.body.enabled) });
  } catch (error) {
    next(error);
  }
});

ecgViewerApiRouter.get("/cases/:caseId/ai-overlay/render", async (req, res, next) => {
  try {
    const params = caseIdParamsSchema.parse(req.params);
    res.json({ render: await renderViewerAiOverlay(params.caseId, req.auth!) });
  } catch (error) {
    next(error);
  }
});

ecgViewerApiRouter.get("/cases/:caseId/compare", async (req, res, next) => {
  try {
    const params = caseIdParamsSchema.parse(req.params);
    const query = compareQuerySchema.parse(req.query);
    res.json({ comparison: await compareViewerCases(params.caseId, req.auth!, query.baselineCaseId) });
  } catch (error) {
    next(error);
  }
});

ecgViewerApiRouter.post(
  "/cases/:caseId/report",
  requireRole("DOCTOR"),
  validateBody(reportBodySchema),
  async (req, res, next) => {
    try {
      const params = caseIdParamsSchema.parse(req.params);
      res.status(201).json(await generateViewerReport(params.caseId, req.auth!, req.body));
    } catch (error) {
      next(error);
    }
  },
);

ecgViewerApiRouter.post(
  "/cases/:caseId/export",
  requireRole("DOCTOR"),
  validateBody(exportBodySchema),
  async (req, res, next) => {
    try {
      const params = caseIdParamsSchema.parse(req.params);
      const result = await exportViewerCase(params.caseId, req.auth!, req.body.format, {
        includeAnnotations: req.body.includeAnnotations,
        includeMeasurements: req.body.includeMeasurements,
      });

      if ("data" in result && result.format === "pdf") {
        res.setHeader("Content-Type", result.contentType ?? "application/pdf");
        res.send(result.data);
        return;
      }

      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);
