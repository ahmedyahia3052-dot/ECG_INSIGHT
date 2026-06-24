import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
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

type Role = "corporate_client" | "doctor" | "user";

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("user");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Full name is required";
    if (!email.trim() && !phoneNumber.trim()) e.email = "Email or mobile phone is required";
    else if (email.trim() && !email.includes("@")) e.email = "Enter a valid email";
    if (email.trim() && !password) e.password = "Password is required for email registration";
    else if (password && passwordStrength(password).score < 4) e.password = "Use 12+ chars with upper, lower, number, and symbol";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const result = await register(name.trim(), email.trim(), password, role, phoneNumber.trim() || undefined);
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace(email.trim() ? `/(auth)/verify-email?email=${encodeURIComponent(email.trim())}` : "/(auth)/login");
      } else {
        setErrors({ form: result.error ?? "Registration failed." });
      }
    } finally {
      setLoading(false);
    }
  };

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const strength = passwordStrength(password);

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: topInset + 24,
            paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 24,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.back}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={20} color={colors.foreground} />
          <Text style={[styles.backText, { color: colors.foreground }]}>Back to Login</Text>
        </TouchableOpacity>

        <View style={styles.topSection}>
          <Text style={[styles.title, { color: colors.foreground }]}>Create Account</Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            Join ECG Insight and start analyzing ECGs with AI
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.form}>
            {errors.form && <Text style={[styles.error, { color: colors.destructive }]}>{errors.form}</Text>}
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.foreground }]}>Full Name</Text>
              <View style={[styles.inputWrap, { backgroundColor: colors.muted, borderColor: errors.name ? colors.destructive : colors.border }]}>
                <Feather name="user" size={16} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="Dr. Jane Smith"
                  placeholderTextColor={colors.mutedForeground}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
              {errors.name && <Text style={[styles.error, { color: colors.destructive }]}>{errors.name}</Text>}
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.foreground }]}>Email</Text>
              <View style={[styles.inputWrap, { backgroundColor: colors.muted, borderColor: errors.email ? colors.destructive : colors.border }]}>
                <Feather name="mail" size={16} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="you@hospital.com"
                  placeholderTextColor={colors.mutedForeground}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              {errors.email && <Text style={[styles.error, { color: colors.destructive }]}>{errors.email}</Text>}
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.foreground }]}>Mobile Phone</Text>
              <View style={[styles.inputWrap, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Feather name="smartphone" size={16} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="+201000000000"
                  placeholderTextColor={colors.mutedForeground}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.foreground }]}>Password</Text>
              <View style={[styles.inputWrap, { backgroundColor: colors.muted, borderColor: errors.password ? colors.destructive : colors.border }]}>
                <Feather name="lock" size={16} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="12+ chars, mixed complexity"
                  placeholderTextColor={colors.mutedForeground}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Feather name={showPassword ? "eye-off" : "eye"} size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
              <View style={styles.strengthRow}>
                {[0, 1, 2, 3, 4].map((slot) => (
                  <View
                    key={slot}
                    style={[
                      styles.strengthBar,
                      { backgroundColor: slot < strength.score ? strength.color : colors.border },
                    ]}
                  />
                ))}
              </View>
              <Text style={[styles.strengthText, { color: strength.color }]}>{strength.label}</Text>
              {errors.password && <Text style={[styles.error, { color: colors.destructive }]}>{errors.password}</Text>}
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.foreground }]}>I am a...</Text>
              <View style={styles.roleRow}>
                {(["user", "doctor", "corporate_client"] as Role[]).map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.roleBtn,
                      {
                        backgroundColor: role === r ? colors.primary : colors.muted,
                        borderColor: role === r ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => {
                      setRole(r);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    activeOpacity={0.8}
                  >
                    <Feather
                      name={r === "doctor" ? "briefcase" : r === "corporate_client" ? "users" : "user"}
                      size={16}
                      color={role === r ? colors.primaryForeground : colors.mutedForeground}
                    />
                    <Text
                      style={[
                        styles.roleText,
                        { color: role === r ? colors.primaryForeground : colors.mutedForeground },
                      ]}
                    >
                      {r === "doctor" ? "Doctor / Clinician" : r === "corporate_client" ? "Corporate Client" : "Individual User"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Feather name={loading ? "loader" : "user-plus"} size={16} color={colors.primaryForeground} />
              <Text style={[styles.btnText, { color: colors.primaryForeground }]}>
                {loading ? "Creating account..." : "Create Account"}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.planHint, { color: colors.mutedForeground }]}>
              New accounts start on the FREE plan with 5 ECG analyses per 24 hours.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.link, { color: colors.primary }]}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 20, gap: 16 },
  back: { flexDirection: "row", alignItems: "center", gap: 8 },
  backText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  topSection: { gap: 6 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  sub: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  card: { borderRadius: 18, borderWidth: 1, padding: 24 },
  form: { gap: 14 },
  field: { gap: 6 },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  input: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  error: { fontSize: 11, fontFamily: "Inter_400Regular" },
  roleRow: { flexDirection: "column", gap: 8 },
  roleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  roleText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 4,
  },
  btnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  footerText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  link: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  planHint: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18, textAlign: "center" },
  strengthBar: { borderRadius: 2, flex: 1, height: 5 },
  strengthRow: { flexDirection: "row", gap: 4 },
  strengthText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
});

function passwordStrength(password: string) {
  const checks = [
    password.length >= 12,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  if (!password) return { color: "#94A3B8", label: "Password strength: not started", score };
  if (score <= 2) return { color: "#DC2626", label: "Password strength: weak", score };
  if (score <= 4) return { color: "#D97706", label: "Password strength: good", score };
  return { color: "#059669", label: "Password strength: strong", score };
}
