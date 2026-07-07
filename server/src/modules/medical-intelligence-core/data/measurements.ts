import type { MicMeasurementReference } from "../types";

/** Module 4 — ECG Measurement Reference */
export const MIC_MEASUREMENT_REFERENCES: MicMeasurementReference[] = [
  {
    parameter: "PR",
    unit: "ms",
    normalMin: 120,
    normalMax: 200,
    borderlineLow: 110,
    borderlineHigh: 220,
    notes: [
      "Short PR may suggest pre-excitation or enhanced AV nodal conduction",
      "Prolonged PR defines first-degree AV block",
    ],
    references: [{ organization: "ACC/AHA", title: "Standard ECG interval interpretation", year: 2022 }],
  },
  {
    parameter: "QRS",
    unit: "ms",
    normalMin: 60,
    normalMax: 100,
    borderlineHigh: 120,
    notes: [
      "QRS ≥120 ms suggests intraventricular conduction delay or ventricular origin",
      "Use age-specific criteria in pediatric populations",
    ],
    references: [{ organization: "AHA", title: "ECG interpretation standards", year: 2021 }],
  },
  {
    parameter: "QT",
    unit: "ms",
    normalMin: 350,
    normalMax: 440,
    notes: [
      "Rate-dependent; always report corrected QTc",
      "Prolonged QT increases torsades de pointes risk",
    ],
    references: [{ organization: "ESC", title: "QT interval monitoring guidance", year: 2020 }],
  },
  {
    parameter: "QTc",
    unit: "ms",
    normalMin: 350,
    normalMax: 450,
    borderlineHigh: 470,
    notes: [
      "Bazett formula common; Fridericia preferred at extreme rates",
      "QTc >500 ms high risk for malignant arrhythmia",
    ],
    references: [{ organization: "ESC", title: "Channelopathy and QT guidance", year: 2022 }],
  },
  {
    parameter: "Heart Rate",
    unit: "bpm",
    normalMin: 60,
    normalMax: 100,
    borderlineLow: 50,
    borderlineHigh: 120,
    notes: [
      "Athletes may have resting rates 40–60 bpm",
      "Infants and children have age-dependent higher normal rates",
    ],
    references: [{ organization: "ACC/AHA", title: "Pediatric and adult rate norms", year: 2022 }],
  },
  {
    parameter: "Axis",
    unit: "degrees",
    normalMin: -30,
    normalMax: 90,
    notes: [
      "Left axis deviation: < -30°",
      "Right axis deviation: > +90°",
      "Extreme axis (northwest) often ventricular or superior axis pathology",
    ],
    references: [{ organization: "AHA", title: "Frontal plane axis determination", year: 2021 }],
  },
  {
    parameter: "Voltage",
    unit: "mm",
    notes: [
      "Low voltage: QRS <5 mm limb leads or <10 mm precordial leads",
      "High voltage supports hypertrophy criteria when combined with QRS duration and strain",
    ],
    references: [{ organization: "ACC/AHA", title: "ECG voltage criteria", year: 2022 }],
  },
  {
    parameter: "Hypertrophy",
    unit: "criteria",
    hypertrophyCriteria: [
      "Sokolow-Lyon LVH: S(V1) + R(V5 or V6) ≥35 mm",
      "Cornell LVH: R(aVL) + S(V3) >28 mm (men), >20 mm (women)",
      "RVH: R/S ratio >1 in V1 with right axis and supporting features",
      "Atrial enlargement: P mitrale (LAE), P pulmonale (RAE)",
    ],
    notes: ["ECG hypertrophy criteria have moderate sensitivity; echo confirms"],
    references: [{ organization: "ESC", title: "Chamber enlargement ECG criteria", year: 2021 }],
  },
];

export const MIC_MEASUREMENT_BY_PARAMETER = new Map(
  MIC_MEASUREMENT_REFERENCES.map((entry) => [entry.parameter.toLowerCase(), entry]),
);
