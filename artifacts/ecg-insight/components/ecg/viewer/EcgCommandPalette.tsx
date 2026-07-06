import { Feather } from "@expo/vector-icons";
import React, { memo, useEffect, useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { medicalTheme } from "@/components/enterprise/EnterpriseUI";

export type EcgCommandItem = {
  group: string;
  icon?: keyof typeof Feather.glyphMap;
  id: string;
  keywords?: string[];
  label: string;
  onPress: () => void;
  shortcut?: string;
};

/** Sprint 25 — searchable command palette (Ctrl+K). */
export const EcgCommandPalette = memo(function EcgCommandPalette({
  commands,
  onClose,
  visible,
}: {
  commands: EcgCommandItem[];
  onClose: () => void;
  visible: boolean;
}) {
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q) ||
        item.keywords?.some((word) => word.toLowerCase().includes(q)),
    );
  }, [commands, query]);

  useEffect(() => {
    if (!visible) {
      setQuery("");
      setHighlight(0);
    }
  }, [visible]);

  useEffect(() => {
    if (Platform.OS !== "web" || !visible || typeof window === "undefined") return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlight((value) => Math.min(value + 1, Math.max(filtered.length - 1, 0)));
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlight((value) => Math.max(value - 1, 0));
        return;
      }
      if (event.key === "Enter" && filtered[highlight]) {
        event.preventDefault();
        filtered[highlight]?.onPress();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [filtered, highlight, onClose, visible]);

  if (!visible || Platform.OS !== "web") return null;

  return (
    <View nativeID="sprint25-command-palette" style={styles.backdrop} testID="sprint25-command-palette">
      <Pressable accessibilityLabel="Close command palette" onPress={onClose} style={StyleSheet.absoluteFill} />
      <View style={styles.panel}>
        <View style={styles.searchRow}>
          <Feather color={medicalTheme.primary} name="search" size={16} />
          <TextInput
            accessibilityLabel="Search commands"
            autoFocus
            nativeID="sprint25-command-palette-input"
            onChangeText={(text) => {
              setQuery(text);
              setHighlight(0);
            }}
            placeholder="Search commands…"
            placeholderTextColor={medicalTheme.muted}
            style={styles.input}
            value={query}
          />
          <Text style={styles.hint}>Esc</Text>
        </View>
        <View style={styles.list}>
          {filtered.length ? (
            filtered.map((item, index) => (
              <Pressable
                accessibilityRole="button"
                key={item.id}
                onPress={() => {
                  item.onPress();
                  onClose();
                }}
                style={[styles.row, index === highlight && styles.rowActive]}
                testID={`sprint25-command-${item.id}`}
              >
                {item.icon ? <Feather color={medicalTheme.primary} name={item.icon} size={14} /> : null}
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>{item.label}</Text>
                  <Text style={styles.rowGroup}>{item.group}</Text>
                </View>
                {item.shortcut ? <Text style={styles.shortcut}>{item.shortcut}</Text> : null}
              </Pressable>
            ))
          ) : (
            <Text style={styles.empty}>No matching commands.</Text>
          )}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: "rgba(2,8,18,0.72)",
    justifyContent: "flex-start",
    paddingTop: 72,
    zIndex: 200,
  },
  empty: { color: medicalTheme.muted, fontSize: 12, fontWeight: "700", padding: 16, textAlign: "center" },
  hint: { color: medicalTheme.muted, fontSize: 10, fontWeight: "800" },
  input: { color: medicalTheme.text, flex: 1, fontSize: 14, fontWeight: "700", minWidth: 0, outlineStyle: "none" } as never,
  list: { maxHeight: 360, overflow: "scroll" as never },
  panel: {
    backgroundColor: "#071422",
    borderColor: medicalTheme.border,
    borderRadius: 12,
    borderWidth: 1,
    maxWidth: 560,
    minWidth: 320,
    overflow: "hidden",
    width: "92%",
  },
  row: {
    alignItems: "center",
    borderBottomColor: "rgba(30,58,74,0.5)",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  rowActive: { backgroundColor: "rgba(34,197,94,0.12)" },
  rowGroup: { color: medicalTheme.muted, fontSize: 10, fontWeight: "700" },
  rowLabel: { color: medicalTheme.text, fontSize: 13, fontWeight: "800" },
  rowText: { flex: 1, gap: 2, minWidth: 0 },
  searchRow: { alignItems: "center", borderBottomColor: medicalTheme.border, borderBottomWidth: 1, flexDirection: "row", gap: 10, padding: 12 },
  shortcut: { color: medicalTheme.muted, fontSize: 10, fontWeight: "800" },
});
