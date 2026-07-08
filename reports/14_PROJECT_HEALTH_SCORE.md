# 14 — Project Health Score

**Audit:** Sprint 69 | Read-only  
**Scale:** 0–100 per dimension | **Overall weighted score: 62/100**

---

## Dimension Scores

| Dimension | Score | Grade | Rationale |
|-----------|------:|-------|-----------|
| **Architecture** | 58 | D+ | Dual ORM, dual API stacks, layered engines without clear boundaries; strong domain separation in modules |
| **Code Quality** | 65 | C | Strict TS locally but ESLint `any` off; 12 typecheck errors; large monolithic files |
| **Repository Organization** | 45 | F | 288 root sprint reports; 26 logs; hybrid npm/pnpm; generated dirs in workspace |
| **Maintainability** | 55 | D | 49 server modules well-factored; 281 viewer files with orphan experiments |
| **Technical Debt** | 40 | F | ~15 duplicate clusters; legacy adapters permanent; unfinished sprint integrations |
| **Testing** | 70 | C+ | Extensive e2e + integration; fragmented runners; 0% coverage thresholds |
| **Documentation** | 50 | D | Abundant sprint reports but poor curation; 3 files in `docs/` |
| **Performance** | 60 | D+ | Render engines solid; unbounded queries; sequential CI pipeline |
| **Security** | 72 | C+ | Strong auth middleware; seed creds, open CORS on api-server, memory maps |
| **Scalability** | 58 | D+ | Local uploads; in-process SSE; 171-model schema |

---

## Weighted Overall Score

| Dimension | Weight | Score | Weighted |
|-----------|-------:|------:|---------:|
| Architecture | 15% | 58 | 8.7 |
| Code Quality | 12% | 65 | 7.8 |
| Repository Organization | 8% | 45 | 3.6 |
| Maintainability | 12% | 55 | 6.6 |
| Technical Debt | 10% | 40 | 4.0 |
| Testing | 12% | 70 | 8.4 |
| Documentation | 5% | 50 | 2.5 |
| Performance | 8% | 60 | 4.8 |
| Security | 10% | 72 | 7.2 |
| Scalability | 8% | 58 | 4.6 |
| **TOTAL** | 100% | — | **62.2** |

### Overall: **62 / 100 — "Functional Enterprise, High Debt"**

---

## Health Indicators

| Indicator | Status | Target |
|-----------|--------|--------|
| `npm run lint` | ✅ Pass | Pass |
| `npm run typecheck` | ❌ 12 errors | 0 errors |
| `npm run build` | ❌ Blocked | Pass |
| Playwright enterprise | ⚠️ ~9/12 (flake) | 100% stable |
| Integration pipeline | ⚠️ 145 sequential | <30 min CI |
| Prisma migrations | ✅ 63 applied | Synced |
| Dual package managers | ❌ npm + pnpm | Single |
| Root clutter | ❌ 288 reports | <10 root docs |

---

## Trend Assessment

| Area | Trend | Notes |
|------|-------|-------|
| Feature velocity | ↑ High | Sprints 54–68 added major modules |
| Integration completeness | ↓ Lagging | Server ahead of frontend wiring |
| Build health | ↓ Regressed | Typecheck errors from partial integrations |
| Test breadth | ↑ High | Many sprint-specific specs |
| Test efficiency | ↓ Low | Sequential pipeline bottleneck |
| Repo hygiene | ↓ Declining | Report sprawl at root |

---

## Score Projection (If P0–P2 Refactors Completed)

| Dimension | Current | Projected |
|-----------|--------:|----------:|
| Architecture | 58 | 72 |
| Code Quality | 65 | 80 |
| Repository Organization | 45 | 75 |
| Technical Debt | 40 | 65 |
| **Overall** | **62** | **~74** |

*Projection assumes: typecheck fix, orphan deletion, API migration, report archival.*

---

## Classification by Health

| Classification | Areas |
|--------------|-------|
| **Healthy** | Auth middleware, diagnostic engine, Playwright infrastructure, Prisma migrations |
| **At Risk** | Typecheck, build, frontend/server API drift |
| **Unhealthy** | Repo root organization, technical debt ratio, dual ORM |
| **Critical** | Seed credentials, api-server CORS |

---

## Benchmark Comparison (Enterprise SaaS)

| Metric | ECG Insight | Typical Enterprise Target |
|--------|-------------|----------------------------|
| Typecheck errors | 12 | 0 |
| Root doc files | 288 | <20 |
| Test runners | 2 | 1 |
| ORM stacks | 2 | 1 |
| Unused orphan components | ~14 | 0 |
| CI integration time | Hours | <45 min |

---

*Read-only health assessment.*
