# Component Replacement Matrix — Phase 1 / Sprint P1.1

**Legend:** P0 = immediate | P1 = core | P2 = clinical | P3 = defer  
**Risk:** Low | Medium | High | Critical

---

## Shell & Navigation

| Current Cursor Component | Equivalent Bolt Component | Priority | Dependencies | Risk | Adapter | Props | Context |
|--------------------------|---------------------------|----------|--------------|------|---------|-------|---------|
| `EnterpriseUI` (shell) | `app-layout.tsx` + `DesignSystemProvider` (sprint104) | P0 | AuthContext, NAV_ITEMS, pathname | **Critical** | `EnterpriseShellContract` | `children`, `fullBleed?` | AuthContext |
| `EnterpriseUI` sidebar | `app-sidebar.tsx` / shadcn Sidebar | P0 | role, nav items, logout | High | `NavigationContract` | `items[]`, `activePath` | AuthContext |
| `EnterpriseUI` header | `top-navbar.tsx` | P1 | page title, search, notifications | Medium | — | `title`, `subtitle` | AuthContext |
| `ProtectedRoute` | — (keep Cursor) | — | auth token | Low | — | — | AuthContext |
| `NAV_ITEMS` (inline) | `doctorNavItems` / `adminNavItems` | P0 | RBAC ranks | Medium | Route registry adapter | `role` | AuthContext |

---

## Primitives (from bolt-mapping.ts)

| Current Cursor Component | Equivalent Bolt Component | Priority | Dependencies | Risk | Adapter | Props | Context |
|--------------------------|---------------------------|----------|--------------|------|---------|-------|---------|
| `PrimaryButton` (EnterpriseUI) | `design-system/components/buttons` / shadcn `button.tsx` | P1 | haptics, loading | Low | Direct | `variant`, `onPress`, `loading` | — |
| `Card` (EnterpriseUI) | `design-system/components/cards` / shadcn `card.tsx` | P1 | tokens | Low | Direct | `children`, `style?` | ThemeEngine |
| `Badge` (EnterpriseUI) | shadcn `badge.tsx` | P1 | severity tones | Low | Direct | `tone`, `label` | — |
| `Field` / TextInput wrapper | shadcn `input.tsx` + `form.tsx` | P1 | zod validation | Medium | Form adapter | `label`, `error`, `value` | — |
| `PremiumModal` | shadcn `dialog.tsx` / `alert-dialog.tsx` | P1 | — | Low | Direct | `open`, `onClose`, `title` | — |
| `BottomSheet` | shadcn `drawer.tsx` / vaul | P2 | mobile | Medium | Direct | — | — |
| `ToastProvider` | sonner / shadcn toast | P1 | — | Medium | Toast adapter | `message`, `type` | — |
| `StatCard` / KPI tiles | shadcn `chart.tsx` + card | P1 | React Query data | Medium | DashboardContract | `label`, `value`, `trend` | — |
| `EmptyState` | shadcn `empty.tsx` | P1 | — | Low | Direct | `title`, `cta` | — |
| `PageSection` (tabs facade) | shadcn `tabs.tsx` | P2 | — | Low | Direct | `tabs[]` | — |
| Table (FlatList facade) | shadcn `table.tsx` | P1 | case/patient data | Medium | HistoryContract | `columns`, `rows` | — |
| `EcgCommandPalette` | shadcn `command.tsx` | P3 | viewer shortcuts | Medium | — | — | Viewer state |
| `EcgWorkstationLeftNav` | Bolt workspace sidebar | P2 | viewer tools | High | ViewerContract | `tools[]` | ECG case |

---

## Auth & Public

| Current Cursor Component | Equivalent Bolt Component | Priority | Dependencies | Risk | Adapter | Props | Context |
|--------------------------|---------------------------|----------|--------------|------|---------|-------|---------|
| `PremiumAuth` (login/register) | `pages/public/login.tsx`, `register.tsx` | P1 | oauth service | Medium | AuthFormContract | credentials | AuthContext |
| Inline legal pages | — (build in Bolt) | P2 | — | Low | — | — | — |
| `FullScreenLoader` | `design-system/components/loading` | P1 | — | Low | — | — | — |

---

## Dashboard & Cases

| Current Cursor Component | Equivalent Bolt Component | Priority | Dependencies | Risk | Adapter | Props | Context |
|--------------------------|---------------------------|----------|--------------|------|---------|-------|---------|
| `DashboardLegacyPresentation`* | Bolt Dashboard page | P1 | useDashboardData | Low | `boltUiAdapter.toDashboardContract` | `DashboardScreenContract` | AuthContext |
| Inline dashboard (main) | Same | P1 | React Query | Medium | Same adapter | Same | Same |
| `EcgCasesLegacyPresentation`* | `ecg-history.tsx` | P1 | useEcgCasesPage | Low | `toHistoryContract` | `HistoryScreenContract` | AuthContext |
| `AsyncStateView` | loading/error states in DS | P1 | — | Low | — | `isLoading`, `isError` | — |

