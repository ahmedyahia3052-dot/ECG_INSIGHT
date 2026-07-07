# Clinical Validation Report — Sprint 34

## Validation Scope

Manual and automated validation of diagnostic measurement accuracy against digital ECG engine reference values.

## Automated Checks

| Test | Validation |
|------|------------|
| `ecg-wave-detection-bridge.test.ts` | Fiducial detection ≥8 points; PR ms conversion ±2 ms |
| Pixel tolerance unit | ±0.5 px acceptance |
| Integration markers | Wave snap, multi-lead, history audit |

## Clinical Intervals

Seeded calipers from `buildCaliperSeedsFromEngine()` align PR, QRS, QT, RR, and ST segments to engine intervals when digital ECG is available.

## Manual Review Checklist

- [x] Caliper presets map to correct measurement kinds
- [x] Live panel updates during caliper drag
- [x] History records create/update/delete with doctor attribution
- [x] Multi-lead sync markers appear on Lead II click
- [x] Annotations persist in workspace export

## Limitations

Image-only cases without digitization rely on manual caliper placement; engine reference row shows "Pending" until digital ECG is available.
