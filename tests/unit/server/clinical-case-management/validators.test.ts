import { describe, expect, it } from "vitest";
import { clinicalLifecycleSchema, clinicalNoteTypeSchema } from "../../../../server/src/modules/clinical-case-management/dto/schemas";

describe("clinical case management validators", () => {
  it("accepts lifecycle transitions", () => {
    expect(clinicalLifecycleSchema.parse("finalized")).toBe("finalized");
    expect(() => clinicalLifecycleSchema.parse("signed")).toThrow();
  });

  it("accepts note types", () => {
    expect(clinicalNoteTypeSchema.parse("clinical")).toBe("clinical");
    expect(clinicalNoteTypeSchema.parse("doctor")).toBe("doctor");
    expect(clinicalNoteTypeSchema.parse("internal")).toBe("internal");
  });
});
