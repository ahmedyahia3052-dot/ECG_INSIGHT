import { Feather } from "@expo/vector-icons";
import React, { memo, useMemo, useRef } from "react";
import { Animated, Easing, PanResponder, Pressable, RefreshControl, ScrollView, TextInput, View } from "react-native";

import type { NotificationRecord } from "@/services/collaboration";

import { CriticalBadge, PendingBadge } from "../components/badges";
import { DangerButton, PrimaryButton, SecondaryButton } from "../components/buttons";
import { useDesignTokens } from "../hooks/useDesignTokens";
import { Text } from "../primitives/Text";
import { Stack } from "../primitives/Stack";
import {
  classifyNotification,
  formatShellDate,
  isCriticalNotification,
  notificationFilterLabel,
  notificationIcon,
  notificationStatusLabel,
} from "./shell-utils";

type Props = {
  criticalCount: number;
  expandedNotificationId: string | null;
  filteredNotifications: NotificationRecord[];
  isMobile: boolean;
  notificationFilter: "all" | "critical" | "license" | "system" | "unread";
  notificationOpen: boolean;
  notificationQueryError: boolean;
  notificationQueryLoading: boolean;
  notificationQueryRefetching: boolean;
  notificationSearch: string;
  notificationsTotal: number;
  onArchive: (id: string) => void;
  onClose: () => void;
  onExpand: (id: string | null) => void;
  onMarkAllRead: () => void;
  onMarkRead: (id: string) => void;
  onNavigateHistory: () => void;
  onOpen: (notification: NotificationRecord) => void;
  onRefetch: () => void;
  onSetFilter: (filter: "all" | "critical" | "license" | "system" | "unread") => void;
  onSetSearch: (value: string) => void;
  readAllPending: boolean;
  unreadCount: number;
};

function NotificationCard({
  expanded,
  notification,
  onArchive,
  onExpand,
  onMarkRead,
  onOpen,
}: {
  expanded: boolean;
  notification: NotificationRecord;
  onArchive: () => void;
  onExpand: () => void;
  onMarkRead: () => void;
  onOpen: () => void;
}) {
  const tokens = useDesignTokens();
  const translateX = useRef(new Animated.Value(0)).current;
  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dx) > 14,
    onPanResponderMove: Animated.event([null, { dx: translateX }], { useNativeDriver: false }),
    onPanResponderRelease: (_event, gesture) => {
      if (gesture.dx < -72) onMarkRead();
      if (gesture.dx > 72) onArchive();
      Animated.spring(translateX, { damping: 18, stiffness: 220, toValue: 0, useNativeDriver: true }).start();
    },
  }), [onArchive, onMarkRead, translateX]);
  const critical = isCriticalNotification(notification);

  return (
    <Animated.View {...panResponder.panHandlers} style={{ marginBottom: 10, transform: [{ translateX }] }}>
      <Pressable
        accessibilityRole="button"
        onLongPress={onExpand}
        onPress={onOpen}
        style={{
          backgroundColor: tokens.colors.surface.card,
          borderColor: critical ? tokens.colors.medical.critical : tokens.colors.border.default,
          borderRadius: tokens.radii.dialog,
          borderWidth: 1,
          gap: 9,
          padding: tokens.spacing.inset.sm,
        }}
      >
        <Stack direction="row" gap={8} style={{ alignItems: "center", justifyContent: "space-between" }}>
          <Stack direction="row" gap={8} style={{ alignItems: "center", flex: 1, minWidth: 0 }}>
            <Feather color={critical ? tokens.colors.medical.critical : tokens.colors.medical.primary} name={notificationIcon(notification)} size={16} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} variant="subtitle">{notification.title}</Text>
              <Text tone="muted" variant="caption">{classifyNotification(notification)} • {formatShellDate(notification.timestamp)}</Text>
            </View>
          </Stack>
          {critical ? <CriticalBadge label={notificationStatusLabel(notification)} /> : <PendingBadge label={notificationStatusLabel(notification)} />}
        </Stack>
        <Text numberOfLines={expanded ? undefined : 3} tone="muted" variant="body">{notification.message}</Text>
        <Stack direction="row" gap={8} style={{ flexWrap: "wrap" }}>
          {!notification.read ? <SecondaryButton label="Mark read" onPress={onMarkRead} /> : null}
          <SecondaryButton label="Open details" onPress={onOpen} />
          <DangerButton label="Archive" onPress={onArchive} />
        </Stack>
      </Pressable>
    </Animated.View>
  );
}

