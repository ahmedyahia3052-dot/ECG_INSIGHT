import { readFileSync } from "node:fs";
import path from "node:path";
import { runIntegrationMain } from "./finish-integration";
import { loadOpenApiSpec } from "../server/src/api/docs/docs.routes";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const inventory = JSON.parse(
    readFileSync(path.join("server", "src", "api", "registry", "endpoint-inventory.json"), "utf8"),
  ) as Array<{ method: string; path: string }>;

  assert(inventory.length >= 500, "inventory should cover enterprise API surface");
  assert(inventory.some((entry) => entry.path.includes("/clinical-decision-support/")), "CDSS routes inventoried");
  assert(inventory.some((entry) => entry.path.includes("/events/")), "notification event routes inventoried");

  const spec = loadOpenApiSpec();
  assert(spec.openapi === "3.1.0", "openapi version should be 3.1.0");
  assert(typeof spec.paths === "object", "openapi paths required");
  const pathCount = Object.keys(spec.paths as object).length;
  const operationCount = Object.values(spec.paths as Record<string, Record<string, unknown>>).reduce(
    (sum, methods) => sum + Object.keys(methods).length,
    0,
  );
  assert(pathCount >= 200, "openapi should document inventoried path groups");
  assert(operationCount >= 500, "openapi should document inventoried operations");
  assert(Array.isArray(spec.tags), "openapi tags required");

  const components = spec.components as { schemas?: Record<string, unknown> };
  assert(components.schemas?.ApiErrorResponse, "standard error schema required");
  assert(components.schemas?.ApiSuccessResponse, "standard success schema required");
  assert(components.schemas?.PaginationMeta, "pagination schema required");

  console.log("sprint72-api-standardization.integration.ts: all tests passed");
}

runIntegrationMain(main, "sprint72-api-standardization.integration.ts");
