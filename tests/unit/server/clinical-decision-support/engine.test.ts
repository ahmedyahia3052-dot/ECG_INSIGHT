import { describe, expect, it } from "vitest";
import { generateClinicalRecommendations } from "../../../../server/src/modules/clinical-decision-support/recommendation-engine";
import { generateFollowUpPlan } from "../../../../server/src/modules/clinical-decision-support/follow-up-engine";

describe("clinical-decision-support sprint65", () => {
  it("generates ACS recommendations from STEMI finding", () => {
    const recommendations = generateClinicalRecommendations({
      caseId: "case-a",
      patientId: "patient-a",
      structuredFindings: [{ code: "STEMI", label: "STEMI", severity: "critical" }],
    });
    expect(recommendations.some((item) => item.recommendationType === "TROPONIN")).toBe(true);
    expect(recommendations[0]?.priorityScore).toBeGreaterThan(50);
  });

  it("generates follow-up plan with reminders", () => {
    const recommendations = generateClinicalRecommendations({
      caseId: "case-b",
      patientId: "patient-b",
      qtcBazettMs: 500,
    });
    const followUp = generateFollowUpPlan(recommendations);
    expect(followUp.reminderDates).toHaveLength(2);
    expect(followUp.recommendedIntervalDays).toBeGreaterThan(0);
  });
});
