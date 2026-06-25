import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { BrandLogo, PremiumCard, PremiumScreenBackground } from "@/components/ui/Premium";
import { BoltEcgLoader } from "@/components/bolt/BoltUI";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

export default function ResetPasswordScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; token?: string }>();
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState(params.email ?? "");
  const [token, setToken] = useState(params.token ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("Enter your reset token and a new strong password.");
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    setLoading(true);
    try {
      await resetPassword(email, token, newPassword);
      setMessage("Password reset complete.");
      router.replace("/(auth)/login");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Password reset failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PremiumScreenBackground>
    <ScrollView contentContainerStyle={styles.container}>
      <PremiumCard style={styles.card}>
        <BrandLogo />
        <Text style={[styles.title, { color: colors.text }]}>Reset Password</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{message}</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text }]}
          placeholder="Email"
          placeholderTextColor={colors.textSecondary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text }]}
          placeholder="Reset token"
          placeholderTextColor={colors.textSecondary}
          value={token}
          onChangeText={setToken}
          autoCapitalize="none"
        />
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text }]}
          placeholder="New password"
          placeholderTextColor={colors.textSecondary}
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
        />
        <Pressable style={[styles.primary, { backgroundColor: colors.primary }]} onPress={handleReset} disabled={loading}>
          {loading ? <BoltEcgLoader compact color="#fff" /> : <Text style={styles.primaryText}>Reset Password</Text>}
        </Pressable>
      </PremiumCard>
    </ScrollView>
    </PremiumScreenBackground>
  );
}

const styles = StyleSheet.create({
  card: { gap: 14, padding: 22, width: "100%" },
  container: { flexGrow: 1, justifyContent: "center", padding: 24 },
  input: { borderRadius: 12, borderWidth: 1, fontSize: 15, padding: 14 },
  primary: { alignItems: "center", borderRadius: 12, paddingVertical: 14 },
  primaryText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  subtitle: { fontSize: 14, lineHeight: 20 },
  title: { fontSize: 24, fontWeight: "800" },
});
