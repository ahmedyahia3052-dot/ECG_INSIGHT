import { Feather } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { z } from "zod";

import { AuthCard, AuthMessage, AuthPrimaryButton, AuthTextField, AuthToggle, premiumAuthTheme, PremiumAuthShell } from "@/components/auth/PremiumAuth";
import { useAuth } from "@/context/AuthContext";
import { checkBackendHealth } from "@/services/api";
import { assertOAuthProviderReady, listOAuthProviders, oauthStartUrl, type OAuthProvider, type OAuthProviderStatus } from "@/services/oauth";

const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required.").email("Enter a valid email address."),
  password: z.string().min(1, "Password is required.").min(6, "Password must be at least 6 characters."),
});

export default function LoginScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [oauthProviders, setOauthProviders] = useState<OAuthProviderStatus[]>([]);
  const [serverUnavailable, setServerUnavailable] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null);

  const providers = oauthProviders ?? [];
  const configuredProviders = (providers ?? []).filter((provider) => provider?.configured);

  useEffect(() => {
    if (!isLoading && isAuthenticated) router.replace("/dashboard" as never);
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const health = await checkBackendHealth();
      if (cancelled) return;

      if (!health.ok) {
        setServerUnavailable(true);
        setOauthProviders([]);
        return;
      }

      setServerUnavailable(false);

      try {
        const { providers: authProviders } = await listOAuthProviders();
        if (cancelled) return;
        setOauthProviders(Array.isArray(authProviders) ? authProviders : []);
      } catch {
        if (!cancelled) {
          setServerUnavailable(true);
          setOauthProviders([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async () => {
    setError("");

    if (serverUnavailable) {
      setError("Server unavailable");
      return;
    }

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid email and password.");
      return;
    }

    setSubmitting(true);
    const result = await login(parsed.data.email, parsed.data.password, remember);
    setSubmitting(false);

    if (!result.success) {
      const message = result.error ?? "Login failed.";
      if (/network|fetch|timeout|unavailable|ECONNREFUSED|502|503|504/i.test(message)) {
        setServerUnavailable(true);
        setError("Server unavailable");
        return;
      }
      setError(message);
      return;
    }

    router.replace("/dashboard" as never);
  };

  const startOAuth = async (provider: OAuthProvider) => {
    if (serverUnavailable) {
      setError("Server unavailable");
      return;
    }

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

        {serverUnavailable ? <AuthMessage message="Server unavailable" tone="error" /> : null}

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

        <AuthPrimaryButton disabled={submitting || serverUnavailable} icon="log-in" label={submitting ? "Signing in..." : "Sign In"} onPress={submit} />

        {configuredProviders.length ? (
          <View style={styles.oauthGrid}>
            {configuredProviders.map(({ provider }) => (
              <AuthPrimaryButton
                disabled={oauthLoading !== null || serverUnavailable}
                key={provider}
                label={oauthLoading === provider ? "Checking..." : provider === "GOOGLE" ? "Google" : provider === "APPLE" ? "Apple" : "Microsoft"}
                onPress={() => void startOAuth(provider)}
                variant="outline"
              />
            ))}
          </View>
        ) : serverUnavailable ? null : <AuthMessage message="Social sign in will be available in production deployment." />}

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
