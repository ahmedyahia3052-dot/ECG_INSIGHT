import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

type DemoRole = "Doctor" | "Student" | "Admin" | "Super Admin";

const DEMO_ACCOUNTS: Record<DemoRole, { email: string; icon: string; color: string }> = {
  Doctor: { email: "doctor@ecginsight.com", icon: "🩺", color: "#0D9488" },
  Student: { email: "student@ecginsight.com", icon: "📚", color: "#8B5CF6" },
  Admin: { email: "admin@ecginsight.com", icon: "⚙️", color: "#06B6D4" },
  "Super Admin": { email: "super@ecginsight.com", icon: "🛡️", color: "#DC2626" },
};

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const handleLogin = async () => {
    setError("");
    if (!email.trim()) { setError("Email is required."); return; }
    if (!email.includes("@")) { setError("Enter a valid email address."); return; }
    if (!password) { setError("Password is required."); return; }

    setLoading(true);
    const result = await login(email.trim(), password, rememberMe);
    setLoading(false);

    if (!result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(result.error ?? "Login failed. Please try again.");
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const fillDemo = (role: DemoRole) => {
    setEmail(DEMO_ACCOUNTS[role].email);
    setPassword("password");
    setError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topInset + 24, paddingBottom: bottomInset + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.logo, { backgroundColor: colors.primary }]}>
            <Feather name="activity" size={30} color="#fff" />
          </View>
          <Text style={[styles.brand, { color: colors.text }]}>ECG Insight</Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]}>
            AI-Powered ECG Interpretation
          </Text>
        </View>

        {/* Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>Welcome back</Text>
          <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
            Sign in to your clinical account
          </Text>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: colors.destructive + "15" }]}>
              <Feather name="alert-circle" size={14} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
            </View>
          ) : null}

          {/* Email */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Email</Text>
            <View
              style={[
                styles.inputWrap,
                {
                  backgroundColor: colors.background,
                  borderColor: emailFocused ? colors.primary : colors.border,
                },
              ]}
            >
              <Feather name="mail" size={16} color={colors.textSecondary} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="you@hospital.com"
                placeholderTextColor={colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Password</Text>
            <View
              style={[
                styles.inputWrap,
                {
                  backgroundColor: colors.background,
                  borderColor: passwordFocused ? colors.primary : colors.border,
                },
              ]}
            >
              <Feather name="lock" size={16} color={colors.textSecondary} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="••••••••"
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
              />
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                <Feather
                  name={showPassword ? "eye-off" : "eye"}
                  size={16}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Remember me + Forgot password */}
          <View style={styles.optionsRow}>
            <Pressable
              style={styles.checkRow}
              onPress={() => {
                setRememberMe((v) => !v);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: rememberMe ? colors.primary : colors.border,
                    backgroundColor: rememberMe ? colors.primary : "transparent",
                  },
                ]}
              >
                {rememberMe && (
                  <Feather name="check" size={10} color="#fff" />
                )}
              </View>
              <Text style={[styles.checkLabel, { color: colors.textSecondary }]}>
                Remember me
              </Text>
            </Pressable>

            <TouchableOpacity onPress={() => router.push("/(auth)/forgot-password")}>
              <Text style={[styles.forgotLink, { color: colors.primary }]}>
                Forgot password?
              </Text>
            </TouchableOpacity>
          </View>

          {/* Sign In Button */}
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary, opacity: loading ? 0.8 : 1 }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="log-in" size={16} color="#fff" />
                <Text style={styles.btnText}>Sign In</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Demo accounts */}
        <View style={[styles.demoBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.demoTitle, { color: colors.textSecondary }]}>Demo Accounts</Text>
          <View style={styles.demoGrid}>
            {(Object.keys(DEMO_ACCOUNTS) as DemoRole[]).map((role) => {
              const acc = DEMO_ACCOUNTS[role];
              const isSelected = email === acc.email;
              return (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.demoChip,
                    {
                      backgroundColor: isSelected ? acc.color + "20" : colors.background,
                      borderColor: isSelected ? acc.color : colors.border,
                    },
                  ]}
                  onPress={() => fillDemo(role)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.demoChipIcon}>{acc.icon}</Text>
                  <Text
                    style={[
                      styles.demoChipText,
                      { color: isSelected ? acc.color : colors.textSecondary },
                    ]}
                  >
                    {role}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[styles.demoHint, { color: colors.textSecondary }]}>
            Password for all accounts: <Text style={{ fontWeight: "700" }}>password</Text>
          </Text>
        </View>

        {/* Register */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Don&apos;t have an account?{" "}
          </Text>
          <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
            <Text style={[styles.link, { color: colors.primary }]}>Register</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 20, gap: 16 },
  header: { alignItems: "center", gap: 8, marginBottom: 4 },
  logo: {
    width: 68,
    height: 68,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0D9488",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  brand: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  sub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  card: { borderRadius: 18, borderWidth: 1, padding: 22, gap: 14 },
  title: { fontSize: 20, fontFamily: "Inter_700Bold" },
  cardSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 4 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
  },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  field: { gap: 6 },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  input: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  optionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 2,
  },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  forgotLink: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 2,
  },
  btnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
  demoBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    alignItems: "center",
  },
  demoTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  demoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  demoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  demoChipIcon: { fontSize: 14 },
  demoChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  demoHint: { fontSize: 12, fontFamily: "Inter_400Regular" },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  footerText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  link: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
