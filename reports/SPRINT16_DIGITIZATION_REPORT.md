# Sprint 16 — Enterprise ECG Waveform Digitization Engine

**Release Candidate · Production Build**  
**Pipeline Version:** `ecg-digitization-v16.0`  
**Date:** 2026-07-05

---

## Executive Summary

Sprint 16 delivers a production-grade, modular ECG Waveform Digitization Engine that transforms uploaded ECG images into clinically structured digital multi-lead signals. The digitized waveform is the **single source of truth** for measurements, AI interpretation, clinical reports, compare mode, live monitor overlays, and future machine learning pipelines.

No OCR is used for waveform extraction. All trace data is produced through image-processing algorithms: edge detection, skeletonization, centerline extraction, spline interpolation, and gap recovery.

---

## Architecture

```
Upload / API
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  Enterprise Digitization Pipeline (engine/enterprise-pipeline) │
├─────────────────────────────────────────────────────────────┤
│ Phase 1  │ image-processing/preprocess.ts                  │
│ Phase 2  │ grid-detector/index.ts                          │
│ Phase 3  │ ocr/ecg-metadata-ocr.ts (TEXT ONLY)             │
│ Phase 4  │ lead-detector/index.ts                            │
│ Phase 5  │ waveform/centerline-extractor.ts                  │
│ Phase 6  │ signal-engine/index.ts → DigitalSignalObject      │
│ Phase 7  │ validation/signal-validator.ts                    │
│ Phase 8  │ viewer/ecgDigitizedWaveformSync.ts (monitor sync) │
│ Phase 10 │ export/formats.ts → JSON, CSV, binary             │
│ Phase 11 │ benchmark/index.ts + artifact storage for ML      │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
ECGLeadSignal (DB) · digitization metadata · measurements · AI
```

---

## Algorithms

### Image Normalization
Automatic crop, deskew, gamma, histogram equalization, adaptive brightness/contrast, denoise, background cleaning, edge enhancement, quality scoring with warnings below threshold 50.

### Grid Engine
Projection peak detection, pixel/mm, pixel/mV, pixel/ms, speed/gain inference, grid confidence.

### Waveform Extraction
Sobel edges, Zhang-Suen thinning, centerline column tracking, Catmull-Rom spline, gap recovery, artifact rejection.

### Digital Signal Engine
`DigitalSignalObject` with sampleIndex, timeMs, voltageMv at 500 Hz.

### Validation
Broken signals, saturation, impossible voltage/HR, baseline drift, lead mix-up, clinical accuracy metrics.

---

## Performance

| Scenario | Target | Result |
|----------|--------|--------|
| 12-lead synthetic 960×720 | < 12 s cold | ~4.2 s integration |
| Export CSV/Binary | Immediate | Verified |

---

## Test Coverage

| Suite | File |
|-------|------|
| Unit | `scripts/ecg-digitization-engine.test.ts` |
| Integration | `scripts/ecg-digitization.integration.ts` |
| Sprint 16 | `scripts/sprint16-ecg-digitization.integration.ts` |
| E2E | `tests/e2e/sprint16-ecg-digitization.spec.ts` |

---

## Viewer Synchronization

`EcgMonitorViewerFoundation` → `getDigitalECG` → `ecgDigitizedWaveformSync` → `EcgDigitizedWaveformLayer`

---

## Known Limitations

1. Standard 4×3 layout assumption for lead detection.
2. Bounded skeleton iterations for CPU budget.
3. Metadata OCR is heuristic; full OCR pluggable via `ocr/` module.
4. Very large 8K images processed in-memory.

---

## Future Extensions

OpenCV/ONNX/TensorFlow plugins, SCP-ECG/DICOM export, arrhythmia/STEMI AI on DigitalSignalObject, golden benchmark corpus.
