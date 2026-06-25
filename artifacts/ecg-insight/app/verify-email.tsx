import { useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { z } from "zod";

import { Field, medicalTheme, PrimaryButton } from "@/components/enterprise/EnterpriseUI";
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
    <View style={styles.root}>
      <View style={styles.panel}>
        <Text style={styles.title}>Verify Email</Text>
        <Text style={styles.subtitle}>Request a fresh verification message for your ECG Insight account.</Text>
        <Field autoCapitalize="none" keyboardType="email-address" label="Email Address" onChangeText={setEmail} placeholder="doctor@hospital.com" value={email} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {message ? <Text style={styles.message}>{message}</Text> : null}
        <PrimaryButton icon="mail" label="Send Verification" onPress={submit} />
        <PrimaryButton label="Back to Login" onPress={() => router.replace("/login" as never)} variant="outline" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  error: { color: medicalTheme.critical, fontSize: 13, fontWeight: "800" },
  message: { color: medicalTheme.success, fontSize: 13, fontWeight: "800" },
  panel: { backgroundColor: medicalTheme.card, borderColor: medicalTheme.border, borderRadius: 24, borderWidth: 1, gap: 16, maxWidth: 520, padding: 22, width: "100%" },
  root: { alignItems: "center", backgroundColor: medicalTheme.background, flex: 1, justifyContent: "center", padding: 18 },
  subtitle: { color: medicalTheme.muted, fontSize: 14, lineHeight: 21 },
  title: { color: medicalTheme.text, fontSize: 30, fontWeight: "900" },
});
