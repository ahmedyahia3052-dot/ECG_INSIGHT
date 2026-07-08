# Guideline Mapping — EMKP

**Source:** `enterprise/emkp/src/guidelines/registry.ts`

---

## Registered Guidelines

| Document ID | Organization | Title | Year | Evidence |
|-------------|-------------|-------|------|----------|
| ESC-ACS-2023 | ESC | Management of Acute Coronary Syndromes | 2023 | A |
| ESC-SYNC-2018 | ESC | Diagnosis and Management of Syncope | 2018 | B |
| ESC-VT-VF-2022 | ESC | Ventricular Arrhythmias and Sudden Cardiac Death | 2022 | A |
| AHA-ECG-2009 | AHA | ECG Standardization and Interpretation | 2009 | A |
| ACC-AHA-AF-2023 | ACC/AHA | Atrial Fibrillation | 2023 | A |
| ACC-AHA-HF-2022 | ACC/AHA | Heart Failure | 2022 | A |
| UDMI-4TH-2018 | UDMI | Fourth Universal Definition of MI | 2018 | A |
| IEC-60601-2-25 | IEC | ECG Equipment Standard | 2011 | A |
| WHF-UDMI-2018 | WHF | Universal Definition of MI Contribution | 2018 | A |
| HRS-PACE-2018 | HRS | Bradycardia and Conduction Delay | 2018 | A |

---

## Diagnosis ↔ Guideline Matrix

| Guideline | Mapped Diagnoses |
|-----------|-----------------|
| **ESC ACS 2023** | STEMI, NSTEMI, ANT_MI, INF_MI, LAT_MI, POST_MI, PERICARDITIS |
| **UDMI 4th Edition** | STEMI, NSTEMI, ANT_MI, INF_MI, LAT_MI, POST_MI, AIVR |
| **ACC/AHA AF 2023** | AF, AFL, PAC |
| **AHA ECG 2009** | NORMAL_ECG, NSR, RBBB, LBBB, LVH, RVH, WPW, LONG_QT |
| **ESC Syncope 2018** | VT, VF, AVB3, AVB2II, SVT, AVNRT, AVRT, BRUGADA |
| **IEC 60601-2-25** | NORMAL_ECG, PACEMAKER |
| **HRS PACE 2018** | AVB1, AVB2I, AVB2II, AVB3, BBB_ESCAPE, PACEMAKER |

---

## Standards Coverage

| Standard Body | Scope in EMKP |
|---------------|---------------|
| **ESC** | ACS, syncope, ventricular arrhythmias |
| **AHA** | ECG interpretation standardization |
| **ACC** | AF, heart failure (joint with AHA) |
| **UDMI** | Universal MI definition (4th edition) |
| **IEC** | International ECG equipment standards |
| **WHF** | Global MI definition alignment |
| **HRS** | Bradycardia, pacing, conduction |

---

## Reference Format

```typescript
interface EmkpGuidelineReference {
  organization: "ESC" | "AHA" | "ACC" | "ACC/AHA" | "HRS" | "WHF" | "UDMI" | "IEC" | "OTHER";
  documentId: string;
  title: string;
  section?: string;
  year?: number;
  url?: string;
  evidenceLevel?: "A" | "B" | "C" | "D" | "expert_consensus";
}
```

---

## API (Future)

```
GET /api/v2/emkp/guidelines
GET /api/v2/emkp/diseases/STEMI  → includes mapped guidelines
```
