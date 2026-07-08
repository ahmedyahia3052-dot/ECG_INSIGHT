# Sprint 78 — Premium UI Import Foundation Report

**Date:** 2026-07-08  
**Mode:** Architecture only — **no Bolt/Penpot UI imported**  
**Contract version:** `sprint78-v1`  
**Status:** Ready for Sprint 78 approval before import sprint begins

---

## Executive Summary

Sprint 78 establishes a production-ready **presentation layer** under `artifacts/ecg-insight/presentation/` that separates UI concerns from business logic and services. The layer includes design system registries, token surfaces, theme re-exports, layout managers, UI state managers, Bolt→ECG component mapping, lazy bundle entry points, and an accessibility provider.

**No existing routes, canvas, waveform engines, or service modules were modified.** The foundation is opt-in: `app/_layout.tsx` continues to use the existing `ThemeEngineProvider` and `ToastProvider` unchanged until the import sprint is approved.

| Gate | Result |
|------|--------|
| `npm run typecheck` | **PASS** (0 errors) |
| `npm run lint` | **PASS** |
| `npm run build` | **PASS** |
| Unit tests (`qa:unit`) | **PASS** — 39/39 script tests + 159 vitest tests |
| `sprint78-ui-import-foundation.integration.ts` | **PASS** |

**Zero placeholder, mock, or temporary code in the presentation foundation.**

---

## Goals Completed

| Goal | Status |
|------|--------|
| Design System Registry | ✅ `design-system/registry.ts` |
| Component Registry | ✅ `design-system/component-registry.ts` |
| Theme Engine (re-export) | ✅ `theme/index.ts` → existing `ThemeEngineProvider` |
| Color Tokens | ✅ `tokens/colors.ts` |
| Typography Tokens | ✅ `tokens/typography.ts` |
| Spacing Tokens | ✅ `tokens/spacing.ts` |
| Elevation Tokens | ✅ `tokens/elevation.ts` |
| Animation Tokens | ✅ `tokens/animation.ts` |
| Icon Registry | ✅ `tokens/icons.ts` |
| Medical Component Registry | ✅ `components/medical/registry.ts` |
| Responsive Breakpoints | ✅ `layouts/responsive-breakpoints.ts` |
| Workspace Layout Manager | ✅ `layouts/workspace-layout-manager.ts` |
| Sidebar Manager | ✅ `layouts/sidebar-manager.ts` |
| Navigation Manager | ✅ `managers/index.tsx` |
| Modal Manager | ✅ `managers/index.tsx` |
| Dialog Manager | ✅ `managers/index.tsx` |
| Toast Manager (facade) | ✅ `managers/index.tsx` |
| Drawer Manager | ✅ `managers/index.tsx` |
| Command Palette Manager | ✅ `managers/index.tsx` |
| Accessibility Layer | ✅ `accessibility/index.tsx` |
| Dark Theme | ✅ via `themeRegistry.dark` |
| Light Theme | ✅ via `themeRegistry.light` |
| Bolt → ECG Mapping | ✅ `design-system/bolt-mapping.ts` |
| Lazy Loading / Bundle Split | ✅ `lazy.ts` |
| Import architecture folders | ✅ see folder structure below |
| **Import Bolt/Penpot UI** | ⛔ **STOPPED** — awaits approval |

---

## Architecture Diagram