export const BoltNotificationPanel = memo(function BoltNotificationPanel(props: Props) {
  const tokens = useDesignTokens();
  const entrance = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!props.notificationOpen) return;
    entrance.setValue(0);
    Animated.timing(entrance, { duration: 180, easing: Easing.out(Easing.quad), toValue: 1, useNativeDriver: true }).start();
  }, [entrance, props.notificationOpen]);

  if (!props.notificationOpen) return null;

  return (
    <View pointerEvents="box-none" style={{ bottom: 0, left: 0, position: "absolute", right: 0, top: 0, zIndex: 70 }} testID="bolt-notification-panel">
      <Pressable onPress={props.onClose} style={{ ...{ bottom: 0, left: 0, position: "absolute", right: 0, top: 0, backgroundColor: `rgba(2,6,23,${tokens.opacity.overlay})` } }} />
      <Animated.View
        style={{
          backgroundColor: tokens.colors.surface.dialog,
          borderColor: tokens.colors.border.default,
          borderRadius: props.isMobile ? tokens.radii.dialog : tokens.radii.dialog,
          borderWidth: 1,
          gap: tokens.spacing.inset.sm,
          maxHeight: props.isMobile ? "92%" : 650,
          opacity: entrance,
          padding: tokens.spacing.inset.lg,
          position: "absolute",
          right: props.isMobile ? 0 : 18,
          top: props.isMobile ? undefined : 76,
          bottom: props.isMobile ? 0 : undefined,
          left: props.isMobile ? 0 : undefined,
          width: props.isMobile ? "100%" : 440,
          zIndex: 80,
        }}
      >
        <Stack direction="row" gap={8} style={{ alignItems: "flex-start", justifyContent: "space-between" }}>
          <View style={{ flex: 1 }}>
            <Text variant="title">Alerts</Text>
            <Text tone="muted" variant="caption">Live clinical, system, subscription, and workflow alerts.</Text>
          </View>
          <SecondaryButton disabled={!props.unreadCount || props.readAllPending} label="Read All" onPress={props.onMarkAllRead} />
        </Stack>

        <View style={{ alignItems: "center", backgroundColor: tokens.colors.surface.toolbar, borderColor: tokens.colors.border.default, borderRadius: tokens.radii.card, borderWidth: 1, flexDirection: "row", gap: 8, minHeight: 42, paddingHorizontal: 10 }}>
          <Feather color={tokens.colors.text.secondary} name="search" size={15} />
          <TextInput
            accessibilityLabel="Search notifications"
            onChangeText={props.onSetSearch}
            placeholder="Search notifications..."
            placeholderTextColor={tokens.colors.text.secondary}
            style={{ color: tokens.colors.text.primary, flex: 1, fontSize: 13 }}
            value={props.notificationSearch}
          />
        </View>

        <Stack direction="row" gap={8}>
          {[
            { label: String(props.criticalCount), title: "Critical", color: tokens.colors.medical.critical },
            { label: String(props.unreadCount), title: "Unread", color: tokens.colors.medical.primary },
            { label: String(props.notificationsTotal), title: "Total", color: tokens.colors.medical.success },
          ].map((item) => (
            <View key={item.title} style={{ alignItems: "center", backgroundColor: tokens.colors.surface.toolbar, borderColor: tokens.colors.border.default, borderRadius: tokens.radii.card, borderWidth: 1, flex: 1, minHeight: 72, padding: 10 }}>
              <Text style={{ color: item.color, fontSize: 25, fontWeight: "900" }}>{item.label}</Text>
              <Text tone="muted" variant="small">{item.title}</Text>
            </View>
          ))}
        </Stack>

        <Stack direction="row" gap={8} style={{ flexWrap: "wrap" }}>
          {(["all", "unread", "critical", "system", "license"] as const).map((filter) => (
            props.notificationFilter === filter ? (
              <PrimaryButton key={filter} label={notificationFilterLabel(filter)} onPress={() => props.onSetFilter(filter)} />
            ) : (
              <SecondaryButton key={filter} label={notificationFilterLabel(filter)} onPress={() => props.onSetFilter(filter)} />
            )
          ))}
        </Stack>

        <ScrollView
          refreshControl={<RefreshControl colors={[tokens.colors.medical.primary]} onRefresh={props.onRefetch} refreshing={props.notificationQueryRefetching} tintColor={tokens.colors.medical.primary} />}
          showsVerticalScrollIndicator
          style={{ maxHeight: 356 }}
        >
          {props.filteredNotifications.length ? props.filteredNotifications.map((notification) => (
            <NotificationCard
              expanded={props.expandedNotificationId === notification.id}
              key={notification.id}
              notification={notification}
              onArchive={() => props.onArchive(notification.id)}
              onExpand={() => props.onExpand(props.expandedNotificationId === notification.id ? null : notification.id)}
              onMarkRead={() => props.onMarkRead(notification.id)}
              onOpen={() => props.onOpen(notification)}
            />
          )) : (
            <Stack gap={8} style={{ alignItems: "center", padding: 16 }}>
              <Text variant="subtitle">{props.notificationQueryLoading ? "Loading..." : "No critical alerts"}</Text>
              <Text tone="muted" variant="body">
                {props.notificationQueryLoading ? "Loading alerts..." : props.notificationQueryError ? "Unable to load live notifications." : "STEMI alerts, urgent reviews, and system events will appear here."}
              </Text>
            </Stack>
          )}
        </ScrollView>

        <SecondaryButton label="Open Notification History" onPress={props.onNavigateHistory} />
      </Animated.View>
    </View>
  );
});
