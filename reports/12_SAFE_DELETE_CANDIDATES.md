# 12 — Safe Delete Candidates

**Audit:** Sprint 69 | Read-only  
**⚠️ Await explicit approval before deleting ANY file**

---

## Summary

| Tier | Category | Est. Files | Confidence |
|------|----------|----------:|------------|
| **Tier 1** | Orphan TS/TSX (zero importers) | 16 | 85–95% |
| **Tier 2** | Generated artifacts | ~66,300 | 99% |
| **Tier 3** | Root logs + duplicate docs | ~35 | 90% |
| **Tier 4** | Archivable sprint reports | 288 | 70% (archive, not delete) |
| **Tier 5** | Deprecated server shims | 2 | 90% |

**Total estimated safely deletable (Tier 1–3):** ~400–450 items  
**Total archivable (Tier 4):** 288 documents  
**Do NOT delete:** `uploads/`, `prisma/migrations/`, active modules

---

## Tier 1 — Orphan Source Files (Safe To Delete)

### `EcgLiveMonitorGridShell.tsx`

| Field | Value |
|-------|-------|
| **Path** | `artifacts/ecg-insight/components/ecg/viewer/EcgLiveMonitorGridShell.tsx` |
| **Why** | Zero imports; broken token references; overlay shell is active |
| **Who references it** | None (grep: 0 `from` imports) |
| **Evidence** | Typecheck errors; `LIVE_MONITOR_SIDEBAR_HOTFIX_REPORT.md` scoped grid out |
| **Confidence** | **92%** |
| **Risk** | Low — may be needed if product chooses grid layout later |

### `EcgReadingStationLayout.tsx`

| Field | Value |
|-------|-------|
| **Path** | `artifacts/ecg-insight/components/ecg/viewer/EcgReadingStationLayout.tsx` |
| **Why** | Sprint 53 experiment never wired to foundation |
| **Who references it** | None |
| **Evidence** | Foundation uses `EcgViewerResizableWorkspace` |
| **Confidence** | **90%** |
| **Risk** | Low |

### `ecgReadingStationTokens.ts`

| Field | Value |
|-------|-------|
| **Path** | `artifacts/ecg-insight/components/ecg/viewer/ecgReadingStationTokens.ts` |
| **Why** | Only used by unused reading station layout |
| **Who references it** | `EcgReadingStationLayout.tsx` only |
| **Confidence** | **90%** |
| **Risk** | Low |

### `EcgReadingModeChrome.tsx`

| Field | Value |
|-------|-------|
| **Path** | `artifacts/ecg-insight/components/ecg/viewer/EcgReadingModeChrome.tsx` |
| **Why** | Not integrated in `EcgMonitorViewerFoundation` |
| **Who references it** | None in runtime import tree |
| **Confidence** | **88%** |
| **Risk** | Low |

### `ecgAutoFitEngine.ts` + `useEcgAutoFit.ts`

| Field | Value |
|-------|-------|
| **Paths** | `viewer/ecgAutoFitEngine.ts`, `viewer/useEcgAutoFit.ts` |
| **Why** | Orphan; documented as removed |
| **Who references it** | None |
| **Confidence** | **85%** |
| **Risk** | Low |

### `ecgViewerCaseState.ts` + `useEcgViewerCaseState.ts`

| Field | Value |
|-------|-------|
| **Paths** | `viewer/ecgViewerCaseState.ts`, `viewer/useEcgViewerCaseState.ts` |
| **Why** | Zero importers |
| **Confidence** | **85%** |
| **Risk** | Low |

### `EcgViewerToolbar.tsx`

| Field | Value |
|-------|-------|
| **Path** | `viewer/EcgViewerToolbar.tsx` |
| **Why** | Superseded by `EcgZeroChromeToolbar` |
| **Who references it** | `viewer/index.ts` barrel only |
| **Confidence** | **88%** |
| **Risk** | Low — remove barrel export first |

### `EcgFloatingToolPalette.tsx`

| Field | Value |
|-------|-------|
| **Path** | `viewer/EcgFloatingToolPalette.tsx` |
| **Why** | Removed from foundation Sprint 52 |
| **Who references it** | Barrel export only |
| **Confidence** | **90%** |
| **Risk** | Low |

