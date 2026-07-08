# Sprint 75 — UI Architecture Report

**Mission:** Prepare ECG Insight Enterprise to receive externally generated Premium UI (Bolt / Penpot)  
**Constraint:** Architecture only — **zero visual modifications**  
**Date:** 2026-07-08

---

## Executive Summary

Sprint 75 introduces a layered UI architecture that separates presentation from business logic, consolidates design tokens, prepares a multi-theme engine, and establishes feature barrels for **Workspace**, **Viewer**, and **Monitor** — without relocating or restyling existing clinical components.

Existing screens continue to render identically. New imports can target stable architecture paths while legacy deep imports remain valid during migration.

---

## Architecture Layers

```
artifacts/ecg-insight/
├── design-system/          # Tokens + themes + theme engine
│   ├── tokens/
│   ├── themes/
│   └── theme-engine/
├── presentation/           # Reusable UI layer (barrels)
│   ├── pages/
│   ├── widgets/
│   ├── medical/
│   ├── charts/
│   ├── cards/
│   ├── dialogs/
│   ├── forms/
│   └── navigation/
├── features/               # Clinical surfaces (logic boundaries)
│   ├── workspace/
│   ├── viewer/
│   └── monitor/
├── lib/presentation/       # Shared presentation utilities
└── ui-architecture/        # Naming + complexity conventions
```

### Separation of Concerns

| Layer | Responsibility | Business Logic |
|-------|----------------|----------------|
| `app/` routes | Thin delegates, auth, case resolution | Via hooks/services only |
| `presentation/` | Visual components, widgets, forms | **None** — re-exports only |
| `features/` | Workspace/Viewer/Monitor orchestration barrels | Delegates to `services/` |
| `services/` | API, clinical data, state (unchanged) | **All domain logic** |
| `design-system/` | Tokens, themes, theme engine | **None** |

---

## Presentation Layer

### Pages (`presentation/pages/`)
Screen-level orchestrators: `EcgEnterpriseWorkspaceScreen`, `EcgLiveMonitorWorkspaceScreen`.

### Widgets (`presentation/widgets/`)
Cross-cutting chrome: `EmptyState`, `PageSection`, status bars, badges.

### Medical Components (`presentation/medical/`)
Clinical panels and workflow gates — presentation-only surfaces.

### Charts (`presentation/charts/`)
Waveform/canvas/visualization exports including rendering-engine barrel.

### Cards / Dialogs / Forms
- **Cards:** `PremiumCard`
- **Dialogs:** `PremiumModal`
- **Forms:** `PrimaryButton`, `PremiumButton`, auth field components

### Navigation (`presentation/navigation/`)
App shell (`ProtectedRoute`) and in-viewer navigation (mode switcher, mini navigators).

---

## Feature Surfaces

| Feature | Barrel Path | Key Exports |
|---------|-------------|-------------|
| **Workspace** | `@/features/workspace` | Resizable workspace, grid shell, case resolver |
| **Viewer** | `@/features/viewer` | Pro viewer engine, monitor foundation, canvas |
| **Monitor** | `@/features/monitor` | Live monitor shell, HMI/v2/pro stacks |

Business logic remains in `@/services/*` and co-located hooks until Bolt migration moves presentation only.

---

## Design Tokens

### Consolidated Entry Point
`@/design-system/tokens` re-exports:

| Module | Source (unchanged values) |
|--------|---------------------------|
| App tokens | `constants/colors`, `theme/medicalTheme` |
| Clinical tokens | `ecgWorkstationVisualTokens`, `ecgLiveMonitorTokens`, `ecgEnterpriseDesignTokens`, HMI tokens |

**No token values were modified** — only centralized import paths for external UI tooling.

---

## Theme Engine

**Path:** `@/design-system/theme-engine`

| Theme ID | Description | Visual Impact |
|----------|-------------|---------------|
| `light` | App light palette | Unchanged |
| `dark` | App dark palette (default) | Unchanged |
| `hospital` | Clinical workstation / medicalTheme | Unchanged |
| `system` | Follows OS scheme | Unchanged |

### Integration
- `ThemeEngineProvider` mounted in `app/_layout.tsx`
- Wraps existing `useColors()` preference flow
- `setThemeId("hospital")` selects hospital clinical theme without altering default behavior
- Future Bolt/Penpot themes register via `design-system/themes/registry.ts`

---

## Duplicated Logic Extraction

| Utility | Path | Consumers |
|---------|------|-----------|
| `readPersistedJson` | `lib/presentation/persisted-layout-storage.ts` | ECG viewer resizable workspace |
| `writePersistedJson` | same | ECG viewer resizable workspace |
| `usePersistedJsonLayout` | same | Copilot resizable workspace |

Panel layout persistence behavior is **identical** — only shared implementation extracted.

---

## Naming Conventions

**Path:** `@/ui-architecture/naming-conventions`

Documented patterns:
- Components: `Ecg{Domain}{Surface}`
- Hooks: `useEcg{Domain}{Concern}`
- Tokens: `ecg{Domain}Tokens` / `ECG_{DOMAIN}_{TOKEN}`
- Complexity budget: 320 lines max per presentation component (target for Bolt imports)

---

## TypeScript Path Aliases (Additive)

```json
"@/design-system/*" → "design-system/*"
"@/presentation/*"  → "presentation/*"
"@/features/*"        → "features/*"
```

Legacy `@/*` imports continue to work.

---

## Migration Guide (Bolt / Penpot)

1. **New UI components** land in `presentation/{layer}/` first
2. **Tokens** consumed from `@/design-system/tokens` — never hard-code colors in new components
3. **Themes** registered in `design-system/themes/registry.ts`
4. **Screens** compose from `presentation/` + `features/` barrels; call `services/` for data
5. **Do not** import rendering engine internals from Bolt shells — use `@/features/viewer`

---

## Validation

| Check | Result |
|-------|--------|
| `npm run lint` | PASS |
| `npx tsc -p artifacts/ecg-insight/tsconfig.json --noEmit` | PASS |
| `npx tsc -p server/tsconfig.json --noEmit` | PASS |
| Sprint 75 unit tests | PASS |
| Sprint 75 integration markers | PASS |

---

## Files Added / Modified

### Added
- `design-system/**` — tokens, themes, theme engine
- `presentation/**` — layer barrels
- `features/**` — workspace/viewer/monitor barrels
- `lib/presentation/persisted-layout-storage.ts`
- `ui-architecture/naming-conventions.ts`
- `scripts/sprint75-ui-architecture.{test,integration}.ts`

### Modified (architecture only — no visual changes)
- `app/_layout.tsx` — `ThemeEngineProvider` wrapper
- `tsconfig.json` — path aliases
- `components/ecg/viewer/EcgViewerResizableWorkspace.tsx` — shared layout storage
- `components/copilot/CopilotResizableWorkspace.tsx` — shared layout hook

### Not Modified
- Component styles, colors, layouts, spacing, clinical rendering behavior
- Workspace/Viewer/Monitor visual chrome

---

## Hardening Summary

Sprint 75 delivers a Bolt/Penpot-ready UI architecture: presentation separated from business logic, unified token and theme entry points, feature barrels for the three clinical surfaces, and shared layout utilities — with **zero visual regression**.
