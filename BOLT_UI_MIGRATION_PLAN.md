# Bolt UI Migration Plan — Sprint 103.5 Pre-Migration Audit

**Mission:** Stage-by-stage frontend replacement with Cursor backend/services unchanged.  
**Constraints:** No UI redesign beyond Bolt parity; no backend logic changes during UI swap.

---

## Phase 0 — Foundation (complete / in progress)

| Item | Status |
|------|--------|
| Container pattern (Dashboard, Cases) | Done |
| `boltUiAdapter` contracts | Done |
| `EXPO_PUBLIC_UI_MODE=bolt` flag | Done |
| Design tokens Sprint 104 | In progress on parallel branch |
| This audit (103.5) | **This document** |

---

## Phase 1 — Bolt Import & Shell (Week 1)

1. Import Bolt design system package into `artifacts/ecg-insight` (no route swaps yet).
2. Implement Bolt `AppShell` behind feature flag — sidebar, header, nav from `APP_NAV_ITEMS`.
3. Wire token bridge: `design-system/tokens` → Bolt theme.
4. **Validation:** lint, typecheck, build, smoke `/dashboard` with flag off/on.

**Exit criteria:** Bolt shell renders; Cursor content area unchanged; zero service imports in Bolt components.

---

## Phase 2 — Ready Routes (Week 2)

| Route | Action |
|-------|--------|
| `/dashboard` | Swap `DashboardLegacyPresentation` → Bolt Dashboard; keep `DashboardContainer` |
| `/ecg-cases` | Swap `EcgCasesLegacyPresentation` → Bolt History |

**Exit criteria:** Adapter contract tests; Playwright dashboard + cases; delete legacy presentations (see `DELETE_AFTER_MIGRATION.md`).

---

## Phase 3 — High-Value Clinical (Weeks 3–5)

| Order | Route | Strategy |
|-------|-------|----------|
| 3a | `/upload-ecg` | New container + adapter; Bolt form; keep upload pipeline |
| 3b | `/ecg-viewer` | Bolt chrome; **Shared** ECG canvas (Cursor) |
| 3c | `/ecg-workspace`, `/ecg-monitor/*` | Unified Bolt Workspace; deprecate duplicate routes |
| 3d | `/ecg-live-monitor` | Bolt monitor + preserve hospital realtime service |

**Exit criteria:** Viewer measurements (Sprint 96) unchanged; workspace deep links work.

---

## Phase 4 — Records & Account (Week 6)

| Route | Strategy |
|-------|----------|
| `/reports`, `/reports/:id` | Container + Bolt tables |
| `/patients`, `/patients/:id`, create/edit | Bolt CRUD; consolidate `/patients/new` |
| `/profile`, `/billing-subscription` | Bolt forms + subscription adapter |
| `/notifications`, `/settings` | Bolt list/settings |

---

## Phase 5 — Auth & Public (Week 7)

| Route | Strategy |
|-------|----------|
| `/login`, `/register`, forgot/verify | Bolt Auth |
| `/system-status`, `/support`, `/contact-support` | Bolt public pages; merge support routes |

---

## Phase 6 — Defer / Keep Cursor

| Surface | Decision |
|---------|----------|
| Copilot | **Keep Cursor** until Bolt equivalent |
| Admin, audit, team, owner licenses | Phase 2 post-core |
| ECG benchmark, release candidate | Internal — keep Cursor |

---

## Phase 7 — Cleanup (Week 8+)

1. Remove `EnterpriseUI.tsx` monolith.
2. Delete token duplicates and hook duplicates.
3. Enable route-level lazy loading + Suspense for Bolt chunks.
4. Full regression: `npm test`, Playwright 15/15+, Lighthouse targets from `PERFORMANCE_BASELINE.md`.

---

# Route Audit (Sprint 103.5)

## Duplicated Routes — Actions

| Routes | Issue | Action |
|--------|-------|--------|
| `/patients/new`, `/patients/create` | Identical | Redirect `new` → `create`; delete `new.tsx` post-Bolt |
| `/ecg-monitor/:caseId`, `/ecg-workspace?caseId=` | Overlap | Single canonical `/ecg-workspace` with param |
| `/ecg-live-monitor`, `/ecg-live-monitor/:caseId` | Gate vs direct | Keep gate; param route for deep link only |
| `/copilot`, `/copilot/:conversationId` | Same component | OK — document as alias |
| `/contact-support`, `/support` | Public vs auth | Merge UX in Bolt |
| `/team-management` | Duplicate nav entry | Dedupe `APP_NAV_ITEMS` |

