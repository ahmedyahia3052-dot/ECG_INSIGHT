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

type Role = "doctor" | "student";

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("doctor");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Full name is required";
    if (!email.trim()) e.email = "Email is required";
    else if (!email.includes("@")) e.email = "Enter a valid email";
    if (!password) e.password = "Password is required";
    else if (password.length < 6) e.password = "At least 6 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password, role);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } finally {
      setLoading(false);
    }
  };

  const topInset = Platform.OS === "web" ? 67 : insets.top;

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
              <Text style={[styles.label, { color: colors.foreground }]}>Password</Text>
              <View style={[styles.inputWrap, { backgroundColor: colors.muted, borderColor: errors.password ? colors.destructive : colors.border }]}>
                <Feather name="lock" size={16} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="Min. 6 characters"
                  placeholderTextColor={colors.mutedForeground}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Feather name={showPassword ? "eye-off" : "eye"} size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
              {errors.password && <Text style={[styles.error, { color: colors.destructive }]}>{errors.password}</Text>}
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.foreground }]}>I am a...</Text>
              <View style={styles.roleRow}>
                {(["doctor", "student"] as Role[]).map((r) => (
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
                      name={r === "doctor" ? "briefcase" : "book-open"}
                      size={16}
                      color={role === r ? colors.primaryForeground : colors.mutedForeground}
                    />
                    <Text
                      style={[
                        styles.roleText,
                        { color: role === r ? colors.primaryForeground : colors.mutedForeground },
                      ]}
                    >
                      {r === "doctor" ? "Doctor / Clinician" : "Medical Student"}
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
});
