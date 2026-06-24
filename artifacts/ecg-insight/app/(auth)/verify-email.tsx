import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/services/api";
import { useColors } from "@/hooks/useColors";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

export default function VerifyEmailScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const { resendVerification } = useAuth();
  const [email, setEmail] = useState(params.email ?? "");
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("Check your email for the verification token.");
  const [loading, setLoading] = useState(false);

  async function handleVerify() {
    setLoading(true);
    try {
      await apiRequest<void>("/auth/verify-email", {
        body: JSON.stringify({ email, token }),
        method: "POST",
      });
      setMessage("Email verified. You can now sign in.");
      router.replace("/(auth)/login");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Verification failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setLoading(true);
    const result = await resendVerification(email);
    setLoading(false);
    if (!result.success) {
      setMessage(result.error ?? "Unable to resend verification.");
      return;
    }
    if (result.token) setToken(result.token);
    setMessage("Verification email resent.");
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Verify Email</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{message}</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text }]}
          placeholder="you@hospital.com"
          placeholderTextColor={colors.textSecondary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text }]}
          placeholder="Verification token"
          placeholderTextColor={colors.textSecondary}
          value={token}
          onChangeText={setToken}
          autoCapitalize="none"
        />
        <Pressable style={[styles.primary, { backgroundColor: colors.primary }]} onPress={handleVerify} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Verify Email</Text>}
        </Pressable>
        <Pressable style={[styles.secondary, { borderColor: colors.primary }]} onPress={handleResend} disabled={loading}>
          <Text style={[styles.secondaryText, { color: colors.primary }]}>Resend Verification Email</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, gap: 14, padding: 22, width: "100%" },
  container: { flexGrow: 1, justifyContent: "center", padding: 24 },
  input: { borderRadius: 12, borderWidth: 1, fontSize: 15, padding: 14 },
  primary: { alignItems: "center", borderRadius: 12, paddingVertical: 14 },
  primaryText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  secondary: { alignItems: "center", borderRadius: 12, borderWidth: 1, paddingVertical: 12 },
  secondaryText: { fontSize: 14, fontWeight: "700" },
  subtitle: { fontSize: 14, lineHeight: 20 },
  title: { fontSize: 24, fontWeight: "800" },
});
