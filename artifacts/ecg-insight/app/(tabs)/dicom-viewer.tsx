import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

export default function DicomViewerScreen() {
  const colors = useColors();
  const tools = ["Zoom", "Pan", "Measurement overlay", "Multi-lead display", "DICOM ECG metadata"];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>DICOM Viewer</Text>
        {tools.map((tool) => (
          <View key={tool} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{tool}</Text>
            <Text style={[styles.cardText, { color: colors.textSecondary }]}>
              Available for parsed DICOM ECG studies and hospital imports.
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
  title: { fontSize: 28, fontWeight: "800" },
});
