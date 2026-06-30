import { Feather } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { z } from "zod";

import { AuthCard, AuthMessage, AuthPrimaryButton, AuthTextField, AuthToggle, premiumAuthTheme, PremiumAuthShell } from "@/components/auth/PremiumAuth";
import { useAuth } from "@/context/AuthContext";
import { assertOAuthProviderReady, listOAuthProviders, oauthStartUrl, type OAuthProvider, type OAuthProviderStatus } from "@/services/oauth";

const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required.").email("Enter a valid email address."),
  password: z.string().min(1, "Password is required.").min(6, "Password must be at least 6 characters."),
});

export default function LoginScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading, login, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [oauthProviders, setOauthProviders] = useState<OAuthProviderStatus[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null);

  const roles = useMemo(() => (user?.role ? [user.role] : []), [user?.role]);
  const organizations = useMemo(
    () => (user as { organizations?: unknown[] } | null)?.organizations ?? [],
    [user],
  );
  const providers = oauthProviders ?? [];
  const configuredProviders = (providers ?? []).filter((provider) => provider?.configured);

  useEffect(() => {
    console.log("LoginScreen state", {
      roles,
      providers,
      organizations,
    });
  }, [roles, providers, organizations]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) router.replace("/dashboard" as never);
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    listOAuthProviders()
      .then(({ providers: authProviders }) => setOauthProviders(Array.isArray(authProviders) ? authProviders : []))
      .catch(() => setOauthProviders([]));
  }, []);

  const submit = async () => {
    setError("");
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid email and password.");
      return;
    }

    setSubmitting(true);
    const result = await login(parsed.data.email, parsed.data.password, remember);
    setSubmitting(false);

    if (!result.success) {
      setError(result.error ?? "Login failed.");
      return;
    }

    router.replace("/dashboard" as never);
  };

  const startOAuth = async (provider: OAuthProvider) => {
    setError("");
    setOauthLoading(provider);
    try {
      await assertOAuthProviderReady(provider);
      await Linking.openURL(oauthStartUrl(provider));
    } catch {
      setError("Social sign in will be available in production deployment.");
    } finally {
      setOauthLoading(null);
    }
  };

  return (
    <PremiumAuthShell
      subtitle="Sign in to your secure ECG analysis workspace."
      title="Welcome Back"
    >
      <AuthCard>
        <View style={styles.header}>
          <Text style={styles.title}>Sign in</Text>
          <Text style={styles.subtitle}>Use your ECG Insight account credentials.</Text>
        </View>

        <AuthTextField
          autoCapitalize="none"
          autoComplete="email"
          icon="mail"
          keyboardType="email-address"
          label="Email"
          onChangeText={setEmail}
          placeholder="name@organization.com"
          textContentType="emailAddress"
          value={email}
        />

        <AuthTextField
          autoComplete="password"
          icon="lock"
          label="Password"
          onChangeText={setPassword}
          placeholder="Enter your password"
          right={(
            <Pressable accessibilityLabel={showPassword ? "Hide password" : "Show password"} accessibilityRole="button" onPress={() => setShowPassword((value) => !value)}>
              <Feather name={showPassword ? "eye-off" : "eye"} size={17} color={premiumAuthTheme.muted} />
            </Pressable>
          )}
          secureTextEntry={!showPassword}
          textContentType="password"
          value={password}
        />

        <View style={styles.options}>
          <AuthToggle checked={remember} label="Remember me" onPress={() => setRemember((value) => !value)} />
          <Link href="/forgot-password" style={styles.link}>Forgot password?</Link>
        </View>

        {error ? <AuthMessage message={error} tone="error" /> : null}

        <AuthPrimaryButton disabled={submitting} icon="log-in" label={submitting ? "Signing in..." : "Sign In"} onPress={submit} />

        {configuredProviders.length ? (
          <View style={styles.oauthGrid}>
            {configuredProviders.map(({ provider }) => (
            <AuthPrimaryButton
              disabled={oauthLoading !== null}
              key={provider}
              label={oauthLoading === provider ? "Checking..." : provider === "GOOGLE" ? "Google" : provider === "APPLE" ? "Apple" : "Microsoft"}
              onPress={() => void startOAuth(provider)}
              variant="outline"
            />
            ))}
          </View>
        ) : <AuthMessage message="Social sign in will be available in production deployment." />}

        <Text style={styles.createText}>
          New to ECG Insight? <Link href="/register" style={styles.link}>Create Account</Link>
        </Text>
      </AuthCard>
    </PremiumAuthShell>
  );
}

const styles = StyleSheet.create({
  createText: { color: premiumAuthTheme.muted, fontSize: 13, fontWeight: "700", textAlign: "center" },
  header: { gap: 6 },
  link: { color: premiumAuthTheme.cyan, fontSize: 13, fontWeight: "900" },
  oauthGrid: { flexDirection: "row", gap: 8 },
  options: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  subtitle: { color: premiumAuthTheme.muted, fontSize: 14, fontWeight: "700", lineHeight: 20 },
  title: { color: premiumAuthTheme.text, fontSize: 28, fontWeight: "900", letterSpacing: -0.7 },
});
