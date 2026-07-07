# Visual QA Report — Sprint 41 Live Monitor

**Date:** 2026-07-07

## Visual Checklist

| Element | Expected | Status |
|---------|----------|--------|
| ECG paper grid | 1 mm minor / 5 mm major spacing at 10 mm/mV | ✅ |
| Grid alignment under zoom | Grid scales with `controls.transform.zoom` | ✅ |
| Waveform color | Green trace; yellow on alarm HR | ✅ |
| Sweep line | Vertical phosphor line during live playback | ✅ |
| Multi-lead labels | Lead ID top-left of each region | ✅ |
| Rhythm strip | Separate canvas, Lead II label | ✅ |
| Alarm bar | Five chips: HR, Signal, Lead, Noise, Acq | ✅ |
| Clinical toolbar | View / Measure / Capture groups | ✅ |
| Diagnostic mode | Header and chrome hidden; canvas full stage | ✅ |
| Dark monitor bezel | `#020617` canvas host, green telemetry text | ✅ |

## Grid Math

Implemented in `ecgMonitorGridMath.ts`:

- Minor cell: 1 mm at reference DPI
- Major cell: 5 mm
- Speed affects horizontal time axis spacing
- Gain affects vertical amplitude scaling (mm/mV)

## Pixel-Perfect Notes

- Canvas uses device pixel ratio for sub-pixel crispness
- Pan offset applied before grid and trace draw
- Beat markers positioned per-region in multi-lead mode

## Manual Verification Steps

1. Open `/ecg-live-monitor/{caseId}` with digitized ECG
2. Toggle grid on/off — grid lines appear/disappear without layout shift
3. Switch 3 → 5 → 12 lead — regions reflow instantly
4. Change gain 5 → 20 — amplitude scales proportionally
5. Enter diagnostic mode — only canvas + floating controls visible
