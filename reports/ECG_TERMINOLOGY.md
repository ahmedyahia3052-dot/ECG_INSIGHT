# ECG Terminology Dictionary — EMKP

**Source:** `enterprise/emkp/src/knowledge/terminology.ts`  
**Entries:** 43+

---

## Categories

| Category | Count | Examples |
|----------|-------|----------|
| wave | 4 | P wave, QRS complex, T wave, U wave |
| interval | 5 | PR, QRS duration, QT, QTc, RR |
| segment | 2 | ST segment, J point |
| axis | 3 | Electrical axis, LAD, RAD |
| morphology | 3 | Delta wave, T inversion, Pathological Q |
| rhythm | 3 | NSR, AF, Torsades de pointes |
| abbreviation | 15 | RBBB, LBBB, LVH, WPW, SVT, VT, VF, PEA, PAC, PVC, AVNRT, AVRT, AIVR, ARVC |
| clinical | 8 | STEMI, NSTEMI, Sgarbossa, Wellens, Brugada, Heart rate, Calibration |

---

## Entry Schema

```typescript
interface EmkpTerminologyEntry {
  term: string;
  category: "wave" | "interval" | "segment" | "axis" | "morphology" | "rhythm" | "abbreviation" | "clinical" | "synonym";
  definition: string;
  synonyms: string[];
  abbreviations: string[];
  relatedTerms: string[];
}
```

---

## Sample Entries

### STEMI
- **Synonyms:** ST elevation MI, Transmural MI
- **Abbreviations:** STEMI
- **Related:** ST elevation, Troponin, Cath lab

### Atrial Fibrillation
- **Synonyms:** AF, AFib
- **Abbreviations:** AF, AFib
- **Related:** Irregularly irregular, Stroke risk

### QTc
- **Synonyms:** Corrected QT
- **Related:** Long QT, Short QT, Torsades de pointes

### Sgarbossa Criteria
- **Definition:** Modified criteria for STEMI in LBBB
- **Related:** LBBB, STEMI

### Wellens Syndrome
- **Definition:** Biphasic/deeply inverted T V2–V3 suggesting critical LAD stenosis
- **Related:** NSTEMI, LAD, V2, V3

---

## Search API (Future)

```
GET /api/v2/emkp/terminology?q=STEMI
GET /api/v2/emkp/terminology?q=AF
```

Matches term, synonyms, and abbreviations (case-insensitive).

---

## Database Normalization

In `emkp.terminology` + `emkp.terminology_synonyms` for full-text search in future sprint.
