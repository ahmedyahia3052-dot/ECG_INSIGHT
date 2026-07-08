# Clinical Reasoning Report — Sprint 44

## Explainable Diagnosis Structure

Every CDSS diagnosis card displays:

| Field | Example |
|-------|---------|
| Title | Possible Inferior STEMI |
| Confidence | 97% |
| Severity | life_threatening |
| Reasoning | Territorial ST elevation in inferior leads with reciprocal lateral depression |
| Supporting Leads | II, III, aVF |
| Measurements | HR 88 bpm, Manual PR Interval: 160 ms |
| Morphology | ST elevation in II, III, aVF; Reciprocal depression in I, aVL |
| Rhythm | Sinus Rhythm |
| Axis | Normal |
| Contradicting | (when applicable) |

## Differential Reasoning

Ranked differential rows include:
- Probability percentage
- Clinical confidence
- Supporting findings (morphology + rule evidence)
- Contradicting findings (from MI explainability or rule conflicts)

## Relationship Graph

`buildRelationshipGraph()` connects:
```
Measurement node ──supports──▶ Diagnosis node ──recommends──▶ Recommendation node
Finding node ──evidence──▶ Diagnosis node
Lead node ──affected──▶ Diagnosis node
```

Displayed in workspace **Finding Relationship Graph** panel with edge labels.

## Final Assessment

`CdssClinicalAssessment` synthesizes:
- Primary final diagnosis (highest-confidence matched rule)
- Overall confidence
- Severity category
- Triage level
- Pipeline stage marker: "Final Clinical Assessment"
