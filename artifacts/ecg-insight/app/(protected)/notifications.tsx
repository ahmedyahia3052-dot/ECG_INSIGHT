import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Badge, Card, EmptyState, Field, formatDate, medicalTheme, PageSection, PrimaryButton, SectionHeader } from "@/components/enterprise/EnterpriseUI";
import { useAuth } from "@/context/AuthContext";
import { deleteNotification, listAlerts, listNotifications, markNotificationRead } from "@/services/collaboration";

export default function NotificationsScreen() {
  const queryClient = useQueryClient();
  const { authToken } = useAuth();
  const token = authToken?.token;
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");

  const notificationsQuery = useQuery({
    enabled: !!token,
    queryFn: () => {
      const params = new URLSearchParams({ pageSize: "25" });
      if (search.trim()) params.set("q", search.trim());
      if (type !== "all") params.set("type", type.toUpperCase());
      return listNotifications(token!, params);
    },
    queryKey: ["enterprise-notifications", token, search, type],
    retry: false,
  });
  const alertsQuery = useQuery({ enabled: !!token, queryFn: () => listAlerts(token!), queryKey: ["enterprise-alerts", token], retry: false });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["enterprise-notifications", token] });
  const readMutation = useMutation({ mutationFn: (id: string) => markNotificationRead(token!, id), onSuccess: invalidate });
  const deleteMutation = useMutation({ mutationFn: (id: string) => deleteNotification(token!, id), onSuccess: invalidate });

  const notifications = notificationsQuery.data?.notifications ?? [];

  return (
    <PageSection>
      <Card style={styles.controls}>
        <SectionHeader title="Notification Center" subtitle="Clinical alerts, workflow events, and collaboration updates." />
        <Field label="Search" onChangeText={setSearch} placeholder="Search notifications..." value={search} />
        <View style={styles.filterRow}>
          {["all", "critical", "warning", "info", "success"].map((item) => <PrimaryButton key={item} label={item} onPress={() => setType(item)} variant={type === item ? "primary" : "outline"} />)}
        </View>
      </Card>
      <Card style={styles.panel}>
        <SectionHeader title="Clinical Alerts" subtitle={`${alertsQuery.data?.alerts.length ?? 0} active alerts`} />
        {notifications.length ? notifications.map((item) => (
          <View key={item.id} style={styles.row}>
            <View style={styles.rowMain}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.meta}>{item.message}</Text>
              <Text style={styles.meta}>{formatDate(item.timestamp)} • {item.read ? "Read" : "Unread"}</Text>
            </View>
            <Badge label={item.type} tone={item.type.toLowerCase() === "critical" ? "critical" : "primary"} />
            <View style={styles.actions}>
              <PrimaryButton label="Read" onPress={() => readMutation.mutate(item.id)} variant="outline" />
              <PrimaryButton label="Dismiss" onPress={() => deleteMutation.mutate(item.id)} variant="danger" />
            </View>
          </View>
        )) : <EmptyState title="No notifications" message="You are all caught up." />}
      </Card>
    </PageSection>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  controls: { gap: 12 },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  meta: { color: medicalTheme.muted, fontSize: 12, lineHeight: 18 },
  panel: { gap: 10 },
  row: { alignItems: "center", borderBottomColor: medicalTheme.border, borderBottomWidth: 1, flexDirection: "row", flexWrap: "wrap", gap: 12, paddingVertical: 12 },
  rowMain: { flex: 1, minWidth: 260 },
  title: { color: medicalTheme.text, fontSize: 15, fontWeight: "900" },
});