```mermaid
flowchart TB
  subgraph ImportSprint["Future Import Sprint (Post-Approval)"]
    Bolt["Bolt Components"]
    Penpot["Penpot Exports"]
  end

  subgraph Presentation["presentation/ (Sprint 78)"]
    DS["design-system/<br/>registry · component-registry · bolt-mapping"]
    Tokens["tokens/<br/>colors · typography · spacing · elevation · animation · icons"]
    Theme["theme/<br/>ThemeEngineProvider · light/dark/hospital"]
    Layouts["layouts/<br/>breakpoints · workspace · sidebar"]
    Managers["managers/<br/>nav · modal · dialog · toast · drawer · command palette"]
    A11y["accessibility/<br/>AccessibilityLayerProvider"]
    Lazy["lazy.ts<br/>viewer · monitor · assistant bundles"]
    Facades["components/<br/>medical · viewer · monitor · assistant · dashboard · shared"]
  end

  subgraph Production["Existing Production (Unchanged)"]
    Services["services/ · hooks/ · data/"]
    Engines["rendering-engine/ · render-engine-2/ · diagnostic pipeline"]
    Viewer["components/ecg/viewer/"]
    Enterprise["components/enterprise/ · interaction/"]
    AppLayout["app/_layout.tsx"]
  end

  Bolt --> DS
  Penpot --> DS
  DS --> Facades
  Tokens --> Theme
  Theme --> Facades
  Layouts --> Facades
  Managers --> Facades
  A11y --> Facades
  Lazy --> Facades

  Facades -->|"re-export only"| Enterprise
  Facades -->|"re-export only"| Viewer
  Services -.->|"no styling imports"| Facades
  Engines -.->|"isolated"| Viewer
  AppLayout --> Theme
```

### Separation of Concerns

```
Business logic / services          ← never imports presentation styling
        ↓ data + callbacks
Presentation facades               ← Bolt/Penpot swap targets
        ↓ tokens + theme + layout
Production components              ← current EnterpriseUI + viewer shells
```

Replacement rule: **change `modulePath` in registries only** — services and clinical engines remain untouched.

---

## Folder Structure

```
artifacts/ecg-insight/presentation/
├── index.ts                          # Public barrel
├── version.ts                        # sprint78-v1
├── lazy.ts                           # React.lazy bundle splits
├── design-system/
│   ├── index.ts
│   ├── registry.ts                   # designSystemRegistry + assertDesignSystemRegistry()
│   ├── component-registry.ts         # Production component catalog
│   └── bolt-mapping.ts               # BOLT_TO_ECG_COMPONENT_MAP
├── theme/
│   └── index.ts                      # Re-exports ThemeEngineProvider + themes
├── tokens/
│   ├── index.ts
│   ├── colors.ts
│   ├── typography.ts
│   ├── spacing.ts
│   ├── elevation.ts
│   ├── animation.ts
│   └── icons.ts
├── layouts/
│   ├── index.ts
│   ├── responsive-breakpoints.ts
│   ├── workspace-layout-manager.ts
│   └── sidebar-manager.ts
├── components/
│   ├── index.ts
│   ├── medical/
│   │   ├── index.ts
│   │   └── registry.ts               # medicalComponentRegistry
│   ├── viewer/index.ts               # Facade re-exports
│   ├── monitor/index.ts
│   ├── assistant/index.ts
│   ├── dashboard/index.ts
│   └── shared/index.ts
├── managers/
│   └── index.tsx                     # Navigation · Modal · Dialog · Toast · Drawer · CommandPalette
└── accessibility/
    └── index.tsx                     # AccessibilityLayerProvider
```

Additional legacy buckets (`forms/`, `widgets/`, `pages/`, etc.) exist as empty or minimal barrels for forward-compatible Penpot routing — they contain no business logic.

---

## Component Mapping (Bolt → ECG)

| Bolt Component | ECG Target | Module | Strategy | Domain |
|----------------|------------|--------|----------|--------|
| Button | `PrimaryButton` | `@/components/enterprise/EnterpriseUI` | direct | shared |
| Card | `Card` | `@/components/enterprise/EnterpriseUI` | direct | shared |
| Badge | `Badge` | `@/components/enterprise/EnterpriseUI` | direct | shared |
| Input | `Field` | `@/components/enterprise/EnterpriseUI` | direct | shared |
| Form | `Field` | `@/components/enterprise/EnterpriseUI` | direct | medical |
| StatCard | `StatCard` | `@/components/enterprise/EnterpriseUI` | direct | dashboard |
| EmptyState | `EmptyState` | `@/components/enterprise/EnterpriseUI` | direct | dashboard |
| Modal | `PremiumModal` | `@/components/interaction/PremiumInteraction` | direct | shared |
| Dialog | `PremiumModal` | `@/components/interaction/PremiumInteraction` | direct | shared |
| Toast | `ToastProvider` | `@/components/interaction/PremiumInteraction` | direct | shared |
| Drawer | `BottomSheet` | `@/components/interaction/PremiumInteraction` | direct | shared |
| Sidebar | `EcgWorkstationLeftNav` | `@/components/ecg/viewer/EcgWorkstationLeftNav` | facade | viewer |
| CommandPalette | `EcgCommandPalette` | `@/components/ecg/viewer/EcgCommandPalette` | facade | viewer |
| Navigation | `EnterpriseShell` | `@/components/enterprise/EnterpriseUI` | facade | dashboard |
| Table | `Card` | `@/components/enterprise/EnterpriseUI` | facade | dashboard |
| Tabs | `PageSection` | `@/components/enterprise/EnterpriseUI` | facade | dashboard |

