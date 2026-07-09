# UI Inventory — Sprint 103.5 Pre-Migration Audit

**Project:** ECG Insight Enterprise  
**Frontend:** `artifacts/ecg-insight` (Expo Router ~6)  
**Audit date:** 2026-07-09  
**Scope:** Documentation only — no UI or backend changes

---

## Layout Hierarchy

| Layout | Path | Wraps |
|--------|------|-------|
| Root | `app/_layout.tsx` | All routes — QueryClient, ThemeEngine, Auth, Toast, Stack |
| Protected | `app/(protected)/_layout.tsx` | `ProtectedRoute` → `EnterpriseShell` → child routes |

---

## Public Routes (12)

| Page | Route | Layout | Primary Components | Hooks | Services | State | Permissions |
|------|-------|--------|------------------|-------|----------|-------|-------------|
| Index | `/` | Root | `FullScreenLoader` | `useAuth` | — | Auth redirect | Public |
| Login | `/login` | Root | `PremiumAuth` | `useAuth`, `useAuthOAuthProviders` | `oauth` | Auth | Public |
| Register | `/register` | Root | `PremiumAuth` | `useAuth`, `useAuthOAuthProviders` | `oauth` | Auth + zod | Public |
| Forgot Password | `/forgot-password` | Root | `PremiumAuth` | `useAuth` | — | Auth | Public |
| Verify Email | `/verify-email` | Root | `PremiumAuth` | `useAuth` | — | Auth | Public |
| Privacy Policy | `/privacy-policy` | Root | `PremiumAuth` | — | — | — | Public |
| Terms of Service | `/terms-of-service` | Root | `PremiumAuth` | — | — | — | Public |
| Contact Support | `/contact-support` | Root | `PremiumAuth` | — | `support` | Form | Public |
| System Status | `/system-status` | Root | `PremiumAuth` | — | `systemStatus` | Live health | Public |
| Onboarding | `/onboarding` | Root | `Premium` | `useColors` | AsyncStorage | Carousel | Public (orphan — not in Stack) |
| Unauthorized | `/unauthorized` | Root | Inline | `useColors` | — | — | Public (orphan) |
| Not Found | `/*` | Root | Inline | `useColors` | — | — | Public |

---

## Protected Routes — Core Clinical (Bolt priority)

| Page | Route | Layout | Components | Hooks | Services | Adapters | State | Permissions |
|------|-------|--------|------------|-------|----------|----------|-------|-------------|
| Dashboard | `/dashboard` | Protected | `DashboardContainer` → `DashboardLegacyPresentation` | `useDashboardData` | clinical, collaboration, subscriptions | `boltUiAdapter` | React Query + contract | Authenticated |
| ECG Cases (History) | `/ecg-cases` | Protected | `EcgCasesContainer` → `EcgCasesLegacyPresentation` | `useEcgCasesPage` | `clinical` | `boltUiAdapter` | React Query + filters | Authenticated |
| ECG Case Detail | `/ecg-cases/:id` | Protected | `EnterpriseUI`, `EcgProViewer`, `CaseCollaborationPanel`, `CDSSDecisionPanel` | `useEcgCaseDetail`, `useAuth` | clinical, ai | `clinical-ui.adapter` | React Query | Authenticated |
| ECG Case New | `/ecg-cases/new` | Protected | `EnterpriseUI` | `useAuth`, React Query | `clinical` | — | Mutation | Authenticated |
| ECG Case Review | `/ecg-cases/:id/review` | Protected | `EnterpriseUI` | `useAuth`, `useQueryClient` | ai, clinical, reports | — | Mutation | Doctor+ |
| Upload ECG | `/upload-ecg` | Protected | `EnterpriseUI` | `useAuth` | ai, clinical, ecgFiles | — | Upload pipeline | Authenticated |
| ECG Viewer (Pro) | `/ecg-viewer` | Protected (full-bleed) | `EcgProViewerFoundationScreen` | `useAuth`, `useEcgWorkspaceCaseResolver` | `ecgViewerApi`, `clinicalMeasurementApi` | — | Local + Query | Authenticated |
| ECG Workspace | `/ecg-workspace` | Protected (full-bleed) | `EcgEnterpriseWorkspaceScreen` | `useAuth`, `useEcgWorkspaceCaseResolver` | ecgViewer, clinical | — | Workspace store | Authenticated |
| ECG Monitor | `/ecg-monitor/:caseId` | Protected (full-bleed) | `EcgEnterpriseWorkspaceScreen` | — | — | — | Direct param | Authenticated |
| Live Monitor | `/ecg-live-monitor` | Protected (full-bleed) | `EcgLiveMonitorWorkspaceScreen`, `EcgExaminationWorkflowGate` | `useAuth`, resolver | hospital | — | Gate + Query | Authenticated |
| Live Monitor (param) | `/ecg-live-monitor/:caseId` | Protected (full-bleed) | `EcgLiveMonitorWorkspaceScreen` | — | — | — | Direct param | Authenticated |
| Clinical Workspace | `/clinical-workspace/:caseId` | Protected | `EcgProViewer`, `EcgAiDiagnosisPanel` | `useAuth`, React Query | ai, clinical, ecgProcessing | — | React Query | Authenticated |
| ECG Analysis | `/ecg-analysis` | Protected | `EnterpriseUI` | `useAuth` | ai, clinical, reports | — | React Query | Authenticated |
| ECG Benchmark | `/ecg-benchmark` | Protected | `EnterpriseUI` | `useAuth` | `ecgBenchmark` | — | React Query | Admin |

