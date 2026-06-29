import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Badge, Card, EmptyState, Field, formatDate, medicalTheme, PageSection, PrimaryButton, SectionHeader } from "@/components/enterprise/EnterpriseUI";
import { useAuth } from "@/context/AuthContext";
import { deleteNotification, listAlerts, listNotifications, markAllNotificationsRead, markNotificationRead, type NotificationRecord } from "@/services/collaboration";

type NotificationFilter = "all" | "critical" | "license" | "system" | "unread";

export default function NotificationsScreen() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { authToken } = useAuth();
  const token = authToken?.token;
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<NotificationFilter>("all");

  const notificationsQuery = useQuery({
    enabled: !!token,
    queryFn: () => {
      const params = new URLSearchParams({ pageSize: "25" });
      if (search.trim()) params.set("q", search.trim());
      return listNotifications(token!, params);
    },
    queryKey: ["enterprise-notifications", token, search],
    refetchInterval: 15_000,
    refetchIntervalInBackground: true,
    retry: false,
  });
  const alertsQuery = useQuery({ enabled: !!token, queryFn: () => listAlerts(token!), queryKey: ["enterprise-alerts", token], retry: false });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["enterprise-notifications", token] });
  const readMutation = useMutation({ mutationFn: (id: string) => markNotificationRead(token!, id), onSuccess: invalidate });
  const readAllMutation = useMutation({ mutationFn: () => markAllNotificationsRead(token!), onSuccess: invalidate });
  const deleteMutation = useMutation({ mutationFn: (id: string) => deleteNotification(token!, id), onSuccess: invalidate });

  const notifications = notificationsQuery.data?.notifications ?? [];
  const filteredNotifications = notifications.filter((item) => notificationMatchesFilter(item, filter));
  const unreadCount = notifications.filter((item) => !item.read).length;
  const criticalCount = notifications.filter(isCriticalNotification).length + (alertsQuery.data?.alerts.length ?? 0);

  return (
    <PageSection>
      <Card style={styles.controls}>
        <SectionHeader title="Alerts" subtitle="Clinical alerts, workflow events, subscription notices, and system updates from live APIs." />
        <Field label="Search" onChangeText={setSearch} placeholder="Search notifications..." value={search} />
        <View style={styles.counterRow}>
          <Card style={styles.counterCard}>
            <Text style={[styles.counterValue, { color: medicalTheme.critical }]}>{criticalCount}</Text>
            <Text style={styles.counterLabel}>Critical</Text>
          </Card>
          <Card style={styles.counterCard}>
            <Text style={[styles.counterValue, { color: medicalTheme.primary }]}>{unreadCount}</Text>
            <Text style={styles.counterLabel}>Unread</Text>
          </Card>
          <Card style={styles.counterCard}>
            <Text style={[styles.counterValue, { color: medicalTheme.success }]}>{notificationsQuery.data?.total ?? notifications.length}</Text>
            <Text style={styles.counterLabel}>Total</Text>
          </Card>
        </View>
        <View style={styles.filterRow}>
          {(["all", "unread", "critical", "system", "license"] as const).map((item) => <PrimaryButton key={item} label={filterLabel(item)} onPress={() => setFilter(item)} variant={filter === item ? "primary" : "outline"} />)}
          <PrimaryButton label="Mark All Read" onPress={() => readAllMutation.mutate()} variant="outline" />
        </View>
      </Card>
      <Card style={styles.panel}>
        <SectionHeader title="Notification History" subtitle={`${alertsQuery.data?.alerts.length ?? 0} active alerts • ${filteredNotifications.length} matching notifications`} />
        {notificationsQuery.isLoading ? <Text style={styles.meta}>Loading live notifications...</Text> : null}
        {filteredNotifications.length ? filteredNotifications.map((item) => (
          <View key={item.id} style={[styles.row, isCriticalNotification(item) && styles.rowCritical]}>
            <View style={styles.rowMain}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.meta}>{item.message}</Text>
              <Text style={styles.meta}>{classifyNotification(item)} • {formatDate(item.timestamp)} • {item.read ? "Read" : "Unread"}</Text>
            </View>
            <Badge label={isCriticalNotification(item) ? "Critical" : item.read ? "Read" : "Unread"} tone={isCriticalNotification(item) ? "critical" : item.read ? "muted" : "primary"} />
            <View style={styles.actions}>
              {!item.read ? <PrimaryButton label="Read" onPress={() => readMutation.mutate(item.id)} variant="outline" /> : null}
              <PrimaryButton label="Open" onPress={() => openNotification(item, router.push, readMutation.mutate)} variant="outline" />
              <PrimaryButton label="Clear" onPress={() => deleteMutation.mutate(item.id)} variant="danger" />
            </View>
          </View>
        )) : <EmptyState title={notificationsQuery.isError ? "Alerts unavailable" : "No critical alerts"} message={notificationsQuery.isError ? "Unable to load live notifications. Please try again." : "STEMI alerts, urgent reviews, failed analyses, subscription notices, and system events will appear here."} />}
      </Card>
    </PageSection>
  );
}

