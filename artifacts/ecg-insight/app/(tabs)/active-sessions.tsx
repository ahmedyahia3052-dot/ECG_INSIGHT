import { SecurityListScreen } from "@/components/security/SecurityListScreen";
import { listSecuritySessions, type SecuritySession } from "@/services/security";

export default function ActiveSessionsScreen() {
  return (
    <SecurityListScreen<SecuritySession>
      emptyText="No active sessions found."
      load={async (token) => (await listSecuritySessions(token)).sessions}
      queryKey="active-sessions-page"
      renderItem={(session) => `${session.active ? "Active" : "Revoked"} - ${session.ipAddress ?? "Unknown IP"} - ${new Date(session.lastActivityAt).toLocaleString()}`}
      subtitle="Review concurrent sessions, device details, expiration, and revocation state."
      title="Active Sessions"
    />
  );
}
