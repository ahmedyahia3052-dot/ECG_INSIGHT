import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Badge, Card, medicalTheme, PageSection, SectionHeader } from "@/components/enterprise/EnterpriseUI";
import { useAuth } from "@/context/AuthContext";
import { getPreferences, updatePreferences, type WorkspacePreferences } from "@/services/preferences";

const settings: Array<{ description: string; key: keyof WorkspacePreferences; label: string }> = [
  { description: "Reduce non-essential transitions and motion effects.", key: "reduceMotion", label: "Reduce Motion" },
  { description: "Increase contrast for clinical readability.", key: "highContrastClinicalMode", label: "High Contrast Clinical Mode" },
  { description: "Use denser cards and reduced spacing on dashboard views.", key: "compactDashboardDensity", label: "Compact Dashboard Density" },
  { description: "Play an audible cue for critical clinical alerts.", key: "criticalAlertSound", label: "Critical Alert Sound" },
  { description: "Remember the last patient registry search/filter state.", key: "rememberLastPatientFilter", label: "Remember Last Patient Filter" },
  { description: "Require confirmation before delete, revoke, archive, or destructive actions.", key: "requireConfirmationForDestructiveActions", label: "Require Confirmation For Destructive Actions" },
];

export default function SettingsScreen() {
  const queryClient = useQueryClient();
  const { authToken } = useAuth();
  const token = authToken?.token;
  const [message, setMessage] = useState("");

  const preferencesQuery = useQuery({
    enabled: !!token,
    queryFn: () => getPreferences(token!),
    queryKey: ["workspace-preferences", token],
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: (input: Partial<WorkspacePreferences>) => updatePreferences(token!, input),
    onSuccess: (payload) => {
      queryClient.setQueryData(["workspace-preferences", token], payload);
      setMessage("Workspace setting saved.");
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Unable to save workspace setting."),
  });

  const preferences = preferencesQuery.data?.preferences;

  return (
    <PageSection>
      <Card style={styles.panel}>
        <SectionHeader title="Workspace Settings" subtitle="Mobile-first clinical preferences and accessibility options." />
        {message ? <Text style={styles.success}>{message}</Text> : null}
        {preferencesQuery.isLoading ? <Text style={styles.meta}>Loading saved preferences...</Text> : null}
        {settings.map((item) => {
          const enabled = Boolean(preferences?.[item.key]);
          return (
          <Pressable
            disabled={!preferences || mutation.isPending}
            key={item.key}
            onPress={() => mutation.mutate({ [item.key]: !enabled })}
            style={styles.row}
          >
            <View style={styles.rowMain}>
              <Text style={styles.title}>{item.label}</Text>
              <Text style={styles.meta}>{item.description}</Text>
            </View>
            <Badge label={enabled ? "Enabled" : "Disabled"} tone={enabled ? "success" : "muted"} />
          </Pressable>
        );})}
      </Card>
    </PageSection>
  );
}

const styles = StyleSheet.create({
  meta: { color: medicalTheme.muted, fontSize: 12, lineHeight: 18 },
  panel: { gap: 8 },
  row: { alignItems: "center", borderBottomColor: medicalTheme.border, borderBottomWidth: 1, flexDirection: "row", gap: 12, minHeight: 62, paddingVertical: 10 },
  rowMain: { flex: 1 },
  success: { color: medicalTheme.success, fontSize: 13, fontWeight: "900" },
  title: { color: medicalTheme.text, fontSize: 15, fontWeight: "900" },
});
