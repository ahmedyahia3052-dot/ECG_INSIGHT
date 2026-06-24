import { ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WorkflowCrudPanel } from "@/components/workflows/WorkflowCrudPanel";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { deleteClinicalDocument, listClinicalDocuments, updateClinicalDocument, type ClinicalDocument } from "@/services/documents";

export default function DocumentCenterScreen() {
  const colors = useColors();
  const { authToken } = useAuth();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Document Center</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          AI document intelligence, OCR extraction, and permanent indexing.
        </Text>
        <WorkflowCrudPanel<ClinicalDocument>
          deleteItem={(id) => deleteClinicalDocument(authToken!.token, id)}
          detailText={(document) => `${document.category} · ${document.mimeType} · ${Math.round(document.sizeBytes / 1024)} KB`}
          emptyText="Upload clinical documents from the clinical workflow to populate OCR summaries and searchable evidence."
          filters={[{ key: "category", label: "Category", options: [
            { label: "ECG", value: "ECG" },
            { label: "Lab", value: "LAB" },
            { label: "Report", value: "REPORT" },
          ] }]}
          itemsFromResponse={(response) => (response as { documents?: ClinicalDocument[] } | undefined)?.documents ?? []}
          listItems={(params) => listClinicalDocuments(authToken!.token, params)}
          queryKey={["clinical-documents", authToken?.token]}
          searchPlaceholder="Search documents by title, patient, or category"
          subtitle="Review, retrieve, edit metadata, and delete persisted documents."
          title="Documents"
          titleForItem={(document) => document.title || document.originalName}
          updateFields={[
            { key: "title", label: "Title" },
            { key: "category", label: "Category" },
          ]}
          updateItem={(id, input) => updateClinicalDocument(authToken!.token, id, input)}
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