### `live-monitor-v2/EcgLiveMonitorFloatingPalette.tsx`

| Field | Value |
|-------|-------|
| **Path** | `viewer/live-monitor-v2/EcgLiveMonitorFloatingPalette.tsx` |
| **Why** | Superseded by HMI bottom bar |
| **Confidence** | **88%** |
| **Risk** | Low |

### `EcgLiveMonitorUnifiedStatusBar.tsx`

| Field | Value |
|-------|-------|
| **Path** | `viewer/EcgLiveMonitorUnifiedStatusBar.tsx` |
| **Why** | Superseded by HMI status bar |
| **Confidence** | **90%** |
| **Risk** | Low |

### `EcgRenderingEngineView.tsx`

| Field | Value |
|-------|-------|
| **Path** | `viewer/EcgRenderingEngineView.tsx` |
| **Why** | Replaced by `EcgClinicalVisualizationCanvas` |
| **Confidence** | **88%** |
| **Risk** | Low |

### `EcgWaveformPlaybackTimeline.tsx`

| Field | Value |
|-------|-------|
| **Path** | `viewer/EcgWaveformPlaybackTimeline.tsx` |
| **Why** | UI unused; hook `useEcgWaveformPlayback` still used |
| **Confidence** | **85%** |
| **Risk** | Low |

### `EcgWorkspaceViewer.tsx`

| Field | Value |
|-------|-------|
| **Path** | `components/ecg/EcgWorkspaceViewer.tsx` |
| **Why** | Legacy; route uses `EcgEnterpriseWorkspaceScreen` |
| **Confidence** | **92%** |
| **Risk** | Low |

### `intent-classifier.ts` + `tool-orchestrator.ts`

| Field | Value |
|-------|-------|
| **Paths** | `server/src/modules/copilot/engine/intent-classifier.ts`, `tool-orchestrator.ts` |
| **Why** | Deprecated; throw on use; never imported |
| **Confidence** | **90%** |
| **Risk** | Medium — verify no dynamic import |

---

## Tier 2 — Generated Artifacts (Safe To Delete)

| Path | Files | Why | Risk |
|------|------:|-----|------|
| `.local/` | ~58,010 | Replit/local cache | Low (regenerated) |
| `test-results/` | 202 | Playwright output | Low |
| `playwright-report/` | 25 | HTML reports | Low |
| `dist/` | 62 | Expo build output | Low (rebuild) |
| Root `*.log` | 26 | CI run logs | Low |
| `*.tsbuildinfo` | few | TS incremental cache | Low |

---

## Tier 3 — Misplaced Binaries & Duplicate Docs

| Path | Why | Confidence | Risk |
|------|-----|------------|------|
| `ara.traineddata` | OCR binary at repo root | 95% | Low — relocate preferred |
| `eng.traineddata` | OCR binary at repo root | 95% | Low |
| `scripts/COVERAGE_DIFF.md` | Duplicate of root | 90% | Low |
| `scripts/UNTESTED_FILES.md` | Duplicate of root | 90% | Low |

---

## Tier 4 — Archive Candidates (Do Not Hard Delete)

| Path | Files | Action |
|------|------:|--------|
| Root `SPRINT*_*.md`, `*_REPORT.md` | 288 | Move to `docs/sprints/archive/` |
| `validation-screenshots/` | 28 | Move to `docs/qa/screenshots/` |

**Confidence:** 70% — may have historical reference value.

---

## Unsafe To Delete

| Path | Why |
|------|-----|
| `uploads/` (~7,928 files) | Runtime clinical file storage |
| `prisma/migrations/` (63) | Database history |
| `server/src/modules/*` (active) | Production API |
| `artifacts/ecg-insight/app/` | Production routes |
| `tests/e2e/` (active specs) | QA coverage |
| `scripts/integration/pipeline.mjs` | CI gate |
| `.github/workflows/` | CI |

---

## Deletion Procedure (When Approved)

1. Run full Playwright + integration suite (baseline).
2. Delete Tier 1 files; remove barrel exports.
3. Run typecheck + lint.
4. Gitignore Tier 2 patterns.
5. Archive Tier 4 to `docs/`.
6. Re-run QA matrix.

---

*No deletions performed. Await explicit approval.*
