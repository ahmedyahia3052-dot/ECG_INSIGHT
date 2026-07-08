# Screenshot Before / After — SAT 2026-07-07

## Purpose

Document visual state captured during System Acceptance Test for enterprise ECG workspace and clinical workflow validation.

---

## ECG Workspace — Enterprise Viewer Restored

**Spec:** `tests/e2e/ecg-workspace-restoration.spec.ts`  
**File:** `test-results/screenshots/ecg-workspace-restored.png`

### Before (pre–Sprint 16–18 enterprise rebuild)
- Legacy import-only UI on `/ecg-workspace`
- No docking layout, no clinical right panel tabs
- No workflow ribbon or zero-chrome toolbar

### After (SAT state)
- Full enterprise shell: left rail, center canvas, right clinical panel
- 16-stage workflow ribbon with progress indicator
- Zero-chrome toolbar with digitize, export PDF, command palette
- Measurement studio with engine reference + manual calipers
- Status bar: lead, speed, gain, zoom, FPS, GPU, memory

---

## ECG Workspace — Demo Mode

**Spec:** `tests/e2e/ecg-workspace-restoration.spec.ts`  
**File:** `test-results/screenshots/ecg-workspace-demo-mode.png`

### After
- `/ecg-workspace` without caseId auto-loads sample when demo available
- `ecg-enterprise-workspace-ready` or `ecg-workspace-no-demo` marker

---

## Clinical Workflow (Sprint 30 baseline)

**File:** `test-results/screenshots/sprint30-clinical-workflow.png`

### After
- Workflow ribbon, alerts banner, patient workspace visible
- AI review panel area (now Sprint 38 cardiologist workspace in SAT)

---

## Live Monitor (Sprint 37)

**Captured during:** `tests/e2e/sprint37-live-monitor.spec.ts` (Playwright artifacts)

### After
- Independent `/ecg-live-monitor` route
- Transport controls, lead strip, status panel
- Diagnostic fullscreen with ESC exit
- Review workspace `/ecg-workspace` unchanged (verified in Sprint 37 spec 4)

---

## AI Cardiologist (Sprint 38)

**Captured during:** `tests/e2e/sprint38-ai-cardiologist.spec.ts`

### Before
- Simple AI review workflow panel in AI tab

### After
- `sprint38-ai-cardiologist-workspace` with 14 collapsible sections
- Finding cards with lead focus (`sprint38-finding-*`)
- Differential table (`sprint38-differential-*`)
- Interval table (`sprint38-interval-*`)

---

## Responsive Layout (Sprint 36)

**Viewports tested:** 1366×768, 1440×900, 1600×900, 1920×1080

### After
- No clipping of workflow steps, toolbar, or right panel at any viewport
- Horizontal scroll on workflow ribbon when needed

---

## How to Regenerate

```bash
npx playwright test tests/e2e/ecg-workspace-restoration.spec.ts
npx playwright test tests/e2e/sprint30-clinical-workflow.spec.ts
npx playwright test tests/e2e/sprint37-live-monitor.spec.ts
npx playwright test tests/e2e/sprint38-ai-cardiologist.spec.ts
```

Screenshots write to `test-results/screenshots/` per spec `page.screenshot()` calls.
