export { classifyDocumentType } from "./document-classifier";
export { MedicalExtractorRegistry, medicalExtractorRegistry } from "./registry";
export {
  CathMedicalExtractor,
  EchoMedicalExtractor,
  EcgMedicalExtractor,
  GeneralMedicalExtractor,
  LabMedicalExtractor,
  RadiologyMedicalExtractor,
} from "./modality-extractors";
export type { MedicalExtractor } from "./types";
