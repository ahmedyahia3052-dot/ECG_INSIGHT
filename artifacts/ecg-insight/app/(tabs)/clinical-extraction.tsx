import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

export default function ClinicalExtractionViewerScreen() {
  const colors = useColors();
  const fields = [
    "ECG: Heart Rate, Rhythm, PR, QRS, QT, QTc, Axis, ST/T abnormalities",
    "Echo: EF, LV dimensions, wall motion, valves, pulmonary pressure",
    "Stress ECG: METS, duration, ischemic changes, arrhythmias",
    "Cath/PCI: vessels, stents, stenosis %, procedure date",
    "Labs: Hb, Creatinine, HbA1c, Troponin, Lipid profile",
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Clinical Extraction Viewer</Text>
        {fields.map((field) => (
          <View key={field} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardText, { color: colors.text }]}>{field}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, padding: 16 },
  cardText: { fontSize: 15, fontWeight: "600", lineHeight: 22 },
  container: { flex: 1 },
  content: { gap: 14, padding: 20, paddingBottom: 120 },
  title: { fontSize: 28, fontWeight: "800" },
});
