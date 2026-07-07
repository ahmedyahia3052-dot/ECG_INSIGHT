# Root Cause Report — Hospital Grade Rebuild

**Date:** 2026-07-08  
**Scope:** ECG Workspace & Live Monitor production readiness

## Executive Summary

The ECG Insight clinical surfaces were **not missing core functionality** — they suffered from **architectural fragmentation** and **operational gaps** that prevented hospital-grade acceptance.

## Root Causes

### 1. Render Engine 2.0 never wired to live monitor
`render-engine-2/realtimeEngine.ts` was built (Sprint 47) but `EcgLiveMonitorView` continued calling `ecgMonitorCanvas.ts` directly. This left phosphor persistence, GPU-friendly offscreen buffers, and sub-pixel grid math unused in the primary bedside canvas path.

**Fix:** `hospital-monitor/hospitalMonitorRenderer.ts` — unified paint entry with RE2 primary + legacy fallback.

### 2. Monitor layout state leaked into lead focus
Clicking lead buttons in multi-lead modes (6×2) incorrectly invoked `focusLead()`, filtering to a single lead. Layout switches did not always bump `layoutRevision`, causing stale canvas regions.

**Fix:** Lead strip guards + `layoutRevision`/`forceFullClear` pipeline (stabilization pass).

### 3. Canvas viewport ratio regression
Sprint 50 Pro HUD and audio controls were placed in the flex column above the canvas, reducing effective waveform area below the >88% hospital threshold.

**Fix:** Move Pro HUD + audio to bottom overlay inside `monitorStage`.

### 4. Connection Lost false positives
Health checks hit endpoints that failed transiently during tab visibility changes or API warm-up, surfacing "Connection Lost" while Postgres and digitized ECG data were available.

**Fix:** Retry-aware `/live` telemetry polling + debounced offline toasts.

### 5. Audio limited to adult/pediatric beeps
Bedside monitors require rhythm-aware alarm profiles (brady, tachy, VF, VT, asystole, lead off) synchronized with R-wave QRS detection.

**Fix:** Extended `useLiveMonitorAudioEngine` with clinical profile resolution and alarm volume channel.

### 6. Workspace perceived as incomplete
The enterprise workstation (`EcgMonitorViewerFoundation`) already implements left/center/right/bottom layout, original viewer, digitized SVG viewer, measurements, AI panel, comparison, timeline, and report — but lacked a unified acceptance marker and full Login→Report E2E gate.

**Fix:** `#hospital-grade-workspace-ready` marker + `hospital-grade-rebuild.spec.ts` workflow test.

## Non-Issues (Confirmed Working)

- AI pipeline (`getAIResult`, explainability adapters) — untouched, preserved
- Digitization API and real waveform samples — no mock data introduced
- Sprint 24–35 workspace grid shell — production layout retained

## Acceptance Status

All mandatory acceptance criteria validated via lint, typecheck, build, integration script, and Playwright `@hospital-grade` suite.
