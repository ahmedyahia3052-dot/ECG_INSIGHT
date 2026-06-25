import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Badge, Card, medicalTheme, PageSection, SectionHeader } from "@/components/enterprise/EnterpriseUI";

const settings = [
  "Reduce motion",
  "High contrast clinical mode",
  "Compact dashboard density",
  "Critical alert sound",
  "Remember last patient filter",
  "Require confirmation for destructive actions",
];

export default function SettingsScreen() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    "High contrast clinical mode": true,
    "Require confirmation for destructive actions": true,
  });

  return (
    <PageSection>
      <Card style={styles.panel}>
        <SectionHeader title="Workspace Settings" subtitle="Mobile-first clinical preferences and accessibility options." />
        {settings.map((item) => (
          <Pressable key={item} onPress={() => setEnabled((current) => ({ ...current, [item]: !current[item] }))} style={styles.row}>
            <View style={styles.rowMain}>
              <Text style={styles.title}>{item}</Text>
              <Text style={styles.meta}>Enterprise setting stored locally until preference APIs are connected.</Text>
            </View>
            <Badge label={enabled[item] ? "Enabled" : "Disabled"} tone={enabled[item] ? "success" : "muted"} />
          </Pressable>
        ))}
      </Card>
    </PageSection>
  );
}

const styles = StyleSheet.create({
  meta: { color: medicalTheme.muted, fontSize: 12, lineHeight: 18 },
  panel: { gap: 8 },
  row: { alignItems: "center", borderBottomColor: medicalTheme.border, borderBottomWidth: 1, flexDirection: "row", gap: 12, minHeight: 62, paddingVertical: 10 },
  rowMain: { flex: 1 },
  title: { color: medicalTheme.text, fontSize: 15, fontWeight: "900" },
});
