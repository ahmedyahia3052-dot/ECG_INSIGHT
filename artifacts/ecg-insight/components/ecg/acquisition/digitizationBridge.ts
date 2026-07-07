import type { DigitalEcg, DigitalEcgLead } from "@/services/ecgProcessing";

/** Stable read-only interface for downstream clinical engines (Measurement, AI, CDSS, Reports). */
export type DigitizationBridgeModel = {
  calibration: DigitalEcg["calibration"];
  gridOverlaySvg?: string;
  leads: DigitalEcgLead[];
  pipelineVersion?: string;
  preprocessing?: DigitalEcg["preprocessing"];
  quality: DigitalEcg["quality"];
  status: DigitalEcg["status"];
  validation?: DigitalEcg["validation"];
};

export function buildDigitizationBridgeModel(digitalEcg?: DigitalEcg | null): DigitizationBridgeModel | null {
  if (!digitalEcg || digitalEcg.status !== "available") return null;
  return {
    calibration: digitalEcg.calibration,
    gridOverlaySvg: digitalEcg.gridOverlaySvg,
    leads: digitalEcg.leads,
    preprocessing: digitalEcg.preprocessing,
    quality: digitalEcg.quality,
    status: digitalEcg.status,
    validation: digitalEcg.validation,
  };
}

export function digitizedLeadByName(model: DigitizationBridgeModel | null, lead: string) {
  return model?.leads.find((entry) => entry.lead === lead) ?? null;
}
