import { Feather } from "@expo/vector-icons";
import { FlashList, type FlashListRef } from "@shopify/flash-list";
import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { medicalTheme } from "@/components/enterprise/EnterpriseUI";
import type { CopilotMessage } from "@/services/copilot";

import { CopilotMessageCard } from "./CopilotMessageCard";
import type { MessageListHandle, MessageListProps } from "./types";

export type { MessageListHandle };

const EMPTY_MESSAGES = [
  "Start a natural conversation — say hello, ask a cardiology question, or upload an ECG when you're ready.",
];

export const CopilotMessageList = forwardRef<MessageListHandle, MessageListProps>(function CopilotMessageList({
  messages,
  onNotice,
  onScrollNearBottomChange,
  onShowNewMessages,
  showNewMessagesButton,
  speechControl,
  status,
  streamingMessage,
}, ref) {
  const listRef = useRef<FlashListRef<CopilotMessage>>(null);
  const nearBottomRef = useRef(true);

  const data = useMemo(() => messages, [messages]);

  const scrollToEnd = useCallback((animated = true) => {
    if (data.length) {
      listRef.current?.scrollToIndex({ animated, index: data.length - 1 });
    }
  }, [data.length]);

  useImperativeHandle(ref, () => ({
    scrollToEnd: ({ animated = true } = {}) => scrollToEnd(animated),
    scrollToOffset: ({ animated = true, offset }: { animated?: boolean; offset: number }) => listRef.current?.scrollToOffset({ animated, offset }),
  }), [scrollToEnd]);

  const renderItem = useCallback(({ item }: { item: CopilotMessage }) => (
    <CopilotMessageCard message={item} onNotice={onNotice} speechControl={speechControl} />
  ), [onNotice, speechControl]);

  const keyExtractor = useCallback((item: CopilotMessage, index: number) => item?.id ?? `message-${index}`, []);

  const ListEmptyComponent = useMemo(() => (
    !streamingMessage ? (
      <View style={styles.emptyChat}>
        <Text style={styles.emptyTitle}>Start a clinical conversation</Text>
        {EMPTY_MESSAGES.map((message) => <Text key={message} style={styles.emptyMessage}>{message}</Text>)}
      </View>
    ) : null
  ), [streamingMessage]);

  const ListFooterComponent = useMemo(() => (
    <View style={styles.footer}>
      {status && !streamingMessage ? <Text style={styles.statusText}>{status}</Text> : null}
      {streamingMessage ? (
        <CopilotMessageCard
          message={{ attachments: [], citations: [], content: streamingMessage, createdAt: new Date().toISOString(), id: "streaming", role: "assistant" }}
          onNotice={onNotice}
          speechControl={speechControl}
        />
      ) : null}
    </View>
  ), [onNotice, speechControl, status, streamingMessage]);

  return (
    <View style={styles.container} testID="copilot-message-thread">
      <FlashList
        ListEmptyComponent={ListEmptyComponent}
        ListFooterComponent={ListFooterComponent}
        contentContainerStyle={styles.listContent}
        data={data}
        keyExtractor={keyExtractor}
        onScroll={(event) => {
          const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
          const nearBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 96;
          if (nearBottomRef.current !== nearBottom) {
            nearBottomRef.current = nearBottom;
            onScrollNearBottomChange(nearBottom);
          }
        }}
        ref={listRef}
        renderItem={renderItem}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator
      />
      {showNewMessagesButton ? (
        <Pressable accessibilityLabel="Scroll to new messages" accessibilityRole="button" onPress={() => { scrollToEnd(true); onShowNewMessages?.(); }} style={styles.newMessagesButton}>
          <Feather color={medicalTheme.background} name="arrow-down" size={14} />
          <Text style={styles.newMessagesText}>New messages</Text>
        </Pressable>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 0, position: "relative" },
  emptyChat: { alignItems: "center", gap: 8, justifyContent: "center", minHeight: 320, padding: 28 },
  emptyMessage: { color: medicalTheme.muted, fontSize: 14, fontWeight: "700", lineHeight: 21, textAlign: "center" },
  emptyTitle: { color: medicalTheme.text, fontSize: 24, fontWeight: "900", textAlign: "center" },
  footer: { gap: 8, paddingBottom: 12 },
  listContent: { paddingBottom: 8, paddingTop: 4 },
  newMessagesButton: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: medicalTheme.primary,
    borderRadius: 999,
    bottom: 12,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    position: "absolute",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  newMessagesText: { color: medicalTheme.background, fontSize: 12, fontWeight: "900" },
  statusText: { color: medicalTheme.muted, fontSize: 12, fontWeight: "800", paddingHorizontal: 8 },
});
