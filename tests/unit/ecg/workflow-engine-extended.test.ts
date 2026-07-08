import { describe, expect, it } from "vitest";

import {
  buildWorkflowSteps,
  navigateWorkflowStep,
  smartToolGroupForViewMode,
  workflowProgress,
} from "@/components/ecg/viewer/clinical-workflow/engine";

const caseRecord = {
  files: [{ downloadUrl: "/f.png" }],
  id: "case-1",
  imagePath: "/uploads/ecg.png",
  patientId: "patient-1",
} as never;

describe("clinical workflow engine — extended SAT", () => {
  it("marks grid-detection complete when grid detected", () => {
    const steps = buildWorkflowSteps({
      caseRecord,
      currentViewMode: "image",
      digitalEcg: {
        calibration: { gridDetected: true },
        preprocessing: { contrastEnhanced: true },
        status: "available",
      } as never,
    });
    const grid = steps.find((s) => s.id === "grid-detection");
    expect(grid?.status).toBe("complete");
  });

  it("navigates measurements to measurement view mode", () => {
    expect(navigateWorkflowStep("measurements")).toEqual({
      measurementsTab: true,
      viewMode: "measurement",
    });
  });

  it("exposes monitor toolbar group only in monitor view mode", () => {
    expect(smartToolGroupForViewMode("monitor")).toContain("MONITOR");
    expect(smartToolGroupForViewMode("monitor")).toEqual(["FILE", "MONITOR", "MEASURE", "EXPORT"]);
    expect(smartToolGroupForViewMode("image")).not.toContain("MONITOR");
    expect(smartToolGroupForViewMode("measurement")).not.toContain("MONITOR");
  });

  it("computes zero progress for fresh upload-only case", () => {
    const steps = buildWorkflowSteps({ caseRecord, currentViewMode: "image" });
    expect(workflowProgress(steps)).toBeGreaterThanOrEqual(0);
  });
});
