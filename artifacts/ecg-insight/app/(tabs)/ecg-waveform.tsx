import { useQuery } from "@tanstack/react-query";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { listClinicalEcgFiles } from "@/services/hospital";

export default function EcgWaveformScreen() {
  const colors = useColors();
  const { authToken } = useAuth();
  const filesQuery = useQuery({
    enabled: !!authToken?.token,
    queryFn: async () => listClinicalEcgFiles(authToken!.token),
    queryKey: ["clinical-ecg-files", authToken?.token],
    retry: false,
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>ECG Waveform Viewer</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Multi-lead clinical ECG files with parser metadata, signal arrays, and wave annotations.
        </Text>
        {(filesQuery.data?.files ?? []).map((file) => (
          <View key={file.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{file.fileName}</Text>
            <Text style={[styles.cardText, { color: colors.textSecondary }]}>
              {file.fileType} · {file.numberOfLeads ?? 0} leads · {file.samplingRate ?? 0} Hz
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, gap: 8, padding: 16 },
  cardText: { fontSize: 13, lineHeight: 19 },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  container: { flex: 1 },
  content: { gap: 14, padding: 20, paddingBottom: 120 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  title: { fontSize: 28, fontWeight: "800" },
});
