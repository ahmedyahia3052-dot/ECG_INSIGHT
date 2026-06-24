import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { deleteNotification, listNotifications, markNotificationRead } from "@/services/collaboration";
import { BoltBadge, BoltButton, BoltCard, BoltEmpty, BoltHero, BoltScreen } from "@/components/bolt/BoltUI";

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
  const { authToken } = useAuth();
  const token = authToken?.token;
  const queryKey = ["bolt-notification-center", token];
  const notificationsQuery = useQuery({
    enabled: !!token,
    queryFn: async () => listNotifications(token!, new URLSearchParams({ pageSize: "50" })),
    queryKey,
    retry: false,
  });
  const readMutation = useMutation({
    mutationFn: async (id: string) => markNotificationRead(token!, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => deleteNotification(token!, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const notifications = (notificationsQuery.data?.notifications ?? []) as LiveNotification[];

  return (
    <BoltScreen>
      <BoltHero
        eyebrow="Clinical notifications"
        subtitle="Live notification data from the existing collaboration API. Demo notification arrays have been removed."
        title="Notifications"
      />
      {notificationsQuery.isError ? (
        <BoltEmpty title="Notifications unavailable" message="Unable to load live notifications." />
      ) : notifications.length === 0 ? (
        <BoltEmpty title={notificationsQuery.isLoading ? "Loading notifications..." : "No notifications"} message="Clinical alerts, tasks, and system notices will appear here." />
      ) : (
        notifications.map((notification, index) => {
          const id = notification.id ?? String(index);
          const unread = !notification.read && !notification.readAt;
          return (
            <BoltCard key={id} style={styles.notification}>
              <View style={styles.cardHeader}>
                <Text style={[styles.title, { color: colors.text }]}>{notification.title ?? "Notification"}</Text>
                <BoltBadge label={unread ? "Unread" : "Read"} tone={unread ? "primary" : "muted"} />
              </View>
              <Text style={[styles.message, { color: colors.textSecondary }]}>{notification.message ?? "No message provided."}</Text>
              <Text style={[styles.date, { color: colors.textSecondary }]}>{notification.createdAt?.slice(0, 19) ?? "Live event"}</Text>
              <View style={styles.actions}>
                {unread ? (
                  <BoltButton label="Mark read" onPress={() => readMutation.mutate(id)} variant="outline" />
                ) : null}
                <BoltButton label="Delete" onPress={() => deleteMutation.mutate(id)} variant="ghost" />
              </View>
            </BoltCard>
          );
        })
      )}
    </BoltScreen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  cardHeader: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "space-between" },
  date: { fontFamily: "Inter_500Medium", fontSize: 11 },
  message: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19 },
  notification: { gap: 9 },
  title: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 16 },
});
