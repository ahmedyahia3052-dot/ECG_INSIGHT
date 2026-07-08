export {
  ECG_VIEWER_API_ID,
  ECG_VIEWER_API_VERSION,
  DEFAULT_ZOOM_PRESETS,
  DEFAULT_OVERLAY_CONFIG,
} from "./types";
export type {
  EcgViewerAnnotationDto,
  EcgViewerBundleDto,
  EcgViewerComparisonDto,
  EcgViewerImageDto,
  EcgViewerLeadDto,
  EcgViewerMetadataDto,
  EcgViewerOverlayConfig,
  EcgViewerWaveformDto,
} from "./types";

export { ecgViewerRepository, EcgViewerRepository } from "./repository";
export {
  compareViewerCases,
  createPhysicianAnnotation,
  deletePhysicianAnnotation,
  exportViewerCase,
  generateViewerReport,
  getEcgViewerApiStatus,
  getOverlayConfig,
  getViewerAnnotations,
  getViewerBundle,
  getViewerImage,
  getViewerLeads,
  getViewerMeasurements,
  getViewerMetadata,
  getViewerPreferences,
  getViewerWaveform,
  getZoomPresets,
  saveOverlayConfig,
  saveViewerMeasurements,
  saveViewerPreferences,
  updatePhysicianAnnotation,
} from "./ecg-viewer-api.service";

export { ecgViewerApiRouter } from "./ecg-viewer-api.routes";
