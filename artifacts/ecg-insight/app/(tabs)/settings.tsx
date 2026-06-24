import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors, useThemePreference, type ThemePreference } from "@/hooks/useColors";
import { BoltButton, BoltCard, BoltHero, BoltNavCard, BoltScreen } from "@/components/bolt/BoltUI";

export default function SettingsScreen() {
  const colors = useColors();
  const { setThemePreference, themePreference } = useThemePreference();
  return (
    <BoltScreen>
      <BoltHero
        eyebrow="Application settings"
        subtitle="Bolt-inspired settings surface using the existing theme persistence, security, privacy, sessions, and notification routes."
        title="Settings"
      />
      <BoltCard style={styles.card}>
        <Text style={[styles.title, { color: colors.text }]}>Theme Preference</Text>
        <View style={styles.row}>
          {(["dark", "light", "system"] as ThemePreference[]).map((preference) => (
            <View key={preference} style={styles.button}>
              <BoltButton
                label={preference[0].toUpperCase() + preference.slice(1)}
                onPress={() => void setThemePreference(preference)}
                variant={themePreference === preference ? "primary" : "outline"}
              />
            </View>
          ))}
        </View>
      </BoltCard>
      <BoltNavCard description="MFA, session, password, and account protection controls" icon="shield" route="/(tabs)/security-dashboard" title="Security" />
      <BoltNavCard description="Review active devices and revoke sessions" icon="monitor" route="/(tabs)/session-dashboard" title="Active Sessions" />
      <BoltNavCard description="Notification center and clinical alert preferences" icon="bell" route="/(tabs)/notification-center" title="Notifications" />
      <BoltNavCard description="Subscription, quota, billing and license status" icon="credit-card" route="/(tabs)/subscription" title="Subscription" />
      <BoltNavCard description="HIPAA/GDPR compliance dashboards and audit tooling" icon="lock" route="/(tabs)/compliance-dashboard" title="Privacy and Compliance" />
    </BoltScreen>
  );
}

const styles = StyleSheet.create({
  button: { minWidth: 98 },
  card: { gap: 12 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  title: { fontFamily: "Inter_700Bold", fontSize: 18 },
});
