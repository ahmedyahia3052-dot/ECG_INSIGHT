/** Sprint 84 — OpenAPI path fragments for organization domain. */

export const ORGANIZATION_DOMAIN_OPENAPI_TAG = "Organization Domain";

export const organizationDomainOpenApiPaths = {
  "/organization-domain/organizations": {
    get: {
      tags: [ORGANIZATION_DOMAIN_OPENAPI_TAG],
      summary: "List organizations (paginated, searchable, sortable)",
      parameters: [
        { in: "query", name: "page", schema: { type: "integer", default: 1 } },
        { in: "query", name: "pageSize", schema: { type: "integer", default: 25 } },
        { in: "query", name: "q", schema: { type: "string" } },
        { in: "query", name: "sortBy", schema: { type: "string", enum: ["name", "createdAt", "status"] } },
        { in: "query", name: "sortDir", schema: { type: "string", enum: ["asc", "desc"] } },
      ],
      responses: { 200: { description: "Paginated organization list" } },
    },
    post: {
      tags: [ORGANIZATION_DOMAIN_OPENAPI_TAG],
      summary: "Create organization",
      responses: { 201: { description: "Organization created" } },
    },
  },
  "/organization-domain/organizations/{organizationId}": {
    get: { tags: [ORGANIZATION_DOMAIN_OPENAPI_TAG], summary: "Get organization by ID", responses: { 200: { description: "Organization detail" } } },
    patch: { tags: [ORGANIZATION_DOMAIN_OPENAPI_TAG], summary: "Update organization", responses: { 200: { description: "Organization updated" } } },
    delete: { tags: [ORGANIZATION_DOMAIN_OPENAPI_TAG], summary: "Soft-delete organization", responses: { 200: { description: "Organization soft-deleted" } } },
  },
  "/organization-domain/organizations/{organizationId}/departments": {
    get: { tags: [ORGANIZATION_DOMAIN_OPENAPI_TAG], summary: "List departments", responses: { 200: { description: "Paginated departments" } } },
    post: { tags: [ORGANIZATION_DOMAIN_OPENAPI_TAG], summary: "Create department", responses: { 201: { description: "Department created" } } },
  },
  "/organization-domain/departments/{departmentId}": {
    get: { tags: [ORGANIZATION_DOMAIN_OPENAPI_TAG], summary: "Get department", responses: { 200: { description: "Department detail" } } },
    patch: { tags: [ORGANIZATION_DOMAIN_OPENAPI_TAG], summary: "Update department", responses: { 200: { description: "Department updated" } } },
    delete: { tags: [ORGANIZATION_DOMAIN_OPENAPI_TAG], summary: "Soft-delete department", responses: { 200: { description: "Department soft-deleted" } } },
  },
  "/organization-domain/organizations/{organizationId}/employees": {
    get: { tags: [ORGANIZATION_DOMAIN_OPENAPI_TAG], summary: "List employees", responses: { 200: { description: "Paginated employees" } } },
    post: { tags: [ORGANIZATION_DOMAIN_OPENAPI_TAG], summary: "Create employee", responses: { 201: { description: "Employee created" } } },
  },
  "/organization-domain/employees/{employeeId}": {
    get: { tags: [ORGANIZATION_DOMAIN_OPENAPI_TAG], summary: "Get employee", responses: { 200: { description: "Employee detail" } } },
    patch: { tags: [ORGANIZATION_DOMAIN_OPENAPI_TAG], summary: "Update employee", responses: { 200: { description: "Employee updated" } } },
    delete: { tags: [ORGANIZATION_DOMAIN_OPENAPI_TAG], summary: "Soft-delete employee (terminate)", responses: { 200: { description: "Employee terminated" } } },
  },
  "/organization-domain/patients": {
    get: { tags: [ORGANIZATION_DOMAIN_OPENAPI_TAG], summary: "List patients", responses: { 200: { description: "Paginated patients" } } },
    post: { tags: [ORGANIZATION_DOMAIN_OPENAPI_TAG], summary: "Create patient", responses: { 201: { description: "Patient created" } } },
  },
  "/organization-domain/patients/{patientId}": {
    get: { tags: [ORGANIZATION_DOMAIN_OPENAPI_TAG], summary: "Get patient", responses: { 200: { description: "Patient detail" } } },
    patch: { tags: [ORGANIZATION_DOMAIN_OPENAPI_TAG], summary: "Update patient", responses: { 200: { description: "Patient updated" } } },
    delete: { tags: [ORGANIZATION_DOMAIN_OPENAPI_TAG], summary: "Soft-delete patient", responses: { 200: { description: "Patient soft-deleted" } } },
  },
  "/organization-domain/organizations/{organizationId}/doctors": {
    get: { tags: [ORGANIZATION_DOMAIN_OPENAPI_TAG], summary: "List doctors in organization", responses: { 200: { description: "Paginated doctors" } } },
  },
  "/organization-domain/doctors/{doctorId}": {
    get: { tags: [ORGANIZATION_DOMAIN_OPENAPI_TAG], summary: "Get doctor profile", responses: { 200: { description: "Doctor detail" } } },
    patch: { tags: [ORGANIZATION_DOMAIN_OPENAPI_TAG], summary: "Update doctor profile", responses: { 200: { description: "Doctor updated" } } },
  },
  "/organization-domain/cases": {
    get: { tags: [ORGANIZATION_DOMAIN_OPENAPI_TAG], summary: "List ECG cases", responses: { 200: { description: "Paginated cases" } } },
    post: { tags: [ORGANIZATION_DOMAIN_OPENAPI_TAG], summary: "Create ECG case", responses: { 201: { description: "Case created" } } },
  },
  "/organization-domain/cases/{caseId}": {
    get: { tags: [ORGANIZATION_DOMAIN_OPENAPI_TAG], summary: "Get ECG case", responses: { 200: { description: "Case detail" } } },
    patch: { tags: [ORGANIZATION_DOMAIN_OPENAPI_TAG], summary: "Update ECG case", responses: { 200: { description: "Case updated" } } },
    delete: { tags: [ORGANIZATION_DOMAIN_OPENAPI_TAG], summary: "Soft-delete ECG case", responses: { 200: { description: "Case soft-deleted" } } },
  },
  "/organization-domain/organizations/{organizationId}/audit": {
    get: { tags: [ORGANIZATION_DOMAIN_OPENAPI_TAG], summary: "Organization audit trail", responses: { 200: { description: "Paginated audit logs" } } },
  },
} as const;

export const ORGANIZATION_DOMAIN_VERSION = "sprint84-v1";
