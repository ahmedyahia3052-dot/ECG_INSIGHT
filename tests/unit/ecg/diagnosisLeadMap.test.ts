import { describe, expect, it } from "vitest";

import { classifyAxis, intervalStatus, leadsForDiagnosis } from "@/components/ecg/viewer/ai-cardiologist/diagnosisLeadMap";

describe("diagnosisLeadMap", () => {
  it("maps STEMI code to inferior leads", () => {
    expect(leadsForDiagnosis("STEMI")).toEqual(["II", "III", "aVF"]);
  });

  it("maps anterior territory from label text", () => {
    expect(leadsForDiagnosis("CUSTOM", "anterior ischemia")).toEqual(["V1", "V2", "V3", "V4"]);
  });

  it("classifies QRS axis ranges", () => {
    expect(classifyAxis(45).classification).toBe("Normal");
    expect(classifyAxis(-45).classification).toBe("Left Axis Deviation");
    expect(classifyAxis(120).classification).toBe("Right Axis Deviation");
    expect(classifyAxis(null).classification).toBe("Unknown");
  });

  it("flags prolonged PR and wide QRS intervals", () => {
    expect(intervalStatus("PR", 240).status).toBe("abnormal");
    expect(intervalStatus("QRS", 130).flag).toBe("Wide QRS");
    expect(intervalStatus("QTc", 450).status).toBe("abnormal");
    expect(intervalStatus("RR", 800).status).toBe("normal");
  });

  it("returns unknown for missing interval values", () => {
    expect(intervalStatus("PR", null).status).toBe("unknown");
  });
});
