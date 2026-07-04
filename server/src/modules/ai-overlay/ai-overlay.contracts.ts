export type AiClinicalAnnotationDto = {
  aiGenerated: boolean;
  clinicalMeaning?: string;
  confidence: number;
  confirmed: boolean;
  coordinates: { height: number; width: number; x: number; y: number };
  createdAt: string;
  createdBy: string;
  doctorEdited: boolean;
  doctorNotes?: string;
  evidence: string[];
  id: string;
  lead: string;
  locked: boolean;
  measurement?: string;
  medicalExplanation?: string;
  rejected: boolean;
  suggestedAction?: string;
  supportingMeasurements?: string[];
  type: string;
  units?: string;
  updatedAt: string;
  visible: boolean;
};

export type AiOverlaySettingsDto = {
  enabled: boolean;
  fontScale: number;
  opacity: number;
  showAnnotations: boolean;
  showConfidence: boolean;
  showHeatmap: boolean;
  showLabels: boolean;
  theme: "clinical" | "dark" | "light";
};

export type AiOverlayWorkspaceDto = {
  annotations: AiClinicalAnnotationDto[];
  selectedAnnotationIds: string[];
  settings: AiOverlaySettingsDto;
  version: 1;
};

export type EcgViewerWorkspaceEnvelopeDto = {
  aiOverlay?: AiOverlayWorkspaceDto;
  version: 4;
  workspace: Record<string, unknown>;
};

/** Future websocket sync envelope for collaborative annotation review. */
export type AiOverlaySyncEventDto = {
  annotation?: AiClinicalAnnotationDto;
  annotationId?: string;
  caseId: string;
  event: "annotation_created" | "annotation_deleted" | "annotation_selected" | "annotation_updated" | "settings_updated";
  settings?: Partial<AiOverlaySettingsDto>;
  timestamp: string;
  userId: string;
};

export interface AiOverlayRepository {
  load(caseId: string): Promise<AiOverlayWorkspaceDto | null>;
  save(caseId: string, payload: AiOverlayWorkspaceDto, authorId: string): Promise<void>;
}
