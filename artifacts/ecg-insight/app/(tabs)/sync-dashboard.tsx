import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useMobileSync } from "@/hooks/useMobileSync";
import { listSyncState } from "@/services/collaboration";
import { listOfflineUploads, listPendingActions } from "@/services/mobileOffline";
import { pushPermissionSnapshot, requestPushPermission } from "@/services/mobileNotifications";

export default function SyncDashboardScreen() {
  const colors = useColors();
  const { authToken } = useAuth();
  const mobileSync = useMobileSync(authToken?.token);
  const query = useQuery({
    enabled: !!authToken?.token,
    queryFn: async () => listSyncState(authToken!.token),
    queryKey: ["sync-state", authToken?.token],
    retry: false,
  });
  const localQueueQuery = useQuery({
    queryFn: async () => {
      const [actions, uploads] = await Promise.all([listPendingActions(), listOfflineUploads()]);
      return { actions, uploads };
    },
    queryKey: ["local-mobile-sync-state", mobileSync.snapshot.pendingActions, mobileSync.snapshot.pendingUploads],
  });
  const permissionQuery = useQuery({
    queryFn: async () => pushPermissionSnapshot(),
    queryKey: ["push-permission"],
  });
  const syncMutation = useMutation({
    mutationFn: async () => mobileSync.runSync(),
    onSuccess: () => {
      void query.refetch();
      void localQueueQuery.refetch();
    },
  });
  const permissionMutation = useMutation({
    mutationFn: requestPushPermission,
    onSuccess: () => permissionQuery.refetch(),
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Sync Dashboard</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Offline cache, background sync, retry status, conflict tracking, pending uploads, and mobile notification readiness.</Text>
        <View style={styles.grid}>
          <StatusCard icon={mobileSync.snapshot.isOnline ? "wifi" : "wifi-off"} label="Network" value={mobileSync.snapshot.isOnline ? "Online" : "Offline"} tone={mobileSync.snapshot.isOnline ? colors.success : colors.destructive} />
          <StatusCard icon="upload-cloud" label="Pending Uploads" value={String(mobileSync.snapshot.pendingUploads)} tone={mobileSync.snapshot.pendingUploads ? colors.warning : colors.success} />
          <StatusCard icon="repeat" label="Pending Actions" value={String(mobileSync.snapshot.pendingActions)} tone={mobileSync.snapshot.pendingActions ? colors.warning : colors.success} />
          <StatusCard icon="bell" label="Push Permission" value={permissionQuery.data?.permission ?? "checking"} tone={permissionQuery.data?.permission === "granted" ? colors.success : colors.warning} />
        </View>
        <View style={styles.actionRow}>
          <Pressable onPress={() => syncMutation.mutate()} style={[styles.action, { backgroundColor: colors.primary }]}>
            <Text style={styles.actionText}>{syncMutation.isPending ? "Syncing..." : "Sync now"}</Text>
          </Pressable>
          <Pressable onPress={() => permissionMutation.mutate()} style={[styles.actionOutline, { borderColor: colors.border }]}>
            <Text style={[styles.actionOutlineText, { color: colors.primary }]}>Enable notifications</Text>
          </Pressable>
        </View>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Local Offline Upload Queue</Text>
          {(localQueueQuery.data?.uploads ?? []).length ? localQueueQuery.data!.uploads.map((upload) => (
            <QueueRow key={upload.id} title={upload.patientName} subtitle={`${upload.asset.name} · ${upload.status} · ${upload.attempts} attempts`} />
          )) : <Text style={[styles.cardText, { color: colors.textSecondary }]}>No local ECG uploads pending.</Text>}
          <Text style={[styles.cardTitle, { color: colors.text }]}>Pending Actions</Text>
          {(localQueueQuery.data?.actions ?? []).length ? localQueueQuery.data!.actions.map((action) => (
            <QueueRow key={action.id} title={`${action.operation} ${action.entityType}`} subtitle={`${action.status}${action.conflictReason ? ` · ${action.conflictReason}` : ""}`} />
          )) : <Text style={[styles.cardText, { color: colors.textSecondary }]}>No local patient or workflow actions pending.</Text>}
        </View>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Server Sync State</Text>
          <Text style={[styles.cardText, { color: colors.textSecondary }]}>Backend queue: {(query.data?.queue ?? []).length} items · Backend cache: {(query.data?.cache ?? []).length} records</Text>
          <Text style={[styles.cardText, { color: colors.textSecondary }]}>Last local sync: {mobileSync.snapshot.lastSyncAt ? new Date(mobileSync.snapshot.lastSyncAt).toLocaleString() : "Not synced yet"}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusCard({ icon, label, tone, value }: { icon: keyof typeof Feather.glyphMap; label: string; tone: string; value: string }) {
  const colors = useColors();
  return (
    <View style={[styles.statusCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Feather name={icon} color={tone} size={20} />
      <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.statusValue, { color: tone }]}>{value}</Text>
    </View>
  );
}

function QueueRow({ subtitle, title }: { subtitle: string; title: string }) {
  const colors = useColors();
  return (
    <View style={[styles.queueRow, { borderColor: colors.border }]}>
      <Feather name="database" color={colors.primary} size={16} />
      <View style={styles.queueMain}>
        <Text style={[styles.queueTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.cardText, { color: colors.textSecondary }]}>{subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  action: { alignItems: "center", borderRadius: 16, flex: 1, padding: 14 },
  actionOutline: { alignItems: "center", borderRadius: 16, borderWidth: 1, flex: 1, padding: 14 },
  actionOutlineText: { fontSize: 13, fontWeight: "800" },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  actionText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  card: { borderRadius: 18, borderWidth: 1, gap: 10, padding: 16 },
  cardText: { fontSize: 12, lineHeight: 18 },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  container: { flex: 1 },
  content: { gap: 14, padding: 20, paddingBottom: 120 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  queueMain: { flex: 1 },
  queueRow: { alignItems: "center", borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 10, padding: 10 },
  queueTitle: { fontSize: 13, fontWeight: "800" },
  statusCard: { borderRadius: 18, borderWidth: 1, flex: 1, gap: 6, minWidth: 146, padding: 14 },
  statusLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  statusValue: { fontSize: 18, fontWeight: "900" },
  subtitle: { fontSize: 14, lineHeight: 20 },
  title: { fontSize: 28, fontWeight: "800" },
});
