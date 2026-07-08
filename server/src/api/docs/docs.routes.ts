import { readFileSync } from "node:fs";
import path from "node:path";
import { Router } from "express";

const openapiJsonPath = path.join(process.cwd(), "lib", "api-spec", "openapi.json");

let cachedSpec: Record<string, unknown> | null = null;

export function loadOpenApiSpec() {
  if (!cachedSpec) {
    cachedSpec = JSON.parse(readFileSync(openapiJsonPath, "utf8")) as Record<string, unknown>;
  }
  return cachedSpec;
}

export const apiDocsRouter = Router();

apiDocsRouter.get("/openapi.json", (_req, res) => {
  res.json(loadOpenApiSpec());
});

apiDocsRouter.get("/openapi.yaml", (_req, res) => {
  res.redirect(307, "/api/v1/openapi.json");
});

apiDocsRouter.get("/docs", (_req, res) => {
  res.type("text/html").send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>ECG Insight Enterprise API</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: '/api/v1/openapi.json',
      dom_id: '#swagger-ui',
      deepLinking: true,
      presets: [SwaggerUIBundle.presets.apis],
      layout: 'BaseLayout'
    });
  </script>
</body>
</html>`);
});

apiDocsRouter.get("/standards", (_req, res) => {
  res.json({
    documentation: {
      changelog: "API_CHANGELOG.md",
      compatibility: "API_COMPATIBILITY_REPORT.md",
      consistency: "API_CONSISTENCY_REPORT.md",
      inventory: "API_INVENTORY.md",
      sprintReport: "SPRINT72_ENTERPRISE_API_STANDARDIZATION.md",
    },
    errorFormat: {
      fields: ["success", "code", "message", "requestId", "errors?"],
      success: false,
    },
    paginationFormat: {
      legacy: ["itemsKey", "page", "pageSize", "total", "totalPages"],
      standard: ["data.items", "data.pagination"],
    },
    successFormat: {
      fields: ["success", "data", "meta?"],
      success: true,
    },
    version: "sprint72-v1",
    versioning: {
      canonical: "/api/v1",
      legacyAlias: "/api",
    },
  });
});
