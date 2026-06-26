import { useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { z } from "zod";

import { AuthCard, AuthMessage, AuthPrimaryButton, AuthTextField, PremiumAuthShell, premiumAuthTheme } from "@/components/auth/PremiumAuth";
import { useAuth } from "@/context/AuthContext";

const schema = z.object({ email: z.string().email("Enter a valid email address.") });
const resetSchema = z.object({
  code: z.string().trim().min(6, "Enter the reset code."),
  password: z.string().min(12, "Password must be at least 12 characters."),
});

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { forgotPassword, resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"request" | "reset">("request");

  const submit = async () => {
    setError("");
    setMessage("");
    const parsed = schema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid email.");
      return;
    }
    setLoading(true);
    try {
      await forgotPassword(parsed.data.email);
      setMessage("Password reset instructions were generated. Continue with the reset code sent by the server.");
      setStep("reset");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to start password reset.");
    } finally {
      setLoading(false);
    }
  };

  const completeReset = async () => {
    setError("");
    setMessage("");
    const parsedEmail = schema.safeParse({ email });
    const parsedReset = resetSchema.safeParse({ code, password });
    if (!parsedEmail.success || !parsedReset.success) {
      setError(parsedEmail.error?.issues[0]?.message ?? parsedReset.error?.issues[0]?.message ?? "Reset details are invalid.");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(parsedEmail.data.email, parsedReset.data.code, parsedReset.data.password);
      setMessage("Password reset completed. You can sign in with your new password.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PremiumAuthShell
      eyebrow="Account recovery"
      subtitle="Recover access through the existing secure reset-token workflow with enterprise audit visibility."
      title="Restore access without weakening security."
    >
      <AuthCard>
        <View style={styles.headerBlock}>
          <Text style={styles.title}>Forgot Password</Text>
          <Text style={styles.subtitle}>Request reset instructions, then confirm the code and set a new compliant password.</Text>
        </View>
        <View style={styles.stepRow}>
          <Text style={[styles.stepPill, step === "request" && styles.stepPillActive]}>1. Request</Text>
          <Text style={[styles.stepPill, step === "reset" && styles.stepPillActive]}>2. Reset</Text>
        </View>
        <AuthTextField autoCapitalize="none" icon="mail" keyboardType="email-address" label="Email Address" onChangeText={setEmail} placeholder="doctor@hospital.com" value={email} />
        {step === "reset" ? (
          <>
            <AuthTextField icon="key" label="Reset code" onChangeText={setCode} placeholder="Server reset token or emailed code" value={code} />
            <AuthTextField icon="lock" label="New password" onChangeText={setPassword} placeholder="12+ characters with symbol" secureTextEntry value={password} />
          </>
        ) : null}
        {error ? <AuthMessage message={error} tone="error" /> : null}
        {message ? <AuthMessage message={message} tone="success" /> : null}
        {step === "request" ? (
          <AuthPrimaryButton disabled={loading} icon="send" label={loading ? "Sending..." : "Send Reset Instructions"} onPress={submit} />
        ) : (
          <AuthPrimaryButton disabled={loading} icon="shield" label={loading ? "Resetting..." : "Reset Password"} onPress={completeReset} />
        )}
        <AuthPrimaryButton label="Back to Login" onPress={() => router.replace("/login" as never)} variant="outline" />
      </AuthCard>
    </PremiumAuthShell>
  );
}

const styles = StyleSheet.create({
  headerBlock: { gap: 8 },
  stepPill: { borderColor: premiumAuthTheme.border, borderRadius: 999, borderWidth: 1, color: premiumAuthTheme.muted, fontSize: 12, fontWeight: "900", overflow: "hidden", paddingHorizontal: 12, paddingVertical: 8 },
  stepPillActive: { backgroundColor: "rgba(34,211,238,0.16)", color: premiumAuthTheme.text },
  stepRow: { flexDirection: "row", gap: 10 },
  subtitle: { color: premiumAuthTheme.muted, fontSize: 14, fontWeight: "700", lineHeight: 21 },
  title: { color: premiumAuthTheme.text, fontSize: 30, fontWeight: "900" },
});
