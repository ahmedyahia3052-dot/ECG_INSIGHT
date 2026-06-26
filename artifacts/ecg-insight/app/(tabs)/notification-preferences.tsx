import { useMutation, useQuery } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import {
  listNotificationHistory,
  listNotificationPreferences,
  updateNotificationPreferences,
  type NotificationCategory,
  type NotificationFrequency,
} from "@/services/collaboration";
import { BoltButton } from "@/components/bolt/BoltUI";

const categories: NotificationCategory[] = [
  "CRITICAL_ECG_ALERT",
  "SUBSCRIPTION_EVENT",
  "PAYMENT_EVENT",
  "REPORT_GENERATION",
  "USER_INVITATION",
  "OCCUPATIONAL_CLEARANCE",
  "SYSTEM_ALERT",
];

const frequencies: NotificationFrequency[] = ["IMMEDIATE", "DAILY_DIGEST", "WEEKLY_DIGEST", "MUTED"];

export default function NotificationPreferencesScreen() {
  const colors = useColors();
  const { authToken } = useAuth();
  const token = authToken?.token;
  const preferencesQuery = useQuery({ enabled: !!token, queryFn: async () => listNotificationPreferences(token!), queryKey: ["notification-preferences", token], retry: false });
  const historyQuery = useQuery({ enabled: !!token, queryFn: async () => listNotificationHistory(token!), queryKey: ["notification-history", token], retry: false });
  const [draft, setDraft] = useState<Record<string, { emailEnabled: boolean; frequency: NotificationFrequency; inAppEnabled: boolean; pushEnabled: boolean; smsEnabled: boolean }>>({});

  const rows = useMemo(() => categories.map((category) => {
    const saved = preferencesQuery.data?.preferences.find((preference) => preference.category === category);
    return {
      category,
      emailEnabled: draft[category]?.emailEnabled ?? saved?.emailEnabled ?? true,
      frequency: draft[category]?.frequency ?? saved?.frequency ?? "IMMEDIATE",
      inAppEnabled: draft[category]?.inAppEnabled ?? saved?.inAppEnabled ?? true,
      pushEnabled: draft[category]?.pushEnabled ?? saved?.pushEnabled ?? true,
      smsEnabled: draft[category]?.smsEnabled ?? saved?.smsEnabled ?? false,
    };
  }), [draft, preferencesQuery.data?.preferences]);

  const saveMutation = useMutation({
    mutationFn: async () => updateNotificationPreferences(token!, rows),
    onSuccess: () => preferencesQuery.refetch(),
  });

  function patch(category: NotificationCategory, update: Partial<(typeof rows)[number]>) {
    setDraft((current) => ({ ...current, [category]: { ...rows.find((row) => row.category === category)!, ...update } }));
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>Communication settings</Text>
          <Text style={[styles.title, { color: colors.text }]}>Notification Preferences</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Configure email, push, SMS, in-app delivery, and frequency for clinical and enterprise events.</Text>
        </View>
        {rows.map((row) => (
          <View key={row.category} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{label(row.category)}</Text>
            <View style={styles.buttonRow}>
              <Toggle label="In-app" value={row.inAppEnabled} onPress={() => patch(row.category, { inAppEnabled: !row.inAppEnabled })} />
              <Toggle label="Email" value={row.emailEnabled} onPress={() => patch(row.category, { emailEnabled: !row.emailEnabled })} />
              <Toggle label="Push" value={row.pushEnabled} onPress={() => patch(row.category, { pushEnabled: !row.pushEnabled })} />
              <Toggle label="SMS" value={row.smsEnabled} onPress={() => patch(row.category, { smsEnabled: !row.smsEnabled })} />
            </View>
            <View style={styles.buttonRow}>
              {frequencies.map((frequency) => (
                <View key={frequency} style={styles.option}>
                  <BoltButton label={frequency.replace("_", " ")} onPress={() => patch(row.category, { frequency })} variant={row.frequency === frequency ? "primary" : "outline"} />
                </View>
              ))}
            </View>
          </View>
        ))}
        <BoltButton icon="save" label={saveMutation.isPending ? "Saving..." : "Save preferences"} loading={saveMutation.isPending} onPress={() => saveMutation.mutate()} />
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Notification History</Text>
          {(historyQuery.data?.logs ?? []).slice(0, 10).map((log) => (
            <Text key={log.id} style={[styles.historyLine, { color: colors.textSecondary }]}>
              {log.createdAt.slice(0, 19).replace("T", " ")} · {log.channel} · {log.provider} · {log.status}
            </Text>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Toggle({ label, onPress, value }: { label: string; onPress: () => void; value: boolean }) {
  return (
    <View style={styles.option}>
      <BoltButton label={`${label}: ${value ? "On" : "Off"}`} onPress={onPress} variant={value ? "primary" : "outline"} />
    </View>
  );
}

function label(value: string) {
  return value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const styles = StyleSheet.create({
  buttonRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  card: { borderRadius: 20, borderWidth: 1, gap: 10, padding: 16 },
  cardTitle: { fontSize: 17, fontWeight: "900" },
  container: { flex: 1 },
  content: { gap: 14, padding: 20, paddingBottom: 120 },
  eyebrow: { fontSize: 12, fontWeight: "900", letterSpacing: 0.8, textTransform: "uppercase" },
  historyLine: { fontSize: 12, lineHeight: 19 },
  option: { minWidth: 126 },
  subtitle: { fontSize: 14, lineHeight: 20, marginTop: 6 },
  title: { fontSize: 30, fontWeight: "900" },
});
