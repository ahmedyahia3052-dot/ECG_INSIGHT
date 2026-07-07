/** @deprecated Use render-engine-2/medicalGrid — kept for backward compatibility. */
import { HOSPITAL_PHOSPHOR_PROFILE } from "../render-engine-2/displayProfile";
import { dynamicTraceStrokeWidth } from "../render-engine-2/hospitalRenderer";

export {
  computeMedicalGridMetrics as computeHospitalGridMetrics,
  drawMedicalEcgGrid as drawHospitalEcgGrid,
  sampleToMedicalY as sampleToClinicalY,
  type MedicalGridMetrics as HospitalGridMetrics,
} from "../render-engine-2/medicalGrid";
export { dynamicTraceStrokeWidth } from "../render-engine-2/hospitalRenderer";

/** Backward-compatible 2-arg trace width helper. */
export function adaptiveTraceStrokeWidth(layoutLeadCount: number, zoom: number): number {
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  return dynamicTraceStrokeWidth(layoutLeadCount, zoom, dpr);
}

/** Hospital bedside monitor ECG paper colors (Philips/GE-style green phosphor grid). */
export const HOSPITAL_GRID = {
  background: HOSPITAL_PHOSPHOR_PROFILE.background,
  major: HOSPITAL_PHOSPHOR_PROFILE.gridMajor,
  minor: HOSPITAL_PHOSPHOR_PROFILE.gridMinor,
} as const;
