import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { z } from "zod";

import {
  accountTypes,
  AuthCard,
  AuthDivider,
  AuthMessage,
  AuthPrimaryButton,
  AuthSkeleton,
  AuthTextField,
  AuthToggle,
  AuthToast,
  premiumAuthTheme,
  PremiumAuthShell,
  SocialAuthGrid,
} from "@/components/auth/PremiumAuth";
import { useAuth } from "@/context/AuthContext";
import { checkBackendHealth } from "@/services/api";
import { checkEmailAvailability, createSocialAuthIntent, type SocialProvider } from "@/services/authProviders";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

const registerSchema = z.object({
  confirmPassword: z.string().min(8),
  country: z.string().trim().min(2, "Country is required."),
  email: z.string().email("Enter a valid email address."),
  fullName: z.string().trim().min(2, "Full name is required."),
  organizationName: z.string().trim().min(2, "Organization name is required."),
  password: z.string().min(12, "Password must be at least 12 characters."),
  phone: z.string().trim().min(8, "Mobile phone is required."),
  specialty: z.string().trim().min(2, "Specialty is required."),
  userCount: z.string().trim().min(1, "User count is required."),
}).refine((value) => value.password === value.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

type ConnectionState = "checking" | "offline" | "online";
type AuthMode = "login" | "register";
type EmailAvailability = "available" | "checking" | "taken" | "unknown";

function passwordScore(passwordValue: string) {
  const checks = [
    passwordValue.length >= 12,
    /[A-Z]/.test(passwordValue),
    /[a-z]/.test(passwordValue),
    /\d/.test(passwordValue),
    /[^A-Za-z0-9]/.test(passwordValue),
  ];
  return checks.filter(Boolean).length;
}

function passwordStrengthLabel(score: number) {
  if (score >= 5) return "Excellent";
  if (score >= 4) return "Strong";
  if (score >= 3) return "Moderate";
  if (score >= 1) return "Weak";
  return "Required";
}

export default function LoginScreen() {
  const router = useRouter();
  const {
    isAuthenticated,
    isLoading,
    login,
    register,
    requestPhoneOtp,
    verifyPhoneOtp,
  } = useAuth();
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<AuthMode>("login");
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedAccountLabel, setSelectedAccountLabel] = useState("Doctor");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [trustDevice, setTrustDevice] = useState(true);
  const [phoneMode, setPhoneMode] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [otpMessage, setOtpMessage] = useState("");
  const [fullName, setFullName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [organizationName, setOrganizationName] = useState("");
  const [country, setCountry] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [department, setDepartment] = useState("");
  const [medicalLicense, setMedicalLicense] = useState("");
  const [occupationalProgram, setOccupationalProgram] = useState("");
  const [facilityType, setFacilityType] = useState("");
  const [userCount, setUserCount] = useState("");
  const [emailAvailability, setEmailAvailability] = useState<EmailAvailability>("unknown");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [connection, setConnection] = useState<ConnectionState>("checking");
  const [connectionMessage, setConnectionMessage] = useState("Checking authentication service...");
  const selectedAccount = useMemo(() => accountTypes.find((item) => item.label === selectedAccountLabel) ?? accountTypes[0], [selectedAccountLabel]);

  const checkConnection = useCallback(async () => {
    setConnection("checking");
    const health = await checkBackendHealth();
    setConnection(health.ok ? "online" : "offline");
    setConnectionMessage(health.ok ? "Authentication service online." : health.message);
    return health.ok;
  }, []);

  useEffect(() => {
    void checkConnection();
  }, [checkConnection]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) router.replace("/dashboard" as never);
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (params.mode === "register") setMode("register");
  }, [params.mode]);

  useEffect(() => {
    const emailValue = registerEmail.trim().toLowerCase();
    if (!emailValue || !z.string().email().safeParse(emailValue).success) {
      setEmailAvailability("unknown");
      return;
    }
    setEmailAvailability("checking");
    const timeout = setTimeout(() => {
      void checkEmailAvailability(emailValue)
        .then((result) => setEmailAvailability(result.available ? "available" : "taken"))
        .catch(() => setEmailAvailability("unknown"));
    }, 350);
    return () => clearTimeout(timeout);
  }, [registerEmail]);

  const submit = async () => {
    setError("");
    setInfo("");
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid login details.");
      return;
    }
    if (connection !== "online") {
      const online = await checkConnection();
      if (!online) return;
    }
    setSubmitting(true);
    const result = await login(parsed.data.email, parsed.data.password, remember);
    setSubmitting(false);
    if (!result.success) {
      setError(result.error ?? "Login failed.");
      return;
    }
    if (trustDevice) {
      setInfo("Trusted device preference saved for this secure session.");
    }
    router.replace("/dashboard" as never);
  };

  const submitPhoneOtpRequest = async () => {
    setError("");
    setOtpMessage("");
    const result = await requestPhoneOtp(phoneNumber, "LOGIN");
    if (!result.success) {
      setError(result.error ?? "Unable to send OTP.");
      return;
    }
    setOtpMessage(result.otp ? `Demo OTP generated: ${result.otp}` : "OTP sent to your mobile phone.");
  };

  const submitPhoneOtp = async () => {
    setError("");
    const result = await verifyPhoneOtp(phoneNumber, otp, remember);
    if (!result.success) {
      setError(result.error ?? "Phone OTP verification failed.");
      return;
    }
    router.replace("/dashboard" as never);
  };

  const submitRegister = async () => {
    setError("");
    setInfo("");
    const parsed = registerSchema.safeParse({
      confirmPassword,
      country,
      email: registerEmail,
      fullName,
      organizationName,
      password: registerPassword,
      phone: registerPhone,
      specialty,
      userCount,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Registration details are incomplete.");
      return;
    }
    if (emailAvailability === "taken") {
      setError("An account already exists for this email address.");
      return;
    }
    setSubmitting(true);
    const result = await register(
      parsed.data.fullName,
      parsed.data.email,
      parsed.data.password,
      selectedAccount.role,
      parsed.data.phone,
      parsed.data.organizationName,
      [parsed.data.specialty, department, medicalLicense, occupationalProgram, facilityType].filter(Boolean).join(" | "),
    );
    setSubmitting(false);
    if (!result.success) {
      setError(result.error ?? "Registration failed.");
      return;
    }
    router.replace("/dashboard" as never);
  };

  const handleSocialProvider = async (provider: SocialProvider) => {
    setError("");
    setInfo("");
    const intent = createSocialAuthIntent(provider);
    if (intent.status === "enterprise_sso_ready") {
      setInfo(`${intent.label} enterprise SSO is routed through the provider intent service and awaits tenant credentials.`);
      return;
    }
    setInfo(`${intent.label} OAuth is backend-ready. Native/web provider credentials will be exchanged through /auth/oauth/login.`);
  };

  const strength = passwordScore(registerPassword);
  const strengthLabel = passwordStrengthLabel(strength);
  const canContinueStep2 =
    fullName.trim().length >= 2 &&
    z.string().email().safeParse(registerEmail).success &&
    registerPhone.trim().length >= 8 &&
    strength >= 4 &&
    registerPassword === confirmPassword &&
    emailAvailability !== "taken";

  return (
    <PremiumAuthShell
      eyebrow="Secure enterprise access"
      subtitle="AI-powered occupational and clinical cardiology platform for physicians, hospitals, clinics, and enterprises."
      title="Enterprise ECG Intelligence Platform"
    >
      <AuthCard>
        {connection === "checking" ? <AuthSkeleton /> : null}
        <View style={styles.modeSwitch}>
          <Pressable accessibilityRole="tab" accessibilityState={{ selected: mode === "login" }} onPress={() => setMode("login")} style={[styles.modeButton, mode === "login" && styles.modeButtonActive]}>
            <Text style={[styles.modeText, mode === "login" && styles.modeTextActive]}>Sign In</Text>
          </Pressable>
          <Pressable accessibilityRole="tab" accessibilityState={{ selected: mode === "register" }} onPress={() => setMode("register")} style={[styles.modeButton, mode === "register" && styles.modeButtonActive]}>
            <Text style={[styles.modeText, mode === "register" && styles.modeTextActive]}>Create Account</Text>
          </Pressable>
        </View>

        <View style={styles.connection}>
          <View style={[styles.statusDot, connection === "online" ? styles.statusOnline : connection === "checking" ? styles.statusChecking : styles.statusOffline]} />
          <Text style={styles.connectionText}>{connectionMessage}</Text>
          {connection === "offline" ? (
            <Pressable accessibilityRole="button" onPress={() => void checkConnection()}>
              <Text style={styles.retryLink}>Retry</Text>
            </Pressable>
          ) : null}
        </View>

        {mode === "login" ? (
          <>
            <View style={styles.headerBlock}>
              <Text style={styles.title}>Welcome back</Text>
              <Text style={styles.subtitle}>Protected by MFA-ready sessions, refresh rotation, audit trails, and enterprise RBAC.</Text>
            </View>
            {phoneMode ? (
              <>
                <AuthTextField icon="smartphone" keyboardType="phone-pad" label="Mobile phone" onChangeText={setPhoneNumber} placeholder="+1 555 0100" value={phoneNumber} />
                <AuthPrimaryButton icon="send" label="Send Phone OTP" onPress={submitPhoneOtpRequest} variant="outline" />
                <AuthTextField icon="key" keyboardType="number-pad" label="One-time code" onChangeText={setOtp} placeholder="6-digit OTP" value={otp} />
                {otpMessage ? <AuthMessage message={otpMessage} tone="success" /> : null}
                <AuthPrimaryButton icon="check-circle" label="Verify OTP and Sign In" onPress={submitPhoneOtp} />
                <AuthPrimaryButton label="Use email and password" onPress={() => setPhoneMode(false)} variant="ghost" />
              </>
            ) : (
              <>
                <AuthTextField autoCapitalize="none" icon="mail" keyboardType="email-address" label="Email address" onChangeText={setEmail} placeholder="doctor@hospital.com" value={email} />
                <AuthTextField
                  icon="lock"
                  label="Password"
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  right={(
                    <Pressable accessibilityRole="button" onPress={() => setShowPassword((value) => !value)}>
                      <Feather name={showPassword ? "eye-off" : "eye"} size={16} color={premiumAuthTheme.muted} />
                    </Pressable>
                  )}
                  secureTextEntry={!showPassword}
                  value={password}
                />
                <View style={styles.optionGrid}>
                  <AuthToggle checked={remember} label="Remember me" onPress={() => setRemember((value) => !value)} />
                  <AuthToggle checked={trustDevice} label="Trust this device" onPress={() => setTrustDevice((value) => !value)} />
                </View>
                <View style={styles.inlineActions}>
                  <Pressable onPress={() => router.push("/forgot-password" as never)}><Text style={styles.link}>Forgot password?</Text></Pressable>
                  <Pressable onPress={() => router.push("/verify-email" as never)}><Text style={styles.link}>Verify email</Text></Pressable>
                </View>
                <AuthPrimaryButton disabled={submitting || connection === "checking"} icon="log-in" label={submitting ? "Signing in..." : "Sign In Securely"} onPress={submit} />
                <AuthPrimaryButton icon="smartphone" label="Use Phone OTP" onPress={() => setPhoneMode(true)} variant="outline" />
              </>
            )}
            <AuthDivider />
            <SocialAuthGrid onProvider={handleSocialProvider} />
            <View style={styles.securityGrid}>
              <Text style={styles.securityItem}>MFA enrollment after login</Text>
              <Text style={styles.securityItem}>Recovery codes supported</Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.headerBlock}>
              <Text style={styles.title}>Create enterprise account</Text>
              <Text style={styles.subtitle}>Three-step onboarding for clinical and occupational cardiology teams.</Text>
            </View>
            <View style={styles.steps}>
              {[1, 2, 3].map((step) => (
                <Pressable key={step} onPress={() => setWizardStep(step)} style={[styles.step, wizardStep === step && styles.stepActive]}>
                  <Text style={[styles.stepText, wizardStep === step && styles.stepTextActive]}>{step}</Text>
                </Pressable>
              ))}
            </View>
            {wizardStep === 1 ? (
              <View style={styles.accountGrid}>
                {accountTypes.map((type) => (
                  <Pressable key={type.label} onPress={() => setSelectedAccountLabel(type.label)} style={[styles.accountType, selectedAccount.label === type.label && styles.accountTypeActive]}>
                    <Feather name={type.icon} size={18} color={selectedAccount.label === type.label ? premiumAuthTheme.cyan : premiumAuthTheme.muted} />
                    <View style={styles.accountTextWrap}>
                      <Text style={styles.accountTitle}>{type.label}</Text>
                      <Text style={styles.accountDescription}>{type.description}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : null}
            {wizardStep === 2 ? (
              <>
                <AuthTextField icon="user" label="Full name" onChangeText={setFullName} placeholder="Dr. Sarah Morgan" value={fullName} />
                <AuthTextField autoCapitalize="none" icon="mail" keyboardType="email-address" label="Email" onChangeText={setRegisterEmail} placeholder="doctor@hospital.com" value={registerEmail} />
                {emailAvailability === "checking" ? <AuthMessage message="Checking email availability..." /> : null}
                {emailAvailability === "available" ? <AuthMessage message="Email is available." tone="success" /> : null}
                {emailAvailability === "taken" ? <AuthMessage message="This email is already registered." tone="error" /> : null}
                <AuthTextField icon="smartphone" keyboardType="phone-pad" label="Mobile phone" onChangeText={setRegisterPhone} placeholder="+1 555 0100" value={registerPhone} />
                <AuthTextField
                  icon="lock"
                  label="Password"
                  onChangeText={(value) => {
                    setRegisterPassword(value);
                    setCapsLockOn(/[A-Z]{2,}/.test(value.slice(-3)) && !/[a-z]/.test(value.slice(-3)));
                  }}
                  placeholder="12+ characters with symbol"
                  right={(
                    <Pressable accessibilityRole="button" onPress={() => setShowPassword((value) => !value)}>
                      <Feather name={showPassword ? "eye-off" : "eye"} size={16} color={premiumAuthTheme.muted} />
                    </Pressable>
                  )}
                  secureTextEntry={!showPassword}
                  value={registerPassword}
                />
                <View style={styles.strengthWrap}>
                  <View style={styles.strengthTrack}>
                    <View style={[styles.strengthFill, { width: `${strength * 20}%` }]} />
                  </View>
                  <Text style={styles.strengthText}>Password strength: {strengthLabel}</Text>
                </View>
                {capsLockOn ? <AuthMessage message="Caps lock appears to be on." /> : null}
                <AuthTextField
                  icon="shield"
                  label="Confirm password"
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm password"
                  right={(
                    <Pressable accessibilityRole="button" onPress={() => setShowConfirmPassword((value) => !value)}>
                      <Feather name={showConfirmPassword ? "eye-off" : "eye"} size={16} color={premiumAuthTheme.muted} />
                    </Pressable>
                  )}
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                />
                {confirmPassword && registerPassword !== confirmPassword ? <AuthMessage message="Passwords do not match." tone="error" /> : null}
              </>
            ) : null}
            {wizardStep === 3 ? (
              <>
                <AuthTextField icon="briefcase" label="Organization name" onChangeText={setOrganizationName} placeholder="NorthStar Heart Institute" value={organizationName} />
                <AuthTextField icon="globe" label="Country" onChangeText={setCountry} placeholder="United States" value={country} />
                <AuthTextField icon="activity" label="Specialty" onChangeText={setSpecialty} placeholder="Cardiology / Occupational Medicine" value={specialty} />
                <AuthTextField icon="layers" label="Department" onChangeText={setDepartment} placeholder="Cardiology, HSE, or Occupational Health" value={department} />
                {selectedAccount.label === "Doctor" ? (
                  <AuthTextField icon="award" label="Medical license" onChangeText={setMedicalLicense} placeholder="License / registration number" value={medicalLicense} />
                ) : null}
                {selectedAccount.label === "Company" ? (
                  <AuthTextField icon="hard-drive" label="Occupational medicine program" onChangeText={setOccupationalProgram} placeholder="Pre-employment, periodic, return-to-work" value={occupationalProgram} />
                ) : null}
                {selectedAccount.label === "Hospital" ? (
                  <AuthTextField icon="home" label="Facility information" onChangeText={setFacilityType} placeholder="Tertiary hospital, clinic network, or cardiac center" value={facilityType} />
                ) : null}
                <AuthTextField icon="users" keyboardType="number-pad" label="User count" onChangeText={setUserCount} placeholder="25" value={userCount} />
              </>
            ) : null}
            <View style={styles.wizardActions}>
              <AuthPrimaryButton disabled={wizardStep === 1} label="Back" onPress={() => setWizardStep((step) => Math.max(1, step - 1))} variant="outline" />
              {wizardStep < 3 ? (
                <AuthPrimaryButton disabled={wizardStep === 2 && !canContinueStep2} icon="arrow-right" label="Continue" onPress={() => setWizardStep((step) => Math.min(3, step + 1))} />
              ) : (
                <AuthPrimaryButton disabled={submitting} icon="user-plus" label={submitting ? "Creating account..." : "Create Secure Account"} onPress={submitRegister} />
              )}
            </View>
          </>
        )}

        {error ? <AuthToast message={error} tone="error" /> : null}
        {info ? <AuthToast message={info} tone="info" /> : null}
        <View style={styles.sessionCard}>
          <Feather name="monitor" size={16} color={premiumAuthTheme.cyan} />
          <Text style={styles.sessionText}>Session management includes active sessions, trusted devices, MFA settings, and force logout controls after sign-in.</Text>
        </View>
      </AuthCard>
    </PremiumAuthShell>
  );
}

const styles = StyleSheet.create({
  accountDescription: { color: premiumAuthTheme.muted, flex: 1, fontSize: 11, fontWeight: "700", lineHeight: 16 },
  accountGrid: { gap: 10 },
  accountTextWrap: { flex: 1, gap: 3 },
  accountTitle: { color: premiumAuthTheme.text, fontSize: 13, fontWeight: "900" },
  accountType: { alignItems: "center", backgroundColor: "rgba(15,23,42,0.52)", borderColor: premiumAuthTheme.border, borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 10, padding: 12 },
  accountTypeActive: { backgroundColor: "rgba(34,211,238,0.12)", borderColor: "rgba(34,211,238,0.58)" },
  connection: { alignItems: "center", backgroundColor: "rgba(15,23,42,0.56)", borderColor: premiumAuthTheme.border, borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 9, padding: 12 },
  connectionText: { color: premiumAuthTheme.text, flex: 1, fontSize: 12, fontWeight: "800" },
  headerBlock: { gap: 7 },
  inlineActions: { flexDirection: "row", justifyContent: "space-between" },
  link: { color: premiumAuthTheme.cyan, fontSize: 13, fontWeight: "900" },
  modeButton: { alignItems: "center", borderRadius: 14, flex: 1, minHeight: 44, justifyContent: "center" },
  modeButtonActive: { backgroundColor: "rgba(34,211,238,0.16)" },
  modeSwitch: { backgroundColor: "rgba(15,23,42,0.74)", borderColor: premiumAuthTheme.border, borderRadius: 18, borderWidth: 1, flexDirection: "row", padding: 4 },
  modeText: { color: premiumAuthTheme.muted, fontSize: 13, fontWeight: "900" },
  modeTextActive: { color: premiumAuthTheme.text },
  optionGrid: { gap: 11 },
  retryLink: { color: premiumAuthTheme.cyan, fontSize: 12, fontWeight: "900" },
  securityGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  securityItem: { backgroundColor: "rgba(15,23,42,0.56)", borderColor: premiumAuthTheme.border, borderRadius: 999, borderWidth: 1, color: premiumAuthTheme.muted, fontSize: 11, fontWeight: "900", overflow: "hidden", paddingHorizontal: 10, paddingVertical: 7 },
  sessionCard: { alignItems: "flex-start", backgroundColor: "rgba(34,211,238,0.08)", borderColor: "rgba(34,211,238,0.22)", borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 10, padding: 12 },
  sessionText: { color: premiumAuthTheme.muted, flex: 1, fontSize: 12, fontWeight: "700", lineHeight: 18 },
  statusChecking: { backgroundColor: premiumAuthTheme.warning },
  statusDot: { borderRadius: 999, height: 10, width: 10 },
  statusOffline: { backgroundColor: premiumAuthTheme.danger },
  statusOnline: { backgroundColor: premiumAuthTheme.success },
  step: { alignItems: "center", backgroundColor: "rgba(15,23,42,0.62)", borderColor: premiumAuthTheme.border, borderRadius: 999, borderWidth: 1, height: 34, justifyContent: "center", width: 34 },
  stepActive: { backgroundColor: premiumAuthTheme.cyan, borderColor: premiumAuthTheme.cyan },
  stepText: { color: premiumAuthTheme.muted, fontSize: 13, fontWeight: "900" },
  stepTextActive: { color: "#03131B" },
  steps: { flexDirection: "row", gap: 10 },
  strengthFill: { backgroundColor: premiumAuthTheme.cyan, borderRadius: 999, height: "100%" },
  strengthText: { color: premiumAuthTheme.muted, fontSize: 11, fontWeight: "900" },
  strengthTrack: { backgroundColor: "rgba(148,163,184,0.18)", borderRadius: 999, height: 8, overflow: "hidden" },
  strengthWrap: { gap: 7 },
  subtitle: { color: premiumAuthTheme.muted, fontSize: 14, fontWeight: "700", lineHeight: 21 },
  title: { color: premiumAuthTheme.text, fontSize: 28, fontWeight: "900", letterSpacing: -0.8 },
  wizardActions: { flexDirection: "row", gap: 10 },
});