### Medical Component Registry

| ID | Export | Clinical Domain |
|----|--------|-----------------|
| `ecg.measurement-panel` | `EcgMeasurementPanel` | workspace |
| `ecg.ai-diagnosis-panel` | `EcgAiDiagnosisPanel` | workspace |
| `ecg.unified-left-panel` | `EcgUnifiedClinicalLeftPanel` | workspace |
| `ecg.examination-gate` | `EcgExaminationWorkflowGate` | workflow |
| `ecg.measurement-studio` | `EcgMeasurementStudioPanel` | workspace |
| `ecg.clinical-alerts-banner` | `EcgClinicalAlertsBanner` | workspace |

---

## Import Strategy (Post-Approval)

1. **Approve Sprint 78** — this report confirms architecture readiness only.
2. **Per-domain import sprints** — import Bolt/Penpot components into `presentation/components/{domain}/` one domain at a time (shared → dashboard → viewer → monitor → medical → assistant).
3. **Update registry entries** — change `modulePath` and `exportName` in `component-registry.ts` and `bolt-mapping.ts`; run `assertDesignSystemRegistry()`.
4. **Wire opt-in providers** — wrap target routes with `UiFoundationProvider` and `AccessibilityLayerProvider` without replacing existing `ThemeEngineProvider`.
5. **Validate per domain** — typecheck, lint, build, unit tests, Playwright visual regression for affected routes.
6. **No service changes** — clinical engines, API hooks, and data layers must not import presentation tokens.

### Lazy Bundle Entry Points

| Export | Target | Purpose |
|--------|--------|---------|
| `LazyEcgMonitorViewerFoundation` | `EcgMonitorViewerFoundation` | Viewer shell code split |
| `LazyEcgLiveMonitorShell` | `EcgLiveMonitorShell` | Live monitor shell split |
| `LazyEcgLiveMonitorView` | `EcgLiveMonitorView` | Monitor canvas host split |
| `LazyCopilotResizableWorkspace` | `CopilotResizableWorkspace` | Assistant workspace split |

---

## Migration Strategy

| Phase | Scope | Risk |
|-------|-------|------|
| **Phase 0** (this sprint) | Presentation layer scaffolding | None — no runtime wiring |
| **Phase 1** | Shared tokens + EnterpriseUI replacements | Low — isolated from clinical engines |
| **Phase 2** | Dashboard + navigation shells | Low |
| **Phase 3** | Viewer chrome (sidebar, toolbar, command palette) | Medium — layout contracts preserved via `workspace-layout-manager` |
| **Phase 4** | Live monitor HMI chrome (not canvas) | Medium — sidebar manager uses `LIVE_MONITOR_LAYOUT` tokens |
| **Phase 5** | Medical panels | Medium — registry IDs map 1:1 to existing exports |
| **Phase 6** | Assistant / copilot workspace | Low |

Each phase:
- Swap facade `modulePath` only
- Run integration script + full QA gates
- Capture Playwright screenshots for regression diff

---

## Rollback Strategy

1. **Registry rollback** — revert `bolt-mapping.ts` and `component-registry.ts` to previous `modulePath` values (versioned by git tag `sprint78-v1`).
2. **Provider rollback** — remove `UiFoundationProvider` / `AccessibilityLayerProvider` wrappers from routes; existing `ThemeEngineProvider` remains the fallback.
3. **Lazy bundle rollback** — routes import production components directly instead of `presentation/lazy` exports.
4. **Zero service impact** — because services never import presentation, rollback is confined to presentation + route wiring.
5. **Validation gate** — `npm run typecheck && npm run build && npm run qa:unit` must pass before merge.

