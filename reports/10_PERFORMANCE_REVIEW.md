# 10 — Performance Review

**Audit:** Sprint 69 | Read-only

---

## Overall Performance Posture: **C+** (Functional; CI and query patterns are bottlenecks)

---

## Critical Performance Risks

| ID | Risk | Location | Impact |
|----|------|----------|--------|
| PERF-01 | **145 sequential integration scripts** | `scripts/integration/pipeline.mjs` | CI wall time hours |
| PERF-02 | **Playwright single worker** | `playwright.config.ts` | Slow e2e; `retries: 0` increases flake cost |
| PERF-03 | **Patient list `take: 5000`** | `server/src/patients/patients.routes.ts` | Memory + response size spike |
| PERF-04 | **Monolithic live monitor page ~1,974 lines** | `ecg-live-monitor.tsx` | Bundle size, re-render cost |

---

## Database / API Performance

| Issue | Path | Severity |
|-------|------|----------|
| `user.findMany()` no pagination | `server/src/users/users.routes.ts` | Medium |
| EMR timeline: 6 parallel unbounded `findMany` | `server/src/modules/emr/emr.routes.ts` | Medium |
| `notificationTemplate.findMany()` unbounded | `server/src/notifications/notifications.routes.ts` | Low |
| `clinicalDecisionRule.findMany()` unbounded | `clinical-intelligence/cdss.service.ts` | Low |
| `usageTracking.findMany()` no limit | `subscriptions/subscriptions.routes.ts` | Low |
| 171-model schema join complexity | Various services | Medium |

**Positive:** Admin routes often use `take: 100` or `take: 500` caps.

---

## Frontend Performance

| Area | Concern | Path |
|------|---------|------|
| Canvas/WebGL rendering | GPU memory at 4K viewports | `rendering-engine/`, `render-engine-2/` |
| 281 viewer files | Tree-shaking depends on import graph | `components/ecg/viewer/` |
| Live monitor overlay layout | Sidebar overlays canvas (paint overlap) | `EcgLiveMonitorShell.tsx` |
| SSE copilot streaming | `while(true)` read loops | `services/copilot.ts` |
| Large foundation component | Many child mounts | `EcgMonitorViewerFoundation.tsx` |

---

## Large Files (Top Performance/Maintainability Risk)

| File | Approx. Size | Risk |
|------|-------------|------|
| `prisma/schema.prisma` | ~5,640 lines / 171 models | Migration + query planner |
| `artifacts/ecg-insight/app/(protected)/ecg-live-monitor.tsx` | ~1,974 lines | Hot path page |
| `server/src/modules/copilot/copilot.routes.ts` | ~1,082 lines | Route handler latency |
| `artifacts/ecg-insight/components/ecg/viewer/EcgMonitorViewerFoundation.tsx` | Large orchestrator | Re-render surface |

---

## Memory Risks

| Risk | Location | Notes |
|------|----------|-------|
| In-memory rate limit maps | `api-security.ts` | Unbounded growth |
| Canvas buffer allocation | Live monitor + workspace | Multiple engines may duplicate buffers |
| `uploads/` ~7.9k files | Filesystem | Disk not RAM but affects backup/scan |
| `.local/` ~58k cached files | Dev environment | Local disk pressure |

---

## CI / QA Performance

| Metric | Value | Recommendation |
|--------|-------|----------------|
| Integration scripts | 145 sequential | Parallelize by domain; mark required vs optional |
| Playwright workers | 1 | Increase to 2–4 for independent specs |
| Playwright retries | 0 | Add 1 retry for infra flakes |
| Vitest coverage scope | Narrow (viewer/hooks only) | Expand or accept gap |
| Typecheck scope | server + ecg-insight only | Add scripts/ optionally |

---

## Network / Payload

| Item | Setting | Assessment |
|------|---------|------------|
| JSON body limit | 1mb (`express.json`) | OK for API |
| File uploads | Multer separate | Review max file size for ECG images |
| Digitized waveform payloads | `ecgProcessing.ts` | Monitor payload size for 12-lead |

---

## Scalability Assessment

| Dimension | Current | Target State |
|-----------|---------|--------------|
| API horizontal scale | Stateless-ish (JWT + DB sessions) | Redis session store for multi-instance |
| DB | Single PostgreSQL | Read replicas for reporting |
| File storage | Local `uploads/` | S3/object storage for production |
| Realtime | In-process SSE | WebSocket service or managed pub/sub |
| ML inference | `ai-engine/` sidecar | Containerized with GPU option |

---

## Performance Classification

| Component | Classification |
|-----------|----------------|
| ECG render engines | **KEEP** — optimize per viewport |
| Integration pipeline | **Review Required** — parallelize |
| Patient list endpoint | **Broken** (perf) — add pagination |
| Live monitor page | **Review Required** — split module |
| Prisma schema | **Review Required** — model audit |
| Copilot routes | **Review Required** — split handlers |

---

## Quick Wins (Post-Approval)

1. Cap `patients.routes.ts` at 100–500 with pagination.
2. Parallelize integration pipeline by tag (`@required` subset for PR).
3. Increase Playwright workers to 2 on CI with sharding.
4. Split `ecg-live-monitor.tsx` into screen + hooks + panels.
5. Add TTL to rate-limit maps.

---

*Read-only performance review.*
