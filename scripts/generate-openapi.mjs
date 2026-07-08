import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const inventoryPath = path.join(root, "server", "src", "api", "registry", "endpoint-inventory.json");
const inventory = JSON.parse(readFileSync(inventoryPath, "utf8"));

const tags = [...new Set(inventory.map((entry) => entry.tag))].sort().map((name) => ({
  description: `${name} operations`,
  name,
}));

const paths = {};
for (const entry of inventory) {
  const openApiPath = entry.path.replace(/^\/api\/v1/, "") || "/";
  paths[openApiPath] ??= {};
  const method = entry.method.toLowerCase();
  paths[openApiPath][method] = {
    description: `${entry.method} ${openApiPath} (${entry.module})`,
    operationId: entry.operationId,
    responses: {
      "200": {
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApiSuccessResponse" },
          },
        },
        description: "Successful response",
      },
      "400": { $ref: "#/components/responses/ValidationError" },
      "401": { $ref: "#/components/responses/UnauthorizedError" },
      "403": { $ref: "#/components/responses/ForbiddenError" },
      "404": { $ref: "#/components/responses/NotFoundError" },
      "500": { $ref: "#/components/responses/InternalError" },
    },
    security: entry.auth === "authenticated" ? [{ bearerAuth: [] }] : [],
    summary: `${entry.method} ${openApiPath}`,
    tags: [entry.tag],
  };
  if (entry.method === "POST") {
    paths[openApiPath][method].responses["201"] = paths[openApiPath][method].responses["200"];
  }
}

const spec = {
  components: {
    responses: {
      ForbiddenError: {
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApiErrorResponse" },
          },
        },
        description: "Forbidden",
      },
      InternalError: {
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApiErrorResponse" },
          },
        },
        description: "Internal server error",
      },
      NotFoundError: {
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApiErrorResponse" },
          },
        },
        description: "Resource not found",
      },
      UnauthorizedError: {
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApiErrorResponse" },
          },
        },
        description: "Authentication required",
      },
      ValidationError: {
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApiValidationErrorResponse" },
          },
        },
        description: "Validation failed",
      },
    },
    schemas: {
      ApiErrorResponse: {
        properties: {
          code: { example: "NOT_FOUND", type: "string" },
          message: { example: "Resource not found.", type: "string" },
          requestId: { example: "req_123", type: "string" },
          success: { enum: [false], type: "boolean" },
        },
        required: ["success", "code", "message"],
        type: "object",
      },
      ApiMeta: {
        properties: {
          engineVersion: { example: "sprint72-v1", type: "string" },
          requestId: { example: "req_123", type: "string" },
          timestamp: { format: "date-time", type: "string" },
        },
        type: "object",
      },
      ApiPaginatedResponse: {
        properties: {
          data: {
            properties: {
              items: { items: { type: "object" }, type: "array" },
              pagination: { $ref: "#/components/schemas/PaginationMeta" },
            },
            required: ["items", "pagination"],
            type: "object",
          },
          meta: { $ref: "#/components/schemas/ApiMeta" },
          success: { enum: [true], type: "boolean" },
        },
        required: ["success", "data"],
        type: "object",
      },
      ApiSuccessResponse: {
        properties: {
          data: { type: "object" },
          meta: { $ref: "#/components/schemas/ApiMeta" },
          success: { enum: [true], type: "boolean" },
        },
        required: ["success", "data"],
        type: "object",
      },
      ApiValidationErrorResponse: {
        allOf: [
          { $ref: "#/components/schemas/ApiErrorResponse" },
          {
            properties: {
              code: { example: "VALIDATION_ERROR", type: "string" },
              errors: { type: "object" },
            },
            type: "object",
          },
        ],
      },
      HealthStatus: {
        properties: {
          ok: { example: true, type: "boolean" },
          service: { example: "ecg-insight-api", type: "string" },
        },
        required: ["ok"],
        type: "object",
      },
      PaginationMeta: {
        properties: {
          page: { example: 1, minimum: 1, type: "integer" },
          pageSize: { example: 20, minimum: 1, type: "integer" },
          total: { example: 100, minimum: 0, type: "integer" },
          totalPages: { example: 5, minimum: 1, type: "integer" },
        },
        required: ["page", "pageSize", "total", "totalPages"],
        type: "object",
      },
    },
    securitySchemes: {
      bearerAuth: {
        bearerFormat: "JWT",
        scheme: "bearer",
        type: "http",
      },
      cookieAuth: {
        in: "cookie",
        name: "access_token",
        type: "apiKey",
      },
    },
  },
  info: {
    description: "ECG Insight Enterprise API — standardized contract (Sprint 72). Canonical base path: /api/v1.",
    title: "Api",
    version: "1.0.0",
  },
  openapi: "3.1.0",
  paths,
  servers: [
    { description: "Canonical API v1", url: "/api/v1" },
    { description: "Legacy alias (deprecated)", url: "/api" },
  ],
  tags,
};

const outJsonPath = path.join(root, "lib", "api-spec", "openapi.json");
writeFileSync(outJsonPath, `${JSON.stringify(spec, null, 2)}\n`, "utf8");
console.log(`Generated OpenAPI spec with ${inventory.length} operations -> lib/api-spec/openapi.json`);
