# 03 — Unused Files Report

**Audit:** Sprint 69 | Read-only  
**Method:** Import-graph heuristics (grep `from` references), barrel export analysis, route wiring checks

---

## Summary

| Category | Count | Confidence |
|----------|------:|------------|
| Confirmed unused TS/TSX (zero importers) | 14 | 85–95% |
| Unused server shims (deprecated, never called) | 2 | 90% |
| Isolated subtree (EMKP) | ~47 diseases + engine | 95% (by design) |
| Generated artifacts (not source) | ~66,000+ files | 99% |
| Sprint report clutter | 288 root `.md` | 70% (archive, not delete) |

**Estimated safely deletable source files:** ~20–25 TS/TSX + ~300 documentation artifacts + generated dirs

---

## Confirmed Unused Frontend Files

### Classification: **Unused** | Safe To Delete after approval

| File | Why Unused | Who References It | Evidence | Confidence | Risk |
|------|------------|-------------------|----------|------------|------|
| `artifacts/ecg-insight/components/ecg/viewer/EcgLiveMonitorGridShell.tsx` | Zero imports; broken token refs | None (grep: 0 importers) | `LIVE_MONITOR_LAYOUT` import error; overlay shell is active | **92%** | Low |
| `artifacts/ecg-insight/components/ecg/viewer/EcgReadingStationLayout.tsx` | Sprint 53 experiment never wired | None | Reports claim wiring; foundation uses `EcgViewerResizableWorkspace` | **90%** | Low |
| `artifacts/ecg-insight/components/ecg/viewer/ecgReadingStationTokens.ts` | Paired with unused layout | None | Only referenced by `EcgReadingStationLayout` | **90%** | Low |
| `artifacts/ecg-insight/components/ecg/viewer/EcgReadingModeChrome.tsx` | Sprint 53.2 chrome not integrated | None | Not in `EcgMonitorViewerFoundation` import tree | **88%** | Low |
| `artifacts/ecg-insight/components/ecg/viewer/ecgAutoFitEngine.ts` | Orphan engine | None | `WORKSPACE_LAYOUT_RESTORE.md` notes removal | **85%** | Low |
| `artifacts/ecg-insight/components/ecg/viewer/useEcgAutoFit.ts` | Orphan hook | None | No importers | **85%** | Low |
| `artifacts/ecg-insight/components/ecg/viewer/ecgViewerCaseState.ts` | Orphan state module | None | No importers | **85%** | Low |
| `artifacts/ecg-insight/components/ecg/viewer/useEcgViewerCaseState.ts` | Orphan hook | None | No importers | **85%** | Low |
| `artifacts/ecg-insight/components/ecg/viewer/EcgViewerToolbar.tsx` | Superseded by `EcgZeroChromeToolbar` | `viewer/index.ts` barrel only | Sprint 13 legacy | **88%** | Low |
| `artifacts/ecg-insight/components/ecg/viewer/EcgFloatingToolPalette.tsx` | Removed from foundation Sprint 52 | `viewer/index.ts` barrel only | No runtime imports | **90%** | Low |
| `artifacts/ecg-insight/components/ecg/viewer/live-monitor-v2/EcgLiveMonitorFloatingPalette.tsx` | Superseded by HMI bottom bar | v2 `index.ts` only | No shell imports | **88%** | Low |
| `artifacts/ecg-insight/components/ecg/viewer/EcgLiveMonitorUnifiedStatusBar.tsx` | Superseded by HMI + hospital HUD | None | No importers | **90%** | Low |
| `artifacts/ecg-insight/components/ecg/viewer/EcgRenderingEngineView.tsx` | Replaced by `EcgClinicalVisualizationCanvas` | None | Sprint 27 standalone view | **88%** | Low |
| `artifacts/ecg-insight/components/ecg/viewer/EcgWaveformPlaybackTimeline.tsx` | UI component unused; hook still used | None for component | `useEcgWaveformPlayback` imported by live monitor | **85%** | Low |
| `artifacts/ecg-insight/components/ecg/EcgWorkspaceViewer.tsx` | Legacy workspace viewer | None | Route uses `EcgEnterpriseWorkspaceScreen` | **92%** | Low |

---

## Confirmed Unused Server Files

| File | Why Unused | References | Confidence | Risk |
|------|------------|------------|------------|------|
| `server/src/modules/copilot/engine/intent-classifier.ts` | Deprecated; throws on call | Exported, never imported | **90%** | Medium (API surface) |
| `server/src/modules/copilot/engine/tool-orchestrator.ts` | Deprecated; throws on call | Exported, never imported | **90%** | Medium |

---

## Isolated / Non-Production Trees

| Path | Classification | Evidence | Confidence |
|------|----------------|----------|------------|
| `enterprise/emkp/` (entire tree) | **Deprecated** (isolated by design) | `CHANGELOG.md`: zero production integration; only `scripts/emkp-validation.test.ts` | **95%** |
| `artifacts/mockup-sandbox/` | **KEEP (Future)** | Dev sandbox; not production route | N/A |
| `mobile/` (root, 5 files) | **KEEP (Future)** | README: future native | N/A |

---

## Generated / Runtime Artifacts (Not Source)

| Path | Classification | Safe To Delete | Risk |
|------|----------------|------------------|------|
| `.local/` (~58k files) | Generated cache | Yes (local) | Low |
| `dist/` (62 files) | Build output | Yes (rebuild) | Low |
| `test-results/` (202 files) | Playwright output | Yes | Low |
| `playwright-report/` (25 files) | HTML reports | Yes | Low |
| Root `*.log` (26 files) | CI run logs | Yes | Low |
| `ara.traineddata`, `eng.traineddata` | OCR binaries at repo root | Yes (relocate to `assets/`) | Low |
| `validation-screenshots/` (28 PNGs) | QA artifacts | Archive then delete | Low |
| `uploads/` (~7,928 files) | **Runtime clinical data** | **NO** | **Critical** |

---

## Potentially Unused (Review Required)

| Item | Why Review | Confidence |
|------|------------|------------|
| `artifacts/api-server/` | Alternate API; may be dev/demo only | 60% unused |
| `lib/db/` + `lib/api-zod/` | Drizzle stack; production uses Prisma | 50% unused |
| 85+ untracked `SPRINT*_REPORT.md` | Deliverable docs; archive candidate | 70% archivable |
| Sprint-specific e2e specs (sprint13–68) | Overlap with enterprise matrix | 50% redundant |
| `server/src/modules/knowledge/` vs `knowledge-engine/` | Overlapping article CMS | Review Required |
| Prisma models with zero `prisma.model` usage | e.g. `ECGKnowledgeEntry` | 65% unused schema |

---

## Unused Constants / Assets (Sample)

| Asset | Path | Status |
|-------|------|--------|
| Legacy Bolt components | `components/bolt/` | **Review Required** — may be referenced by old routes |
| Duplicate coverage docs | `COVERAGE_DIFF.md` + `scripts/COVERAGE_DIFF.md` | **Duplicate** |
| Duplicate untested lists | `UNTESTED_FILES.md` + `scripts/UNTESTED_FILES.md` | **Duplicate** |

---

## Methodology Limitations

1. Barrel re-exports (`viewer/index.ts`) can mask true usage — files exported but never imported downstream counted as unused.
2. Dynamic imports and Expo Router file-based routing not fully traced.
3. Integration scripts may reference files outside normal import graph.
4. Prisma model usage inferred from `prisma.modelName` grep — indirect usage via raw SQL not counted.

---

*No files deleted. Await explicit approval for cleanup.*
