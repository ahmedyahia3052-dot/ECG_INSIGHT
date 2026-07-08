# Auto Snap Report — Sprint 42

**Date:** 2026-07-07

## Snap Targets

| Target | Source |
|--------|--------|
| P onset / peak / offset | Wave fiducials + engine intervals |
| Q, R peak, S | Detected annotations or synthetic beat model |
| J point, ST junction | J/ST fiducials |
| T onset / peak / offset | T wave fiducials |
| Baseline / isoelectric | Lead region baseline Y |
| Grid intersections | 1 mm grid spacing |
| Nearest waveform | Closest fiducial within 1.25 box threshold |

## Pipeline

`applyAutoSnap()` in `ecgAutoSnapEngine.ts`:

1. Grid snap (optional)
2. Baseline Y lock (optional)
3. Fiducial X/Y snap (optional, visible lead only)

## Configuration

`EcgMeasurementSnapSettings`:

- `snapToGrid`, `snapToBaseline`, `snapToWave`, `multiLeadSync`
- `snapTargets[]` — granular target filter
- `visibleLeadOnly` — restrict fiducials to active lead

## Integration

`useEcgMeasurementWorkspace.applySnap()` delegates to auto snap engine with detected fiducials from `ecgWaveDetectionBridge`.
