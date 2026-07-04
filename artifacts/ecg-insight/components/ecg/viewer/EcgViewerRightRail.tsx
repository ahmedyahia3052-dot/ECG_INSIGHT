import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Card, medicalTheme, SectionHeader } from "@/components/enterprise/EnterpriseUI";

export function EcgViewerRightRail() {
  return (
    <ScrollView contentContainerStyle={styles.scroll} style={styles.fill}>
      <Card style={styles.card}>
        <SectionHeader subtitle="Sprint 13 Phase 2" title="AI Findings" />
        <Text style={styles.placeholder}>AI overlay and explainability panels will mount here in a future sprint phase.</Text>
      </Card>
      <Card style={styles.card}>
        <SectionHeader subtitle="Sprint 13 Phase 2" title="Measurements" />
        <Text style={styles.placeholder}>Interactive calipers and measurement readouts will mount here in a future sprint phase.</Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8, marginBottom: 10 },
  fill: { flex: 1 },
  placeholder: { color: medicalTheme.muted, fontSize: 12, fontWeight: "700", lineHeight: 18 },
  scroll: { gap: 8, paddingBottom: 12 },
});
