import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { listSuperAdminAudit } from "@/services/superAdmin";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AuditLogViewerScreen() {
  const colors = useColors();
  const { authToken } = useAuth();
  const [logs, setLogs] = useState<Array<{ action: string; createdAt: string; entityId?: string; entityType?: string; id: string; message: string }>>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!authToken?.token) return;
    const params = new URLSearchParams({ page: "1", pageSize: "50" });
    if (search) params.set("q", search);
    listSuperAdminAudit(authToken.token, params).then((payload) => setLogs(payload.logs)).catch(() => setLogs([]));
  }, [authToken?.token, search]);

  const styles = StyleSheet.create({
    card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: colors.radius.lg, borderWidth: 1, gap: 5, marginBottom: 10, padding: 14 },
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 120 },
    input: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: colors.radius.md, borderWidth: 1, color: colors.text, marginBottom: 12, padding: 12 },
    title: { color: colors.text, fontSize: 24, fontWeight: "800", marginBottom: 6 },
  });

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Audit Log Viewer</Text>
        <TextInput style={styles.input} value={search} onChangeText={setSearch} placeholder="Search admin audit logs" placeholderTextColor={colors.textSecondary} />
        {logs.map((log) => (
          <View key={log.id} style={styles.card}>
            <Text style={{ color: colors.text, fontWeight: "800" }}>{log.action}</Text>
            <Text style={{ color: colors.textSecondary }}>{log.message}</Text>
            <Text style={{ color: colors.textSecondary }}>{log.entityType ?? "Entity"} · {log.entityId ?? "n/a"} · {log.createdAt}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
