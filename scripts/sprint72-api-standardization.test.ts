import { buildMeta, buildPaginationMeta, legacyListEnvelope, paginatedBody, successBody } from "../server/src/api/standards/response";
import { buildErrorBody, buildValidationErrorBody } from "../server/src/api/standards/errors";
import { API_MOUNT_POINTS, toOperationId, toVersionedPath } from "../server/src/api/registry/mount-points";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function main() {
  assert(API_MOUNT_POINTS.length >= 50, "mount point registry should cover enterprise modules");

  const path = toVersionedPath("/cases", "/:caseId");
  assert(path === "/api/v1/cases/:caseId", "versioned path builder should prefix /api/v1");

  const operationId = toOperationId("GET", "/api/v1/cases/:caseId");
  assert(operationId.startsWith("get"), "operation id should include HTTP method prefix");

  const success = successBody({ id: "case-1" }, buildMeta("req-1"));
  assert(success.success === true, "success envelope should set success=true");
  assert(success.data.id === "case-1", "success envelope should wrap data");

  const paginated = paginatedBody(["a", "b"], buildPaginationMeta({ page: 1, pageSize: 20, total: 2 }));
  assert(paginated.data.items.length === 2, "paginated envelope should include items");
  assert(paginated.data.pagination.totalPages === 1, "pagination meta should compute totalPages");

  const legacy = legacyListEnvelope("cases", [{ id: "1" }], buildPaginationMeta({ page: 1, pageSize: 20, total: 1 }));
  assert(Array.isArray(legacy.cases), "legacy list envelope should preserve domain key");

  const error = buildErrorBody({ code: "NOT_FOUND", message: "Missing", requestId: "req-2" });
  assert(error.success === false, "error envelope should set success=false");
  assert(error.code === "NOT_FOUND", "error envelope should preserve code");

  const validation = buildValidationErrorBody({
    flatten: () => ({ fieldErrors: {}, formErrors: [] }),
  } as never, "req-3");
  assert(validation.code === "VALIDATION_ERROR", "validation envelope should use VALIDATION_ERROR");

  console.log("sprint72-api-standardization.test.ts: all tests passed");
}

main();
