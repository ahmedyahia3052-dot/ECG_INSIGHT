/**
 * Sprint 78 — Medical component registry (clinical presentation only).
 */

export type MedicalComponentId =
  | "ecg.measurement-panel"
  | "ecg.ai-diagnosis-panel"
  | "ecg.unified-left-panel"
  | "ecg.examination-gate"
  | "ecg.measurement-studio"
  | "ecg.clinical-alerts-banner";

export type MedicalComponentRegistryEntry = {
  id: MedicalComponentId;
  exportName: string;
  modulePath: string;
  clinicalDomain: "workspace" | "monitor" | "report" | "workflow";
};

export const medicalComponentRegistry = {
  version: "sprint78-v1",
  entries: [
    {
      clinicalDomain: "workspace",
      exportName: "EcgMeasurementPanel",
      id: "ecg.measurement-panel",
      modulePath: "@/components/ecg/EcgMeasurementPanel",
    },
    {
      clinicalDomain: "workspace",
      exportName: "EcgAiDiagnosisPanel",
      id: "ecg.ai-diagnosis-panel",
      modulePath: "@/components/ecg/EcgAiDiagnosisPanel",
    },
    {
      clinicalDomain: "workspace",
      exportName: "EcgUnifiedClinicalLeftPanel",
      id: "ecg.unified-left-panel",
      modulePath: "@/components/ecg/viewer/EcgUnifiedClinicalLeftPanel",
    },
    {
      clinicalDomain: "workflow",
      exportName: "EcgExaminationWorkflowGate",
      id: "ecg.examination-gate",
      modulePath: "@/components/ecg/viewer/EcgExaminationWorkflowGate",
    },
    {
      clinicalDomain: "workspace",
      exportName: "EcgMeasurementStudioPanel",
      id: "ecg.measurement-studio",
      modulePath: "@/components/ecg/viewer/EcgMeasurementStudioPanel",
    },
    {
      clinicalDomain: "workspace",
      exportName: "EcgClinicalAlertsBanner",
      id: "ecg.clinical-alerts-banner",
      modulePath: "@/components/ecg/viewer/EcgClinicalAlertsBanner",
    },
  ] satisfies MedicalComponentRegistryEntry[],
} as const;

export function getMedicalComponent(id: MedicalComponentId) {
  return medicalComponentRegistry.entries.find((entry) => entry.id === id);
}
