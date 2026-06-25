import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { BoltBadge } from "./BoltUI";

export function FloatingEcgActionButton() {
  const colors = useColors();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      friction: 5,
      tension: 80,
      toValue: open ? 1.04 : 1,
      useNativeDriver: true,
    }).start();
  }, [open, scale]);

  const actions = [
    { icon: "camera" as const, label: "Camera Capture", route: "/(tabs)/upload?method=camera" },
    { icon: "image" as const, label: "Upload Image", route: "/(tabs)/upload?method=upload" },
    { icon: "file" as const, label: "Upload PDF", route: "/(tabs)/document-center" },
  ];

  return (
    <View pointerEvents="box-none" style={styles.ecgLayer}>
      {open ? (
        <View style={styles.ecgMenu}>
          {actions.map((action) => (
            <Pressable
              key={action.label}
              accessibilityRole="button"
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setOpen(false);
                router.push(action.route as never);
              }}
              style={({ pressed }) => [
                styles.ecgMenuItem,
                {
                  backgroundColor: colors.glass,
                  borderColor: colors.gradientBorder,
                  opacity: pressed ? 0.78 : 1,
                },
              ]}
            >
              <Feather name={action.icon} size={18} color={colors.primary} />
              <Text style={[styles.ecgMenuText, { color: colors.text }]}>{action.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="ECG quick actions"
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          setOpen((value) => !value);
        }}
      >
        <Animated.View style={[styles.ecgFab, { shadowColor: colors.primary, transform: [{ scale }] }]}>
          <LinearGradient colors={["#00E5FF", "#0EA5E9", "#14B8A6"]} style={styles.ecgFabGradient}>
            <Feather name={open ? "x" : "plus"} size={20} color="#050816" />
            <Text style={styles.ecgFabText}>ECG</Text>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </View>
  );
}

export function FloatingAIAssistant({ compact }: { compact: boolean }) {
  const colors = useColors();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <View pointerEvents="box-none" style={[styles.aiLayer, compact ? styles.aiLayerMobile : styles.aiLayerDesktop]}>
      {open ? (
        <View style={[styles.aiPanel, { backgroundColor: colors.glass, borderColor: colors.gradientBorder }]}>
          <View style={styles.aiHeader}>
            <Text style={[styles.aiTitle, { color: colors.text }]}>Clinical AI Assistant</Text>
            <BoltBadge icon="cpu" label="Available" tone="success" />
          </View>
          {["Explain ECG", "Ask Clinical Question", "Differential Diagnosis", "Treatment Suggestions"].map((item) => (
            <Pressable
              key={item}
              accessibilityRole="button"
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                router.push("/(tabs)/ai-assistant" as never);
              }}
              style={({ pressed }) => [styles.aiAction, { borderColor: colors.border, opacity: pressed ? 0.78 : 1 }]}
            >
              <Text style={[styles.aiActionText, { color: colors.text }]}>{item}</Text>
              <Feather name="arrow-right" size={15} color={colors.primary} />
            </Pressable>
          ))}
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open AI assistant"
        onPress={() => {
          Haptics.selectionAsync().catch(() => {});
          setOpen((value) => !value);
        }}
        style={[styles.aiButton, { backgroundColor: colors.glass, borderColor: colors.gradientBorder }]}
      >
        <Feather name={open ? "x" : "message-circle"} size={18} color={colors.primary} />
        {!compact ? <Text style={[styles.aiButtonText, { color: colors.text }]}>AI Assistant</Text> : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  aiAction: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 48,
    paddingHorizontal: 12,
  },
  aiActionText: { fontFamily: "Inter_700Bold", fontSize: 13 },
  aiButton: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 48,
    minWidth: 48,
    paddingHorizontal: 14,
    shadowOffset: { height: 12, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  aiButtonText: { fontFamily: "Inter_700Bold", fontSize: 13 },
  aiHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  aiLayer: { position: "absolute", zIndex: 32 },
  aiLayerDesktop: { right: 24, top: 24 },
  aiLayerMobile: { left: 18, top: 52 },
  aiPanel: {
    borderRadius: 22,
    borderWidth: 1,
    gap: 10,
    marginBottom: 10,
    padding: 12,
    width: 280,
  },
  aiTitle: { fontFamily: "Inter_700Bold", fontSize: 15 },
  ecgFab: {
    borderRadius: 999,
    elevation: 12,
    shadowOffset: { height: 14, width: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
  },
  ecgFabGradient: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    gap: 8,
    minHeight: 58,
    minWidth: 92,
    paddingHorizontal: 18,
  },
  ecgFabText: { color: "#050816", fontFamily: "Inter_700Bold", fontSize: 15 },
  ecgLayer: { bottom: 98, position: "absolute", right: 18, zIndex: 34 },
  ecgMenu: { gap: 10, marginBottom: 10 },
  ecgMenuItem: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 52,
    minWidth: 178,
    paddingHorizontal: 14,
  },
  ecgMenuText: { fontFamily: "Inter_700Bold", fontSize: 13 },
});