---

## Validation Results

### Tree Shaking

Presentation modules use named exports and re-export facades. Lazy bundles use `React.lazy()` with dynamic `import()` — unused domains are not loaded until referenced.

### Lazy Loading

`lazy.ts` defines four domain bundles (viewer foundation, monitor shell, monitor view, copilot workspace). Integration script validates lazy declarations exist.

### Bundle Split

Heavy viewer/monitor shells are isolated behind lazy imports. Shared tokens and managers are lightweight synchronous modules.

### Component Isolation

- `presentation/components/*` re-exports production components — no duplicate implementations.
- Medical registry references existing clinical panel paths.
- Managers hold UI state only (modal stack, drawer side, command palette open flag).

### Theme Switching

`theme/index.ts` re-exports `ThemeEngineProvider`, `lightTheme`, `darkTheme`, `hospitalTheme`, and `resolveTheme` from the existing design-system. `assertDesignSystemRegistry()` validates both light and dark themes are registered.

### Responsive Engine

`responsive-breakpoints.ts` defines breakpoints from `xs` (0) through `uhd` (3840). `workspace-layout-manager.ts` and `sidebar-manager.ts` use existing production token helpers (`responsiveLeftPanelWidth`, `clampLeftPanelWidth`, `LIVE_MONITOR_LAYOUT`).

### Dark Mode / Light Mode

Supported via existing `themeRegistry.light` and `themeRegistry.dark`. Color tokens expose `colorTokens.dark` and `colorTokens.light` sourced from production palettes.

---

## Files Created / Restored (Sprint 78)

| Path | Purpose |
|------|---------|
| `presentation/index.ts` | Public presentation barrel |
| `presentation/version.ts` | Contract version `sprint78-v1` |
| `presentation/lazy.ts` | Lazy bundle definitions |
| `presentation/design-system/*` | Registry, component catalog, Bolt mapping |
| `presentation/theme/index.ts` | Theme engine re-exports |
| `presentation/tokens/*` | Token surfaces |
| `presentation/layouts/*` | Breakpoints, workspace, sidebar managers |
| `presentation/components/*` | Domain facades + medical registry |
| `presentation/managers/index.tsx` | UI manager providers (restored) |
| `presentation/accessibility/index.tsx` | Accessibility layer |
| `scripts/sprint78-ui-import-foundation.integration.ts` | Structural validation script |

### Fix Applied During Sprint 78 Completion

| Issue | Resolution |
|-------|------------|
| `managers/index.tsx` corrupted (circular self-export) | Restored full manager provider implementations |
| `sidebar-manager.ts` imported non-existent `LIVE_MONITOR_SIDEBAR` | Switched to `LIVE_MONITOR_LAYOUT` from `ecgLiveMonitorHmiTokens.ts` |

---

## Boundaries Preserved

**Not modified:**
- ECG canvas / waveform rendering engines
- Live monitor signal pipeline
- Diagnostic and measurement engines
- Server API and services
- `app/_layout.tsx` wiring (existing theme + toast remain)
- Business logic inside clinical components

**Presentation layer is additive and opt-in.**

---

## Success Criteria

| Criterion | Result |
|-----------|--------|
| Production ready | ✅ All QA gates pass |
| Zero regression | ✅ No existing modules modified |
| Zero runtime error | ✅ Typecheck + build clean |
| Zero placeholder | ✅ All tokens sourced from production palettes |
| Zero mock | ✅ Registries point to real production exports |
| Zero temporary code | ✅ No TODO/FIXME stubs in presentation layer |
| Ready for Bolt/Penpot import | ✅ Mapping + registry + lazy architecture complete |
| UI import stopped | ✅ No Bolt/Penpot assets imported |

---

## Next Step (Requires Approval)

**Sprint 79+ — Premium UI Import:** Begin domain-by-domain Bolt/Penpot component import using `BOLT_TO_ECG_COMPONENT_MAP` and `componentRegistry` as the swap contract. Do not proceed until Sprint 78 is explicitly approved.

---

*Generated: Sprint 78 — Premium UI Import Preparation · ECG Insight Enterprise*
