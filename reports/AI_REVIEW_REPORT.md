# AI Review Report — Sprint 30

## EcgAiReviewWorkflowPanel

Professional AI clinical review workspace integrated into the right panel AI tab.

### Sections

| Section | Source |
|---------|--------|
| Primary Diagnosis | `AIAnalysisResult.diagnosis` |
| Secondary Findings | Rhythm + urgent actions |
| Differential Considerations | `AIExplainability.panel` |
| Urgency Level | Derived from severity |
| Clinical Explanation | `AIAnalysisResult.interpretation` |
| Supporting Evidence | `AIExplainability.leadHighlights` |
| Suggested Investigations | `AIAnalysisResult.recommendations` |
| Guideline References | Institutional CDS policy reference |
| Doctor Confirmation | Local confirm state + review route |

### Integration

- Workflow step **AI Review** navigates to AI tab + ai-review view mode
- Workflow step **Clinical Review** opens doctor review route
- AI overlays remain on canvas via existing `EcgAiOverlayWorkspace`
- Explainability heatmap/regions unchanged (Sprint 14/23 engines)

### Clinical Alerts

`buildClinicalAlerts()` surfaces:
- Critical ECG findings
- Urgent review actions
- Poor signal quality
- Lead validation warnings
- Incomplete measurements
- AI disagreement pending confirmation

Displayed in `EcgClinicalAlertsBanner` below workflow ribbon.

## Test Coverage

- Unit: alert builder + workflow AI step completion
- E2E: AI panel visible on tab switch, workflow AI step navigation
