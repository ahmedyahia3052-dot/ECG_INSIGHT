import { describe, expect, it } from "vitest";

import {
  mapQueryPhase,
  resolveEcgMonitorScreenPhase,
} from "@/components/ecg/viewer/ecgMonitorRoute";

describe("ecgMonitorRoute", () => {
  it("maps react-query style flags to monitor query phase", () => {
    expect(mapQueryPhase(false, false, false)).toBe("idle");
    expect(mapQueryPhase(true, true, false)).toBe("error");
    expect(mapQueryPhase(true, false, true)).toBe("success");
    expect(mapQueryPhase(true, false, false)).toBe("pending");
  });

  it("requires auth before loading case", () => {
    expect(
      resolveEcgMonitorScreenPhase({
        authLoading: false,
        casePhase: "idle",
        hasCase: false,
        hasPatient: false,
        patientPhase: "idle",
      }),
    ).toBe("auth-required");
  });

  it("resolves ready when case and patient loaded", () => {
    expect(
      resolveEcgMonitorScreenPhase({
        authLoading: false,
        caseId: "case-1",
        casePatientId: "patient-1",
        casePhase: "success",
        hasCase: true,
        hasPatient: true,
        patientPhase: "success",
        token: "token",
      }),
    ).toBe("ready");
  });

  it("returns unavailable when case lacks patient link", () => {
    expect(
      resolveEcgMonitorScreenPhase({
        authLoading: false,
        caseId: "case-1",
        casePhase: "success",
        hasCase: true,
        hasPatient: true,
        patientPhase: "success",
        token: "token",
      }),
    ).toBe("unavailable");
  });

  it("surfaces patient-loading while patient query pending", () => {
    expect(
      resolveEcgMonitorScreenPhase({
        authLoading: false,
        caseId: "case-1",
        casePatientId: "patient-1",
        casePhase: "success",
        hasCase: true,
        hasPatient: false,
        patientPhase: "pending",
        token: "token",
      }),
    ).toBe("patient-loading");
  });
});
