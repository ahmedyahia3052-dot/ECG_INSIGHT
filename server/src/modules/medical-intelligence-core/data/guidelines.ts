import type { MicGuidelineEntry } from "../types";

/** Module 8 — Guideline Structure */
export const MIC_GUIDELINE_REGISTRY: MicGuidelineEntry[] = [
  {
    id: "esc-af-2024",
    organization: "ESC",
    title: "2024 ESC Guidelines for the management of atrial fibrillation",
    version: "2024",
    year: 2024,
    url: "https://www.escardio.org/Guidelines/Clinical-Practice-Guidelines/Atrial-Fibrillation-Management",
    applicableCategories: ["arrhythmia"],
  },
  {
    id: "esc-acs-2023",
    organization: "ESC",
    title: "2023 ESC Guidelines for the management of acute coronary syndromes",
    version: "2023",
    year: 2023,
    url: "https://www.escardio.org/Guidelines/Clinical-Practice-Guidelines/Acute-Coronary-Syndromes",
    applicableCategories: ["ischemia"],
  },
  {
    id: "accaha-stemi-2023",
    organization: "ACC/AHA",
    title: "2023 ACC/AHA Guideline for the Management of Patients With Chronic Coronary Disease and STEMI updates",
    version: "2023",
    year: 2023,
    applicableCategories: ["ischemia"],
  },
  {
    id: "aha-af-2019",
    organization: "AHA",
    title: "2019 AHA/ACC/HRS Focused Update on Atrial Fibrillation",
    version: "2019",
    year: 2019,
    applicableCategories: ["arrhythmia"],
  },
  {
    id: "aha-acls-2020",
    organization: "AHA",
    title: "2020 AHA Guidelines for CPR and Emergency Cardiovascular Care",
    version: "2020",
    year: 2020,
    applicableCategories: ["arrhythmia", "ischemia"],
  },
  {
    id: "accaha-lvh-2022",
    organization: "ACC/AHA",
    title: "Clinical guidance on hypertrophy and chamber enlargement on ECG",
    version: "2022",
    year: 2022,
    applicableCategories: ["hypertrophy"],
  },
];

export const MIC_GUIDELINE_BY_ID = new Map(MIC_GUIDELINE_REGISTRY.map((entry) => [entry.id, entry]));
