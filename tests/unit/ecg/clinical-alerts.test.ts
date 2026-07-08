import { describe, expect, it } from "vitest";

import { buildClinicalAlerts, highestAlertSeverity } from "@/components/ecg/viewer/clinical-workflow/alerts";

const baseCtx = {
  caseRecord: { id: "c1", patientId: "p1" },
} as never;

describe("clinical alerts", () => {
  it("creates critical alert for severe AI analysis", () => {
    const alerts = buildClinicalAlerts({
      ...baseCtx,
      analysis: { diagnosis: "STEMI", severity: "critical", urgentActions: [] },
    });
    expect(alerts.some((a) => a.severity === "critical")).toBe(true);
    expect(highestAlertSeverity(alerts)).toBe("critical");
  });

  it("warns on poor digitization quality", () => {
    const alerts = buildClinicalAlerts({
      ...baseCtx,
      digitalEcg: { quality: { score: 40 }, status: "available" },
    });
    expect(alerts.some((a) => a.id === "poor-signal")).toBe(true);
  });

  it("warns when measurements missing after digitization", () => {
    const alerts = buildClinicalAlerts({
      ...baseCtx,
      digitalEcg: { status: "available" },
      measurementCount: 0,
    });
    expect(alerts.some((a) => a.id === "incomplete-measurements")).toBe(true);
  });

  it("returns info workflow-ready alert when only diagnosis present", () => {
    const alerts = buildClinicalAlerts({
      ...baseCtx,
      analysis: { diagnosis: "Normal sinus rhythm", severity: "normal", urgentActions: [] },
    });
    expect(alerts[0]?.severity).toBe("info");
    expect(highestAlertSeverity(alerts)).toBe("info");
  });
});
