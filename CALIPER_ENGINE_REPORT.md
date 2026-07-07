# Caliper Engine Report — Sprint 34

## Supported Calipers

| Kind | Measurements |
|------|--------------|
| Horizontal | PR, RR, PP, QT, QTc, QRS, HR, P duration |
| Vertical | ST↑, ST↓, P/R/S/T amplitude, voltage |
| Angle | Electrical axis |
| Distance / Multi | Custom segments |

## Interaction

- Drag handles (mouse + touch via PanResponder)
- Keyboard arrow nudge (±0.5 px minimum step)
- Grid, baseline, and wave snapping
- Lock, duplicate, delete, undo, redo
- Multiple simultaneous calipers

## Floating Toolbar

`EcgMeasurementFloatingToolbar` — pointer, H/V calipers, angle, distance, delete, undo/redo, snap, lock, annotations. Auto-collapses after 2.4s idle.

## Multi-Lead Sync

Horizontal calipers on Lead II replicate across all 12 leads via `groupId`. Timestamp markers highlight synchronized vertical positions when multi-lead sync is enabled.

## Overlay

`EcgMeasurementOverlay` renders SVG calipers zoom/pan aware with endpoint hit-testing and annotation drawing modes.