---

## Protected Routes — Patients & Reports

| Page | Route | Layout | Components | Hooks | Services | State | Permissions |
|------|-------|--------|------------|-------|----------|-------|-------------|
| Patients List | `/patients` | Protected | `EnterpriseUI` | `usePatientsPage`, `useAuth` | `clinical` | React Query | Authenticated |
| Patient Create | `/patients/create` | Protected | `EnterpriseUI` | `useAuth`, mutation | `clinical` | zod form | Authenticated |
| Patient New (alias) | `/patients/new` | Protected | Re-exports `create` | Same | Same | Same | Authenticated |
| Patient Detail | `/patients/:id` | Protected | `EnterpriseUI` (7 tabs) | `useAuth`, React Query | clinical, documents, reports | React Query | Authenticated |
| Patient Edit | `/patients/:id/edit` | Protected | `EnterpriseUI` | `useAuth` | `clinical` | Form | Authenticated |
| Reports List | `/reports` | Protected | `EnterpriseUI` | `useAuth` | `reports` | React Query | Authenticated |
| Report Detail | `/reports/:id` | Protected | `EnterpriseUI`, `AsyncStateView` | `useAuth` | reports, reportsDomain | React Query | Authenticated |

---

## Protected Routes — Platform & Admin

| Page | Route | Layout | Components | Hooks | Services | Permissions |
|------|-------|--------|------------|-------|----------|-------------|
| Copilot | `/copilot` | Protected (full-bleed) | `CopilotResizableWorkspace`, `CopilotComposer` | `useAuth` | copilot, copilotUpload | Authenticated |
| Copilot Thread | `/copilot/:conversationId` | Protected (full-bleed) | Same as `/copilot` | — | copilot | Authenticated |
| Analytics | `/analytics` | Protected | `EnterpriseUI` | `useAuth` | ai, clinical, reports | Authenticated |
| Notifications | `/notifications` | Protected | `EnterpriseUI` | `useAuth` | collaboration | Authenticated |
| Settings | `/settings` | Protected | `EnterpriseUI` | `useAuth` | preferences | Authenticated |
| Profile | `/profile` | Protected | `EnterpriseUI` | `useAuth` | — | Authenticated |
| Team Management | `/team-management` | Protected | `EnterpriseUI` | `useAuth` (managedUsers) | — | Admin |
| Support (auth) | `/support` | Protected | `EnterpriseUI` | `useAuth` | support | Authenticated |
| Admin Dashboard | `/admin-dashboard` | Protected | `EnterpriseUI` | `useAuth` | collaboration, clinical, subscriptions | Admin |
| Audit Log | `/audit-log` | Protected | `EnterpriseUI` | `useAuth` | enterpriseClinical | Admin |
| Billing / Subscription | `/billing-subscription` | Protected | `EnterpriseUI` | `useAuth` | subscriptions | Authenticated |
| Owner Licenses | `/owner/licenses` | Protected | `EnterpriseUI` | `useOwnerLicensesPage` | subscriptions | Owner |
| Release Candidate | `/release-candidate` | Protected | `EnterpriseUI` | `useAuth` | releaseCandidate | Owner |

---

## Container / Adapter Pattern (Bolt-ready)

| Route | Container | Adapter | Legacy Presentation | Bolt Status |
|-------|-----------|---------|---------------------|-------------|
| `/dashboard` | `DashboardContainer` | `boltUiAdapter.toDashboardContract` | `DashboardLegacyPresentation` | **Ready for Bolt swap** |
| `/ecg-cases` | `EcgCasesContainer` | `boltUiAdapter.toHistoryContract` | `EcgCasesLegacyPresentation` | **Ready for Bolt swap** |
| All other routes | Inline in route file | Partial / none | `EnterpriseUI` monolith | **Needs adapter** |

---

## Shared Dependencies (all protected pages)

| Layer | Path | Role |
|-------|------|------|
| Shell | `components/enterprise/EnterpriseUI.tsx` | Layout, sidebar, nav, RBAC |
| Auth | `context/AuthContext.tsx` | Session, roles, impersonation |
| Nav registry | `routes/` (`APP_NAV_ITEMS`) | Sidebar items, page meta |
| API | `services/api.ts` | HTTP client, `ApiError` |
| Query | `@tanstack/react-query` | Server state (30s staleTime) |
| Design tokens | `design-system/`, `presentation/tokens/` | Parallel token systems |

---

## Full-Bleed Routes (no sidebar padding)

`/copilot`, `/ecg-monitor/*`, `/ecg-workspace`, `/ecg-viewer`, `/ecg-live-monitor` — configured in `EnterpriseShell`.

---

## Route Count Summary

| Category | Count |
|----------|-------|
| Public pages | 12 |
| Protected pages | 34 |
| **Total route files** | **46** |
| Container-pattern pages | 2 |
| Bolt adapter contracts | 2 (`DashboardScreenContract`, `HistoryScreenContract`) |
