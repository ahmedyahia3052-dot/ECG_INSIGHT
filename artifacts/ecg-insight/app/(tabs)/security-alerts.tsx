import { SecurityListScreen } from "@/components/security/SecurityListScreen";
import { listSecurityEvents, type SecurityEvent } from "@/services/security";

export default function SecurityAlertsScreen() {
  return (
    <SecurityListScreen<SecurityEvent>
      emptyText="No security alerts found."
      load={async (token) => (await listSecurityEvents(token)).events}
      queryKey="security-alerts-page"
      renderItem={(event) => `${event.severity} - ${event.eventType} - ${event.message}`}
      subtitle="Failed login, suspicious behavior, request signature, CSRF, device, and key rotation alerts."
      title="Security Alerts"
    />
  );
}
