# Guideline Engine Report — Sprint 44

**File:** `cdss-workspace/guidelineEngine.ts`

## Sources

| Source | Topics |
|--------|--------|
| ACC/AHA | STEMI reperfusion, complete heart block pacing, hyperkalemia, normal ECG |
| ESC | QT prolongation, atrial fibrillation stroke risk, Brugada, PE evaluation, LVH echo |
| Universal Definition of MI | NSTEMI troponin criteria |

## Reference Fields

Each guideline reference includes:
- **Topic** — clinical subject (e.g. STEMI, QT Prolongation)
- **Statement** — evidence-based recommendation text
- **Recommendation Class** — I, IIa, III
- **Evidence Level** — I, IIa, III

## Triage Mapping

| Severity | Triage | Label |
|----------|--------|-------|
| normal, low_risk | green | GREEN — Routine |
| moderate | yellow | YELLOW — Prompt evaluation |
| high_risk | orange | ORANGE — Urgent cardiology |
| critical | red | RED — Critical / emergent |
| life_threatening | black | BLACK — Immediate life threat |

## Integration

Guidelines attach automatically when matching rule IDs fire during CDSS evaluation. Fallback clinical correlation guideline applies when rules match without catalog entry.
