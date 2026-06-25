import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useColors, useThemePreference, type ThemePreference } from "@/hooks/useColors";
import { getMySubscription } from "@/services/subscriptions";
import {
  BoltBadge,
  BoltButton,
  BoltCard,
  BoltEmpty,
  BoltHero,
  BoltNavCard,
  BoltScreen,
  BoltStat,
} from "@/components/bolt/BoltUI";

export default function ProfileScreen() {
  const colors = useColors();
  const router = useRouter();
  const { setThemePreference, themePreference } = useThemePreference();
  const { authToken, isImpersonating, logout, stopImpersonation, user } = useAuth();
  const subscriptionQuery = useQuery({
    enabled: !!authToken?.token,
    queryFn: async () => getMySubscription(authToken!.token),
    queryKey: ["bolt-profile-subscription", authToken?.token],
    retry: false,
  });

  if (!user) {
    return (
      <BoltScreen>
        <BoltEmpty
          actionLabel="Sign in"
          message="A user profile is required to display account settings."
          onAction={() => router.replace("/login")}
          title="Profile unavailable"
        />
      </BoltScreen>
    );
  }
  const subscription = subscriptionQuery.data;
  const planLabel = subscription?.lifetimeAccess.granted
    ? "Special Lifetime Access"
    : subscription?.plan.name ?? `${(user.subscriptionTier ?? "free").toUpperCase()} Plan`;

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <BoltScreen>
      {isImpersonating ? (
        <BoltCard style={styles.impersonation}>
          <Text style={[styles.impersonationText, { color: "#92400E" }]}>Impersonation mode is active.</Text>
          <BoltButton label="Stop" onPress={stopImpersonation} variant="outline" />
        </BoltCard>
      ) : null}

      <BoltHero
        eyebrow="Account and settings"
        subtitle="Profile, subscription, security, active sessions, notifications, and theme settings remain connected to existing ECG Insight services."
        title={user.name}
      />

      <BoltCard style={styles.profileCard}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>{user.avatarInitials}</Text>
        </View>
        <View style={styles.profileMain}>
          <Text style={[styles.name, { color: colors.text }]}>{user.name}</Text>
          <Text style={[styles.meta, { color: colors.textSecondary }]}>{user.email}</Text>
          <View style={styles.badgeRow}>
            <BoltBadge icon="shield" label={user.role.replace("_", " ")} />
            {user.emailVerified ? <BoltBadge icon="check-circle" label="Verified" tone="success" /> : <BoltBadge label="Email unverified" tone="warning" />}
          </View>
        </View>
      </BoltCard>

      <View style={styles.statsRow}>
        <BoltStat icon="credit-card" label="Subscription" value={subscriptionQuery.isLoading ? "..." : planLabel} />
        <BoltStat icon="activity" label="Quota Used" value={subscription?.quota.used ?? "Live"} />
      </View>

      <BoltCard highlight style={styles.subscription}>
        <View style={styles.cardHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Subscription</Text>
          <BoltBadge label={subscription?.lifetimeAccess.granted ? "Lifetime" : "Quota active"} tone={subscription?.lifetimeAccess.granted ? "success" : "primary"} />
        </View>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          {subscription?.lifetimeAccess.granted
            ? "Unlimited ECG analyses · No expiration date · granted privately by administrator."
            : `${subscription?.quota.remaining ?? 0} analyses remaining · resets ${subscription?.quota.nextResetAt?.slice(0, 10) ?? "soon"}.`}
        </Text>
      </BoltCard>

      <BoltCard style={styles.settings}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Theme</Text>
        <View style={styles.themeRow}>
          {(["dark", "light", "system"] as ThemePreference[]).map((preference) => (
            <View key={preference} style={styles.themeButton}>
              <BoltButton
                label={preference[0].toUpperCase() + preference.slice(1)}
                onPress={() => void setThemePreference(preference)}
                variant={themePreference === preference ? "primary" : "outline"}
              />
            </View>
          ))}
        </View>
      </BoltCard>

      <BoltNavCard description="MFA, password policy, audit-aware account controls" icon="shield" route="/(tabs)/security-dashboard" title="Security" />
      <BoltNavCard description="Theme, privacy, notification, and application preferences" icon="settings" route="/(tabs)/settings" title="Settings" />
      <BoltNavCard description="Review and revoke active trusted devices" icon="monitor" route="/(tabs)/session-dashboard" title="Active Sessions" />
      <BoltNavCard description="Live notification center and clinical alerts" icon="bell" route="/(tabs)/notification-center" title="Notifications" />
      <BoltNavCard description="Subscription plans, quota, billing and license state" icon="credit-card" route="/(tabs)/subscription" title="Subscription" />
      {user.role === "super_admin" ? (
        <BoltNavCard description="Protected owner/admin features and revenue controls" icon="shield" route="/admin/" title="Admin Dashboard" />
      ) : null}

      <BoltButton icon="log-out" label="Sign Out" onPress={handleLogout} variant="danger" />
    </BoltScreen>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: "center", borderRadius: 28, height: 56, justifyContent: "center", width: 56 },
  avatarText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 18 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  cardHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  impersonation: { alignItems: "center", flexDirection: "row", gap: 10 },
  impersonationText: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 13 },
  meta: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 20 },
  name: { fontFamily: "Inter_700Bold", fontSize: 19 },
  profileCard: { alignItems: "center", flexDirection: "row", gap: 14 },
  profileMain: { flex: 1, gap: 6 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  settings: { gap: 10 },
  statsRow: { flexDirection: "row", gap: 10 },
  subscription: { gap: 8 },
  themeButton: { minWidth: 96 },
  themeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
