import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
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

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const e: typeof errors = {};
    if (!email.trim()) e.email = "Email is required";
    else if (!email.includes("@")) e.email = "Enter a valid email";
    if (!password) e.password = "Password is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const ok = await login(email.trim(), password);
      if (ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace("/(tabs)");
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Login Failed", "Invalid email or password. Try the demo credentials below.");
      }
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role: "doctor" | "student" | "admin") => {
    const map = {
      doctor: "doctor@ecginsight.com",
      student: "student@ecginsight.com",
      admin: "admin@ecginsight.com",
    };
    setEmail(map[role]);
    setPassword("password");
    setErrors({});
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
        <View style={styles.header}>
          <View style={[styles.logo, { backgroundColor: colors.primary }]}>
            <Feather name="activity" size={28} color="#fff" />
          </View>
          <Text style={[styles.brand, { color: colors.foreground }]}>
            ECG Insight
          </Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            AI-Powered ECG Interpretation
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>Welcome back</Text>
          <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
            Sign in to your clinical account
          </Text>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.foreground }]}>Email</Text>
              <View
                style={[
                  styles.inputWrap,
                  {
                    backgroundColor: colors.muted,
                    borderColor: errors.email ? colors.destructive : colors.border,
                  },
                ]}
              >
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
              {errors.email && (
                <Text style={[styles.error, { color: colors.destructive }]}>
                  {errors.email}
                </Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.foreground }]}>Password</Text>
              <View
                style={[
                  styles.inputWrap,
                  {
                    backgroundColor: colors.muted,
                    borderColor: errors.password ? colors.destructive : colors.border,
                  },
                ]}
              >
                <Feather name="lock" size={16} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.mutedForeground}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Feather
                    name={showPassword ? "eye-off" : "eye"}
                    size={16}
                    color={colors.mutedForeground}
                  />
                </TouchableOpacity>
              </View>
              {errors.password && (
                <Text style={[styles.error, { color: colors.destructive }]}>
                  {errors.password}
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.btn,
                { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 },
              ]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <Text style={[styles.btnText, { color: colors.primaryForeground }]}>
                  Signing in...
                </Text>
              ) : (
                <>
                  <Feather name="log-in" size={16} color={colors.primaryForeground} />
                  <Text style={[styles.btnText, { color: colors.primaryForeground }]}>
                    Sign In
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.demoBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Text style={[styles.demoTitle, { color: colors.mutedForeground }]}>
            Demo Accounts
          </Text>
          <View style={styles.demoRow}>
            {(["doctor", "student", "admin"] as const).map((role) => (
              <TouchableOpacity
                key={role}
                style={[styles.demoChip, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}
                onPress={() => fillDemo(role)}
                activeOpacity={0.7}
              >
                <Text style={[styles.demoChipText, { color: colors.primary }]}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.demoHint, { color: colors.mutedForeground }]}>
            Password: password
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
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
  scroll: {
    paddingHorizontal: 20,
    gap: 16,
  },
  header: {
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  sub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 24,
    gap: 4,
  },
  title: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  cardSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 12,
  },
  form: {
    gap: 14,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  error: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 4,
  },
  btnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  demoBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 10,
    alignItems: "center",
  },
  demoTitle: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  demoRow: {
    flexDirection: "row",
    gap: 8,
  },
  demoChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  demoChipText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  demoHint: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  link: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});
