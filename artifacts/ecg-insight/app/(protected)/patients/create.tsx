import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { z } from "zod";

import { Card, Field, medicalTheme, PageSection, PrimaryButton, SectionHeader } from "@/components/enterprise/EnterpriseUI";
import { useAuth } from "@/context/AuthContext";
import { createPatient, type PatientInput } from "@/services/clinical";

const patientSchema = z.object({
  firstName: z.string().min(1, "First name is required."),
  gender: z.enum(["male", "female", "child_male", "child_female", "other", "unknown"], { message: "Gender is required." }),
  lastName: z.string().min(1, "Last name is required."),
});

const genderOptions: Array<{ label: string; value: PatientInput["gender"] }> = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Child Male", value: "child_male" },
  { label: "Child Female", value: "child_female" },
  { label: "Other", value: "other" },
  { label: "Unknown", value: "unknown" },
];

export default function CreatePatientScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { authToken } = useAuth();
  const token = authToken?.token;
  const [form, setForm] = useState<PatientInput>({
    dateOfBirth: "1970-01-01",
    firstName: "",
    gender: "unknown",
    lastName: "",
    medicalRecordNumber: "",
  });
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error("Authentication required.");
      const parsed = patientSchema.safeParse(form);
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid patient details.");
      return createPatient(token, {
        ...form,
        dateOfBirth: form.dateOfBirth || "1970-01-01",
        medicalRecordNumber: form.medicalRecordNumber?.trim() || `MRN-${Date.now()}`,
      });
    },
    onError: (mutationError) => setError(mutationError instanceof Error ? mutationError.message : "Unable to create patient."),
    onSuccess: async (payload) => {
      await queryClient.invalidateQueries({ queryKey: ["enterprise-patients", token] });
      router.replace(`/patients/${payload.patient.id}?created=1` as never);
    },
  });

  return (
    <PageSection>
      <Card style={styles.form}>
        <SectionHeader title="Create Patient" subtitle="Create an enterprise patient profile for ECG tracking and reporting." />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.grid}>
          <Field label="First Name" onChangeText={(value) => setForm((current) => ({ ...current, firstName: value }))} value={form.firstName} />
          <Field label="Middle Name" onChangeText={(value) => setForm((current) => ({ ...current, middleName: value }))} value={form.middleName} />
          <Field label="Last Name" onChangeText={(value) => setForm((current) => ({ ...current, lastName: value }))} value={form.lastName} />
          <Field label="Employee ID / MRN (Optional)" onChangeText={(value) => setForm((current) => ({ ...current, medicalRecordNumber: value }))} value={form.medicalRecordNumber} />
          <Field label="Employee ID" onChangeText={(value) => setForm((current) => ({ ...current, employeeId: value }))} value={form.employeeId} />
          <Field label="DOB" onChangeText={(value) => setForm((current) => ({ ...current, dateOfBirth: value }))} value={form.dateOfBirth} />
        </View>
        <View style={styles.genderPanel}>
          <Text style={styles.genderLabel}>Gender</Text>
          <View style={styles.genderOptions}>
            {genderOptions.map((option) => (
              <PrimaryButton key={option.value} label={option.label} onPress={() => setForm((current) => ({ ...current, gender: option.value }))} variant={form.gender === option.value ? "primary" : "outline"} />
            ))}
          </View>
        </View>
        <View style={styles.grid}>
          <Field label="Phone" onChangeText={(value) => setForm((current) => ({ ...current, phone: value }))} value={form.phone} />
          <Field label="Email" onChangeText={(value) => setForm((current) => ({ ...current, email: value }))} value={form.email} />
          <Field label="National ID" onChangeText={(value) => setForm((current) => ({ ...current, nationalId: value }))} value={form.nationalId} />
          <Field label="Passport Number" onChangeText={(value) => setForm((current) => ({ ...current, passportNumber: value }))} value={form.passportNumber} />
          <Field label="Company" onChangeText={(value) => setForm((current) => ({ ...current, company: value }))} value={form.company} />
          <Field label="Department" onChangeText={(value) => setForm((current) => ({ ...current, departmentName: value }))} value={form.departmentName} />
          <Field label="Contractor" onChangeText={(value) => setForm((current) => ({ ...current, contractorName: value }))} value={form.contractorName} />
          <Field label="Job Title" onChangeText={(value) => setForm((current) => ({ ...current, jobTitle: value, occupation: value }))} value={form.jobTitle} />
          <Field label="Blood Group" onChangeText={(value) => setForm((current) => ({ ...current, bloodGroup: value }))} value={form.bloodGroup} />
          <Field label="Marital Status" onChangeText={(value) => setForm((current) => ({ ...current, maritalStatus: value }))} value={form.maritalStatus} />
          <Field label="Emergency Contact Name" onChangeText={(value) => setForm((current) => ({ ...current, emergencyContactName: value }))} value={form.emergencyContactName} />
          <Field label="Emergency Contact Phone" onChangeText={(value) => setForm((current) => ({ ...current, emergencyContactPhone: value }))} value={form.emergencyContactPhone} />
          <Field label="Height CM" onChangeText={(value) => setForm((current) => ({ ...current, heightCm: Number(value) || undefined }))} value={form.heightCm ? String(form.heightCm) : ""} />
          <Field label="Weight KG" onChangeText={(value) => setForm((current) => ({ ...current, weightKg: Number(value) || undefined }))} value={form.weightKg ? String(form.weightKg) : ""} />
          <Field label="Known Allergies" onChangeText={(value) => setForm((current) => ({ ...current, knownAllergies: value, allergies: value }))} value={form.knownAllergies} />
          <Field label="Medical History" onChangeText={(value) => setForm((current) => ({ ...current, medicalHistory: value }))} value={form.medicalHistory} />
          <Field label="Medications" onChangeText={(value) => setForm((current) => ({ ...current, medications: value }))} value={form.medications} />
          <Field label="Risk Factors / Notes" onChangeText={(value) => setForm((current) => ({ ...current, notes: value }))} value={form.notes} />
        </View>
        <View style={styles.actions}>
          <PrimaryButton label="Cancel" onPress={() => router.back()} variant="outline" />
          <PrimaryButton disabled={mutation.isPending} icon="save" label={mutation.isPending ? "Creating..." : "Create Patient"} onPress={() => mutation.mutate()} />
        </View>
      </Card>
    </PageSection>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "flex-end" },
  error: { color: medicalTheme.critical, fontSize: 13, fontWeight: "800" },
  form: { gap: 16 },
  genderLabel: { color: medicalTheme.text, fontSize: 12, fontWeight: "800" },
  genderOptions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  genderPanel: { gap: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
});
