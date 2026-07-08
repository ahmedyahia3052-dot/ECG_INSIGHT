# Differential Diagnosis Trees — EMKP

**Source:** `enterprise/emkp/src/differential/trees.ts`

---

## Tree Index

| Root Node | Branches | Primary Use Case |
|-----------|----------|------------------|
| ST Elevation | 6 | ACS vs mimics |
| ST Depression | 5 | NSTEMI vs demand ischemia |
| Tachycardia | 8 | SVT vs VT vs AF |
| Bradycardia | 7 | AV block vs escape rhythms |
| Wide QRS | 6 | BBB vs VT vs WPW |
| QT Abnormality | 5 | Channelopathy vs electrolyte |

---

## ST Elevation Tree

```
ST Elevation
├── STEMI
│   ├── Anterior MI (ANT_MI)
│   ├── Inferior MI (INF_MI)
│   └── Lateral MI (LAT_MI)
├── Pericarditis (PERICARDITIS)
├── Early Repolarization (EARLY_REPOL)
├── LVH Strain (LVH)
├── Bundle Branch Block (LBBB)
└── Brugada (BRUGADA)
```

**Distinguishing features stored per node** — e.g., Pericarditis: diffuse leads, PR depression, concave ST.

---

## Tachycardia Tree

```
Tachycardia
├── Narrow QRS
│   ├── Sinus Tachycardia (STACH)
│   ├── SVT
│   │   ├── AVNRT (AVNRT)
│   │   └── AVRT (AVRT)
│   ├── Atrial Fibrillation (AF)
│   └── Atrial Flutter (AFL)
└── Wide QRS
    ├── Ventricular Tachycardia (VT)
    ├── SVT with Aberrancy
    └── Antidromic WPW (AVRT)
```

---

## Bradycardia Tree

```
Bradycardia
├── Sinus Bradycardia (SBRAD)
├── Junctional Rhythm (JUNCTIONAL)
├── AV Block
│   ├── First Degree (AVB1)
│   ├── Second Degree Type I (AVB2I)
│   ├── Second Degree Type II (AVB2II)
│   └── Third Degree (AVB3)
└── Idioventricular Rhythm (IVR)
```

---

## Node Schema

```typescript
interface EmkpDifferentialNode {
  nodeId: string;
  label: string;
  diagnosisCode?: string;
  children: EmkpDifferentialNode[];
  distinguishingFeatures?: string[];
}
```

---

## Validation

All `diagnosisCode` references validated against disease catalog. Unknown codes produce validation errors.
