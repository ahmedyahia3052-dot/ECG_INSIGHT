import { describe, expect, it } from "vitest";
import {
  CLINICAL_CASE_LIFECYCLE,
  assertLifecycleTransition,
  ecgCaseStatusForLifecycle,
  isCriticalCase,
  lifecycleFromCaseStatus,
  lifecycleFromManagementStatus,
  managementStatusForLifecycle,
  resolveClinicalLifecycle,
} from "../../../../server/src/modules/clinical-case-management/domain/lifecycle";

describe("clinical case lifecycle", () => {
  it("defines sprint 87 lifecycle states", () => {
    expect(CLINICAL_CASE_LIFECYCLE).toEqual([
      "draft",
      "uploaded",
      "processing",
      "pending_review",
      "reviewed",
      "finalized",
      "archived",
    ]);
  });

  it("maps management status to lifecycle", () => {
    expect(lifecycleFromManagementStatus("UPLOADED")).toBe("uploaded");
    expect(lifecycleFromManagementStatus("PROCESSING")).toBe("processing");
    expect(lifecycleFromManagementStatus("FINALIZED")).toBe("finalized");
    expect(lifecycleFromManagementStatus("ARCHIVED")).toBe("archived");
  });

  it("maps ecg case status to lifecycle", () => {
    expect(lifecycleFromCaseStatus("UPLOADED")).toBe("uploaded");
    expect(lifecycleFromCaseStatus("PROCESSING")).toBe("processing");
    expect(lifecycleFromCaseStatus("UNDER_REVIEW")).toBe("pending_review");
    expect(lifecycleFromCaseStatus("FINALIZED")).toBe("finalized");
  });

  it("resolves lifecycle from management and case status", () => {
    expect(
      resolveClinicalLifecycle({ managementStatus: "PROCESSING", status: "UPLOADED" }),
    ).toBe("processing");
    expect(
      resolveClinicalLifecycle({ managementStatus: "DRAFT", status: "FINALIZED" }),
    ).toBe("finalized");
  });

  it("allows forward transitions and archive from any state", () => {
    expect(() => assertLifecycleTransition("draft", "uploaded")).not.toThrow();
    expect(() => assertLifecycleTransition("uploaded", "processing")).not.toThrow();
    expect(() => assertLifecycleTransition("processing", "pending_review")).not.toThrow();
    expect(() => assertLifecycleTransition("pending_review", "reviewed")).not.toThrow();
    expect(() => assertLifecycleTransition("reviewed", "finalized")).not.toThrow();
    expect(() => assertLifecycleTransition("finalized", "archived")).not.toThrow();
    expect(() => assertLifecycleTransition("draft", "archived")).not.toThrow();
  });

  it("rejects invalid backward transitions", () => {
    expect(() => assertLifecycleTransition("finalized", "draft")).toThrow();
    expect(() => assertLifecycleTransition("reviewed", "processing")).toThrow();
  });

  it("maps lifecycle to persistence enums", () => {
    expect(managementStatusForLifecycle("uploaded")).toBe("UPLOADED");
    expect(ecgCaseStatusForLifecycle("pending_review")).toBe("UNDER_REVIEW");
  });

  it("detects critical cases", () => {
    expect(isCriticalCase({ priority: "CRITICAL", severity: "NORMAL" })).toBe(true);
    expect(isCriticalCase({ priority: "HIGH", severity: "CRITICAL" })).toBe(true);
    expect(isCriticalCase({ priority: "HIGH", severity: "NORMAL" })).toBe(false);
  });
});
