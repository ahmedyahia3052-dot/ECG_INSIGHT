# ECG Knowledge Base

## Overview

Structured clinical knowledge for **37 ECG diagnoses**, each containing diagnostic criteria, ECG characteristics, measurements, differential diagnoses, pitfalls, severity, urgency, clinical notes, and guideline references.

**Source:** `server/src/modules/medical-intelligence/knowledge-base/diagnosis-factory.ts`

---

## Supported Diagnoses

### Rhythm (12)
| Code | Label |
|------|-------|
| NSR | Normal Sinus Rhythm |
| SBRAD | Sinus Bradycardia |
| STACH | Sinus Tachycardia |
| AF | Atrial Fibrillation |
| AFL | Atrial Flutter |
| PAC | Premature Atrial Contraction |
| PVC | Premature Ventricular Contraction |
| SVT | Supraventricular Tachycardia |
| VT | Ventricular Tachycardia |
| VF | Ventricular Fibrillation |
| ASYSTOLE | Asystole |
| PEA | Pulseless Electrical Activity |

### Conduction (9)
| Code | Label |
|------|-------|
| AVB1 | First Degree AV Block |
| AVB2I | Second Degree AV Block Type I |
| AVB2II | Second Degree AV Block Type II |
| AVB3 | Third Degree AV Block |
| LBBB | Left Bundle Branch Block |
| RBBB | Right Bundle Branch Block |
| BIFASC | Bifascicular Block |
| TRIFASC | Trifascicular Block |
| WPW | Wolff-Parkinson-White Syndrome |

### Channelopathy (3)
| Code | Label |
|------|-------|
| BRUGADA | Brugada Syndrome |
| LONG_QT | Long QT Syndrome |
| SHORT_QT | Short QT Syndrome |

### Electrolyte (4)
| Code | Label |
|------|-------|
| HYPERK | Hyperkalemia |
| HYPOK | Hypokalemia |
| HYPOCAL | Hypocalcemia |
| ELECTROLYTE | Electrolyte Disorder (Pattern) |

### Hypertrophy (3)
| Code | Label |
|------|-------|
| LVH | Left Ventricular Hypertrophy |
| RVH | Right Ventricular Hypertrophy |
| HYPERTROPHY | Hypertrophy (Unspecified) |

### Ischemia (2)
| Code | Label |
|------|-------|
| STEMI | ST-Elevation Myocardial Infarction |
| NSTEMI | Non-ST-Elevation Myocardial Infarction |

### Other (4)
| Code | Label |
|------|-------|
| PERICARDITIS | Pericarditis |
| PE | Pulmonary Embolism |
| EARLY_REPOL | Early Repolarization |
| DRUG_EFFECT | Drug Effect on ECG |
| PACEMAKER | Pacemaker Rhythm |

---

## Entry Schema

Every diagnosis entry includes:

```typescript
interface KnowledgeBaseEntry {
  code: MedicalDiagnosisCode;
  label: string;
  category: "rhythm" | "conduction" | "ischemia" | "electrolyte" | "hypertrophy" | "channelopathy" | "other";
  diagnosticCriteria: string[];      // Required criteria for diagnosis
  ecgCharacteristics: string[];      // ECG morphology patterns
  measurements: string[];            // Relevant intervals/amplitudes
  differentialDiagnosis: string[];   // Alternative diagnoses
  pitfalls: string[];                // Common interpretation errors
  severity: ClinicalSeverity;        // normal | minor | abnormal | urgent | critical
  urgency: ClinicalUrgency;          // routine | urgent | emergent | critical
  clinicalNotes: string[];           // Management pearls
  guidelineReferences: GuidelineReference[];
}
```

---

## Guideline References

Primary sources cited across the knowledge base:

- **AHA/ACCF/HRS** — ECG Standardization and Interpretation (2009)
- **ESC** — Acute Coronary Syndromes Guidelines (2023)
- **AHA/ACC/HRS** — Atrial Fibrillation Management (2023)
- **ESC** — Syncope Guidelines (2018)

---

## API Access

```
GET /api/medical-intelligence/knowledge              # List/search all entries
GET /api/medical-intelligence/knowledge?query=AF     # Search by term
GET /api/medical-intelligence/knowledge?category=rhythm
GET /api/medical-intelligence/knowledge/:code        # Single entry (e.g., /STEMI)
POST /api/medical-intelligence/knowledge/seed        # Seed to database (SUPER_ADMIN)
```

---

## Database Persistence

Knowledge entries can be seeded to `MedicalKnowledgeBaseEntry` table via the seed endpoint. In-memory knowledge base is always available without database seeding.

---

## Statistics

| Category | Count |
|----------|-------|
| rhythm | 12 |
| conduction | 9 |
| ischemia | 2 |
| electrolyte | 4 |
| hypertrophy | 3 |
| channelopathy | 3 |
| other | 4 |
| **Total** | **37** |
