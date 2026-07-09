import type { ScreenContract } from "./common";

export type PatientListItemView = {
  age?: number;
  fullName: string;
  gender?: string;
  id: string;
  medicalRecordNumber?: string;
  riskLevel?: string;
};

export type PatientsScreenData = {
  patients: PatientListItemView[];
  query: string;
  total: number;
};

export type PatientsScreenActions = {
  onCreatePatient: () => void;
  onOpenPatient: (patientId: string) => void;
  onSetQuery: (value: string) => void;
};

export type PatientsScreenContract = ScreenContract<PatientsScreenData, PatientsScreenActions>;
