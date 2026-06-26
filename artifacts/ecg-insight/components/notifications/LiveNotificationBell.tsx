import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { getUnreadNotificationCount } from "@/services/collaboration";

export function LiveNotificationBell() {
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { authToken } = useAuth();
  const token = authToken?.token;
  const unreadQuery = useQuery({
    enabled: !!token,
    queryFn: async () => getUnreadNotificationCount(token!),
    queryKey: ["live-unread-notifications", token],
    refetchInterval: 30_000,
    retry: false,
  });

  useEffect(() => {
    if (typeof window === "undefined") return () => undefined;
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: ["live-unread-notifications", token] });
      void queryClient.invalidateQueries({ queryKey: ["notification-center", token] });
    };
    window.addEventListener("focus", refresh);
    window.addEventListener("ecg-insight-notification", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("ecg-insight-notification", refresh);
    };
  }, [queryClient, token]);

  if (!token) return null;
  const count = unreadQuery.data?.unreadCount ?? 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open notification center. ${count} unread notifications.`}
      onPress={() => router.push("/(tabs)/notification-center" as never)}
      style={[styles.bell, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.shadow }]}
    >
      <Feather name="bell" size={18} color={count ? colors.warning : colors.primary} />
      {count ? (
        <View style={[styles.badge, { backgroundColor: colors.destructive }]}>
          <Text style={styles.badgeText}>{count > 99 ? "99+" : count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: "center", borderRadius: 999, minWidth: 18, paddingHorizontal: 5, paddingVertical: 2, position: "absolute", right: -5, top: -6 },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "900" },
  bell: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    position: "absolute",
    right: 14,
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    top: 14,
    width: 42,
    zIndex: 60,
  },
});
