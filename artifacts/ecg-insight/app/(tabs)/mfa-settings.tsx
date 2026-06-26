import { SecurityListScreen } from "@/components/security/SecurityListScreen";
import { listMfaMethods, type MfaMethod } from "@/services/security";

export default function MfaSettingsScreen() {
  return (
    <SecurityListScreen<MfaMethod>
      emptyText="No MFA methods configured."
      load={async (token) => (await listMfaMethods(token)).methods}
      queryKey="mfa-settings-page"
      renderItem={(method) => `${method.type} - ${method.enabled ? "Enabled" : "Pending"} - verified ${method.verifiedAt ? new Date(method.verifiedAt).toLocaleString() : "not yet"}`}
      subtitle="Manage authenticator apps, email OTP backup methods, and recovery-code lifecycle."
      title="MFA Settings"
    />
  );
}
