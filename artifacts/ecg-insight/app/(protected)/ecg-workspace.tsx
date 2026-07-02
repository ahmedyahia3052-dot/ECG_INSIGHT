import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useMutation } from "@tanstack/react-query";

import { EcgImageImport, type EcgImageImportResult } from "@/components/ecg/EcgImageImport";
import { EcgWorkspaceViewer } from "@/components/ecg/EcgWorkspaceViewer";
import { medicalTheme, SectionHeader } from "@/components/enterprise/EnterpriseUI";
import { useAuth } from "@/context/AuthContext";
import { digitizeECG, type DigitalEcg } from "@/services/ecgProcessing";
import { uploadClinicalEcgFile } from "@/services/ecgFiles";

export default function EcgWorkspaceRoute() {
  const { caseId, patientId } = useLocalSearchParams<{ caseId?: string; patientId?: string }>();
  const { authToken } = useAuth();
  const token = authToken?.token;
  const [notice, setNotice] = useState<{ text: string; tone: "error" | "success" } | undefined>();
  const [digitalEcg, setDigitalEcg] = useState<DigitalEcg | null>(null);
  const [previewUri, setPreviewUri] = useState<string | undefined>();

  const pipeline = useMutation({
    mutationFn: async (input: EcgImageImportResult) => {
      if (!token) throw new Error("Sign in required.");
      if (!patientId) throw new Error("Open ECG Workspace from a patient or case to upload and digitize.");

      setPreviewUri(input.processed.enhanced.uri);
      const formData = new FormData();
      const blob = input.processed.enhanced.file;
      if (PlatformBlob(blob, input.processed.enhanced.name, input.processed.enhanced.mimeType, formData)) {
        formData.append("source", input.source);
        formData.append("patientId", patientId);
        if (caseId) formData.append("caseId", caseId);
        const uploaded = await uploadClinicalEcgFile(token, formData);
        const targetCaseId = uploaded.file.caseId ?? caseId;
        if (!targetCaseId) throw new Error("Link a patient case before digitization.");
        const digitized = await digitizeECG(token, { caseId: targetCaseId, ecgFileId: uploaded.file.id });
        return digitized.digitalEcg;
      }
      throw new Error("Could not prepare ECG file for upload.");
    },
    onError: (error) => setNotice({ text: error instanceof Error ? error.message : "ECG pipeline failed.", tone: "error" }),
    onSuccess: (result) => {
      setDigitalEcg(result);
      setNotice({ text: "ECG image processed and digitized successfully.", tone: "success" });
    },
  });

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <SectionHeader
        subtitle="Import, preprocess, quality-check, detect leads and grid, digitize, and review in the ECG workspace."
        title="ECG Image Interpretation"
      />

      {notice ? (
        <View style={[styles.notice, notice.tone === "error" ? styles.noticeError : styles.noticeSuccess]}>
          <Text style={styles.noticeText}>{notice.text}</Text>
        </View>
      ) : null}

      <EcgImageImport
        disabled={pipeline.isPending}
        onError={(text) => setNotice({ text, tone: "error" })}
        onImported={(result) => pipeline.mutate(result)}
      />

      {pipeline.isPending ? (
        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>Processing pipeline</Text>
          {[
            "Image import",
            "Auto rotate & deskew",
            "Contrast & denoise",
            "Quality scoring",
            "Lead & grid detection",
            "Waveform digitization",
          ].map((step, index) => (
            <Text key={step} style={styles.progressStep}>{index + 1}. {step}</Text>
          ))}
        </View>
      ) : null}

      <EcgWorkspaceViewer digitalEcg={digitalEcg} originalUrl={previewUri} processedUrl={digitalEcg?.enhancedImageUrl} />
    </ScrollView>
  );
}

function PlatformBlob(
  blob: Blob | undefined,
  name: string,
  mimeType: string,
  formData: FormData,
) {
  if (blob) {
    formData.append("file", blob, name);
    return true;
  }
  return false;
}

const styles = StyleSheet.create({
  notice: { borderRadius: 14, borderWidth: 1, padding: 12 },
  noticeError: { backgroundColor: "rgba(239,68,68,0.12)", borderColor: "rgba(239,68,68,0.35)" },
  noticeSuccess: { backgroundColor: "rgba(34,197,94,0.1)", borderColor: "rgba(34,197,94,0.28)" },
  noticeText: { color: medicalTheme.text, fontSize: 13, fontWeight: "700" },
  page: { gap: 18, padding: 18 },
  progressCard: {
    backgroundColor: "rgba(15,23,42,0.88)",
    borderColor: "rgba(148,163,184,0.22)",
    borderRadius: 18,
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },
  progressStep: { color: medicalTheme.muted, fontSize: 12 },
  progressTitle: { color: medicalTheme.text, fontSize: 14, fontWeight: "900" },
});
