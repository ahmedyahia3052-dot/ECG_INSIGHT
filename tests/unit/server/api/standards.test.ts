import { describe, expect, it } from "vitest";
import { buildErrorBody, buildValidationErrorBody } from "../../../../server/src/api/standards/errors";
import { buildPaginationMeta, paginatedBody, successBody } from "../../../../server/src/api/standards/response";
import { API_MOUNT_POINTS, toVersionedPath } from "../../../../server/src/api/registry/mount-points";

describe("enterprise API standards", () => {
  it("registers canonical mount points", () => {
    expect(API_MOUNT_POINTS.length).toBeGreaterThan(50);
    expect(API_MOUNT_POINTS.some((mount) => mount.module === "clinical-decision-support")).toBe(true);
  });

  it("builds versioned paths", () => {
    expect(toVersionedPath("/notifications", "/unread")).toBe("/api/v1/notifications/unread");
  });

  it("wraps success responses", () => {
    expect(successBody({ ok: true }).success).toBe(true);
  });

  it("wraps paginated responses", () => {
    const body = paginatedBody([], buildPaginationMeta({ page: 2, pageSize: 10, total: 25 }));
    expect(body.data.pagination.totalPages).toBe(3);
  });

  it("wraps standardized errors", () => {
    const body = buildErrorBody({ code: "FORBIDDEN", message: "Denied" });
    expect(body.success).toBe(false);
    expect(buildValidationErrorBody({ flatten: () => ({ fieldErrors: {}, formErrors: [] }) } as never).code).toBe(
      "VALIDATION_ERROR",
    );
  });
});
