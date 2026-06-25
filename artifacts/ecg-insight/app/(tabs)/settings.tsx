import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors, useThemePreference, type ThemePreference } from "@/hooks/useColors";
import { BoltButton, BoltCard, BoltHero, BoltNavCard, BoltScreen } from "@/components/bolt/BoltUI";
import { useVisualExperience } from "@/context/VisualExperienceContext";

export default function SettingsScreen() {
  const colors = useColors();
  const { setThemePreference, themePreference } = useThemePreference();
  const { reducedMotionEnabled, settings, updateSettings } = useVisualExperience();
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
      <BoltCard style={styles.card}>
        <Text style={[styles.title, { color: colors.text }]}>Premium Visual Experience</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          Keep clinical readability first while controlling subtle motion, backgrounds, and feedback.
        </Text>
        {[
          { key: "animatedBackgrounds" as const, label: "Animated Medical Backgrounds" },
          { key: "motionEffects" as const, label: "Motion Effects" },
          { key: "haptics" as const, label: "Haptic Feedback" },
          { key: "notificationSounds" as const, label: "Notification Sounds" },
        ].map((item) => (
          <View key={item.key} style={styles.preferenceRow}>
            <View style={styles.preferenceText}>
              <Text style={[styles.preferenceTitle, { color: colors.text }]}>{item.label}</Text>
              {item.key === "motionEffects" && reducedMotionEnabled ? (
                <Text style={[styles.preferenceNote, { color: colors.warning }]}>Reduced motion is enabled at system level.</Text>
              ) : null}
            </View>
            <View style={styles.toggleButton}>
              <BoltButton
                label={settings[item.key] ? "On" : "Off"}
                onPress={() => void updateSettings({ [item.key]: !settings[item.key] })}
                variant={settings[item.key] ? "primary" : "outline"}
              />
            </View>
          </View>
        ))}
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
  description: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19 },
  preferenceNote: { fontFamily: "Inter_600SemiBold", fontSize: 11, marginTop: 3 },
  preferenceRow: { alignItems: "center", flexDirection: "row", gap: 12, justifyContent: "space-between" },
  preferenceText: { flex: 1 },
  preferenceTitle: { fontFamily: "Inter_700Bold", fontSize: 14 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  title: { fontFamily: "Inter_700Bold", fontSize: 18 },
  toggleButton: { minWidth: 82 },
});
