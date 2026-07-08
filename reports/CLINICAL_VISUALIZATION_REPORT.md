# Clinical Visualization Report

See Sprint 28 implementation in `artifacts/ecg-insight/components/ecg/viewer/clinical-visualization/` and `EcgClinicalVisualizationCanvas.tsx`.

## Layer Stack

Grid (10) → Waveform (20) → Beat (25) → Measurement (35) → AI (45) → Selection (65) → Cursor (75) → Tooltip (80)

## Grid Presets

Classic ECG Paper, Hospital Black, Dark Blue, Dark Gray — pixel-perfect 1mm/5mm scaling with zoom.

## Crosshair Telemetry

Lead, time (ms), voltage (mV), sample index, coordinates on hover.

## AI Visualization

Explainability lead highlights rendered as colored region overlays with confidence opacity.
