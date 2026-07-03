import type { AttachmentExtractionInput, AttachmentExtractionResult } from "../attachment/types";

export type MedicalExtractor = {
  /** Stable identifier used in logs and metrics */
  id: string;
  /** Returns true when this extractor should handle the document */
  supports: (input: AttachmentExtractionInput) => boolean;
  /** Extract normalized clinical fields from OCR + metadata */
  extract: (input: AttachmentExtractionInput) => AttachmentExtractionResult;
};
