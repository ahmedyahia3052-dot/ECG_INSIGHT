# Caliper Engine Report — Sprint 42

**Date:** 2026-07-07

## Caliper Geometry Modes

| Mode | Use |
|------|-----|
| Horizontal | Interval measurements (PR, QRS, QT, RR) |
| Vertical | Amplitude / ST deviation |
| Dual | Custom paired measurement |
| Multi | Polyline segments |
| Angle | Electrical axis |
| Distance | Path length |
| Crosshair | Point reference (Sprint 42) |
| Reference | Baseline reference caliper (Sprint 42) |
| Free | Unconstrained measurement (Sprint 42) |

## Waveform Anchoring

Each caliper stores optional `waveformStart`, `waveformEnd`, `waveformVertex`, `waveformWaypoints`. On drag/create:

```typescript
attachWaveformAnchors(caliper, waveformContext)
```

On grid/gain/speed change:

```typescript
syncCaliperImageFromWaveform(caliper, context)
```

## Interaction

- Lock/unlock per caliper
- Duplicate with offset
- Arrow-key nudge (sub-grid step)
- PanResponder overlay hit testing unchanged for regression compatibility

## Live Labels

Overlay renders: abbreviation · lead · value · unit · approval · operator via `liveLabelForCaliper()`.
