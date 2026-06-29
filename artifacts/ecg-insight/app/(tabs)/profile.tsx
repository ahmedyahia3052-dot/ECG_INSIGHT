import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
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
  const { authToken, isImpersonating, logout, stopImpersonation, updateProfile, user } = useAuth();
  const [department, setDepartment] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [institution, setInstitution] = useState("");
  const [organizationCountry, setOrganizationCountry] = useState("");
  const [organizationEmail, setOrganizationEmail] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [organizationType, setOrganizationType] = useState("");
  const [positionTitle, setPositionTitle] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const subscriptionQuery = useQuery({
    enabled: !!authToken?.token,
    queryFn: async () => getMySubscription(authToken!.token),
    queryKey: ["bolt-profile-subscription", authToken?.token],
    retry: false,
  });

  useEffect(() => {
    setDepartment(user?.department ?? "");
    setEmployeeId(user?.employeeId ?? "");
    setInstitution(user?.institution ?? "");
    setOrganizationCountry(user?.organizationCountry ?? "");
    setOrganizationEmail(user?.organizationEmail ?? "");
    setOrganizationName(user?.organizationName ?? user?.institution ?? "");
    setOrganizationType(user?.organizationType ?? "");
    setPositionTitle(user?.positionTitle ?? "");
  }, [user?.department, user?.employeeId, user?.institution, user?.organizationCountry, user?.organizationEmail, user?.organizationName, user?.organizationType, user?.positionTitle]);

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

  async function handleSaveProfile() {
    setSavingProfile(true);
    setProfileMessage("");
    const result = await updateProfile({
      department: department.trim() || null,
      employeeId: employeeId.trim() || null,
      institution: institution.trim() || null,
      organizationCountry: organizationCountry.trim() || null,
      organizationEmail: organizationEmail.trim() || null,
      organizationName: organizationName.trim() || null,
      organizationType: organizationType.trim() || null,
      positionTitle: positionTitle.trim() || null,
    });
    setSavingProfile(false);
    setProfileMessage(result.success ? "Profile details saved." : result.error ?? "Profile update failed.");
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

      <BoltCard style={styles.settings}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Organization Profile</Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>Account type: {user.accountType?.replace(/_/g, " ") ?? "INDIVIDUAL"}</Text>
        <View style={styles.formGrid}>
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Organization / Institution</Text>
            <TextInput onChangeText={(value) => { setInstitution(value); setOrganizationName(value); }} placeholder="Organization" placeholderTextColor={colors.textSecondary} style={[styles.input, { borderColor: colors.border, color: colors.text }]} value={organizationName || institution} />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Organization Type</Text>
            <TextInput onChangeText={setOrganizationType} placeholder="Hospital" placeholderTextColor={colors.textSecondary} style={[styles.input, { borderColor: colors.border, color: colors.text }]} value={organizationType} />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Organization Email</Text>
            <TextInput autoCapitalize="none" keyboardType="email-address" onChangeText={setOrganizationEmail} placeholder="admin@hospital.org" placeholderTextColor={colors.textSecondary} style={[styles.input, { borderColor: colors.border, color: colors.text }]} value={organizationEmail} />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Department</Text>
            <TextInput onChangeText={setDepartment} placeholder="Cardiology" placeholderTextColor={colors.textSecondary} style={[styles.input, { borderColor: colors.border, color: colors.text }]} value={department} />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Position / Job Title</Text>
            <TextInput onChangeText={setPositionTitle} placeholder="Consultant Cardiologist" placeholderTextColor={colors.textSecondary} style={[styles.input, { borderColor: colors.border, color: colors.text }]} value={positionTitle} />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Country</Text>
            <TextInput onChangeText={setOrganizationCountry} placeholder="United States" placeholderTextColor={colors.textSecondary} style={[styles.input, { borderColor: colors.border, color: colors.text }]} value={organizationCountry} />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Employee ID</Text>
            <TextInput onChangeText={setEmployeeId} placeholder="EMP-1042" placeholderTextColor={colors.textSecondary} style={[styles.input, { borderColor: colors.border, color: colors.text }]} value={employeeId} />
          </View>
        </View>
        {profileMessage ? <Text style={[styles.meta, { color: colors.textSecondary }]}>{profileMessage}</Text> : null}
        <BoltButton label={savingProfile ? "Saving..." : "Save Profile Details"} onPress={handleSaveProfile} variant="outline" />
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
  fieldGroup: { flex: 1, gap: 6, minWidth: 220 },
  fieldLabel: { fontFamily: "Inter_700Bold", fontSize: 12 },
  formGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  impersonation: { alignItems: "center", flexDirection: "row", gap: 10 },
  impersonationText: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 13 },
  meta: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 20 },
  name: { fontFamily: "Inter_700Bold", fontSize: 19 },
  profileCard: { alignItems: "center", flexDirection: "row", gap: 14 },
  profileMain: { flex: 1, gap: 6 },
  input: { borderRadius: 14, borderWidth: 1, fontFamily: "Inter_600SemiBold", fontSize: 14, paddingHorizontal: 12, paddingVertical: 10 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  settings: { gap: 10 },
  statsRow: { flexDirection: "row", gap: 10 },
  subscription: { gap: 8 },
  themeButton: { minWidth: 96 },
  themeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
