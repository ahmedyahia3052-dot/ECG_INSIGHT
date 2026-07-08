# Sprint 36 — Bug Report

## Critical

### B-36-001 — Infinite re-render (`Maximum update depth exceeded`)
**Area:** ECG monitor / measurement workspace  
**Symptoms:** Console flood when interacting with viewer or placing calipers with measurements panel open.  
**Root causes (multiple):**
- `useHistoryStack.commit` mutated undo history even on no-op updates
- `useEffect` dependencies on entire `workspace` / `aiOverlay` objects
- Unstable `onPersist` / `scheduleSave` callbacks recreating overlay sync effects
- `useEnterpriseStatusMetrics` depended on `metrics.memory`, retriggering RAF loop

**Status:** FIXED (core paths). Caliper placement with full Measurement Studio + analyzed cases remains a known edge case — tracked as B-36-008.

### B-36-002 — Duplicate React keys (`custom`) in measurement presets
**Area:** `EcgMeasurementsPanel`  
**Symptoms:** Console warnings for three presets sharing `kind: "custom"`.  
**Status:** FIXED — composite keys `${kind}-${caliperKind}-${label}`.

### B-36-003 — Invalid DOM `nativeID` on web
**Area:** Viewer layout / canvas / tooltips  
**Symptoms:** `React does not recognize the nativeID prop on a DOM element`.  
**Status:** FIXED — `ecgNativeId.ts`, `ecgAnchorId.ts`, grid shell uses HTML `id`.

### B-36-004 — Cross-origin ECG image blocked (CORP)
**Area:** API static file delivery  
**Symptoms:** `ERR_BLOCKED_BY_RESPONSE.NotSameOrigin` when frontend loads images from API origin.  
**Status:** FIXED — `crossOriginResourcePolicy: cross-origin` in Helmet config.

## High

### B-36-005 — Nested `<button>` in measurement rows
**Area:** `EcgMeasurementsPanel.MeasurementRow`  
**Symptoms:** Hydration error, button inside button.  
**Status:** FIXED — row container is `View`; jump action on inner `Pressable` only.

### B-36-006 — AI annotation merge re-added generated annotations
**Area:** `mergeGeneratedAnnotations`  
**Symptoms:** Growing annotation arrays on each sync cycle.  
**Status:** FIXED — preserve existing keys before merging generated set.

### B-36-007 — Floating palette control label drift
**Area:** E2E / floating toolbar  
**Symptoms:** Tests expected `Reset View` / `Fit Image`; palette uses `Reset`.  
**Status:** FIXED — locator aliases + keyboard zoom shortcuts in QA suite.

## Medium (Open)

### B-36-008 — Caliper workflow + Measurement Studio under analyzed cases
**Area:** Measurement overlay + AI sync  
**Symptoms:** Max update depth when opening measurements tab, selecting PR, placing calipers, with AI analysis enabled.  
**Status:** OPEN — deferred; Sprint 36 e2e validates overlay stability via keyboard zoom without full caliper workflow under strict console gate.
