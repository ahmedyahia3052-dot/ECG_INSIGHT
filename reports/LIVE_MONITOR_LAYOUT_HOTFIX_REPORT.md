# Live Monitor Layout Hotfix Report

**Status:** COMPLETE  
**Scope:** Layout rebuild only — no ECG logic or signal rendering changes

---

## Problem

The Live Monitor used **absolute-positioned overlays** for the left rail, right rail, bottom bar, and Pro HUD. Rails sat on top of the canvas instead of reserving layout space, causing visual overlap, clipped controls, and fragile `chromeHeight` calculations that passed automated tests but failed manual inspection.

---

## Solution

Replaced the overlay shell with a **CSS Grid layout** (`EcgLiveMonitorGridShell.tsx`):

```
┌──────────┬─────────────────────────────────────┐
│          │ Header (status + Pro HUD)           │
│ Sidebar  ├─────────────────────────────────────┤
│ (280–320)│ Canvas region                       │
│          │ [optional right panel ≥1600px]      │
│          ├─────────────────────────────────────┤
│          │ Bottom toolbar (transport)          │
└──────────┴─────────────────────────────────────┘
```

### Key changes

| Area | Change |
|------|--------|
| **Left sidebar** | Fixed docked column, 280–320px responsive, never auto-collapses, scrollable sections with consistent padding |
| **Canvas** | Starts immediately after sidebar (`canvasRect.left >= sidebarRect.right`), zero horizontal overlap |
| **Status bar** | Aligned to main column width (header grid area), not overlaid on canvas |
| **Bottom toolbar** | Docked footer in grid, always visible, never covers waveform |
| **Right panel** | In-flow third column on viewports ≥1600px |
| **Pro HUD / audio** | Moved into status stack (in-flow), removed absolute overlay |

### Files modified

- `EcgLiveMonitorGridShell.tsx` — **new** CSS Grid shell
- `EcgLiveMonitorShell.tsx` — rewired to grid (removed all absolute overlays)
- `live-monitor-hmi/ecgLiveMonitorHmiTokens.ts` — sidebar 280–320px tokens
- `live-monitor-hmi/useLiveMonitorHmiLayout.ts` — disabled collapse, responsive widths
- `live-monitor-hmi/EcgLiveMonitorHmiLeftRail.tsx` — full-width docked sidebar UI
- `live-monitor-hmi/EcgLiveMonitorHmiRightRail.tsx` — in-flow panel
- `live-monitor-hmi/EcgLiveMonitorHmiStatusBar.tsx` — header alignment
- `live-monitor-hmi/EcgLiveMonitorHmiBottomBar.tsx` — docked footer

---

## Validation

### Quality gates

| Check | Result |
|-------|--------|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run build` | PASS |
| Playwright `@sprint49` | PASS (6/6) |
| Playwright `@live-monitor-layout` | PASS (6/6) |

### Responsive screenshot evidence

Generated at `validation-screenshots/live-monitor-layout-hotfix/`:

- `live-monitor-1366x768.png`
- `live-monitor-1600x900.png`
- `live-monitor-1920x1080.png`
- `live-monitor-2560x1440.png`
- `live-monitor-3840x2160.png`

### Layout assertions (per viewport)

- Sidebar width 280–320px
- Zero horizontal overlap between sidebar and canvas
- Canvas starts after sidebar edge
- Header above canvas, bottom bar below canvas
- Zero clipped sidebar buttons

---

## Manual validation checklist

- [x] Fixed docked left sidebar (280–320px)
- [x] Sidebar never overlaps canvas
- [x] All sidebar buttons visible with equal spacing
- [x] Canvas begins only after sidebar ends
- [x] Status bar aligned with main column
- [x] Bottom toolbar docked, does not cover waveform
- [x] CSS Grid — no negative margins, no translate hacks
- [x] Responsive 1366 → 4K

---

## Known limitations

- Diagnostic fullscreen mode retains a minimal absolute HUD overlay (exit chip only) — acceptable for fullscreen UX
- Right clinical panel hidden below 1600px viewport width (by design for narrow bedsides)
