# Pre-Migration Checklist — Phase 1 / Sprint P1.1

Everything that **MUST** be validated before any UI replacement begins.

---

## 1. Repository & Branch Readiness

- [ ] `main` synchronized with `origin/main` (verified P1.1: `0e42745`)
- [ ] `feature/sprint104-enterprise-design-system` reviewed for merge (`ddeea3e`)
- [ ] `feature/bolt-ui-migration-foundation` adapter commits identified (`8866d62`)
- [ ] External Bolt reference available at `ECG_INSIGHT_UI_BOLT/ecg-insight-main`
- [ ] Decision recorded: merge sprint104 to main **before** first route swap
- [ ] Feature flag `EXPO_PUBLIC_UI_MODE=bolt` tested in isolation (sprint104 branch)
- [ ] No uncommitted application code mixed with migration PRs

---

## 2. Build & Quality Gate (baseline)

- [ ] `npm run lint` PASS (document failures — do not fix in P1.1)
- [ ] `npm run typecheck` PASS
- [ ] `npm run build` PASS
- [ ] `npm run build:frontend` PASS — record entry bundle size
- [ ] Playwright smoke baseline captured (15/15 from Sprint 98)
- [ ] Integration tests baseline exit 0 recorded

---

## 3. Architecture Contracts

- [ ] `BOLT_PRESERVE_MANIFEST` paths confirmed untouched (services, auth, ecg engines)
- [ ] `BOLT_REPLACEMENT_MANIFEST` paths identified for post-swap deletion
- [ ] Adapter rule enforced: Bolt UI never imports `@/services/*` directly
- [ ] Container pattern exists for Dashboard + Cases (sprint104 branch)
- [ ] Screen contracts defined: `DashboardScreenContract`, `HistoryScreenContract`
- [ ] Remaining routes have container extraction plan (see PAGE_REPLACEMENT_MATRIX)

---

## 4. Route & Navigation

- [ ] All 45 route files inventoried (`UI_MIGRATION_MAP.md`)
- [ ] Duplicate routes documented: `/patients/new`, `/ecg-monitor` vs workspace, support routes
- [ ] Deep links verified: `/ecg-cases/:id`, `/ecg-viewer?caseId=`, `/copilot/:conversationId`
- [ ] Orphan routes flagged: `/onboarding`, `/unauthorized`
- [ ] Full-bleed routes list confirmed: copilot, viewer, workspace, monitor
- [ ] URL preservation policy agreed — no breaking href changes

---

## 5. State & Providers

- [ ] `AuthContext` mount point documented (`app/_layout.tsx`)
- [ ] `VisualExperienceContext` orphan status documented (not mounted on main)
- [ ] Zustand vs AuthContext overlap documented (`useAuthStore`)
- [ ] React Query singleton config recorded (staleTime 30s)
- [ ] Query key centralization plan approved (`store/query-keys.ts`)
- [ ] Duplicate hook trees flagged (`hooks/domain` vs `src/hooks` on sprint103 branch)

---

## 6. Clinical Safety (CRITICAL)

- [ ] ECG canvas components marked **DO NOT REPLACE** (`EcgProViewerWaveformCanvas`)
- [ ] Measurement layer (Sprint 96) marked **DO NOT REPLACE**
- [ ] Live monitor realtime pipeline marked **DO NOT REPLACE**
- [ ] CDSS / AI panels marked Cursor-owned
- [ ] Clinical workflow gates documented (`EcgExaminationWorkflowGate`)
- [ ] Rollback plan: `EXPO_PUBLIC_UI_MODE=cursor` instant revert

---

## 7. Design System & Theming

- [ ] Three token systems inventory complete (medicalTheme, presentation/tokens, design-system/tokens)
- [ ] Tailwind → RN port strategy approved (tokens only, no Tailwind runtime)
- [ ] Icon migration plan: Feather → lucide registry
- [ ] Dark/light theme parity requirements defined
- [ ] 48px minimum touch target rule preserved

---

## 8. Dependencies & Packages

- [ ] No new npm installs during migration sprints without approval
- [ ] Chart strategy decided: Recharts port vs custom SVG retention
- [ ] Toast strategy: sonner port vs keep PremiumInteraction until Phase 2
- [ ] Date library gap documented (native Date only on Cursor)
- [ ] Bundle size baseline recorded (4.75 MB entry, P1.1 build)

---

## 9. Backend & API (must not change)

- [ ] All 69 service files unchanged during UI migration
- [ ] Prisma schema frozen for UI sprints
- [ ] NestJS/server routes frozen
- [ ] RBAC roles map to Bolt nav (`doctor`, `admin`, `super_admin`, `student`)
- [ ] OAuth providers list matches auth screens

---

## 10. Documentation & Sign-off

- [ ] `UI_MIGRATION_MAP.md` reviewed
- [ ] `COMPONENT_REPLACEMENT_MATRIX.md` reviewed
- [ ] `PAGE_REPLACEMENT_MATRIX.md` reviewed
- [ ] Risk acceptance for Difficulty 5 pages (viewer, workspace, monitor)
- [ ] Stakeholder sign-off before Phase P1 (first route swap)

---

## Blockers Identified (P1.1)

| Blocker | Status |
|---------|--------|
| Sprint104 design-system not on `main` | **OPEN** — merge required |
| Bolt adapters/containers not on `main` | **OPEN** — merge required |
| Only 10 Bolt reference pages vs 45 Cursor routes | **OPEN** — phased plan |
| Bolt runtime components removed from main | **ACKNOWLEDGED** — restore via sprint104 or re-port |

**Do not begin UI replacement until blockers marked resolved.**
