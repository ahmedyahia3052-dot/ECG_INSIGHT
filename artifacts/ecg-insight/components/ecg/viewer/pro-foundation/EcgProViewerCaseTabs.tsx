import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ECG_PRO_VIEWER_THEMES, type EcgProViewerTheme } from "./types";

type Props = {
  activeCaseId?: string;
  onSelect: (caseId: string) => void;
  tabIds: string[];
  theme: EcgProViewerTheme;
};

export function EcgProViewerCaseTabs({ activeCaseId, onSelect, tabIds, theme }: Props) {
  const palette = ECG_PRO_VIEWER_THEMES[theme];
  if (tabIds.length <= 1) return null;

  return (
    <ScrollView
      contentContainerStyle={[styles.row, { borderBottomColor: palette.border }]}
      horizontal
      showsHorizontalScrollIndicator={false}
      testID="sprint95-ecg-pro-viewer-case-tabs"
    >
      {tabIds.map((caseId) => {
        const active = caseId === activeCaseId;
        return (
          <Pressable
            key={caseId}
            onPress={() => onSelect(caseId)}
            style={[styles.tab, { borderColor: palette.border, backgroundColor: active ? palette.border : palette.panel }]}
            testID={`sprint95-ecg-pro-viewer-tab-${caseId}`}
          >
            <Text style={{ color: palette.text, fontWeight: active ? "800" : "600", fontSize: 12 }}>{caseId}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { borderBottomWidth: 1, gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  tab: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
});
