# Sprint 55 — Permission Matrix

## Enterprise Permissions (21 keys)

| Permission | Description | Default Roles |
|------------|-------------|---------------|
| `patient.create` | Create patients | Org Admin, Doctor, Reception |
| `patient.delete` | Delete patients | Org Admin |
| `patient.view` | View patients | All clinical roles + Viewer |
| `ecg.analyze` | Run ECG analysis | Doctor, Consultant, Technician, Resident, Researcher |
| `ecg.upload` | Upload ECG files | Doctor, Technician, Nurse |
| `report.approve` | Approve clinical reports | Org Admin, Medical Director, Consultant |
| `report.export_pdf` | Export PDF reports | Org Admin, Doctor, Consultant, Researcher |
| `ai.view` | View AI findings | Most clinical roles |
| `ai.manage` | Configure AI settings | Org Admin |
| `billing.manage` | Manage billing | Org Admin |
| `user.manage` | Manage users | Org Admin |
| `user.invite` | Invite users | Org Admin |
| `device.manage` | Manage devices | Org Admin |
| `audit.access` | View audit logs | Org Admin, Medical Director, Auditor |
| `organization.manage` | Edit organization | Org Admin |
| `department.manage` | Manage departments | Org Admin |
| `branch.manage` | Manage branches | Org Admin |
| `branding.manage` | Manage branding | Org Admin |
| `subscription.manage` | Change subscription | Org Admin |
| `settings.manage` | Organization settings | Org Admin |
| `notification.manage` | Send notifications | Org Admin |

## Enforcement

```typescript
requirePermission("patient.create", "ecg.analyze")
```

Checks `OrganizationMember.enterpriseRole.permissions` JSON array. Platform admins bypass via `OWNER`/`SUPER_ADMIN` role rank.

## Department Presets

`CARDIOLOGY`, `EMERGENCY`, `ICU`, `CCU`, `INTERNAL_MEDICINE`, `OCCUPATIONAL_MEDICINE`, `OUTPATIENT_CLINIC`, `ADMINISTRATION`, `CUSTOM`