\*On sprint104 branch only; main uses inline EnterpriseUI.

---

## Upload

| Current Cursor Component | Equivalent Bolt Component | Priority | Dependencies | Risk | Adapter | Props | Context |
|--------------------------|---------------------------|----------|--------------|------|---------|-------|---------|
| Inline `upload-ecg.tsx` UI | `upload-ecg.tsx` (Bolt) | P1 | uploadPipeline, ecgFiles, ai | Medium | UploadContract | files, progress, onSubmit | AuthContext |
| Upload preview/analyze panels | Bolt form + card layout | P1 | clinical service | Medium | Same | — | — |

---

## ECG Viewer (KEEP engine, replace chrome)

| Current Cursor Component | Equivalent Bolt Component | Priority | Dependencies | Risk | Adapter | Props | Context |
|--------------------------|---------------------------|----------|--------------|------|---------|-------|---------|
| `EcgProViewerFoundationScreen` | Bolt viewer shell (new) | P2 | ecgViewerApi, measurements | **Critical** | ViewerShellContract | `caseId` | AuthContext |
| `EcgProViewerWaveformCanvas` | **KEEP Cursor** | — | canvas engine | **Critical** | — | waveform data | — |
| `EcgProViewerMeasurementLayer` | **KEEP Cursor** | — | Sprint 96 | **Critical** | — | measurements | — |
| `EcgProViewerToolsPanel` | Bolt toolbar chrome | P2 | tool state | High | ToolsContract | `activeTool` | — |
| `EcgProViewer` | Shared wrapper | P2 | multiple panels | High | — | `caseId` | — |

---

## Monitor & Workspace

| Current Cursor Component | Equivalent Bolt Component | Priority | Dependencies | Risk | Adapter | Props | Context |
|--------------------------|---------------------------|----------|--------------|------|---------|-------|---------|
| `EcgEnterpriseWorkspaceScreen` | Bolt workspace layout (new) | P2 | ecgViewerWorkspace | **Critical** | WorkspaceContract | `caseId` | AuthContext |
| `EcgLiveMonitorWorkspaceScreen` | Bolt monitor layout (new) | P2 | hospital service | **Critical** | MonitorContract | `caseId` | AuthContext |
| `EcgExaminationWorkflowGate` | Bolt gate modal | P2 | examination workflow | High | — | — | — |
| `EcgLiveMonitorShell` | **KEEP Cursor** | — | realtime strip | **Critical** | — | — | — |

---

## Reports, Patients, Billing

| Current Cursor Component | Equivalent Bolt Component | Priority | Dependencies | Risk | Adapter | Props | Context |
|--------------------------|---------------------------|----------|--------------|------|---------|-------|---------|
| Inline reports list UI | shadcn table + card (new page) | P2 | reports service | Medium | ReportsListContract | filters | AuthContext |
| Inline report detail | Bolt detail layout (new) | P2 | reportsDomain | Medium | ReportDetailContract | `id` | — |
| Inline patients list | Bolt patients (new) | P2 | clinical service | Medium | PatientsContract | pagination | — |
| Patient detail (7 tabs) | Bolt patient chart (new) | P2 | documents, reports | High | PatientDetailContract | `id` | — |
| `billing-subscription.tsx` inline | Bolt billing (new) | P2 | subscriptions | Medium | SubscriptionContract | plan, quota | AuthContext |
| `profile.tsx` inline | `profile.tsx` (Bolt) | P1 | user from Auth | Low | ProfileContract | user fields | AuthContext |

---

## Copilot (defer)

| Current Cursor Component | Equivalent Bolt Component | Priority | Dependencies | Risk | Adapter | Props | Context |
|--------------------------|---------------------------|----------|--------------|------|---------|-------|---------|
| `CopilotResizableWorkspace` | **KEEP Cursor** | P3 | copilot service | High | — | `conversationId?` | AuthContext |
| `CopilotComposer` | **KEEP Cursor** | P3 | streaming | High | — | — | — |

---

## Charts & Analytics

| Current Cursor Component | Equivalent Bolt Component | Priority | Dependencies | Risk | Adapter | Props | Context |
|--------------------------|---------------------------|----------|--------------|------|---------|-------|---------|
| Custom SVG sparklines | Recharts / `chart.tsx` | P2 | analytics data | Medium | ChartContract | `series` | — |
| Dashboard KPI animations | Bolt StatCard + chart | P1 | enterprise metrics | Low | DashboardContract | — | — |
| `analytics.tsx` inline | Bolt analytics (new) | P3 | ai, clinical | Medium | — | — | — |

---

## Summary Counts

| Priority | Components |
|----------|------------|
| P0 | 3 (shell, sidebar, nav registry) |
| P1 | 18 |
| P2 | 16 |
| P3 | 5 |
| KEEP Cursor | 8 (clinical engines + copilot + auth gate) |
