# AI Cardiologist Report — Sprint 38

## Overview

The AI Cardiologist Workspace presents ECG interpretation in the structured format used by hospital ECG machines and enterprise cardiology systems.

## Sections

1. **Rhythm Analysis** — rhythm, regularity, heart rate, P wave, RR variability, PR status  
2. **Axis** — normal / LAD / RAD / extreme with confidence  
3. **Intervals** — PR, QRS, QT, QTc, RR, PP with normal ranges and flags  
4. **Wave Analysis** — P, QRS, ST, T, QT with explanations  
5. **ST Analysis** — elevation, depression, diffuse/reciprocal patterns + leads  
6. **Block Detection** — RBBB, LBBB, AV blocks, fascicular blocks  
7. **Arrhythmia** — AF, flutter, SVT, VT, PVC, PAC, bradycardia, tachycardia  
8. **Hypertrophy** — LVH, RVH, LAE, RAE with criteria evidence  
9. **Ischemia / Infarction** — territory-based findings  
10. **Clinical Impression** — narrative summary paragraph  
11. **Differential Diagnosis** — ranked list with confidence  
12. **Recommendations** — troponin, echo, Holter, consult, etc.  
13. **Confidence** — overall, signal, lead, image quality, evidence used  
14. **Visualization** — interactive lead focus on diagnosis click  

## Data Sources

| Layer | Source |
|-------|--------|
| Primary | `POST /api/medical-intelligence/cases/:id/analyze` |
| Cached | `GET /api/medical-intelligence/cases/:id/reports` |
| Fallback | `DigitalEcg.measurementEngine` + `interpretationEngine` |
| Legacy AI | `AIAnalysisResult` + `AIExplainability` |

## Interaction

- Click any structured finding → affected leads highlighted on canvas  
- AI overlay enabled automatically  
- Active lead switches to primary affected lead  
- View mode switches to AI Review for waveform context  

## Test IDs

- `sprint38-ai-cardiologist-workspace`
- `sprint30-ai-review-panel` (backward-compatible wrapper)
- `sprint38-section-*`
- `sprint38-finding-*`
- `sprint38-differential-*`
- `sprint38-interval-*`
