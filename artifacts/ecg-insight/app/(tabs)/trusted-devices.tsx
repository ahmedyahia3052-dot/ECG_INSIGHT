import { SecurityListScreen } from "@/components/security/SecurityListScreen";
import { listTrustedDevices, type TrustedDevice } from "@/services/security";

export default function TrustedDevicesScreen() {
  return (
    <SecurityListScreen<TrustedDevice>
      emptyText="No trusted devices registered."
      load={async (token) => (await listTrustedDevices(token)).devices}
      queryKey="trusted-devices-page"
      renderItem={(device) => `${device.deviceName} - ${device.trusted ? "Trusted" : "Revoked"} - ${device.ipAddress ?? "No IP"} - ${new Date(device.lastSeenAt).toLocaleString()}`}
      subtitle="Track device fingerprints, trust state, IP addresses, and revocations."
      title="Trusted Devices"
    />
  );
}
