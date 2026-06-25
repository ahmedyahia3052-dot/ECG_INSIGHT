import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { deleteNotification, listAlerts, listNotifications, markNotificationRead } from "@/services/collaboration";
import { BoltBadge, BoltButton, BoltCard, BoltEmpty, BoltHero, BoltScreen } from "@/components/bolt/BoltUI";
import { PremiumRefreshControl, SkeletonList, SwipeActionRow, useToast } from "@/components/interaction/PremiumInteraction";

interface LiveNotification {
  createdAt?: string;
  id?: string;
  message?: string;
  read?: boolean;
  readAt?: string | null;
  title?: string;
  type?: string;
}

export default function NotificationCenterScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { authToken } = useAuth();
  const token = authToken?.token;
  const queryKey = ["bolt-notification-center", token];
  const [refreshing, setRefreshing] = useState(false);
  const notificationsQuery = useQuery({
    enabled: !!token,
    queryFn: async () => listNotifications(token!, new URLSearchParams({ pageSize: "50" })),
    queryKey,
    retry: false,
  });
  const alertsQuery = useQuery({
    enabled: !!token,
    queryFn: async () => listAlerts(token!, new URLSearchParams({ pageSize: "50" })),
    queryKey: ["mobile-critical-alerts", token],
    retry: false,
  });
  const readMutation = useMutation({
    mutationFn: async (id: string) => markNotificationRead(token!, id),
    onSuccess: () => {
      toast.success("Notification updated", "Marked as read.");
      return queryClient.invalidateQueries({ queryKey });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => deleteNotification(token!, id),
    onSuccess: () => {
      toast.info("Notification dismissed", "The notification was removed from your queue.");
      return queryClient.invalidateQueries({ queryKey });
    },
  });

  const cache = useOfflineCache("ecg-insight:mobile:alerts", notificationsQuery.data?.notifications);
  const notifications = (notificationsQuery.data?.notifications ?? cache.cachedData ?? []) as LiveNotification[];
  const alerts = (alertsQuery.data?.alerts ?? []) as Array<Record<string, unknown>>;
  const unreadCount = notifications.filter((item) => !item.read && !item.readAt).length;
  const criticalCount = notifications.filter((item) => isCriticalAlert(item)).length + alerts.length;
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([notificationsQuery.refetch(), alertsQuery.refetch()]);
    setRefreshing(false);
  }, [alertsQuery, notificationsQuery]);

  return (
    <BoltScreen refreshControl={<PremiumRefreshControl onRefresh={onRefresh} refreshing={refreshing} />}>
      <BoltHero
        eyebrow="Critical alert center"
        subtitle="STEMI alerts, urgent reviews, subscription warnings, failed analyses, and collaboration notifications from existing live APIs."
        title="Alerts"
      />
      <View style={styles.counterRow}>
        <BoltCard style={styles.counterCard}>
          <Text style={[styles.counterValue, { color: colors.destructive }]}>{criticalCount}</Text>
          <Text style={[styles.counterLabel, { color: colors.textSecondary }]}>Critical</Text>
        </BoltCard>
        <BoltCard style={styles.counterCard}>
          <Text style={[styles.counterValue, { color: colors.primary }]}>{unreadCount}</Text>
          <Text style={[styles.counterLabel, { color: colors.textSecondary }]}>Unread</Text>
        </BoltCard>
      </View>
      {notificationsQuery.isError && cache.hasOfflineData ? (
        <BoltCard style={styles.notification}>
          <BoltBadge icon="wifi-off" label="Offline alerts" tone="warning" />
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            Showing cached alerts from {cache.savedAt ? new Date(cache.savedAt).toLocaleString() : "a previous session"}.
          </Text>
        </BoltCard>
      ) : null}
      {notificationsQuery.isError ? (
        <BoltEmpty title="Alerts unavailable" message="Unable to load live alerts or notifications." />
      ) : notificationsQuery.isLoading ? (
        <SkeletonList count={4} />
      ) : notifications.length === 0 ? (
        <BoltEmpty title={notificationsQuery.isLoading ? "Loading alerts..." : "No critical alerts"} message="STEMI alerts, urgent reviews, failed analyses, and subscription notices will appear here." />
      ) : (
        notifications.map((notification, index) => {
          const id = notification.id ?? String(index);
          const unread = !notification.read && !notification.readAt;
          const critical = isCriticalAlert(notification);
          return (
            <SwipeActionRow
              key={id}
              leftLabel="Read"
              onLeft={unread ? () => readMutation.mutate(id) : undefined}
              onRight={() => deleteMutation.mutate(id)}
              rightLabel="Dismiss"
            >
              <BoltCard style={[styles.notification, critical && { borderColor: colors.destructive }]}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.title, { color: colors.text }]}>{notification.title ?? "Notification"}</Text>
                  <BoltBadge label={critical ? "Critical" : unread ? "Unread" : "Read"} tone={critical ? "danger" : unread ? "primary" : "muted"} />
                </View>
                <Text style={[styles.message, { color: colors.textSecondary }]}>{notification.message ?? "No message provided."}</Text>
                <View style={styles.severityRow}>
                  <BoltBadge label={classifyAlert(notification)} tone={critical ? "danger" : "warning"} />
                  <Text style={[styles.swipeHint, { color: colors.textSecondary }]}>Swipe right to mark read · swipe left to dismiss</Text>
                </View>
                <Text style={[styles.date, { color: colors.textSecondary }]}>{notification.createdAt?.slice(0, 19) ?? "Live event"}</Text>
                <View style={styles.actions}>
                  {unread ? (
                    <BoltButton label="Mark read" onPress={() => readMutation.mutate(id)} variant="outline" />
                  ) : null}
                  <BoltButton label="Dismiss" onPress={() => deleteMutation.mutate(id)} variant="ghost" />
                </View>
              </BoltCard>
            </SwipeActionRow>
          );
        })
      )}
    </BoltScreen>
  );
}

function isCriticalAlert(notification: LiveNotification) {
  const text = `${notification.title ?? ""} ${notification.message ?? ""} ${notification.type ?? ""}`.toLowerCase();
  return text.includes("stemi") || text.includes("critical") || text.includes("urgent") || text.includes("failed");
}

function classifyAlert(notification: LiveNotification) {
  const text = `${notification.title ?? ""} ${notification.message ?? ""} ${notification.type ?? ""}`.toLowerCase();
  if (text.includes("stemi")) return "STEMI";
  if (text.includes("subscription")) return "Subscription";
  if (text.includes("failed")) return "Failed analysis";
  if (text.includes("urgent") || text.includes("review")) return "Urgent review";
  return "Clinical";
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  cardHeader: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "space-between" },
  counterCard: { alignItems: "center", flex: 1, gap: 3, minHeight: 84 },
  counterLabel: { fontFamily: "Inter_700Bold", fontSize: 12, textTransform: "uppercase" },
  counterRow: { flexDirection: "row", gap: 10 },
  counterValue: { fontFamily: "Inter_700Bold", fontSize: 32 },
  date: { fontFamily: "Inter_500Medium", fontSize: 11 },
  message: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19 },
  notification: { gap: 9 },
  severityRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 8 },
  swipeHint: { fontFamily: "Inter_500Medium", fontSize: 11 },
  title: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 16 },
});
