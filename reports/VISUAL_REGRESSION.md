# Visual Regression — RC-1

**Date:** 2026-07-07  
**Suite:** `tests/e2e/visual-regression-enterprise.spec.ts`  
**Tag:** `@visual-regression @enterprise`

---

## Snapshot Baselines

| Snapshot | Viewport | Purpose |
|----------|----------|---------|
| `dashboard-desktop.png` | 1440×900 | KPI layout |
| `dashboard-laptop.png` | 1366×768 | Responsive dashboard |
| `dashboard-tablet.png` | 1024×768 | Tablet shell |
| `ecg-workspace-shell.png` | 1920×1080 | Toolbar, ribbon, panels |
| `login-screen.png` | default | Auth card typography |

**Path:** `tests/e2e/__snapshots__/visual-regression-enterprise.spec.ts/`

---

## RC-1 Visual Validation

| Method | Result |
|--------|--------|
| Sprint 36 responsive (4 viewports) | ✅ No clipping |
| Workspace restoration screenshots | ✅ Enterprise shell |
| Visual regression spec | Run `npm run qa:visual` pre-deploy |
| maxDiffPixelRatio | 0.02–0.03 |

---

## UI Elements Verified (Non-Snapshot)

- 16-stage workflow ribbon with progress bar
- Clinical alerts severity colors
- Zero-chrome / Sprint 35 floating palette
- AI Cardiologist 14-section scroll layout
- Live monitor independent chrome

---

## Detected / Fixed Visual Issues (SAT)

| Issue | Severity | Status |
|-------|----------|--------|
| Workflow label clipping | HIGH | ✅ Horizontal scroll |
| AI tab strict-mode dual pane | LOW | ✅ Test updated |
| Tooltip portal clipping | MEDIUM | ✅ Phase 10 integration |

---

## Commands

```bash
npm run qa:visual              # Compare baselines
npm run qa:visual:update       # Refresh after approved UI change
```

---

## Classification

No visual **BLOCKER** defects open. Baseline comparison recommended once before production tag.
