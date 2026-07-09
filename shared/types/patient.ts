export type PatientGender = "child" | "child_female" | "child_male" | "female" | "male" | "other" | "unknown";

export type PatientStatus = "active" | "inactive" | "archived";

export type Patient = {
  address?: string;
  age: number;
  archivedAt?: string;
  dateOfBirth: string;
  email?: string;
  firstName: string;
  fullName?: string;
  gender: PatientGender;
  hypertension?: boolean;
  diabetes?: boolean;
  id: string;
  lastName: string;
  medicalRecordNumber: string;
  phone?: string;
  smokingStatus?: "current" | "former" | "never" | "unknown";
  status?: PatientStatus;
};

export type PatientInput = Pick<Patient, "dateOfBirth" | "firstName" | "gender" | "lastName" | "medicalRecordNumber"> & Partial<Omit<Patient, "id" | "age">>;
