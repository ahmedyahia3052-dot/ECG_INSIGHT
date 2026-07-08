# 11 — Refactor Recommendations

**Audit:** Sprint 69 | Read-only  
**Priority:** Impact × Effort matrix

---

## P0 — Unblock Build & CI (Immediate)

| # | Recommendation | Files Affected | Effort | Impact |
|---|----------------|----------------|--------|--------|
| 1 | Fix 12 typecheck errors (resolver, gate, foundation props, notification engine) | 8 files | S | Critical |
| 2 | Decide live monitor layout: wire `EcgLiveMonitorGridShell` OR delete it | 1–2 files | S | High |
| 3 | Remove `"monitor"` view mode references post-Sprint 52 | 2 files | S | Medium |

---

## P1 — Architecture Consolidation (1–2 Sprints)

| # | Recommendation | Rationale |
|---|----------------|-----------|
| 4 | **Unify API client paths** — migrate `hospital.ts`, `clinicalIntelligence.ts` to Sprint 65–68 endpoints | Eliminates FHIR/CDSS/timeline drift |
| 5 | **Single timeline service** — deprecate `/longitudinal-ecg/` | Two server implementations |
| 6 | **Knowledge catalog merge** — `clinical-knowledge-engine` + `mic` + `knowledge-engine` behind one facade | 4 overlapping catalogs |
| 7 | **Decide Drizzle stack fate** — archive `artifacts/api-server` + `lib/db` OR document as dev-only | Dual ORM confusion |
| 8 | **Unify Zod to v4** across root and pnpm catalog packages | Schema boundary bugs |
| 9 | **Choose npm OR pnpm** — add `server/` to workspace or drop pnpm | Hybrid monorepo friction |

---

## P2 — UI Module Cleanup (1 Sprint)

| # | Recommendation | Delete/Wiring |
|---|----------------|---------------|
| 10 | Remove orphan viewer components (14 files) | Delete after barrel cleanup |
| 11 | Complete or abandon Sprint 53 reading station | Wire OR delete 3 files |
| 12 | Consolidate toolbars to `EcgZeroChromeToolbar` only | Remove `EcgViewerToolbar`, alias |
| 13 | Split `ecg-live-monitor.tsx` (~1,974 lines) | Screen + hooks + sub-panels |
| 14 | Split `EcgMonitorViewerFoundation.tsx` | Extract status/HUD/panels |
| 15 | Prune `viewer/index.ts` barrel exports | Export only used components |

---

## P3 — Server Module Cleanup (2–3 Sprints)

| # | Recommendation | Notes |
|---|----------------|-------|
| 16 | Collapse `ecg-interpretation` into `ecg-interpretation-engine` | Keep thin adapter 1 sprint |
| 17 | Standardize measurement DTO — single response shape | Remove `toLegacyMeasurementResult` eventually |
| 18 | Split `copilot.routes.ts` (~1,082 lines) | By feature: chat, tools, settings |
| 19 | Add pagination to all `findMany` without `take` | patients, users, EMR, templates |
| 20 | Audit 171 Prisma models — mark unused, add indexes | Schema diet |
| 21 | Wire frontend to `clinical-alerts-risk-engine` | Sprint 64 server-only today |
| 22 | Wire frontend to `clinical-decision-support` follow-up | Sprint 65 server-only today |

---

## P4 — Repository Hygiene (Ongoing)

| # | Recommendation | Est. Files Affected |
|---|----------------|---------------------|
| 23 | Archive 288 root sprint reports to `docs/sprints/` | 288 |
| 24 | Gitignore `*.log`, `test-results/`, `playwright-report/`, `.local/` | Config |
| 25 | Relocate `*.traineddata` to `assets/ocr/` or download script | 2 |
| 26 | Merge duplicate docs (`API_SPEC`, `COVERAGE_DIFF`, etc.) | ~10 |
| 27 | Consolidate sprint e2e specs into enterprise matrix | ~40 specs |
| 28 | Unify unit test runners (Vitest only) | 2 runners |
| 29 | Raise Vitest coverage thresholds from 0% | `vitest.config.ts` |
| 30 | Fix `pnpm-workspace.yaml` missing `lib/integrations/*` | 1 |

---

## P5 — EMKP & Experimental (Product Decision)

| Option | Action |
|--------|--------|
| A — Integrate | Import EMKP catalog into `clinical-knowledge-engine` |
| B — Archive | Move `enterprise/emkp/` to separate repo |
| C — Keep isolated | Document as R&D only; exclude from CI |

---

## Refactor Patterns to Adopt

1. **Adapter pattern with sunset dates** — legacy modules get `DEPRECATED_AT` constant.
2. **Feature flags** — grid shell vs overlay shell behind env flag until decided.
3. **Module boundaries** — each server module exports only `routes.ts` + `service.ts` + `types.ts`.
4. **Frontend service map** — one service file per API domain, no duplicate endpoints.
5. **Sprint report policy** — reports go to `docs/sprints/SPRINT-NN/` not repo root.

---

## Anti-Patterns to Avoid

| Anti-Pattern | Current Example |
|--------------|-----------------|
| Parallel shells without deprecation | Grid + overlay monitor |
| Barrel exporting orphans | `viewer/index.ts` |
| Sprint code without integration | Reading station, grid shell |
| New API without frontend migration | FHIR, CDSS, alerts-risk |
| Root-level documentation sprawl | 288 `.md` files |

---

## Estimated Effort

| Phase | Sprints | Outcome |
|-------|---------|---------|
| P0 | 0.5 | Green typecheck + build |
| P1 | 2 | Unified API surface |
| P2 | 1 | Lean viewer tree |
| P3 | 2–3 | Lean server + schema |
| P4 | 1 | Clean repo root |
| **Total** | **6–7 sprints** | Maintainable enterprise codebase |

---

*Read-only recommendations. No refactoring performed.*
