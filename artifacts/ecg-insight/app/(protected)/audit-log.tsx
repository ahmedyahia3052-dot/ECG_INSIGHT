import { useQuery } from "@tanstack/react-query";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { Card, EmptyState, formatDate, medicalTheme, PageSection, SectionHeader } from "@/components/enterprise/EnterpriseUI";
import { useAuth } from "@/context/AuthContext";
import { listAuditLogs } from "@/services/enterpriseClinical";

export default function AuditLogScreen() {
  const { authToken, canAccess } = useAuth();
  const token = authToken?.token;
  const allowed = canAccess(["admin", "super_admin"]);

  const auditQuery = useQuery({
    enabled: !!token && allowed,
    queryFn: () => listAuditLogs(token!),
    queryKey: ["enterprise-audit-log", token],
    retry: false,
  });

  if (!allowed) return <EmptyState title="Audit access required" message="Only administrators can view the enterprise audit trail." />;

  return (
    <PageSection>
      <Card style={styles.panel}>
        <SectionHeader title="Enterprise Audit Trail" subtitle="Who changed what, when, with old and new values for clinical accountability." />
        {(auditQuery.data?.logs ?? []).map((log) => (
          <View key={log.id} style={styles.row}>
            <Text style={styles.action}>{log.action}</Text>
            <Text style={styles.meta}>{formatDate(log.createdAt)} • {log.actor?.name ?? log.actorId}</Text>
            <Text style={styles.message}>{log.message}</Text>
            {log.oldValue ? <Text style={styles.diff}>Old: {JSON.stringify(log.oldValue)}</Text> : null}
            {log.newValue ? <Text style={styles.diff}>New: {JSON.stringify(log.newValue)}</Text> : null}
          </View>
        ))}
        {!auditQuery.isLoading && !(auditQuery.data?.logs.length) ? <EmptyState title="No audit entries" message="Clinical actions will appear here as they occur." /> : null}
      </Card>
    </PageSection>
  );
}

const styles = StyleSheet.create({
  action: { color: medicalTheme.text, fontSize: 14, fontWeight: "900" },
  diff: { color: medicalTheme.muted, fontFamily: "monospace", fontSize: 11 },
  message: { color: medicalTheme.text, fontSize: 13 },
  meta: { color: medicalTheme.muted, fontSize: 12 },
  panel: { gap: 10 },
  row: { borderBottomColor: medicalTheme.border, borderBottomWidth: 1, gap: 4, paddingVertical: 10 },
});
