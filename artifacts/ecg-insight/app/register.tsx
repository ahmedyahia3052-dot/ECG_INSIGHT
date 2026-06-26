import { Feather } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { z } from "zod";

import { AuthCard, AuthMessage, AuthPrimaryButton, AuthTextField, premiumAuthTheme, PremiumAuthShell } from "@/components/auth/PremiumAuth";
import { useAuth, type UserRole } from "@/context/AuthContext";

type RegistrationRole = {
  apiRole: Extract<UserRole, "admin" | "doctor" | "student" | "user">;
  label: "Administrator" | "Cardiologist" | "Doctor" | "Medical Student" | "Resident";
  specialization: string;
};

const roleOptions: RegistrationRole[] = [
  { apiRole: "doctor", label: "Doctor", specialization: "Doctor" },
  { apiRole: "doctor", label: "Cardiologist", specialization: "Cardiologist" },
  { apiRole: "doctor", label: "Resident", specialization: "Resident" },
  { apiRole: "student", label: "Medical Student", specialization: "Medical Student" },
  { apiRole: "admin", label: "Administrator", specialization: "Administrator" },
];

const registerSchema = z.object({
  confirmPassword: z.string().min(1, "Confirm your password."),
  email: z.string().trim().min(1, "Email is required.").email("Enter a valid email address."),
  fullName: z.string().trim().min(2, "Full name is required."),
  password: z.string().min(12, "Password must be at least 12 characters.").regex(/[A-Z]/, "Password must include an uppercase letter.").regex(/[a-z]/, "Password must include a lowercase letter.").regex(/\d/, "Password must include a number.").regex(/[^A-Za-z0-9]/, "Password must include a symbol."),
}).refine((value) => value.password === value.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

export default function RegisterScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading, register } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<RegistrationRole>(roleOptions[0]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) router.replace("/dashboard" as never);
  }, [isAuthenticated, isLoading, router]);

  const submit = async () => {
    setError("");
    const parsed = registerSchema.safeParse({ confirmPassword, email, fullName, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Registration details are invalid.");
      return;
    }

    setSubmitting(true);
    const result = await register(
      parsed.data.fullName,
      parsed.data.email,
      parsed.data.password,
      role.apiRole,
      undefined,
      role.label,
      role.specialization,
    );
    setSubmitting(false);

    if (!result.success) {
      setError(result.error ?? "Registration failed.");
      return;
    }

    router.replace("/dashboard" as never);
  };

  return (
    <PremiumAuthShell
      subtitle="Create your secure ECG Insight workspace account."
      title="Create Account"
    >
      <AuthCard>
        <View style={styles.header}>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>All fields are persisted to your user profile.</Text>
        </View>

        <AuthTextField icon="user" label="Full Name" onChangeText={setFullName} placeholder="Dr. Sarah Morgan" value={fullName} />
        <AuthTextField autoCapitalize="none" icon="mail" keyboardType="email-address" label="Email" onChangeText={setEmail} placeholder="name@organization.com" value={email} />

        <View style={styles.roleGrid}>
          {roleOptions.map((item) => (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: role.label === item.label }}
              key={item.label}
              onPress={() => setRole(item)}
              style={[styles.roleButton, role.label === item.label && styles.roleButtonActive]}
            >
              <Text style={[styles.roleText, role.label === item.label && styles.roleTextActive]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        <AuthTextField
          icon="lock"
          label="Password"
          onChangeText={setPassword}
          placeholder="12+ characters, number, symbol"
          right={(
            <Pressable accessibilityLabel={showPassword ? "Hide password" : "Show password"} accessibilityRole="button" onPress={() => setShowPassword((value) => !value)}>
              <Feather name={showPassword ? "eye-off" : "eye"} size={17} color={premiumAuthTheme.muted} />
            </Pressable>
          )}
          secureTextEntry={!showPassword}
          value={password}
        />

        <AuthTextField
          icon="shield"
          label="Confirm Password"
          onChangeText={setConfirmPassword}
          placeholder="Re-enter password"
          right={(
            <Pressable accessibilityLabel={showConfirmPassword ? "Hide confirmed password" : "Show confirmed password"} accessibilityRole="button" onPress={() => setShowConfirmPassword((value) => !value)}>
              <Feather name={showConfirmPassword ? "eye-off" : "eye"} size={17} color={premiumAuthTheme.muted} />
            </Pressable>
          )}
          secureTextEntry={!showConfirmPassword}
          value={confirmPassword}
        />

        {error ? <AuthMessage message={error} tone="error" /> : null}

        <AuthPrimaryButton disabled={submitting} icon="user-plus" label={submitting ? "Creating account..." : "Create Account"} onPress={submit} />

        <Text style={styles.createText}>
          Already have an account? <Link href="/login" style={styles.link}>Sign In</Link>
        </Text>
      </AuthCard>
    </PremiumAuthShell>
  );
}

const styles = StyleSheet.create({
  createText: { color: premiumAuthTheme.muted, fontSize: 13, fontWeight: "700", textAlign: "center" },
  header: { gap: 6 },
  link: { color: premiumAuthTheme.cyan, fontSize: 13, fontWeight: "900" },
  roleButton: { borderColor: premiumAuthTheme.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9 },
  roleButtonActive: { backgroundColor: "rgba(34,211,238,0.16)", borderColor: "rgba(34,211,238,0.54)" },
  roleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  roleText: { color: premiumAuthTheme.muted, fontSize: 12, fontWeight: "900" },
  roleTextActive: { color: premiumAuthTheme.text },
  subtitle: { color: premiumAuthTheme.muted, fontSize: 14, fontWeight: "700", lineHeight: 20 },
  title: { color: premiumAuthTheme.text, fontSize: 28, fontWeight: "900", letterSpacing: -0.7 },
});
