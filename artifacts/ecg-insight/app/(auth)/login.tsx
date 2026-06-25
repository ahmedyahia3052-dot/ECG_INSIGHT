import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { apiConfigurationWarning } from "@/services/env";
import { checkBackendHealth } from "@/services/api";
import {
  BoltBadge,
  BoltButton,
  BoltCard,
  BoltEcgLine,
  BoltField,
  BoltHero,
  BoltScreen,
} from "@/components/bolt/BoltUI";
import { useToast } from "@/components/interaction/PremiumInteraction";

type ConnectionState = "checking" | "online" | "offline" | "misconfigured";

export default function LoginScreen() {
  const colors = useColors();
  const router = useRouter();
  const toast = useToast();
  const { login, oauthLogin, requestPhoneOtp, verifyPhoneOtp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [connectionState, setConnectionState] = useState<ConnectionState>("checking");
  const [connectionMessage, setConnectionMessage] = useState("Checking backend service...");

  const checkConnection = useCallback(async (notify = false) => {
    const warning = apiConfigurationWarning();
    if (warning) {
      setConnectionState("misconfigured");
      setConnectionMessage(warning);
      if (notify) toast.warning("API configuration missing", warning);
      return false;
    }

    setConnectionState("checking");
    setConnectionMessage("Checking backend service...");
    const health = await checkBackendHealth();
    if (health.ok) {
      setConnectionState("online");
      setConnectionMessage("Authentication service online.");
      if (notify) toast.success("Connection restored", "Backend service is reachable.");
      return true;
    }

    setConnectionState("offline");
    setConnectionMessage(health.message);
    if (notify) toast.error("Backend service unavailable", health.message);
    return false;
  }, [toast]);

  useEffect(() => {
    void checkConnection(false);
  }, [checkConnection]);

  const authDisabled = connectionState !== "online";

  async function handleLogin() {
    setError("");
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }
    if (authDisabled) {
      const online = await checkConnection(true);
      if (!online) {
        setError("Authentication service unavailable. Please retry the server connection.");
        return;
      }
    }
    setLoading(true);
    const result = await login(email.trim(), password, true);
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "Login failed.");
      toast.error("Sign-in failed", result.error ?? "Authentication service unavailable.");
      return;
    }
    router.replace("/(tabs)");
  }

  async function handlePhoneOtp() {
    setError("");
    if (!phoneNumber.trim()) {
      setError("Enter your mobile phone number.");
      return;
    }
    if (authDisabled) {
      const online = await checkConnection(true);
      if (!online) {
        setError("Authentication service unavailable. Please retry the server connection.");
        return;
      }
    }
    setLoading(true);
    if (!phoneOtpSent) {
      const result = await requestPhoneOtp(phoneNumber.trim(), "LOGIN");
      setLoading(false);
      if (!result.success) {
        setError(result.error ?? "Unable to send OTP.");
        toast.error("OTP request failed", result.error ?? "Authentication service unavailable.");
        return;
      }
      setPhoneOtp(result.otp ?? "");
      setPhoneOtpSent(true);
      return;
    }
    const result = await verifyPhoneOtp(phoneNumber.trim(), phoneOtp.trim(), true);
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "OTP verification failed.");
      toast.error("OTP verification failed", result.error ?? "Authentication service unavailable.");
      return;
    }
    router.replace("/(tabs)");
  }

  async function handleOAuth(provider: "GOOGLE" | "APPLE" | "MICROSOFT") {
    setError("");
    if (authDisabled) {
      const online = await checkConnection(true);
      if (!online) {
        setError("Authentication service unavailable. Please retry the server connection.");
        return;
      }
    }
    setLoading(true);
    const normalized = provider.toLowerCase();
    const result = await oauthLogin(provider, `${normalized}-local-user`, `${normalized}@ecginsight.local`, `${provider} User`);
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? `${provider} sign-in failed.`);
      toast.error(`${provider} sign-in failed`, result.error ?? "Authentication service unavailable.");
      return;
    }
    router.replace("/(tabs)");
  }

  return (
    <BoltScreen>
      <BoltHero
        eyebrow="Secure clinical workspace"
        subtitle="Sign in with your enterprise ECG Insight account. Authentication stays connected to the existing production API and secure refresh-token flow."
        title="Welcome back"
      />
      <BoltCard style={styles.formCard}>
        <ConnectionStatus
          message={connectionMessage}
          onRetry={() => void checkConnection(true)}
          state={connectionState}
        />
        {error ? (
          <View style={[styles.errorBox, { backgroundColor: colors.destructive + "14" }]}>
            <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
          </View>
        ) : null}
        <Text style={[styles.label, { color: colors.text }]}>Email Address</Text>
        <BoltField icon="mail" keyboardType="email-address" onChangeText={setEmail} placeholder="you@hospital.com" value={email} />
        <Text style={[styles.label, { color: colors.text }]}>Password</Text>
        <BoltField icon="lock" onChangeText={setPassword} placeholder="Password" secureTextEntry value={password} />
        <BoltButton disabled={authDisabled} icon="log-in" label={connectionState === "offline" ? "Server offline" : "Sign In"} loading={loading || connectionState === "checking"} onPress={handleLogin} />
        {authDisabled ? (
          <View style={styles.connectionActions}>
            <BoltButton label="Retry Connection" onPress={() => void checkConnection(true)} variant="outline" />
            <BoltButton label="Check Connection" onPress={() => void checkConnection(true)} variant="ghost" />
          </View>
        ) : null}
        <BoltButton label="Forgot password?" onPress={() => router.push("/(auth)/forgot-password")} variant="ghost" />
      </BoltCard>

      <BoltCard style={styles.formCard}>
        <BoltBadge icon="smartphone" label="Mobile OTP" />
        <BoltField icon="phone" keyboardType="phone-pad" onChangeText={setPhoneNumber} placeholder="+201000000000" value={phoneNumber} />
        {phoneOtpSent ? (
          <BoltField icon="key" keyboardType="number-pad" onChangeText={setPhoneOtp} placeholder="Verification code" value={phoneOtp} />
        ) : null}
        <BoltButton disabled={authDisabled} icon="send" label={phoneOtpSent ? "Verify OTP" : "Send OTP"} loading={loading} onPress={handlePhoneOtp} variant="outline" />
      </BoltCard>

      <BoltCard style={styles.formCard}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Enterprise providers</Text>
        <View style={styles.providerRow}>
          {(["GOOGLE", "APPLE", "MICROSOFT"] as const).map((provider) => (
            <View key={provider} style={styles.providerButton}>
              <BoltButton disabled={authDisabled} label={provider === "MICROSOFT" ? "Microsoft" : provider[0] + provider.slice(1).toLowerCase()} onPress={() => handleOAuth(provider)} variant="outline" />
            </View>
          ))}
        </View>
      </BoltCard>

      <BoltCard style={styles.signupCard}>
        <BoltEcgLine height={42} opacity={0.18} />
        <Text style={[styles.signupTitle, { color: colors.text }]}>New to ECG Insight?</Text>
        <Text style={[styles.signupText, { color: colors.textSecondary }]}>
          Create a secure account and start on the FREE subscription plan.
        </Text>
        <BoltButton icon="user-plus" label="Create Account" onPress={() => router.push("/(auth)/register")} variant="outline" />
      </BoltCard>
    </BoltScreen>
  );
}

