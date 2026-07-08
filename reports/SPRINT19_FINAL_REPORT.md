# Sprint 19 — ECG Enterprise Hardening

**Status:** Complete  
**Date:** 2026-07-05  
**Route:** `/ecg-workspace`

## Summary

Closed enterprise policy gaps from the permanent master prompt: in-workspace report preview, dedicated measurement view mode, Canvas 2D live monitor engine, wired keyboard shortcuts, and monitor state in the clinical status bar.

## Delivered

| Requirement | Implementation |
|-------------|----------------|
| Report Preview view mode | `EcgReportPreviewPanel` — list/generate reports, authenticated HTML iframe preview, PDF export |
| Measurement Mode view | `measurement` mode chip + auto tool activation + `sprint19-measurement-view` |
| Canvas monitor engine | `ecgMonitorCanvas.ts` + web `<canvas>` rendering at device pixel ratio (~60 FPS) |
| Keyboard shortcuts | `useEcgWorkstationShortcuts` — Ctrl+O (cases), Ctrl+U (upload), M (monitor), R (report), G (grid) |
| Monitor status bar | `Monitor Live/Frozen/Paused` via `sprint19-status-monitor` |
| Open button fix | FILE → Open navigates to `/ecg-cases` (not upload) |

## View Modes (8 total)

Image · Processed · Waveform · Monitor · Measurement · Compare · Overlay · Report

## Validation

- lint / typecheck / build: pass
- Sprint 19 integration: pass
- Playwright Sprint 18 + 19: pass

## Key Files

- `EcgReportPreviewPanel.tsx`
- `ecgMonitorCanvas.ts`
- `useEcgWorkstationShortcuts.ts`
- Updated: `EcgLiveMonitorView.tsx`, `EcgMonitorViewerFoundation.tsx`, `types.ts`, `EcgViewModeSwitcher.tsx`
