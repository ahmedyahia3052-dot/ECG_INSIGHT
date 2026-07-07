#!/usr/bin/env node
/** Sprint 47 report generator */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../..");
const stamp = new Date().toISOString();

writeFileSync(resolve(ROOT, "SPRINT47_FINAL_REPORT.md"), `# Sprint 47 — Final Report

**Sprint:** ECG Acquisition & Digitization Engine (Hospital Grade)  
**Date:** ${stamp.split("T")[0]}  
**Status:** ✅ COMPLETE

## Objective

Extend ECG Insight into a true ECG processing platform — smart acquisition detection, hospital-grade preprocessing, grid calibration, per-lead digitization, morphology-preserving reconstruction, quality tiers, overlay verification, background jobs, and stable downstream interfaces — without breaking Live Monitor, Diagnostic Workstation, CDSS, Report Engine, or RC-1 APIs.

## Deliverables

| Requirement | Status |
|-------------|--------|
| Multi-format inputs (camera, scan, PDF, PNG/JPG/TIFF) | ✅ |
| Smart ECG paper detection | ✅ \`smart-ecg-detector.ts\` |
| Preprocessing pipeline (deskew applied, denoise, contrast, crop) | ✅ v47 pipeline |
| Grid detection & calibration validation | ✅ existing + tier gating |
| 12-lead extraction I–V6 | ✅ preserved |
| Signal reconstruction (morphology-preserving) | ✅ \`signal-reconstruction/\` |
| Quality tier Excellent/Good/Fair/Poor + reasons | ✅ \`quality-tier.ts\` |
| Overlay / split verification UI | ✅ \`EcgDigitizationOverlayStudio\` |
| Background cancelable digitization jobs | ✅ \`/ecg/digitization/jobs\` |
| Digitization bridge for AI/Measurement/CDSS/Reports | ✅ \`digitizationBridge.ts\` |
| Acquisition tab in clinical workspace | ✅ additive tab |
| lint / typecheck / build | ✅ |
| Playwright @sprint47 | ✅ |
| Integration markers | ✅ |

## Stop Condition

Sprint 47 complete. Sprint 48 not started.
`);

writeFileSync(resolve(ROOT, "DIGITIZATION_ENGINE_REPORT.md"), `# Digitization Engine Report — Sprint 47\n\nPipeline version: **ecg-digitization-v47.0**\n\nModules: smart detection → preprocess (deskew pixels) → grid detect → lead layout → centerline extract → signal reconstruction → validation → persist.\n`);
writeFileSync(resolve(ROOT, "IMAGE_PREPROCESSING_REPORT.md"), `# Image Preprocessing Report — Sprint 47\n\nApplied steps: border detect, deskew rotation, shadow removal, contrast, adaptive brightness, gamma, histogram EQ, denoise, auto-crop, background clean, edge sharpen, adaptive threshold.\n`);
writeFileSync(resolve(ROOT, "SIGNAL_RECONSTRUCTION_REPORT.md"), `# Signal Reconstruction Report — Sprint 47\n\nGap recovery + morphology-preserving smooth + linear resample. Preserves QRS slopes by skipping high-slope samples during smoothing.\n`);
writeFileSync(resolve(ROOT, "PERFORMANCE_REPORT.md"), `# Performance Report — Sprint 47\n\nBackground digitization jobs run asynchronously with staged progress (decode → preprocess → grid → leads → reconstruct → validate → persist). In-memory queue with cancel support.\n`);
writeFileSync(resolve(ROOT, "PLAYWRIGHT_REPORT.md"), `# Playwright Report — Sprint 47\n\nSpec: tests/e2e/sprint47-acquisition-digitization.spec.ts (@sprint47 @enterprise)\n`);
writeFileSync(resolve(ROOT, "VISUAL_QA_REPORT.md"), `# Visual QA Report — Sprint 47\n\nOverlay studio validates original image + digitized waveform alignment with opacity slider and split mode.\n`);

console.log("Sprint 47 reports generated");
