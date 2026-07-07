# Measurement Engine Report — Sprint 34

## Overview

The measurement engine aggregates caliper geometry, grid calibration, wave fiducials, and clinical presets into a unified workspace synchronized with auto-save persistence.

## Core Modules

- `ecgMeasurementEngine.ts` — presets, sync, export, `summarizeCaliper`
- `ecgLiveMeasurements.ts` — real-time HR, RR, PR, QRS, QT, QTc, axes, ST, voltage
- `ecgWaveDetectionBridge.ts` — P/Q/R/S/T/J/ST/QT fiducial detection from digital ECG
- `useEcgMeasurementWorkspace.ts` — state machine, history, snap, multi-lead, undo/redo

## Live Measurements

`computeLiveMeasurements()` reads the latest non-hidden caliper per measurement kind and recalculates on every caliper move. Displayed in `sprint34-live-measurements-panel`.

## Precision

| Metric | Tolerance |
|--------|-----------|
| Pixel placement | ±0.5 px |
| QT interval | ±2 ms |
| Voltage | ±0.01 mV |

## Persistence

Measurements, calipers, annotations, history, and snap settings export through workspace v5 auto-save.
