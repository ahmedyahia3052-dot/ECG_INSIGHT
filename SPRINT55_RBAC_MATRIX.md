# Sprint 55 — RBAC Matrix

## System Roles (14)

| Role | Slug | Scope | Key Capabilities |
|------|------|-------|------------------|
| Developer | `developer` | Platform | All permissions |
| Super Admin | `super_admin` | Platform | All permissions |
| Organization Admin | `organization_admin` | Organization | Full org management except platform |
| Medical Director | `medical_director` | Organization | Clinical approval, audit |
| Consultant | `consultant` | Organization | Analyze, approve reports |
| Doctor | `doctor` | Organization | Patient CRUD, ECG analyze |
| Resident | `resident` | Organization | View + analyze |
| Technician | `technician` | Organization | Upload + analyze ECG |
| Nurse | `nurse` | Organization | View + upload |
| Reception | `reception` | Organization | Patient create/view |
| Auditor | `auditor` | Organization | Audit access + view |
| Researcher | `researcher` | Organization | View, analyze, export |
| Student | `student` | Organization | View + AI |
| Viewer | `viewer` | Organization | Patient view only |

## Platform vs Organization Scope

| Action | Developer | Super Admin | Org Admin | Doctor | Viewer |
|--------|-----------|-------------|-----------|--------|--------|
| Create organization | ✓ | ✓ | — | — | — |
| Delete organization | ✓ | ✓ | — | — | — |
| Manage subscription | ✓ | ✓ | ✓ | — | — |
| Invite users | ✓ | ✓ | ✓ | — | — |
| Analyze ECG | ✓ | ✓ | ✓ | ✓ | — |
| Approve report | ✓ | ✓ | ✓ | — | — |
| Audit access | ✓ | ✓ | ✓ | — | ✓ |

## Tenant Isolation

- `requireTenantAccess()` enforces `user.organizationId === :organizationId`
- Platform roles bypass tenant check
- Cross-tenant requests return `403 TENANT_FORBIDDEN`

## Custom Roles

Organizations can create custom roles via `POST /:organizationId/roles` with arbitrary permission subsets from the 21-key catalog.
