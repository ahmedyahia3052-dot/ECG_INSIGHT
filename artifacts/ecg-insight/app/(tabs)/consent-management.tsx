import { SecurityListScreen } from "@/components/security/SecurityListScreen";
import { listConsents } from "@/services/security";

export default function ConsentManagementScreen() {
  return (
    <SecurityListScreen<Record<string, unknown>>
      emptyText="No consent records found."
      load={async (token) => (await listConsents(token)).consents as Record<string, unknown>[]}
      queryKey="consent-management-page"
      renderItem={(consent) => `${String(consent.consentType ?? "CONSENT")} - ${consent.granted ? "Granted" : "Revoked"} - patient ${String(consent.patientId ?? "unknown")}`}
      subtitle="Review treatment, data processing, occupational health, research, and sharing consent."
      title="Consent Management"
    />
  );
}
