import { SecurityListScreen } from "@/components/security/SecurityListScreen";
import { listAuditLogs } from "@/services/security";

export default function AuditExplorerScreen() {
  return (
    <SecurityListScreen<Record<string, unknown>>
      emptyText="No audit records found."
      load={async (token) => (await listAuditLogs(token)).logs as Record<string, unknown>[]}
      queryKey="audit-explorer-page"
      renderItem={(log) => `${String(log.action ?? "AUDIT")} - ${String(log.entityType ?? "system")} - ${String(log.message ?? "")}`}
      subtitle="Immutable audit trail for access, reports, ECG uploads, exports, deletes, and permission changes."
      title="Audit Explorer"
    />
  );
}
