import { useMutation, useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BoltButton, BoltField } from "@/components/bolt/BoltUI";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import {
  broadcastNotification,
  listNotificationTemplates,
  upsertNotificationTemplate,
  type NotificationCategory,
  type NotificationChannel,
} from "@/services/collaboration";

const categories: NotificationCategory[] = ["SYSTEM_ALERT", "CRITICAL_ECG_ALERT", "SUBSCRIPTION_EVENT", "PAYMENT_EVENT", "REPORT_GENERATION", "USER_INVITATION", "OCCUPATIONAL_CLEARANCE"];
const channels: NotificationChannel[] = ["IN_APP", "EMAIL", "PUSH", "SMS"];

export default function NotificationConsoleScreen() {
  const colors = useColors();
  const { authToken } = useAuth();
  const token = authToken?.token;
  const [title, setTitle] = useState("System maintenance alert");
  const [message, setMessage] = useState("ECG Insight maintenance window is scheduled. Clinical alerts remain prioritized.");
  const [category, setCategory] = useState<NotificationCategory>("SYSTEM_ALERT");
  const [selectedChannels, setSelectedChannels] = useState<NotificationChannel[]>(["IN_APP", "EMAIL"]);
  const [scheduledAt, setScheduledAt] = useState("");
  const templatesQuery = useQuery({ enabled: !!token, queryFn: async () => listNotificationTemplates(token!), queryKey: ["notification-templates", token], retry: false });
  const broadcastMutation = useMutation({
    mutationFn: async () =>
      broadcastNotification(token!, {
        category,
        channels: selectedChannels,
        message,
        scheduledAt: scheduledAt.trim() || undefined,
        title,
        type: category === "CRITICAL_ECG_ALERT" ? "CRITICAL" : "INFO",
      }),
  });
  const templateMutation = useMutation({
    mutationFn: async () =>
      upsertNotificationTemplate(token!, {
        bodyTemplate: "{{message}}",
        category,
        htmlTemplate: "<h1>{{title}}</h1><p>{{message}}</p>",
        key: `${category.toLowerCase()}_admin`,
        titleTemplate: "{{title}}",
      }),
    onSuccess: () => templatesQuery.refetch(),
  });

  function toggleChannel(channel: NotificationChannel) {
    setSelectedChannels((current) => current.includes(channel) ? current.filter((item) => item !== channel) : [...current, channel]);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>Admin communication</Text>
          <Text style={[styles.title, { color: colors.text }]}>Notification Console</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Broadcast notifications, scheduled announcements, maintenance alerts, and templates.</Text>
        </View>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Broadcast Notification</Text>
          <BoltField icon="bell" onChangeText={setTitle} placeholder="Title" value={title} />
          <BoltField icon="message-square" multiline onChangeText={setMessage} placeholder="Message" value={message} />
          <BoltField icon="clock" onChangeText={setScheduledAt} placeholder="Scheduled ISO time (optional)" value={scheduledAt} />
          <View style={styles.buttonRow}>
            {categories.map((item) => (
              <View key={item} style={styles.option}>
                <BoltButton label={shortLabel(item)} onPress={() => setCategory(item)} variant={category === item ? "primary" : "outline"} />
              </View>
            ))}
          </View>
          <View style={styles.buttonRow}>
            {channels.map((item) => (
              <View key={item} style={styles.option}>
                <BoltButton label={item} onPress={() => toggleChannel(item)} variant={selectedChannels.includes(item) ? "primary" : "outline"} />
              </View>
            ))}
          </View>
          <BoltButton icon="send" label={broadcastMutation.isPending ? "Broadcasting..." : "Broadcast or schedule"} loading={broadcastMutation.isPending} onPress={() => broadcastMutation.mutate()} />
          <BoltButton icon="file-text" label="Save matching template" onPress={() => templateMutation.mutate()} variant="outline" />
        </View>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Templates</Text>
          {(templatesQuery.data?.templates ?? []).slice(0, 12).map((template) => (
            <Text key={template.id} style={[styles.templateLine, { color: colors.textSecondary }]}>
              {template.key} · {template.locale} · {shortLabel(template.category)} · {template.active ? "active" : "inactive"}
            </Text>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function shortLabel(value: string) {
  return value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const styles = StyleSheet.create({
  buttonRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  card: { borderRadius: 20, borderWidth: 1, gap: 10, padding: 16 },
  cardTitle: { fontSize: 17, fontWeight: "900" },
  container: { flex: 1 },
  content: { gap: 14, padding: 20, paddingBottom: 120 },
  eyebrow: { fontSize: 12, fontWeight: "900", letterSpacing: 0.8, textTransform: "uppercase" },
  option: { minWidth: 132 },
  subtitle: { fontSize: 14, lineHeight: 20, marginTop: 6 },
  templateLine: { fontSize: 12, lineHeight: 19 },
  title: { fontSize: 30, fontWeight: "900" },
});
