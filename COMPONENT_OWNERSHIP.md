# Component Ownership — Sprint 103.5 Pre-Migration Audit

**Owners:** Bolt | Cursor | Shared  
**Rule:** Bolt owns presentation; Cursor owns clinical canvas, adapters, and services; Shared owns design tokens during transition.

---

## Shell & Navigation

| Component | Location | Owner | Post-Migration |
|-----------|----------|-------|----------------|
| Sidebar | `EnterpriseUI.tsx` | **Bolt** | Replace with Bolt shell |
| Header / Top bar | `EnterpriseUI.tsx` | **Bolt** | Replace |
| Nav items registry | `routes/` | **Shared** | Bolt reads same route meta |
| ProtectedRoute | `components/auth/` | **Cursor** | Keep — auth gate |
| EnterpriseShell | `EnterpriseUI.tsx` | **Bolt** | Replace layout wrapper |
| Full-bleed wrapper | `EnterpriseUI.tsx` | **Bolt** | Keep behavior in Bolt shell |

---

## Primitives (from `bolt-mapping.ts` + audit)

| Component | Current | Owner | Notes |
|-----------|---------|-------|-------|
| **Button** | `design-system/Button`, `PremiumInteraction` | **Bolt** | Consolidate to Bolt Button |
| **Card** | `design-system/Card`, inline `EnterpriseUI` cards | **Bolt** | |
| **Dialog** | `PremiumInteraction` modals | **Bolt** | |
| **Table** | Inline FlatList / custom tables | **Bolt** | No dedicated table lib |
| **Forms** | zod + inline TextInput | **Bolt** | Keep zod schemas in Cursor adapters |
| **Toast** | `ToastProvider` / PremiumInteraction | **Bolt** | Custom impl today |
| **Charts** | Custom SVG, dashboard KPI tiles | **Shared** → **Bolt** | No chart library; KPI tiles Bolt-owned |
| **Icons** | `@expo/vector-icons`, `expo-symbols` | **Bolt** | Single icon set in Bolt |
| **Date display** | Native `Date` / `toLocaleString` | **Bolt** | No date-fns/dayjs yet |

---

## Clinical Surfaces

| Component | Location | Owner | Notes |
|-----------|----------|-------|-------|
| **Viewer** | `EcgProViewer*`, `ecg-viewer/` | **Shared** | Canvas + measurements = Cursor; chrome = Bolt |
| **Monitor** | `EcgLiveMonitorWorkspaceScreen` | **Shared** | Realtime strip = Cursor |
| **Workspace** | `EcgEnterpriseWorkspaceScreen` | **Shared** | Layout Bolt; tools Cursor |
| ECG Canvas | `components/ecg/` | **Cursor** | Preserve — not in Bolt |
| Measurement layer | `EcgProViewerMeasurementLayer` | **Cursor** | Sprint 96 integration |
| Caliper / tools panel | `EcgProViewerToolsPanel` | **Cursor** | |
| CDSS panel | `CDSSDecisionPanel` | **Cursor** | Clinical logic |
| AI diagnosis panel | `EcgAiDiagnosisPanel` | **Cursor** | |
| Upload pipeline | `upload-ecg` dynamic import | **Cursor** | Bolt UI wraps hook |

---

## Screen Presentations

| Screen | Current | Owner |
|--------|---------|-------|
| Dashboard | `DashboardLegacyPresentation` | **Bolt** (contract ready) |
| ECG Cases | `EcgCasesLegacyPresentation` | **Bolt** |
| All other pages | Inline in route files | **Bolt** (after migration) |
| Copilot workspace | `CopilotResizableWorkspace` | **Cursor** (keep) |
| Auth screens | `PremiumAuth` | **Bolt** |
| Async states | `AsyncStateView` | **Shared** |

---

## Data & State Layer (always Cursor)

| Layer | Owner |
|-------|-------|
| `services/*` | **Cursor** |
| `adapters/bolt/*` | **Cursor** |
| `containers/*` | **Cursor** |
| `hooks/domain/*`, `src/hooks/*` | **Cursor** |
| React Query keys | **Cursor** |
| Zustand stores | **Cursor** |
| AuthContext | **Cursor** |

---

## Design Tokens (transition)

| System | Path | Owner | Action |
|--------|------|-------|--------|
| medicalTheme | legacy | **Cursor** | Delete after Bolt tokens |
| presentation/tokens | Sprint 103 | **Shared** | Merge into Bolt |
| design-system/tokens | Sprint 104 | **Bolt** | Canonical post-migration |

---

## Ownership Summary

| Owner | Responsibility |
|-------|----------------|
| **Bolt** | Layout, sidebar, header, buttons, cards, dialogs, tables, forms, toasts, auth UI, dashboard/cases chrome |
| **Cursor** | Services, adapters, containers, ECG canvas, measurements, CDSS, copilot, upload pipeline, auth context |
| **Shared** | Route registry, AsyncStateView, token bridge during migration |
