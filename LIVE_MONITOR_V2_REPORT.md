# Live Monitor V2 Report

Generated: 2026-07-07T18:23:33.052Z

## Architecture

`/ecg-live-monitor/[caseId]` → `EcgLiveMonitorShell` (V2)

- **Top:** 22px case strip + 28px `EcgLiveMonitorHospitalHud`
- **Stage:** `EcgLiveMonitorView` auto-fit canvas (~93% viewport)
- **Overlay:** `EcgLiveMonitorFloatingPalette` (leads, toolbar, transport)
- **Renderer:** `ecgMonitorCanvas.ts` + `live-monitor-v2/ecgHospitalGrid.ts`

## Layout Modes

single · 3-lead · 5-lead · **6-lead** · 12-lead · **custom** · rhythm strip