function ConnectionStatus({
  message,
  onRetry,
  state,
}: {
  message: string;
  onRetry: () => void;
  state: ConnectionState;
}) {
  const colors = useColors();
  const tone = state === "online" ? "success" : state === "checking" ? "primary" : "danger";
  const title =
    state === "online"
      ? "Server online"
      : state === "checking"
        ? "Checking connection"
        : state === "misconfigured"
          ? "API configuration required"
          : "Server offline";

  return (
    <View style={[styles.connectionBox, { backgroundColor: (state === "online" ? colors.success : state === "checking" ? colors.primary : colors.destructive) + "14" }]}>
      <View style={styles.connectionHeader}>
        <BoltBadge icon={state === "online" ? "wifi" : "wifi-off"} label={title} tone={tone} />
        {state !== "online" ? <BoltButton label="Retry" onPress={onRetry} variant="ghost" /> : null}
      </View>
      <Text style={[styles.connectionText, { color: colors.textSecondary }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  connectionActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  connectionBox: { borderRadius: 14, gap: 8, padding: 12 },
  connectionHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  connectionText: { fontFamily: "Inter_500Medium", fontSize: 12, lineHeight: 18 },
  errorBox: { borderRadius: 12, padding: 12 },
  errorText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  formCard: { gap: 10 },
  label: { fontFamily: "Inter_700Bold", fontSize: 13 },
  providerButton: { flex: 1, minWidth: 96 },
  providerRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  signupCard: { gap: 10 },
  signupText: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  signupTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
});
