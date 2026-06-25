import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { BrandLogo, PremiumCard, PremiumScreenBackground } from "@/components/ui/Premium";
import { BoltEcgLoader } from "@/components/bolt/BoltUI";

type Step = "email" | "code" | "password" | "success";

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const { forgotPassword, verifyResetCode, resetPassword } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { flexGrow: 1, justifyContent: "center", padding: 24 },
    header: { alignItems: "center", marginBottom: 32 },
    stepIndicator: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 24,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    icon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.primaryLight,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    iconText: { fontSize: 28 },
    title: {
      fontSize: 24,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 8,
      textAlign: "center",
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 20,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: colors.radius.lg,
      padding: 24,
      marginTop: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    label: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textSecondary,
      marginBottom: 8,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    inputWrapper: {
      backgroundColor: colors.background,
      borderRadius: colors.radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginBottom: 20,
    },
    input: { fontSize: 16, color: colors.text },
    codeRow: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 20,
    },
    codeBox: {
      flex: 1,
      height: 56,
      borderRadius: colors.radius.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
    },
    codeBoxActive: { borderColor: colors.primary },
    codeText: { fontSize: 22, fontWeight: "700", color: colors.text },
    hint: {
      backgroundColor: colors.primaryLight,
      borderRadius: colors.radius.md,
      padding: 12,
      marginBottom: 20,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    hintText: { fontSize: 13, color: colors.primary, flex: 1 },
    error: {
      backgroundColor: "#FEF2F2",
      borderRadius: colors.radius.md,
      padding: 12,
      marginBottom: 16,
    },
    errorText: { color: colors.destructive, fontSize: 13 },
    btn: {
      backgroundColor: colors.primary,
      borderRadius: colors.radius.md,
      height: 52,
      alignItems: "center",
      justifyContent: "center",
    },
    btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
    back: { alignItems: "center", marginTop: 20 },
    backText: { color: colors.primary, fontSize: 14 },
    successIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: "#DCFCE7",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
      alignSelf: "center",
    },
    successTitle: {
      fontSize: 24,
      fontWeight: "700",
      color: colors.text,
      textAlign: "center",
      marginBottom: 12,
    },
    successSub: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 22,
      marginBottom: 32,
    },
  });

  const steps: Step[] = ["email", "code", "password", "success"];

  async function handleEmail() {
    setError("");
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    const ok = await forgotPassword(email);
    setLoading(false);
    if (!ok) {
      setError("No account found with that email address.");
      return;
    }
    setStep("code");
  }

  async function handleCode() {
    setError("");
    if (code.length < 6) {
      setError("Please enter the 6-digit code.");
      return;
    }
    setLoading(true);
    const ok = await verifyResetCode(email, code);
    setLoading(false);
    if (!ok) {
      setError("Invalid code. Try 123456 for the demo.");
      return;
    }
    setStep("password");
  }

  async function handlePassword() {
    setError("");
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    await resetPassword(email, code, newPassword);
    setLoading(false);
    setStep("success");
  }

  if (step === "success") {
    return (
      <View style={styles.container}>
        <PremiumScreenBackground>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.successIcon}>
            <Text style={{ fontSize: 36 }}>✓</Text>
          </View>
          <Text style={styles.successTitle}>Password Reset!</Text>
          <Text style={styles.successSub}>
            Your password has been successfully updated.{"\n"}
            You can now sign in with your new password.
          </Text>
          <Pressable style={styles.btn} onPress={() => router.replace("/(auth)/login")}>
            <Text style={styles.btnText}>Back to Sign In</Text>
          </Pressable>
        </ScrollView>
        </PremiumScreenBackground>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <PremiumScreenBackground>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <BrandLogo />
          <View style={styles.stepIndicator}>
            {(["email", "code", "password"] as Step[]).map((s) => (
              <View
                key={s}
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      steps.indexOf(s) <= steps.indexOf(step)
                        ? colors.primary
                        : colors.border,
                    width: s === step ? 24 : 8,
                  },
                ]}
              />
            ))}
          </View>

          <View style={styles.icon}>
            <Text style={styles.iconText}>
              {step === "email" ? "🔑" : step === "code" ? "📬" : "🔒"}
            </Text>
          </View>

          <Text style={styles.title}>
            {step === "email"
              ? "Forgot Password"
              : step === "code"
              ? "Check Your Email"
              : "New Password"}
          </Text>
          <Text style={styles.subtitle}>
            {step === "email"
              ? "Enter your account email and we'll send\na verification code."
              : step === "code"
              ? `A 6-digit code was sent to\n${email}`
              : "Choose a strong new password."}
          </Text>
        </View>

        <PremiumCard style={styles.card}>
          {error ? (
            <View style={styles.error}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {step === "email" && (
            <>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="you@hospital.com"
                  placeholderTextColor={colors.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoFocus
                />
              </View>
              <Pressable style={styles.btn} onPress={handleEmail} disabled={loading}>
                {loading ? (
                  <BoltEcgLoader compact color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Send Reset Code</Text>
                )}
              </Pressable>
            </>
          )}

          {step === "code" && (
            <>
              <View style={styles.hint}>
                <Text>💡</Text>
                <Text style={styles.hintText}>
                  Demo hint: Use code <Text style={{ fontWeight: "700" }}>123456</Text>
                </Text>
              </View>
              <Text style={styles.label}>Verification Code</Text>
              <TextInput
                style={{
                  height: 56,
                  borderRadius: colors.radius.md,
                  borderWidth: 1.5,
                  borderColor: code.length === 6 ? colors.primary : colors.border,
                  backgroundColor: colors.background,
                  textAlign: "center",
                  fontSize: 28,
                  fontWeight: "700",
                  color: colors.text,
                  letterSpacing: 8,
                  marginBottom: 20,
                }}
                placeholder="• • • • • •"
                placeholderTextColor={colors.textSecondary}
                value={code}
                onChangeText={(t) => setCode(t.replace(/[^0-9]/g, "").slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
              <Pressable style={styles.btn} onPress={handleCode} disabled={loading}>
                {loading ? (
                  <BoltEcgLoader compact color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Verify Code</Text>
                )}
              </Pressable>
            </>
          )}

          {step === "password" && (
            <>
              <Text style={styles.label}>New Password</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Min. 8 characters"
                  placeholderTextColor={colors.textSecondary}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  autoFocus
                />
              </View>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Repeat new password"
                  placeholderTextColor={colors.textSecondary}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
              </View>
              <Pressable
                style={styles.btn}
                onPress={handlePassword}
                disabled={loading}
              >
                {loading ? (
                  <BoltEcgLoader compact color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Reset Password</Text>
                )}
              </Pressable>
            </>
          )}
        </PremiumCard>

        <Pressable style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back to Sign In</Text>
        </Pressable>
      </ScrollView>
      </PremiumScreenBackground>
    </KeyboardAvoidingView>
  );
}
