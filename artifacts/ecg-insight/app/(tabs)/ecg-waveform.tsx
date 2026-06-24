import { ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WorkflowCrudPanel } from "@/components/workflows/WorkflowCrudPanel";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { deleteClinicalEcgFile, listClinicalEcgFiles, measureClinicalEcgFile, type ClinicalEcgFile } from "@/services/ecgFiles";

export default function EcgWaveformScreen() {
  const colors = useColors();
  const { authToken } = useAuth();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>ECG Waveform Viewer</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Multi-lead clinical ECG files with parser metadata, signal arrays, and wave annotations.
        </Text>
        <WorkflowCrudPanel<ClinicalEcgFile>
          deleteItem={(id) => deleteClinicalEcgFile(authToken!.token, id)}
          detailText={(file) => `${file.fileType} · ${file.mimeType} · ${Math.round(file.sizeBytes / 1024)} KB`}
          emptyText="No ECG files are available. Upload an ECG file from the ECG analysis workflow to enable waveform review."
          filters={[{ key: "fileType", label: "File type", options: [
            { label: "PDF", value: "PDF_REPORT" },
            { label: "DICOM", value: "DICOM_ECG" },
            { label: "Image", value: "IMAGE" },
            { label: "Waveform", value: "WAVEFORM" },
          ] }]}
          itemsFromResponse={(response) => (response as { files?: ClinicalEcgFile[] } | undefined)?.files ?? []}
          listItems={(params) => listClinicalEcgFiles(authToken!.token, params)}
          queryKey={["clinical-ecg-files", authToken?.token]}
          searchPlaceholder="Search ECG files by name, case, patient, or type"
          subtitle="Retrieve persisted files, inspect parser data, run measurement, and delete securely."
          title="ECG Files"
          titleForItem={(file) => file.originalName}
          updateFields={[]}
          updateItem={(id) => measureClinicalEcgFile(authToken!.token, id)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { gap: 14, padding: 20, paddingBottom: 120 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  title: { fontSize: 28, fontWeight: "800" },
});
