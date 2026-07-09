# Bolt Mapping — Sprint 103.5 Pre-Migration Audit

**Purpose:** Map every Cursor (current) page to its Bolt replacement strategy.  
**Status legend:** Ready | Needs Adapter | Keep Cursor | Replace

---

## Primary Product Surfaces

| Cursor Page | Route | Bolt Target | Status | Notes |
|-------------|-------|-------------|--------|-------|
| **Dashboard** | `/dashboard` | Bolt Dashboard | **Ready** | `DashboardContainer` + `boltUiAdapter.toDashboardContract`; swap `DashboardLegacyPresentation` |
| **Cases (History)** | `/ecg-cases` | Bolt Cases / History | **Ready** | `EcgCasesContainer` + `toHistoryContract` |
| **Case Detail** | `/ecg-cases/:id` | Bolt Case Detail + Viewer embed | **Needs Adapter** | Inline `EnterpriseUI`; extract container + viewer contract |
| **Upload** | `/upload-ecg` | Bolt Upload | **Replace** | Rebuild with Bolt form + upload pipeline hook |
| **Workspace** | `/ecg-workspace` | Bolt Workspace | **Replace** | `EcgEnterpriseWorkspaceScreen` — high complexity, preserve measurement APIs |
| **Viewer (Pro)** | `/ecg-viewer` | Bolt Viewer | **Replace** | `EcgProViewerFoundationScreen` — keep canvas/measurement layer as **Cursor Shared** |
| **Monitor** | `/ecg-monitor/:caseId` | Bolt Monitor | **Replace** | Alias of workspace pattern; unify with workspace Bolt screen |
| **Live Monitor** | `/ecg-live-monitor` | Bolt Live Monitor | **Replace** | Gate + realtime; preserve hospital service integration |
| **Reports** | `/reports`, `/reports/:id` | Bolt Reports | **Needs Adapter** | List + detail; wire `reports-service` via adapter |
| **Profile** | `/profile` | Bolt Profile | **Replace** | Simple form surface |
| **Subscription** | `/billing-subscription` | Bolt Billing | **Replace** | `subscriptions` service via adapter |
| **Developer / Admin** | `/admin-dashboard`, `/audit-log`, `/owner/licenses` | Bolt Admin (or Keep Cursor) | **Keep Cursor** (phase 2) | Low traffic; defer to post-core migration |
| **Status** | `/system-status` | Bolt Status (public) | **Replace** | Public health page; low risk first swap |

---

## Secondary / Supporting Pages

| Cursor Page | Route | Bolt Target | Status |
|-------------|-------|-------------|--------|
| Patients List | `/patients` | Bolt Patients | Needs Adapter |
| Patient Detail | `/patients/:id` | Bolt Patient Chart | Needs Adapter |
| Patient Create/Edit | `/patients/create`, `/patients/:id/edit` | Bolt Patient Form | Replace |
| ECG Analysis | `/ecg-analysis` | Bolt Analysis | Needs Adapter |
| Clinical Workspace | `/clinical-workspace/:caseId` | Merge into Bolt Viewer | Replace |
| Copilot | `/copilot`, `/copilot/:conversationId` | **Keep Cursor** | Resizable workspace; Bolt has no equivalent yet |
| Analytics | `/analytics` | Bolt Analytics | Needs Adapter |
| Notifications | `/notifications` | Bolt Notifications | Replace |
| Settings | `/settings` | Bolt Settings | Replace |
| Team Management | `/team-management` | Bolt Team | Keep Cursor (admin) |
| Support | `/support`, `/contact-support` | Bolt Support | Replace (public + auth) |
| Auth (login/register/…) | `/login`, `/register`, … | Bolt Auth | Replace |
| ECG Benchmark | `/ecg-benchmark` | — | **Keep Cursor** (internal QA) |
| Release Candidate | `/release-candidate` | — | **Keep Cursor** (internal) |

---

## Route Consolidation (pre-Bolt)

| Duplicate | Resolution |
|-----------|------------|
| `/patients/new` → `/patients/create` | Redirect or delete `/patients/new` after Bolt |
| `/ecg-monitor/:caseId` vs `/ecg-workspace?caseId=` | Single Bolt Workspace route |
| `/copilot` vs `/copilot/:conversationId` | Keep both; same Bolt shell component |
| `/contact-support` vs `/support` | Single Bolt Support with auth variant |
| Duplicate nav entry for `/team-management` | Dedupe in `APP_NAV_ITEMS` |

---

## Existing Bolt Assets

| Asset | Path | Coverage |
|-------|------|----------|
| UI adapter | `adapters/bolt/bolt-ui.adapter.ts` | Dashboard, History |
| Component mapping | `presentation/design-system/bolt-mapping.ts` | 16 primitives (Sprint 78) |
| Replacement manifest | `migration/bolt-replacement-manifest.ts` | `BOLT_REPLACEMENT_MANIFEST`, `BOLT_PRESERVE_MANIFEST` |
| UI mode flag | `src/migration/ui-migration-mode.ts` | `EXPO_PUBLIC_UI_MODE=bolt` |
| Legacy presentations | `legacy-ui/screens/` | Dashboard, ECG Cases only |

---

## Mapping Summary

| Status | Count (primary surfaces) |
|--------|--------------------------|
| Ready | 2 (Dashboard, Cases) |
| Needs Adapter | 6 |
| Replace | 10 |
| Keep Cursor | 4 (Copilot, Admin, Benchmark, RC) |

---

## Bolt Import Prerequisites

1. Container + contract pattern extended to Upload, Viewer, Workspace, Reports, Profile, Subscription.
2. `EXPO_PUBLIC_UI_MODE=bolt` feature flag per route.
3. No direct `@/services/*` imports in Bolt components (adapter-only).
4. ECG canvas, measurement layer, and CDSS panels remain **Cursor Shared** per `BOLT_PRESERVE_MANIFEST`.