## Deep Links — Verified

| Link | Resolves | Notes |
|------|----------|-------|
| `/ecg-cases/:id` | Yes | Case detail |
| `/ecg-viewer?caseId=` | Yes | Query resolver |
| `/ecg-workspace?caseId=` | Yes | Workspace resolver |
| `/copilot/:conversationId` | Yes | Thread load |
| `/patients/:id` | Yes | 7-tab detail |
| `/onboarding` | Orphan | Not in Stack — fix or remove |
| `/unauthorized` | Orphan | Not in Stack — wire on 403 |

## Lazy Loading — Gaps

| Mechanism | Status |
|-----------|--------|
| `presentation/lazy.ts` | Defined; limited consumers |
| Dynamic import copilot/upload | Partial |
| Suspense boundaries | **None found** |
| Route-based splitting | **Not implemented** |

**Recommendation:** Add Suspense + React.lazy per Bolt route chunk in Phase 7.

---

# State Audit (Sprint 103.5)

## Context

| Store | Mounted | Duplicate? |
|-------|---------|--------------|
| `AuthContext` | Root layout | No |
| `VisualExperienceContext` | **Not mounted** | Dead code — remove or mount |
| `ThemeEngineProvider` | Root | No |
| `ToastProvider` | Root | No |

## Zustand

| Store | Purpose | Overlap |
|-------|---------|---------|
| `useAuthStore` | Auth snapshot | Overlaps AuthContext — consolidate |
| `useDashboardStore` | Dashboard UI | OK with React Query |
| `useApiLoadingStore` | Global loading | Overlaps Query isLoading |
| `useAppStore` | Misc app | Review keys |

## Redux

**None.**

## React Query

- Singleton in `app/_layout.tsx`, staleTime 30s.
- Keys: mix of inline strings and `store/query-keys.ts`.
- **Action:** Centralize all keys in `store/query-keys.ts`; remove inline duplicates.

## Duplicate Hook Trees

- `hooks/domain/*` vs `src/hooks/*` (Sprint 103 split).
- **Action:** Merge to single `hooks/` namespace before Bolt import.

---

# Package Audit (Sprint 103.5)

## Duplicated / Overlapping

| Category | Libraries | Recommendation |
|----------|-----------|----------------|
| **Design tokens** | medicalTheme, presentation/tokens, design-system/tokens | **Single Bolt canonical** |
| **Icons** | @expo/vector-icons, expo-symbols | Pick one in Bolt |
| **Charts** | Custom SVG only | Bolt brings chart lib OR keep custom in Shared |
| **Toast** | Custom PremiumInteraction | Replace with Bolt |
| **Date** | Native Date only | Add `date-fns` only if Bolt requires |
| **Table** | FlatList/custom | Bolt table component |
| **Forms** | zod + inline | Keep zod in adapters; Bolt form primitives |
| **Validation** | zod | **Keep** — Cursor adapter layer |

## Not Duplicated (keep)

- `@tanstack/react-query` — single server state
- `zustand` — client UI state (after consolidation)
- `expo-router` — routing unchanged

## Do Not Add During Migration

- Second chart library
- Redux
- Duplicate date/icon packages

---

# Validation Gate (every phase)

```bash
npm run lint
npm run typecheck
npm run build
npm test -- --grep "smoke|bolt|dashboard"  # or full suite before release
```

Playwright: 15/15 smoke minimum before deleting legacy UI.

---

# Sprint 103.5 Deliverables Checklist

- [x] `UI_INVENTORY.md`
- [x] `BOLT_MAPPING.md`
- [x] `COMPONENT_OWNERSHIP.md`
- [x] `DELETE_AFTER_MIGRATION.md`
- [x] Route audit (this document)
- [x] State audit (this document)
- [x] Package audit (this document)
- [x] `PERFORMANCE_BASELINE.md`
- [x] `BOLT_UI_MIGRATION_PLAN.md` (this document)
