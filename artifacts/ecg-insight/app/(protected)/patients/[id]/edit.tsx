import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Card, Field, medicalTheme, PageSection, PrimaryButton, SectionHeader } from "@/components/enterprise/EnterpriseUI";
import { useAuth } from "@/context/AuthContext";
import { getPatient, updatePatient, type PatientInput } from "@/services/clinical";

export default function EditPatientScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { authToken } = useAuth();
  const token = authToken?.token;
  const [form, setForm] = useState<Partial<PatientInput>>({});
  const [error, setError] = useState("");

  const patientQuery = useQuery({
    enabled: !!token && !!id,
    queryFn: () => getPatient(token!, id),
    queryKey: ["enterprise-patient-edit", token, id],
    retry: false,
  });

  useEffect(() => {
    const patient = patientQuery.data?.patient;
    if (!patient) return;
    setForm({
      address: patient.address,
      alcoholStatus: patient.alcoholStatus,
      bloodGroup: patient.bloodGroup,
      company: patient.company,
      cardiovascularHistory: patient.cardiovascularHistory,
      dateOfBirth: patient.dateOfBirth,
      departmentName: patient.department,
      diabetes: patient.diabetes,
      email: patient.email,
      employeeId: patient.employeeId,
      emergencyContactName: patient.emergencyContactName,
      emergencyContactPhone: patient.emergencyContactPhone,
      firstName: patient.firstName,
      gender: patient.gender,
      heightCm: patient.heightCm,
      hypertension: patient.hypertension,
      jobTitle: patient.jobTitle,
      knownAllergies: patient.knownAllergies,
      lastName: patient.lastName,
      maritalStatus: patient.maritalStatus,
      medicalHistory: patient.medicalHistory,
      medicalRecordNumber: patient.medicalRecordNumber,
      medications: patient.medications,
      middleName: patient.middleName,
      nationalId: patient.nationalId,
      notes: patient.notes,
      passportNumber: patient.passportNumber,
      phone: patient.phone,
      smokingStatus: patient.smokingStatus,
      status: patient.status,
      weightKg: patient.weightKg,
    });
  }, [patientQuery.data?.patient]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error("Authentication required.");
      return updatePatient(token, id, form);
    },
    onError: (mutationError) => setError(mutationError instanceof Error ? mutationError.message : "Unable to update patient."),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["enterprise-patient-profile", token, id] });
      await queryClient.invalidateQueries({ queryKey: ["enterprise-patients", token] });
      router.replace(`/patients/${id}` as never);
    },
  });

  if (patientQuery.isLoading) return <Text style={styles.muted}>Loading patient...</Text>;

  return (
    <PageSection>
      <Card style={styles.form}>
        <SectionHeader title="Edit Patient" subtitle="Update enterprise patient, occupational, medical, and vital information." />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.grid}>
          <PatientField label="First Name" name="firstName" setForm={setForm} value={form.firstName} />
          <PatientField label="Middle Name" name="middleName" setForm={setForm} value={form.middleName} />
          <PatientField label="Last Name" name="lastName" setForm={setForm} value={form.lastName} />
          <PatientField label="Employee ID" name="employeeId" setForm={setForm} value={form.employeeId} />
          <PatientField label="National ID" name="nationalId" setForm={setForm} value={form.nationalId} />
          <PatientField label="Passport Number" name="passportNumber" setForm={setForm} value={form.passportNumber} />
          <PatientField label="Phone" name="phone" setForm={setForm} value={form.phone} />
          <PatientField label="Email" name="email" setForm={setForm} value={form.email} />
          <PatientField label="Company" name="company" setForm={setForm} value={form.company} />
          <PatientField label="Department" name="departmentName" setForm={setForm} value={form.departmentName} />
          <PatientField label="Job Title" name="jobTitle" setForm={setForm} value={form.jobTitle} />
          <PatientField label="Blood Group" name="bloodGroup" setForm={setForm} value={form.bloodGroup} />
          <PatientField label="Marital Status" name="maritalStatus" setForm={setForm} value={form.maritalStatus} />
          <PatientField label="Emergency Contact Name" name="emergencyContactName" setForm={setForm} value={form.emergencyContactName} />
          <PatientField label="Emergency Contact Phone" name="emergencyContactPhone" setForm={setForm} value={form.emergencyContactPhone} />
          <PatientField label="Height CM" name="heightCm" numeric setForm={setForm} value={form.heightCm} />
          <PatientField label="Weight KG" name="weightKg" numeric setForm={setForm} value={form.weightKg} />
          <PatientField label="Known Allergies" name="knownAllergies" setForm={setForm} value={form.knownAllergies} />
          <PatientField label="Medical History" name="medicalHistory" setForm={setForm} value={form.medicalHistory} />
          <PatientField label="Cardiovascular History" name="cardiovascularHistory" setForm={setForm} value={form.cardiovascularHistory} />
          <PatientField label="Medications" name="medications" setForm={setForm} value={form.medications} />
          <PatientField label="Notes" name="notes" setForm={setForm} value={form.notes} />
        </View>
        <View style={styles.actions}>
          <PrimaryButton label="Cancel" onPress={() => router.back()} variant="outline" />
          <PrimaryButton disabled={mutation.isPending} icon="save" label={mutation.isPending ? "Saving..." : "Save Changes"} onPress={() => mutation.mutate()} />
        </View>
      </Card>
    </PageSection>
  );
}

function PatientField({
  label,
  name,
  numeric,
  setForm,
  value,
}: {
  label: string;
  name: keyof PatientInput;
  numeric?: boolean;
  setForm: React.Dispatch<React.SetStateAction<Partial<PatientInput>>>;
  value?: number | string;
}) {
  return (
    <Field
      label={label}
      onChangeText={(next) => setForm((current) => ({ ...current, [name]: numeric ? Number(next) || undefined : next }))}
      value={value === undefined ? "" : String(value)}
    />
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "flex-end" },
  error: { color: medicalTheme.critical, fontSize: 13, fontWeight: "800" },
  form: { gap: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  muted: { color: medicalTheme.muted, fontSize: 13, fontWeight: "700" },
});
