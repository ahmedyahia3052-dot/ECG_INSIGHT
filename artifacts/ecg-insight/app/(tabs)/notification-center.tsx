import { ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WorkflowCrudPanel } from "@/components/workflows/WorkflowCrudPanel";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { PremiumCard, PremiumScreenBackground } from "@/components/ui/Premium";
import { deleteNotification, listNotifications, markNotificationRead } from "@/services/collaboration";

type NotificationItem = Record<string, unknown> & { id: string; message?: string; read?: boolean; title?: string; type?: string };

export default function NotificationCenterScreen() {
  const colors = useColors();
  const { authToken } = useAuth();

  return (
    <PremiumScreenBackground>
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <PremiumCard style={styles.hero}>
          <Text style={[styles.title, { color: colors.text }]}>Notification Center</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Read/unread triage, priority categories, mark-as-read workflows, and push-ready notification architecture.</Text>
        </PremiumCard>
        <WorkflowCrudPanel<NotificationItem>
          deleteItem={(id) => deleteNotification(authToken!.token, id)}
          detailText={(notification) => `${notification.type ?? "INFO"} · ${notification.read ? "Read" : "Unread"} · ${notification.message ?? ""}`}
          emptyText="No notifications match the current search and filters."
          filters={[{ key: "read", label: "Read state", options: [
            { label: "Unread", value: "false" },
            { label: "Read", value: "true" },
          ] }]}
          itemsFromResponse={(response) => (response as { notifications?: NotificationItem[] } | undefined)?.notifications ?? []}
          listItems={(params) => listNotifications(authToken!.token, params)}
          queryKey={["notification-center", authToken?.token]}
          searchPlaceholder="Search notifications by title, type, or message"
          subtitle="Inspect notifications, mark them read, and delete stale records."
          title="Notifications"
          titleForItem={(notification) => notification.title ?? "Notification"}
          updateFields={[]}
          updateItem={(id) => markNotificationRead(authToken!.token, id)}
        />
      </ScrollView>
    </SafeAreaView>
    </PremiumScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { gap: 14, padding: 20, paddingBottom: 120 },
  hero: { gap: 8 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  title: { fontSize: 28, fontWeight: "800" },
});
