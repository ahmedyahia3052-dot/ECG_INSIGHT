import React, { memo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { formatDate, medicalTheme, PrimaryButton } from "@/components/enterprise/EnterpriseUI";

const NOTE_TEMPLATES = [
  "Normal sinus rhythm. No acute ischemic changes.",
  "ST-T changes noted — correlate clinically.",
  "Compared with prior ECG — no significant interval change.",
  "Recommend cardiology follow-up within 72 hours.",
];

export const EcgClinicalNotesPanel = memo(function EcgClinicalNotesPanel({
  initialNotes = "",
  onNotesChange,
  operatorName,
}: {
  initialNotes?: string;
  onNotesChange?: (notes: string) => void;
  operatorName?: string;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [lastEdited, setLastEdited] = useState<string | null>(null);

  const updateNotes = (value: string) => {
    setNotes(value);
    setLastEdited(new Date().toISOString());
    onNotesChange?.(value);
  };

  return (
    <View style={styles.root} testID="sprint30-clinical-notes">
      <Text style={styles.title}>Doctor Notes</Text>
      <Text style={styles.subtitle}>Structured clinical documentation · Voice-ready architecture</Text>
      <View style={styles.templateRow}>
        {NOTE_TEMPLATES.map((template) => (
          <Pressable key={template} onPress={() => updateNotes(notes ? `${notes}\n${template}` : template)} style={styles.templateChip}>
            <Text numberOfLines={2} style={styles.templateLabel}>
              {template}
            </Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        multiline
        onChangeText={updateNotes}
        placeholder="Enter clinical notes, impressions, and follow-up plan…"
        placeholderTextColor={medicalTheme.muted}
        style={styles.input}
        value={notes}
      />
      <View style={styles.footer}>
        <Text style={styles.audit}>
          {operatorName ? `${operatorName} · ` : ""}
          {lastEdited ? `Last edit ${formatDate(lastEdited)}` : "Auto-save enabled"}
        </Text>
        <PrimaryButton label="Save Notes" onPress={() => onNotesChange?.(notes)} variant="outline" />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  audit: { color: medicalTheme.muted, flex: 1, fontSize: 9, fontWeight: "600" },
  footer: { alignItems: "center", flexDirection: "row", gap: 8 },
  input: {
    backgroundColor: "rgba(12,26,45,0.92)",
    borderColor: medicalTheme.border,
    borderRadius: 8,
    borderWidth: 1,
    color: medicalTheme.text,
    fontSize: 12,
    lineHeight: 18,
    minHeight: 120,
    padding: 10,
    textAlignVertical: "top",
  },
  root: { gap: 8 },
  subtitle: { color: medicalTheme.muted, fontSize: 10, fontWeight: "600" },
  templateChip: {
    backgroundColor: "rgba(56,189,248,0.08)",
    borderColor: "rgba(56,189,248,0.25)",
    borderRadius: 6,
    borderWidth: 1,
    maxWidth: 160,
    padding: 6,
  },
  templateLabel: { color: medicalTheme.text, fontSize: 9, fontWeight: "600" },
  templateRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  title: { color: medicalTheme.primary, fontSize: 12, fontWeight: "900" },
});
