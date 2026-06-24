import { useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { UserRole, useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { BoltBadge, BoltButton, BoltCard, BoltField, BoltHero, BoltScreen } from "@/components/bolt/BoltUI";

type RegisterRole = Extract<UserRole, "corporate_client" | "doctor" | "user">;

export default function RegisterScreen() {
  const colors = useColors();
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<RegisterRole>("user");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister() {
    setError("");
    if (!name.trim()) {
      setError("Full name is required.");
      return;
    }
    if (!email.trim() && !phoneNumber.trim()) {
      setError("Email or mobile phone is required.");
      return;
    }
    if (email.trim() && (!password || passwordScore(password) < 4)) {
      setError("Use a strong password with 12+ characters, mixed case, number, and symbol.");
      return;
    }
    setLoading(true);
    const result = await register(name.trim(), email.trim(), password, role, phoneNumber.trim() || undefined);
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "Registration failed.");
      return;
    }
    router.replace(email.trim() ? `/(auth)/verify-email?email=${encodeURIComponent(email.trim())}` : "/(auth)/login");
  }

  const score = passwordScore(password);

  return (
    <BoltScreen>
      <BoltHero
        eyebrow="Start on the FREE plan"
        subtitle="Create a real ECG Insight account using the existing authentication API. Subscription assignment, verification, quota, and security policies remain backend controlled."
        title="Create your account"
      />
      <BoltCard style={styles.form}>
        {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
        <Text style={[styles.label, { color: colors.text }]}>Full Name</Text>
        <BoltField icon="user" onChangeText={setName} placeholder="Dr. Jane Smith" value={name} />
        <Text style={[styles.label, { color: colors.text }]}>Email Address</Text>
        <BoltField icon="mail" keyboardType="email-address" onChangeText={setEmail} placeholder="you@hospital.com" value={email} />
        <Text style={[styles.label, { color: colors.text }]}>Mobile Phone</Text>
        <BoltField icon="phone" keyboardType="phone-pad" onChangeText={setPhoneNumber} placeholder="+201000000000" value={phoneNumber} />
        <Text style={[styles.label, { color: colors.text }]}>Password</Text>
        <BoltField icon="lock" onChangeText={setPassword} placeholder="12+ chars, mixed complexity" secureTextEntry value={password} />
        <View style={styles.strengthRow}>
          {[0, 1, 2, 3, 4].map((item) => (
            <View
              key={item}
              style={[
                styles.strengthBar,
                { backgroundColor: item < score ? strengthColor(score) : colors.border },
              ]}
            />
          ))}
        </View>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Password policy is enforced by the existing backend security platform.
        </Text>
      </BoltCard>

      <BoltCard style={styles.form}>
        <Text style={[styles.label, { color: colors.text }]}>Account Type</Text>
        {([
          ["user", "Individual User", "Personal ECG analysis workspace"],
          ["doctor", "Doctor / Clinician", "Clinical review and reporting"],
          ["corporate_client", "Corporate Client", "Team and enterprise access"],
        ] as const).map(([value, title, description]) => {
          const active = role === value;
          return (
            <View key={value} style={styles.roleWrapper}>
              <BoltButton
                icon={value === "doctor" ? "briefcase" : value === "corporate_client" ? "users" : "user"}
                label={title}
                onPress={() => setRole(value)}
                variant={active ? "primary" : "outline"}
              />
              <Text style={[styles.roleDescription, { color: colors.textSecondary }]}>{description}</Text>
            </View>
          );
        })}
        <BoltBadge icon="shield" label="Owner and admin privileges cannot be self-assigned" tone="warning" />
      </BoltCard>

      <BoltButton icon="user-plus" label="Create Account" loading={loading} onPress={handleRegister} />
      <BoltButton label="Already have an account? Sign in" onPress={() => router.replace("/(auth)/login")} variant="ghost" />
    </BoltScreen>
  );
}

function passwordScore(password: string) {
  return [
    password.length >= 12,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;
}

function strengthColor(score: number) {
  if (score <= 2) return "#DC2626";
  if (score <= 4) return "#D97706";
  return "#059669";
}

const styles = StyleSheet.create({
  error: { fontFamily: "Inter_700Bold", fontSize: 13 },
  form: { gap: 10 },
  hint: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 18 },
  label: { fontFamily: "Inter_700Bold", fontSize: 13 },
  roleDescription: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 17, marginLeft: 2 },
  roleWrapper: { gap: 5 },
  strengthBar: { borderRadius: 999, flex: 1, height: 5 },
  strengthRow: { flexDirection: "row", gap: 5 },
});
