import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { Badge, Card, medicalTheme, PageSection, PrimaryButton, roleLabel, SectionHeader } from "@/components/enterprise/EnterpriseUI";
import { useAuth } from "@/context/AuthContext";

export default function ProfileScreen() {
  const router = useRouter();
  const { authToken, isImpersonating, logout, user } = useAuth();

  return (
    <PageSection>
      <Card style={styles.hero}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{user?.avatarInitials ?? "DR"}</Text></View>
        <View style={styles.main}>
          <Text style={styles.title}>{user?.name ?? "Clinical User"}</Text>
          <Text style={styles.meta}>{user?.email ?? "No email"} • {roleLabel(user?.role)}</Text>
          <View style={styles.badges}>
            <Badge label={user?.emailVerified ? "Email Verified" : "Email Pending"} tone={user?.emailVerified ? "success" : "warning"} />
            <Badge label={user?.isLifetime ? "Lifetime Premium" : user?.subscriptionTier ?? "Subscription"} tone="primary" />
            {isImpersonating ? <Badge label="Impersonating" tone="warning" /> : null}
          </View>
        </View>
        <PrimaryButton icon="log-out" label="Logout" onPress={() => void logout().then(() => router.replace("/login" as never))} variant="danger" />
      </Card>

      <View style={styles.grid}>
        <Card style={styles.panel}>
          <SectionHeader title="Account" />
          <Info label="Role" value={roleLabel(user?.role)} />
          <Info label="Institution" value={user?.institution ?? "Not recorded"} />
          <Info label="Specialization" value={user?.specialization ?? "Not recorded"} />
          <Info label="Username" value={user?.username ?? "Not recorded"} />
        </Card>
        <Card style={styles.panel}>
          <SectionHeader title="Secure Session" />
          <Info label="Access Token" value={authToken?.token ? "Active" : "Missing"} />
          <Info label="Expires At" value={authToken?.expiresAt ? new Date(authToken.expiresAt).toLocaleString() : "Not available"} />
          <Info label="Protected Owner" value={user?.protectedOwner ? "Yes" : "No"} />
          <Info label="Account Status" value={user?.isActive === false ? "Inactive" : "Active"} />
        </Card>
      </View>
    </PageSection>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.info}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: "center", backgroundColor: "#123B4A", borderRadius: 24, height: 76, justifyContent: "center", width: 76 },
  avatarText: { color: medicalTheme.primary, fontSize: 23, fontWeight: "900" },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  hero: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 16 },
  info: { borderBottomColor: medicalTheme.border, borderBottomWidth: 1, gap: 3, paddingVertical: 10 },
  infoLabel: { color: medicalTheme.muted, fontSize: 12, fontWeight: "800" },
  infoValue: { color: medicalTheme.text, fontSize: 14, fontWeight: "800" },
  main: { flex: 1, minWidth: 250 },
  meta: { color: medicalTheme.muted, fontSize: 13, fontWeight: "700" },
  panel: { flex: 1, gap: 8, minWidth: 300 },
  title: { color: medicalTheme.text, fontSize: 30, fontWeight: "900" },
});
