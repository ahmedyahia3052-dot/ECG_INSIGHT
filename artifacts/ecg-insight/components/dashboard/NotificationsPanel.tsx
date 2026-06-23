import { useAuth } from "@/context/AuthContext";
import { NOTIFICATIONS, type AppNotification, type NotificationType } from "@/data/mockData";
import { useColors } from "@/hooks/useColors";
import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function typeIcon(t: NotificationType): string {
  switch (t) {
    case "critical": return "🔴";
    case "warning": return "🟠";
    case "success": return "🟢";
    case "info": return "🔵";
  }
}

function formatTime(ts: string): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

interface NotificationItemProps {
  item: AppNotification & { read: boolean };
  onMarkRead: () => void;
}

function NotificationItem({ item, onMarkRead }: NotificationItemProps) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onMarkRead}
      style={({ pressed }) => ({
        flexDirection: "row",
        gap: 12,
        padding: 14,
        backgroundColor: pressed
          ? colors.border
          : item.read
          ? colors.surface
          : colors.primaryLight,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      })}
    >
      <Text style={{ fontSize: 20, marginTop: 2 }}>{typeIcon(item.type)}</Text>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: item.read ? "500" : "700",
              color: colors.text,
              flex: 1,
            }}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text style={{ fontSize: 11, color: colors.textSecondary, marginLeft: 8 }}>
            {formatTime(item.timestamp)}
          </Text>
        </View>
        <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 18 }}>
          {item.message}
        </Text>
      </View>
      {!item.read && (
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: colors.primary,
            marginTop: 6,
          }}
        />
      )}
    </Pressable>
  );
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function NotificationsPanel({ visible, onClose }: Props) {
  const colors = useColors();
  const { user } = useAuth();
  const [readIds, setReadIds] = useState<Set<string>>(
    new Set(NOTIFICATIONS.filter((n) => n.read).map((n) => n.id))
  );

  const filtered = NOTIFICATIONS.filter((n) => {
    if (!n.targetRole) return true;
    return user && n.targetRole.includes(user.role);
  });

  const items = filtered.map((n) => ({ ...n, read: readIds.has(n.id) }));
  const unread = items.filter((n) => !n.read).length;

  function markRead(id: string) {
    setReadIds((prev) => new Set([...prev, id]));
  }

  function markAllRead() {
    setReadIds(new Set(filtered.map((n) => n.id)));
  }

  const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
    panel: {
      position: "absolute",
      top: 0,
      right: 0,
      left: 0,
      bottom: 0,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
    headerTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
    badge: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 2,
      minWidth: 20,
      alignItems: "center",
    },
    badgeText: { fontSize: 12, color: "#fff", fontWeight: "700" },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    markAll: {
      padding: 12,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    markAllText: { fontSize: 13, color: colors.primary, fontWeight: "600" },
    empty: { alignItems: "center", paddingVertical: 60, gap: 12 },
    emptyIcon: { fontSize: 40 },
    emptyText: { fontSize: 16, color: colors.textSecondary },
  });

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.panel}>
        <SafeAreaView edges={["top"]} style={{ backgroundColor: colors.surface }}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>Notifications</Text>
              {unread > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unread}</Text>
                </View>
              )}
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Text style={{ fontSize: 16, color: colors.textSecondary }}>✕</Text>
            </Pressable>
          </View>
        </SafeAreaView>

        {unread > 0 && (
          <Pressable style={styles.markAll} onPress={markAllRead}>
            <Text style={styles.markAllText}>Mark all as read</Text>
          </Pressable>
        )}

        <ScrollView>
          {items.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🔔</Text>
              <Text style={styles.emptyText}>No notifications</Text>
            </View>
          ) : (
            items.map((item) => (
              <NotificationItem
                key={item.id}
                item={item}
                onMarkRead={() => markRead(item.id)}
              />
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
