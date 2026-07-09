# Sprint 103 — UI Integration Adapter Layer Report

**Branch:** `feature/sprint103-ui-integration`  
**Date:** 2026-07-09  
**Mode:** Production — backend remains UI-independent

## Summary

Sprint 103 introduces a complete UI Integration Adapter Layer under `artifacts/ecg-insight/src/`. All future Bolt UI screens can consume typed ViewModels, contracts, and hooks without importing backend DTOs or calling REST services directly from components.

## Architecture

```
Database → Repositories → Services → Business Logic → API Controllers
                                                          ↓
                                              UI Integration Layer (src/)
                                                          ↓
                                              Legacy UI / Bolt UI
```

## Layer Structure

| Layer | Path | Responsibility |
|-------|------|----------------|
| Adapters | `src/adapters/` | Fetch, normalize, paginate, retry surface |
| Mappers | `src/mappers/` | DTO → ViewModel transformation |
| View Models | `src/view-models/` | UI-only typed properties |
| Presenters | `src/presenters/` | Labels, badges, dates, measurements |
| Contracts | `src/contracts/` | Screen-level typed interfaces |
| Hooks | `src/hooks/` | `data`, `loading`, `error`, `refresh()`, `actions()` |
| Selectors | `src/selectors/` | Derived dashboard/case/patient state |
| UI Services | `src/ui-services/` | Navigation, toast, dialog, theme, permissions, export |
| Migration | `src/migration/` | Legacy ↔ Bolt presentation switch |
| Errors | `src/errors/` | Standardized UI error taxonomy |

## Adapters Implemented

Dashboard, Patient, Case, ECG Workspace, ECG Viewer, Live Monitor, Upload, History, Profile, Settings, Organization, Subscription, Developer, Notification, Analytics, Auth

## Hooks Implemented

`useDashboard`, `usePatients`, `usePatient`, `useCases`, `useWorkspace`, `useViewer`, `useLiveMonitor`, `useUpload`, `useOrganizations`, `useSubscriptions`, `useDeveloper`, `useNotifications`, `useProfile`, `useHistory`, `useAnalytics`, `useSettings`, `useAuthSession`

## UI Migration Mode

- `getUiPresentationMode()` → `legacy` | `bolt`
- `EXPO_PUBLIC_UI_MODE=bolt` env override
- `selectPresentation(legacy, bolt)` helper for zero-backend-change UI swaps

## Preserved (Not Modified)

- Server APIs and business logic
- ECG Pro Viewer internals
- Live Monitor rendering engine
- Existing Sprint 102 domain services (`services/domain/`)

## Validation

| Check | Result |
|-------|--------|
| Sprint 103 unit test | PASS |
| Sprint 103 integration markers | PASS |
| Sprint 102 regression markers | PASS |
| `src/` TypeScript | PASS |
| `npm run lint` | PASS |

## Tests

- `scripts/sprint103-ui-integration-layer.test.ts`
- `scripts/sprint103-ui-integration-layer.integration.ts`

## Git

- Commit: `Sprint103_UIIntegrationLayer`
- Push: `feature/sprint103-ui-integration`

## Next Steps for Bolt Migration

1. Replace legacy presentation components with Bolt UI bound to `src/hooks/*`
2. Route each screen through `src/contracts/*` + `selectPresentation()`
3. Retire direct `@/services/*` imports from app routes incrementally
