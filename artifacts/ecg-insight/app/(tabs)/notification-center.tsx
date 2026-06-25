import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { deleteNotification, listAlerts, listNotifications, markNotificationRead, type NotificationRecord } from "@/services/collaboration";
import { BoltBadge, BoltButton, BoltCard, BoltEmpty, BoltField, BoltHero, BoltScreen } from "@/components/bolt/BoltUI";
import { PremiumRefreshControl, SkeletonList, SwipeActionRow, useToast } from "@/components/interaction/PremiumInteraction";

type ReadFilter = "all" | "false" | "true";
type TypeFilter = "all" | "critical" | "info" | "success" | "warning";

export default function NotificationCenterScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { authToken } = useAuth();
  const token = authToken?.token;
  const [search, setSearch] = useState("");
  const [read, setRead] = useState<ReadFilter>("all");
  const [type, setType] = useState<TypeFilter>("all");
  const [page, setPage] = useState(1);
  const queryKey = ["notification-center", token, page, search, read, type];
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (__DEV__) console.info("[route-mount] NotificationsPage", { page, read, search, type });
  }, [page, read, search, type]);
  const notificationsQuery = useQuery({
    enabled: !!token,
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: "10" });
      if (search.trim()) params.set("q", search.trim());
      if (read !== "all") params.set("read", read);
      if (type !== "all") params.set("type", type.toUpperCase());
      return listNotifications(token!, params);
    },
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
      return queryClient.invalidateQueries({ queryKey: ["notification-center", token] });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => deleteNotification(token!, id),
    onSuccess: () => {
      toast.info("Notification dismissed", "The notification was removed from your queue.");
      return queryClient.invalidateQueries({ queryKey: ["notification-center", token] });
    },
  });

  const cache = useOfflineCache("ecg-insight:mobile:alerts", notificationsQuery.data?.notifications);
  const notifications = (notificationsQuery.data?.notifications ?? cache.cachedData ?? []) as NotificationRecord[];
  const alerts = (alertsQuery.data?.alerts ?? []) as Array<Record<string, unknown>>;
  const unreadCount = notifications.filter((item) => !item.read).length;
  const criticalCount = notifications.filter((item) => isCriticalAlert(item)).length + alerts.length;
  const total = notificationsQuery.data?.total ?? notifications.length;
  const totalPages = notificationsQuery.data?.totalPages ?? 1;
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

      <BoltCard style={styles.filters}>
        <BoltField
          icon="search"
          onChangeText={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search notifications by title or message..."
          value={search}
        />
        <View style={styles.filterRow}>
          {(["all", "false", "true"] as ReadFilter[]).map((item) => (
            <View key={item} style={styles.filterButton}>
              <BoltButton
                label={item === "all" ? "All" : item === "false" ? "Unread" : "Read"}
                onPress={() => {
                  setRead(item);
                  setPage(1);
                }}
                variant={read === item ? "primary" : "outline"}
              />
            </View>
          ))}
        </View>
        <View style={styles.filterRow}>
          {(["all", "critical", "info", "success", "warning"] as TypeFilter[]).map((item) => (
            <View key={item} style={styles.filterButton}>
              <BoltButton
                label={item[0].toUpperCase() + item.slice(1)}
                onPress={() => {
                  setType(item);
                  setPage(1);
                }}
                variant={type === item ? "primary" : "outline"}
              />
            </View>
          ))}
        </View>
      </BoltCard>

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
          const unread = !notification.read;
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
                <Text style={[styles.date, { color: colors.textSecondary }]}>{notification.timestamp?.slice(0, 19) ?? "Live event"}</Text>
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
      <View style={styles.pagination}>
        <Text style={[styles.pageText, { color: colors.textSecondary }]}>{total} notifications · Page {page} of {Math.max(totalPages, 1)}</Text>
        <View style={styles.actions}>
          <BoltButton disabled={page <= 1} label="Previous" onPress={() => setPage((current) => Math.max(1, current - 1))} variant="outline" />
          <BoltButton disabled={page >= totalPages} label="Next" onPress={() => setPage((current) => current + 1)} variant="outline" />
        </View>
      </View>
    </BoltScreen>
  );
}

function isCriticalAlert(notification: NotificationRecord) {
  const text = `${notification.title ?? ""} ${notification.message ?? ""} ${notification.type ?? ""}`.toLowerCase();
  return text.includes("stemi") || text.includes("critical") || text.includes("urgent") || text.includes("failed");
}

function classifyAlert(notification: NotificationRecord) {
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
  filterButton: { minWidth: 96 },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filters: { gap: 10 },
  message: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19 },
  notification: { gap: 9 },
  pageText: { fontFamily: "Inter_600SemiBold", fontSize: 12, textAlign: "center" },
  pagination: { alignItems: "center", gap: 8 },
  severityRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 8 },
  swipeHint: { fontFamily: "Inter_500Medium", fontSize: 11 },
  title: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 16 },
});
