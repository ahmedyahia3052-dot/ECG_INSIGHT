import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { z } from "zod";

import { Card, Field, medicalTheme, PageSection, PrimaryButton, SectionHeader } from "@/components/enterprise/EnterpriseUI";
import { useAuth } from "@/context/AuthContext";
import { createPatient, type PatientInput } from "@/services/clinical";

const patientSchema = z.object({
  dateOfBirth: z.string().min(4),
  firstName: z.string().min(1, "First name is required."),
  gender: z.enum(["male", "female", "other", "unknown"]),
  lastName: z.string().min(1, "Last name is required."),
  medicalRecordNumber: z.string().min(1, "Medical record number is required."),
});

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
      return createPatient(token, form);
    },
    onError: (mutationError) => setError(mutationError instanceof Error ? mutationError.message : "Unable to create patient."),
    onSuccess: async (payload) => {
      await queryClient.invalidateQueries({ queryKey: ["enterprise-patients", token] });
      router.replace(`/patients/${payload.patient.id}` as never);
    },
  });

  return (
    <PageSection>
      <Card style={styles.form}>
        <SectionHeader title="Create Patient" subtitle="Create an enterprise patient profile for ECG tracking and reporting." />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.grid}>
          <Field label="First Name" onChangeText={(value) => setForm((current) => ({ ...current, firstName: value }))} value={form.firstName} />
          <Field label="Last Name" onChangeText={(value) => setForm((current) => ({ ...current, lastName: value }))} value={form.lastName} />
          <Field label="Employee ID / MRN" onChangeText={(value) => setForm((current) => ({ ...current, medicalRecordNumber: value }))} value={form.medicalRecordNumber} />
          <Field label="DOB" onChangeText={(value) => setForm((current) => ({ ...current, dateOfBirth: value }))} value={form.dateOfBirth} />
          <Field label="Gender" onChangeText={(value) => setForm((current) => ({ ...current, gender: normalizeGender(value) }))} placeholder="male / female / other / unknown" value={form.gender} />
          <Field label="Phone" onChangeText={(value) => setForm((current) => ({ ...current, phone: value }))} value={form.phone} />
          <Field label="Email" onChangeText={(value) => setForm((current) => ({ ...current, email: value }))} value={form.email} />
          <Field label="National ID" onChangeText={(value) => setForm((current) => ({ ...current, nationalId: value }))} value={form.nationalId} />
          <Field label="Company / Department" onChangeText={(value) => setForm((current) => ({ ...current, occupation: value }))} value={form.occupation} />
          <Field label="Medical History" onChangeText={(value) => setForm((current) => ({ ...current, medicalHistory: value }))} value={form.medicalHistory} />
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

function normalizeGender(value: string): PatientInput["gender"] {
  const normalized = value.toLowerCase();
  if (normalized === "male" || normalized === "female" || normalized === "other") return normalized;
  return "unknown";
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "flex-end" },
  error: { color: medicalTheme.critical, fontSize: 13, fontWeight: "800" },
  form: { gap: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
});
