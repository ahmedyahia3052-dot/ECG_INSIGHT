import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useToast } from "@/components/interaction/PremiumInteraction";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useMobileSync } from "@/hooks/useMobileSync";

export function MobileSyncStatus() {
  const colors = useColors();
  const toast = useToast();
  const { authToken } = useAuth();
  const { runSync, snapshot, syncing } = useMobileSync(authToken?.token);
  const lastBackendToastRef = useRef("");
  const hasPending = snapshot.pendingActions + snapshot.pendingUploads > 0;

  useEffect(() => {
    if (snapshot.backendReachable) {
      lastBackendToastRef.current = "";
      return;
    }
    const toastKey = `${snapshot.backendHealthStatus}:${snapshot.lastHealthCheckAt}`;
    if (lastBackendToastRef.current === toastKey) return;
    lastBackendToastRef.current = toastKey;
    toast.warning("Connection lost. Some features may be unavailable.", "");
  }, [snapshot.apiUrl, snapshot.backendHealthStatus, snapshot.backendReachable, snapshot.lastHealthCheckAt, toast]);

  if (!hasPending) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.warning }]}>
      <Feather name="upload-cloud" color={colors.warning} size={16} />
      <Text style={[styles.text, { color: colors.text }]}>
        {syncing ? "Syncing" : `${snapshot.pendingUploads} uploads, ${snapshot.pendingActions} actions pending`}
      </Text>
      <Pressable onPress={() => void runSync()} style={[styles.button, { borderColor: colors.border }]}>
        <Text style={[styles.buttonText, { color: colors.primary }]}>Sync now</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  button: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  buttonText: { fontSize: 11, fontWeight: "800" },
  container: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    bottom: 12,
    flexDirection: "row",
    gap: 8,
    left: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    position: "absolute",
    right: 12,
    zIndex: 50,
  },
  text: { flex: 1, fontSize: 12, fontWeight: "700" },
});
