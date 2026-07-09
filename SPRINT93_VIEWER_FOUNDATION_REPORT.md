# SPRINT 93 — ECG PRO VIEWER FOUNDATION REPORT

**Sprint:** 93 — ECG Pro Viewer Foundation  
**Date:** 2026-07-09  
**Base tag:** `v0.9.2-production`  
**Release tag:** `v0.9.3-viewer-foundation`  
**Branch:** `sprint93-ecg-viewer`

## Executive summary

Sprint 93 delivers a production-grade **ECG Pro Viewer** module at `/ecg-viewer` with a hospital workstation layout, canvas-based image rendering, calibrated ECG paper grid, and live study metadata. All toolbar and tool controls are wired to real viewer state — no placeholder UI.

| Area | Status |
|------|--------|
| `/ecg-viewer` route | PASS |
| Professional layout (toolbar / tools / canvas / info / status) | PASS |
| Canvas rendering (DPR, wheel zoom, pinch/pan) | PASS |
| Medical grid (1 mm / 5 mm, speed, gain, opacity, theme colors) | PASS |
| API integration (`/cases`, `/ecg-viewer/bundle`, `/ecg-storage`) | PASS |
| Responsive desktop / tablet / mobile | PASS |
| Lint / typecheck / build | PASS |
| Sprint 93 tests | PASS |

---

## Module: `/ecg-viewer`

### Route

- `artifacts/ecg-insight/app/(protected)/ecg-viewer.tsx`
- Query params: `?caseId=` or `?patientId=` (reuses `useEcgWorkspaceCaseResolver`)
- Protected via `ProtectedRoute` + zero-chrome enterprise shell

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ TOP TOOLBAR — case, patient, study date, leads, zoom, fit  │
├──────┬──────────────────────────────────────────┬───────────┤
│ LEFT │           CENTER ECG CANVAS              │   RIGHT   │
│ TOOLS│     (canvas drawImage + grid overlay)     │   INFO    │
├──────┴──────────────────────────────────────────┴───────────┤
│ BOTTOM STATUS — zoom %, pointer, paper calibration, canvas  │
└─────────────────────────────────────────────────────────────┘
```

**Responsive behavior:**
- **Desktop (≥1100px):** Full five-region layout
- **Tablet (768–1099px):** Tools + canvas + collapsible info panel
- **Mobile (<768px):** Toolbar + canvas + toggleable info; tools consolidated in toolbar

---

## Components (new)

| File | Purpose |
|------|---------|
| `pro-foundation/EcgProViewerFoundationScreen.tsx` | Main workspace orchestration |
| `pro-foundation/EcgProViewerToolbar.tsx` | Top toolbar (all sprint controls) |
| `pro-foundation/EcgProViewerToolsPanel.tsx` | Left tools panel |
| `pro-foundation/EcgProViewerCanvas.tsx` | Web canvas renderer (devicePixelRatio) |
| `pro-foundation/EcgProViewerInfoPanel.tsx` | Right study metadata panel |
| `pro-foundation/EcgProViewerStatusBar.tsx` | Bottom status bar |
| `pro-foundation/useEcgProViewerSession.ts` | Case + bundle + storage data hook |
| `services/ecgViewerApi.ts` | Sprint 89 viewer + storage API client |

---

## Toolbar controls (all functional)

| Control | Implementation |
|---------|----------------|
| Case name / Patient / Study date | Loaded from `getCase` + viewer bundle |
| Lead selector | Cycles `ALL` + standard 12 leads |
| Zoom +/- | `controls.zoomBy` |
| Fit Width | `controls.applyFit("width")` |
| Fit Screen | `controls.applyFit("hero")` |
| Paper speed 25/50 mm/s | `controls.setGrid({ speed })` |
| Gain 5/10/20 mm/mV | `controls.setGrid({ gain })` |
| View: Image / Grid / Image+Grid | `displayMode` state |
| Dark / Light mode | Theme palette swap (grid colors included) |
| Fullscreen | Fullscreen API + `controls.toggleFullscreen` |
| Download | Opens authenticated image URL |
| Print | Opens image in new window + `print()` |

---

## Canvas & grid

- **Web:** HTML canvas `drawImage` at `devicePixelRatio` — avoids CSS scaling blur
- **Native:** Falls back to `EcgProViewerEngine` (pinch/pan gestures)
- **Wheel zoom:** Anchored zoom at cursor position
- **Grid:** `EcgPaperGrid` with 1 mm minor / 5 mm major lines, theme-aware colors, configurable opacity
- **Paper calibration:** `resolveGridSpacing` from speed + gain

---

## API integration

| Endpoint | Usage |
|----------|-------|
| `GET /api/v1/cases/:id` | Case + patient context |
| `GET /api/v1/ecg-viewer/cases/:id/bundle` | Image URL, metadata, leads |
| `GET /api/v1/ecg-storage/files/:id/metadata` | File checksum, version, storage |

Also mounted at `/api/*` (dual mount).

---

## Navigation

- Enterprise sidebar: **ECG Pro Viewer** → `/ecg-viewer`
- Zero-chrome mode enabled for `/ecg-viewer` (full-bleed workspace)

---

## Validation

```bash
npm run lint          # PASS
npm run typecheck     # PASS
npm run build         # PASS
npx tsx scripts/sprint93-ecg-viewer-foundation.test.ts
npx tsx scripts/sprint93-ecg-viewer-foundation.integration.ts
```

Pipeline entries added in `scripts/integration/pipeline.mjs`.

---

## Files changed

- `artifacts/ecg-insight/app/(protected)/ecg-viewer.tsx` (new)
- `artifacts/ecg-insight/components/ecg/viewer/pro-foundation/*` (new module)
- `artifacts/ecg-insight/services/ecgViewerApi.ts` (new)
- `artifacts/ecg-insight/components/ecg/viewer/EcgPaperGrid.tsx` (theme grid colors)
- `artifacts/ecg-insight/components/enterprise/EnterpriseUI.tsx` (nav + zero-chrome)
- `scripts/sprint93-ecg-viewer-foundation.{test,integration}.ts` (new)
- `scripts/integration/pipeline.mjs`

---

## Operator notes

Open viewer:

```
http://localhost:8081/ecg-viewer?caseId=<case-id>
```

Or from sidebar **ECG Pro Viewer** (auto-loads first available case in demo mode).

---

*Sprint 93 — Production-ready ECG Pro Viewer foundation. Zero placeholders.*
