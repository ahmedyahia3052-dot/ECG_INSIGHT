import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useMobileSync } from "@/hooks/useMobileSync";

export function MobileSyncStatus() {
  const colors = useColors();
  const { authToken } = useAuth();
  const { runSync, snapshot, syncing, updateAvailable } = useMobileSync(authToken?.token);
  const hasPending = snapshot.pendingActions + snapshot.pendingUploads > 0;
  if (snapshot.isOnline && !hasPending && !updateAvailable) return null;

  const tone = snapshot.isOnline ? colors.warning : colors.destructive;
  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: tone }]}>
      <Feather name={snapshot.isOnline ? "wifi" : "wifi-off"} color={tone} size={16} />
      <Text style={[styles.text, { color: colors.text }]}>
        {snapshot.isOnline ? "Online" : "Offline"} · {syncing ? "Syncing" : `${snapshot.pendingUploads} uploads, ${snapshot.pendingActions} actions pending`}
        {updateAvailable ? " · Update ready" : ""}
      </Text>
      {snapshot.isOnline && hasPending ? (
        <Pressable onPress={() => void runSync()} style={[styles.button, { borderColor: colors.border }]}>
          <Text style={[styles.buttonText, { color: colors.primary }]}>Sync now</Text>
        </Pressable>
      ) : null}
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
