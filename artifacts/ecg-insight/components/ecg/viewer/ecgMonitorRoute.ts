export type EcgMonitorQueryPhase = "idle" | "pending" | "error" | "success";

export type EcgMonitorScreenPhase =
  | "auth-loading"
  | "auth-required"
  | "case-loading"
  | "patient-loading"
  | "ready"
  | "unavailable";

export function mapQueryPhase(enabled: boolean, isError: boolean, isSuccess: boolean): EcgMonitorQueryPhase {
  if (!enabled) return "idle";
  if (isError) return "error";
  if (isSuccess) return "success";
  return "pending";
}

export function resolveEcgMonitorScreenPhase(input: {
  authLoading: boolean;
  caseId?: string;
  casePatientId?: string;
  casePhase: EcgMonitorQueryPhase;
  hasCase: boolean;
  hasPatient: boolean;
  patientPhase: EcgMonitorQueryPhase;
  token?: string;
}): EcgMonitorScreenPhase {
  if (input.authLoading) return "auth-loading";
  if (!input.token) return "auth-required";
  if (!input.caseId) return "unavailable";
  if (input.casePhase === "idle" || input.casePhase === "pending") return "case-loading";
  if (input.casePhase === "error" || !input.hasCase) return "unavailable";
  if (!input.casePatientId) return "unavailable";
  if (input.patientPhase === "idle" || input.patientPhase === "pending") return "patient-loading";
  if (input.patientPhase === "error" || !input.hasPatient) return "unavailable";
  return "ready";
}