function openNotification(item: NotificationRecord, push: (href: never) => void, markRead: (id: string) => void) {
  markRead(item.id);
  const target = item.actionUrl ?? (item.caseId ? `/ecg-cases/${item.caseId}` : item.patientId ? `/patients/${item.patientId}` : item.reportId ? `/reports/${item.reportId}` : "/notifications");
  push(target as never);
}

function notificationMatchesFilter(notification: NotificationRecord, filter: NotificationFilter) {
  const haystack = `${notification.type} ${notification.category ?? ""} ${notification.title} ${notification.message}`.toLowerCase();
  if (filter === "all") return true;
  if (filter === "unread") return !notification.read;
  if (filter === "critical") return isCriticalNotification(notification);
  if (filter === "license") return haystack.includes("license") || haystack.includes("subscription") || haystack.includes("billing");
  return haystack.includes("system") || haystack.includes("sync") || haystack.includes("failed");
}

function isCriticalNotification(notification: NotificationRecord) {
  const haystack = `${notification.type} ${notification.category ?? ""} ${notification.title} ${notification.message}`.toLowerCase();
  return haystack.includes("critical") || haystack.includes("stemi") || haystack.includes("urgent") || haystack.includes("failed");
}

function classifyNotification(notification: NotificationRecord) {
  const haystack = `${notification.type} ${notification.category ?? ""} ${notification.title} ${notification.message}`.toLowerCase();
  if (haystack.includes("stemi")) return "STEMI";
  if (haystack.includes("subscription") || haystack.includes("license") || haystack.includes("billing")) return "License";
  if (haystack.includes("system") || haystack.includes("sync") || haystack.includes("failed")) return "System";
  if (haystack.includes("urgent") || haystack.includes("review")) return "Urgent review";
  return "Clinical";
}

function filterLabel(filter: NotificationFilter) {
  if (filter === "all") return "All";
  if (filter === "unread") return "Unread";
  if (filter === "critical") return "Critical";
  if (filter === "system") return "System";
  return "License";
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  counterCard: { alignItems: "center", flex: 1, gap: 3, minHeight: 80 },
  counterLabel: { color: medicalTheme.muted, fontSize: 11, fontWeight: "900", letterSpacing: 0.7, textTransform: "uppercase" },
  counterRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  counterValue: { fontSize: 30, fontWeight: "900" },
  controls: { gap: 12 },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  meta: { color: medicalTheme.muted, fontSize: 12, lineHeight: 18 },
  panel: { gap: 10 },
  row: { alignItems: "center", borderBottomColor: medicalTheme.border, borderBottomWidth: 1, flexDirection: "row", flexWrap: "wrap", gap: 12, paddingVertical: 12 },
  rowCritical: { borderBottomColor: medicalTheme.critical },
  rowMain: { flex: 1, minWidth: 260 },
  title: { color: medicalTheme.text, fontSize: 15, fontWeight: "900" },
});
