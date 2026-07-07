# Measurement Engine Report — Sprint 42

**Module:** Clinical Measurement Studio  
**Date:** 2026-07-07

## Core Principle

All clinical values are computed from **waveform coordinates** (`timeMs`, `amplitudeMv`, `lead`) when anchors are present. Image/screen pixels are display derivatives only.

## Engine Components

| File | Role |
|------|------|
| `waveformCoordinateSpace.ts` | Canonical coordinate conversions and waveform readouts |
| `ecgMeasurementEngine.ts` | Presets, sync, workflow bundles, export, QT dispersion |
| `ecgAutoSnapEngine.ts` | Clinical fiducial and grid snap pipeline |
| `ecgCalibrationMath.ts` | Legacy pixel readouts + QTc formulas |
| `useEcgMeasurementWorkspace.ts` | State machine, undo/redo, approval, workflow presets |
| `EcgMeasurementsPanel.tsx` | Professional sidebar UI |

## Measurement Lifecycle

1. **Click waveform** → screen→image→snap→waveform anchor
2. **Sync** → compute readouts from waveform delta
3. **Recalibrate** (zoom/gain/speed) → reproject image endpoints from waveform anchors
4. **Review** → approve/reject in sidebar
5. **Export** → JSON/CSV/FHIR/HL7/XML bundles

## Supported Clinical Measurements

PR, QRS, QT, QTc, QTc Bazett, QTc Fridericia, QT Dispersion, RR, PP, HR, P/T duration, P/R/S/T amplitude, ST elevation/depression, electrical axis, Q wave width/depth, bundle branch delay, custom.

## Backward Compatibility

- Workspace version remains **v5**
- Legacy calipers without waveform anchors fall back to pixel-based `measurementFromCaliper`
- Existing Sprint 13–34 test IDs preserved
