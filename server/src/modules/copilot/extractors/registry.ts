import type { MedicalExtractor } from "./types";
import {
  CathMedicalExtractor,
  EchoMedicalExtractor,
  EcgMedicalExtractor,
  GeneralMedicalExtractor,
  LabMedicalExtractor,
  RadiologyMedicalExtractor,
} from "./modality-extractors";

const defaultExtractors: MedicalExtractor[] = [
  EcgMedicalExtractor,
  LabMedicalExtractor,
  RadiologyMedicalExtractor,
  EchoMedicalExtractor,
  CathMedicalExtractor,
  GeneralMedicalExtractor,
];

export class MedicalExtractorRegistry {
  private extractors: MedicalExtractor[];

  constructor(extractors: MedicalExtractor[] = defaultExtractors) {
    this.extractors = extractors;
  }

  register(extractor: MedicalExtractor) {
    this.extractors = [extractor, ...this.extractors.filter((item) => item.id !== extractor.id)];
  }

  resolve(input: Parameters<MedicalExtractor["supports"]>[0]) {
    return this.extractors.find((extractor) => extractor.supports(input)) ?? GeneralMedicalExtractor;
  }

  extract(input: Parameters<MedicalExtractor["extract"]>[0]) {
    return this.resolve(input).extract(input);
  }
}

export const medicalExtractorRegistry = new MedicalExtractorRegistry();
