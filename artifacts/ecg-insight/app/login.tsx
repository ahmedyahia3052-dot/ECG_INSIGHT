import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { z } from "zod";

import { Badge, Field, medicalTheme, PrimaryButton } from "@/components/enterprise/EnterpriseUI";
import { useAuth } from "@/context/AuthContext";
import { checkBackendHealth } from "@/services/api";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

type ConnectionState = "checking" | "offline" | "online";

export default function LoginScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [connection, setConnection] = useState<ConnectionState>("checking");
  const [connectionMessage, setConnectionMessage] = useState("Checking authentication service...");

  const checkConnection = useCallback(async () => {
    setConnection("checking");
    const health = await checkBackendHealth();
    setConnection(health.ok ? "online" : "offline");
    setConnectionMessage(health.ok ? "Authentication service online." : health.message);
    return health.ok;
  }, []);

  useEffect(() => {
    void checkConnection();
  }, [checkConnection]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) router.replace("/dashboard" as never);
  }, [isAuthenticated, isLoading, router]);

  const submit = async () => {
    setError("");
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid login details.");
      return;
    }
    if (connection !== "online") {
      const online = await checkConnection();
      if (!online) return;
    }
    setSubmitting(true);
    const result = await login(parsed.data.email, parsed.data.password, remember);
    setSubmitting(false);
    if (!result.success) {
      setError(result.error ?? "Login failed.");
      return;
    }
    router.replace("/dashboard" as never);
  };

  return (
    <View style={styles.root}>
      <View style={styles.panel}>
        <View style={styles.brandRow}>
          <View style={styles.logo}><Feather name="activity" size={22} color={medicalTheme.background} /></View>
          <View>
            <Text style={styles.brand}>ECG Insight</Text>
            <Text style={styles.brandSub}>Enterprise Medical AI Platform</Text>
          </View>
        </View>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to your secure ECG workspace.</Text>

        <View style={[styles.connection, connection === "online" ? styles.connectionOnline : styles.connectionOffline]}>
          <Badge label={connection === "checking" ? "Checking" : connection === "online" ? "Server Online" : "Server Offline"} tone={connection === "online" ? "success" : "critical"} />
          <Text style={styles.connectionText}>{connectionMessage}</Text>
        </View>

        <Field autoCapitalize="none" keyboardType="email-address" label="Email Address" onChangeText={setEmail} placeholder="doctor@hospital.com" value={email} />
        <Field label="Password" onChangeText={setPassword} placeholder="Password" secureTextEntry value={password} />
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: remember }} onPress={() => setRemember((value) => !value)} style={styles.rememberRow}>
          <View style={[styles.checkbox, remember && styles.checkboxChecked]}>{remember ? <Feather name="check" size={14} color={medicalTheme.background} /> : null}</View>
          <Text style={styles.rememberText}>Remember Me</Text>
        </Pressable>

        <PrimaryButton disabled={submitting || connection === "checking"} icon="log-in" label={submitting ? "Signing in..." : "Sign In"} onPress={submit} />
        <View style={styles.footerActions}>
          <Pressable onPress={() => router.push("/forgot-password" as never)}><Text style={styles.link}>Forgot password?</Text></Pressable>
          <Pressable onPress={() => router.push("/verify-email" as never)}><Text style={styles.link}>Verify email</Text></Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  brand: { color: medicalTheme.text, fontSize: 20, fontWeight: "900" },
  brandRow: { alignItems: "center", flexDirection: "row", gap: 12 },
  brandSub: { color: medicalTheme.muted, fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  checkbox: { alignItems: "center", borderColor: medicalTheme.border, borderRadius: 6, borderWidth: 1, height: 22, justifyContent: "center", width: 22 },
  checkboxChecked: { backgroundColor: medicalTheme.primary, borderColor: medicalTheme.primary },
  connection: { borderRadius: 14, gap: 8, padding: 12 },
  connectionOffline: { backgroundColor: "#3F1421" },
  connectionOnline: { backgroundColor: "#073A34" },
  connectionText: { color: medicalTheme.text, fontSize: 12, fontWeight: "700" },
  error: { color: medicalTheme.critical, fontSize: 13, fontWeight: "800" },
  footerActions: { flexDirection: "row", justifyContent: "space-between" },
  link: { color: medicalTheme.primary, fontSize: 13, fontWeight: "900" },
  logo: { alignItems: "center", backgroundColor: medicalTheme.primary, borderRadius: 14, height: 44, justifyContent: "center", width: 44 },
  panel: { backgroundColor: medicalTheme.card, borderColor: medicalTheme.border, borderRadius: 24, borderWidth: 1, gap: 16, maxWidth: 520, padding: 22, width: "100%" },
  rememberRow: { alignItems: "center", flexDirection: "row", gap: 10 },
  rememberText: { color: medicalTheme.text, fontSize: 13, fontWeight: "800" },
  root: { alignItems: "center", backgroundColor: medicalTheme.background, flex: 1, justifyContent: "center", padding: 18 },
  subtitle: { color: medicalTheme.muted, fontSize: 14, lineHeight: 21 },
  title: { color: medicalTheme.text, fontSize: 32, fontWeight: "900", letterSpacing: -0.8 },
});
