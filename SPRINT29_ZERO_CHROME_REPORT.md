# Sprint 29 — Zero-Chrome Clinical Workspace & Enterprise Layout Engine

**Status:** Complete  
**Date:** 2026-07-06  
**Tag:** `Sprint29-ZeroChromeClinicalWorkspace`

## Summary

Transformed the ECG workspace into a hospital-grade zero-chrome cardiology workstation. Less UI, more ECG. The viewer receives maximum screen real estate with contextual tools that appear only when relevant.

## Delivered

| Phase | Implementation |
|-------|----------------|
| Zero-chrome toolbar | Contextual collapsible groups (FILE/VIEW/DIGITIZE/MONITOR/MEASURE/AI/COMPARE/EXPORT/REPORT), ≤48px height |
| Smart tool groups | One expanded group at a time; mode-specific tool sets |
| Floating palette | Auto-hide zoom/measure/caliper/reset tools on viewer (`sprint29-floating-tool-palette`) |
| Layout engine | Auto-hide panels, hover expand, pinned mode, layout v4 persistence |
| Resizable panels | Double-click reset on resize handles, min/max width constraints |
| Diagnostic mode | F11 zero-chrome fullscreen; ESC restores workspace |
| Design system | `ecgEnterpriseDesignTokens.ts` — spacing, radius, animation, glow |
| Status bar | Coordinates, render engine, GPU/FPS/memory telemetry |

## Validation

- lint / typecheck / build: pass
- Sprint 29 integration: pass (11 checks)
- Playwright Sprint 29: **3/3 pass**
- Visual Inspector: **100%**

## Key Files

- `EcgZeroChromeToolbar.tsx`, `EcgFloatingToolPalette.tsx`, `EcgEnterpriseLayoutEngine.tsx`
- `useEcgDiagnosticMode.ts`, `ecgEnterpriseDesignTokens.ts`, `ecgWorkstationVisualTokens.ts`
- `EcgMonitorViewerFoundation.tsx`, `EcgWorkstationGridShell.tsx`, `EcgViewerResizableWorkspace.tsx`

## Readiness testIDs

- `sprint29-zero-chrome-workstation-ready`
- `sprint29-zero-chrome-toolbar`, `sprint29-enterprise-layout-engine`
- `sprint29-floating-tool-palette`, `sprint29-diagnostic-header`
- `sprint29-enterprise-status-bar`
