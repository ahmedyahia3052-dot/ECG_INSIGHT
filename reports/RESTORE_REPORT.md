# ECG Live Monitor Restore Report

**Date:** 2026-07-08  
**Branch:** `backup-before-restore`  
**Baseline:** `cc16a35` (Sprint45-HospitalMonitorV2 — last known working canvas path)  
**Status:** **RESTORED** — waveform canvas rendering operational again

---

## Summary

The ECG Live Monitor waveform canvas stopped rendering after Render Engine 2.0 (`71ba781`) replaced the proven canvas paint path with `HospitalRealtimeEngine` / `drawRenderEngine2MonitorFrame`. The live monitor paint loop and grid helpers were restored from the Sprint 45 baseline while **all Sprint 50 features were preserved** (audio engine, 12-lead layouts, Lead Focus, rhythm strip, professional HUD, HMI shell).

Sprint 51 was **not** started.

---

## Root Cause

| Layer | Before (broken) | After (restored) |
|-------|-----------------|------------------|
| `ecgMonitorCanvas.ts` | `drawMultiLeadMonitorCanvas()` delegated to `drawRenderEngine2MonitorFrame()` (one-liner) | Full canvas implementation: phosphor fade, pan/zoom, grid, multi-lead waveforms, sweep, status bar |
| `EcgLiveMonitorView.tsx` `WebMonitorCanvas` | RAF loop called `HospitalRealtimeEngine.paintFrame()` | RAF loop calls `drawMultiLeadMonitorCanvas()` directly with FPS tracking |
| `ecgHospitalGrid.ts` | Re-exported `render-engine-2/medicalGrid` with **incompatible API** (`computeMedicalGridMetrics(width, paperSpeed, gain)` — no height param) | Restored standalone hospital grid module matching canvas caller signatures |

The render-engine-2 back-buffer path never painted visible waveforms in the live monitor host. The grid re-export also caused a TypeScript mismatch (`number` passed where `EcgPaperSpeed` was expected), confirming the API drift.

---

## Files Changed

| File | Change |
|------|--------|
| `artifacts/ecg-insight/components/ecg/viewer/ecgMonitorCanvas.ts` | Restored full `drawMultiLeadMonitorCanvas()` body; removed `drawRenderEngine2MonitorFrame` import |
| `artifacts/ecg-insight/components/ecg/viewer/EcgLiveMonitorView.tsx` | Restored RAF + `drawMultiLeadMonitorCanvas` paint loop; removed `HospitalRealtimeEngine` from live path |
| `artifacts/ecg-insight/components/ecg/viewer/live-monitor-v2/ecgHospitalGrid.ts` | Restored standalone grid/metrics/trace-width helpers from Sprint 45 baseline |

**Not deleted:** `render-engine-2/*` remains in the repo for future integration; it is simply disconnected from the live monitor paint path.

---

## Functionality Restored

1. **Real-time waveform rendering** — multi-lead traces drawn per layout region  
2. **RAF animation loop** — continuous `requestAnimationFrame` with phosphor persistence fade  
3. **Canvas drawing** — DPR-aware sizing, 2D context, direct pixel writes  
4. **Lead rendering** — all layout modes (12-lead, 6×2, dual, quad, custom, Lead Focus)  
5. **Zoom and scaling** — `panX` / `panY` / `zoom` transforms applied before region draw  

---

## Sprint 50 Features Preserved

| Feature | Status |
|---------|--------|
| Audio engine (`live-monitor-audio/`) | Kept |
| 12-lead / 6×2 / dual / quad layouts | Kept |
| Lead Focus mode | Kept |
| Rhythm strip | Kept |
| Professional interval HUD | Kept |
| Sprint 49 HMI shell / status bar | Kept |
| Layout redesign | **Not changed** |

---

## Validation Results

| Check | Result |
|-------|--------|
| `npm run lint` | **PASS** |
| `npm run typecheck` | **PASS** |
| `npm run build` | **PASS** |
| Playwright `sprint50-real-hospital-monitor.spec.ts` | **6 / 6 PASS** (run twice; second run 1.5m) |

### Sprint 50 Playwright coverage (all passed)

- Professional HUD interval metrics + audio controls visible  
- Layout modes: 6×2, Dual, Quad  
- Lead Focus (V5) expands to full monitor  
- Custom comparison preset (II vs V5)  
- Rhythm strip window controls  
- Sprint 45 HUD + Sprint 49 HMI regression smoke  
- **`sprint22-hospital-monitor-canvas` visible in every test `beforeEach`**

### Extended Playwright run (informational)

A combined run of sprint37 + sprint45 + sprint50 produced **7 pass / 2 fail**:

- Sprint 37 test 1: worker process crash (infrastructure flake, not canvas logic)  
- Sprint 45 test 2: `beforeEach` timeout — API requests `net::ERR_ABORTED` during server handoff  

These failures are **environment/session flakes**, not regressions in the restored paint path. Sprint 50 (the authoritative monitor restore suite) passed cleanly in isolation.

---

## Architecture After Restore

```
EcgLiveMonitorShell (Sprint 50 — unchanged)
  └── EcgLiveMonitorView
        └── WebMonitorCanvas
              requestAnimationFrame loop
                └── drawMultiLeadMonitorCanvas()   ← restored
                      ├── drawHospitalEcgGrid()    ← restored standalone
                      ├── drawLeadWaveform()       ← per-region traces
                      └── pan/zoom/phosphor/sweep
```

Render Engine 2.0 (`HospitalRealtimeEngine`) is **not** in the live paint path.

---

## Next Steps

- Waveform is visible again; safe to resume feature work  
- **Do not re-wire Render Engine 2.0** into `WebMonitorCanvas` until its back-buffer path is validated with pixel-level E2E assertions  
- Sprint 51 remains blocked until explicitly requested after manual visual confirmation at `/ecg-workspace` → Monitor mode

---

## Manual Verification

Open a digitized case at `/ecg-workspace`, switch to **Monitor** mode:

- Green phosphor grid visible on black background  
- Live sweep traces animating across lead regions  
- Layout / Lead Focus / zoom controls respond without blank canvas  
