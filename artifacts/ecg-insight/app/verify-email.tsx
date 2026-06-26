import { useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { z } from "zod";

import { AuthCard, AuthMessage, AuthPrimaryButton, AuthTextField, PremiumAuthShell, premiumAuthTheme } from "@/components/auth/PremiumAuth";
import { useAuth } from "@/context/AuthContext";

const schema = z.object({ email: z.string().email("Enter a valid email address.") });

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { resendVerification } = useAuth();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    setMessage("");
    const parsed = schema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid email.");
      return;
    }
    const result = await resendVerification(parsed.data.email);
    if (!result.success) {
      setError(result.error ?? "Unable to send verification email.");
      return;
    }
    setMessage("Verification request accepted by the authentication service.");
  };

  return (
    <PremiumAuthShell
      eyebrow="Identity assurance"
      subtitle="Request a fresh verification message while preserving the existing email verification backend contract."
      title="Verify your clinical identity."
    >
      <AuthCard>
        <View style={styles.headerBlock}>
          <Text style={styles.title}>Verify Email</Text>
          <Text style={styles.subtitle}>Keep your ECG Insight account trusted for clinical review, reports, audit trails, and collaboration.</Text>
        </View>
        <AuthTextField autoCapitalize="none" icon="mail" keyboardType="email-address" label="Email Address" onChangeText={setEmail} placeholder="doctor@hospital.com" value={email} />
        {error ? <AuthMessage message={error} tone="error" /> : null}
        {message ? <AuthMessage message={message} tone="success" /> : null}
        <AuthPrimaryButton icon="mail" label="Send Verification" onPress={submit} />
        <AuthPrimaryButton label="Back to Login" onPress={() => router.replace("/login" as never)} variant="outline" />
      </AuthCard>
    </PremiumAuthShell>
  );
}

const styles = StyleSheet.create({
  headerBlock: { gap: 8 },
  subtitle: { color: premiumAuthTheme.muted, fontSize: 14, fontWeight: "700", lineHeight: 21 },
  title: { color: premiumAuthTheme.text, fontSize: 30, fontWeight: "900" },
});
