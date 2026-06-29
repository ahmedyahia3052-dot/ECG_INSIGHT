import { Feather } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { z } from "zod";

import { AuthCard, AuthMessage, AuthPrimaryButton, AuthTextField, premiumAuthTheme, PremiumAuthShell } from "@/components/auth/PremiumAuth";
import { useAuth, type UserRole } from "@/context/AuthContext";
import { assertOAuthProviderReady, listOAuthProviders, oauthStartUrl, type OAuthProvider, type OAuthProviderStatus } from "@/services/oauth";

type RegistrationRole = {
  apiRole: Extract<UserRole, "admin" | "doctor" | "student" | "user">;
  label: string;
};

type AccountType = "INDIVIDUAL" | "HOSPITAL" | "CLINIC" | "ORGANIZATION" | "COMPANY" | "UNIVERSITY" | "RESEARCH_CENTER";

type AccountTypeOption = {
  label: string;
  value: AccountType;
};

export const ROLE_OPTIONS = [
  "Doctor",
  "Cardiologist",
  "Electrophysiologist",
  "Resident Physician",
  "Medical Student",
  "General Practitioner",
  "Nurse",
  "Technician",
  "Occupational Physician",
  "Consultant",
  "Researcher",
  "Administrator",
] as const;

export const ACCOUNT_TYPE_OPTIONS = [
  "Individual Account",
  "Hospital Account",
  "Clinic Account",
  "Organization Account",
  "Corporate Account",
  "University Account",
  "Research Center Account",
] as const;

const roleOptions: RegistrationRole[] = [
  { apiRole: "doctor", label: "Doctor" },
  { apiRole: "doctor", label: "Cardiologist" },
  { apiRole: "doctor", label: "Electrophysiologist" },
  { apiRole: "doctor", label: "Resident Physician" },
  { apiRole: "student", label: "Medical Student" },
  { apiRole: "doctor", label: "General Practitioner" },
  { apiRole: "user", label: "Nurse" },
  { apiRole: "user", label: "Technician" },
  { apiRole: "doctor", label: "Occupational Physician" },
  { apiRole: "doctor", label: "Consultant" },
  { apiRole: "user", label: "Researcher" },
  { apiRole: "admin", label: "Administrator" },
];

const organizationTypes = [
  "Hospital",
  "Clinic",
  "Company",
  "Healthcare Organization",
  "University",
] as const;

const accountTypeOptions: AccountTypeOption[] = [
  { label: "Individual Account", value: "INDIVIDUAL" },
  { label: "Hospital Account", value: "HOSPITAL" },
  { label: "Clinic Account", value: "CLINIC" },
  { label: "Organization Account", value: "ORGANIZATION" },
  { label: "Corporate Account", value: "COMPANY" },
  { label: "University Account", value: "UNIVERSITY" },
  { label: "Research Center Account", value: "RESEARCH_CENTER" },
];

const registerSchema = z.object({
  accountType: z.enum(["INDIVIDUAL", "HOSPITAL", "CLINIC", "ORGANIZATION", "COMPANY", "UNIVERSITY", "RESEARCH_CENTER"]),
  confirmPassword: z.string().min(1, "Confirm your password."),
  country: z.string().trim().optional(),
  department: z.string().trim().optional(),
  email: z.string().trim().min(1, "Email is required.").email("Enter a valid email address."),
  employeeId: z.string().trim().optional(),
  fullName: z.string().trim().min(2, "Full name is required."),
  organizationEmail: z.string().trim().optional(),
  organizationName: z.string().trim().optional(),
  organizationType: z.enum(organizationTypes).optional(),
  password: z.string().min(12, "Password must be at least 12 characters.").regex(/[A-Z]/, "Password must include an uppercase letter.").regex(/[a-z]/, "Password must include a lowercase letter.").regex(/\d/, "Password must include a number.").regex(/[^A-Za-z0-9]/, "Password must include a symbol."),
  positionTitle: z.string().trim().optional(),
  role: z.string().min(1, "Role is required.").refine((value) => roleOptions.some((item) => item.label === value), "Select a supported role."),
}).refine((value) => value.password === value.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
}).refine((value) => value.accountType === "INDIVIDUAL" || Boolean(value.organizationName && value.department && value.employeeId && value.positionTitle && value.organizationEmail && value.country), {
  message: "Organization name, department, employee ID, position, organization email, and country are required.",
}).refine((value) => !value.organizationEmail || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.organizationEmail), {
  message: "Enter a valid organization email.",
  path: ["organizationEmail"],
});

function SelectField({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery ? options.filter((item) => item.toLowerCase().includes(normalizedQuery)) : options;

  useEffect(() => {
    if (!open) setQuery(value);
  }, [open, value]);

  const openSelect = () => {
    setQuery("");
    setOpen(true);
  };

  const closeSelect = () => {
    setQuery(value);
    setOpen(false);
  };

  return (
    <View style={styles.selectWrap}>
      <Text style={styles.selectLabel}>{label}</Text>
      <Pressable accessibilityRole="button" onPress={open ? closeSelect : openSelect} style={styles.selectTrigger}>
        <Text style={styles.selectValue}>{value || `Select ${label.toLowerCase()}`}</Text>
        <Feather name={open ? "chevron-up" : "chevron-down"} size={16} color={premiumAuthTheme.muted} />
      </Pressable>
      <Modal animationType="fade" onRequestClose={closeSelect} transparent visible={open}>
        <Pressable onPress={closeSelect} style={styles.portalBackdrop}>
          <Pressable style={styles.portalMenu}>
            <Text style={styles.portalTitle}>{label}</Text>
            <View style={styles.searchShell}>
              <Feather name="search" size={15} color={premiumAuthTheme.muted} />
              <TextInput
                autoFocus
                onChangeText={setQuery}
                placeholder={`Search ${label.toLowerCase()}`}
                placeholderTextColor="rgba(148, 163, 184, 0.78)"
                style={styles.searchInput}
                value={query}
              />
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" style={styles.menuList}>
              {filtered.map((item) => (
                <Pressable
                  accessibilityRole="button"
                  key={item}
                  onPress={() => {
                    onChange(item);
                    setQuery(item);
                    setOpen(false);
                  }}
                  style={styles.menuItem}
                >
                  <Text style={styles.menuText}>{item}</Text>
                </Pressable>
              ))}
              {!filtered.length ? <Text style={styles.emptyText}>No matching option</Text> : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export default function RegisterScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < 680;
  const { isAuthenticated, isLoading, register } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [roleLabel, setRoleLabel] = useState(roleOptions[0].label);
  const [accountType, setAccountType] = useState<AccountType>("INDIVIDUAL");
  const [organizationName, setOrganizationName] = useState("");
  const [organizationType, setOrganizationType] = useState<(typeof organizationTypes)[number] | "">("");
  const [department, setDepartment] = useState("");
  const [country, setCountry] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [organizationEmail, setOrganizationEmail] = useState("");
  const [positionTitle, setPositionTitle] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [oauthProviders, setOauthProviders] = useState<OAuthProviderStatus[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null);
  const selectedRole = useMemo(() => roleOptions.find((item) => item.label === roleLabel) ?? roleOptions[0], [roleLabel]);
  const accountTypeLabel = useMemo(() => accountTypeOptions.find((item) => item.value === accountType)?.label ?? "Individual Account", [accountType]);
  const requiresOrganization = accountType !== "INDIVIDUAL";
  const configuredProviders = useMemo(() => oauthProviders.filter((provider) => provider.configured), [oauthProviders]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) router.replace("/dashboard" as never);
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    listOAuthProviders()
      .then(({ providers }) => setOauthProviders(providers))
      .catch(() => setOauthProviders([]));
  }, []);

  const submit = async () => {
    setError("");
    const parsed = registerSchema.safeParse({
      accountType,
      confirmPassword,
      country,
      department,
      email,
      employeeId,
      fullName,
      organizationEmail,
      organizationName,
      organizationType: organizationType || undefined,
      password,
      positionTitle,
      role: roleLabel,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Registration details are invalid.");
      return;
    }

    setSubmitting(true);
    const result = await register(
      parsed.data.fullName,
      parsed.data.email,
      parsed.data.password,
      selectedRole.apiRole,
      undefined,
      requiresOrganization ? parsed.data.organizationName : undefined,
      parsed.data.role,
      {
        accountType: parsed.data.accountType,
        department: parsed.data.department,
        employeeId: parsed.data.employeeId,
        organizationCountry: parsed.data.country,
        organizationEmail: parsed.data.organizationEmail,
        organizationName: parsed.data.organizationName,
        organizationType: parsed.data.organizationType,
        positionTitle: parsed.data.positionTitle,
        registrationRole: parsed.data.role,
      },
    );
    setSubmitting(false);

    if (!result.success) {
      setError(result.error ?? "Registration failed.");
      return;
    }

    router.replace("/dashboard" as never);
  };

  const selectAccountType = (label: string) => {
    const option = accountTypeOptions.find((item) => item.label === label);
    if (!option) return;
    setAccountType(option.value);
    if (option.value === "INDIVIDUAL") {
      setOrganizationType("");
      return;
    }
    if (option.value === "ORGANIZATION") {
      setOrganizationType("Healthcare Organization");
      return;
    }
    if (option.value === "RESEARCH_CENTER") {
      setOrganizationType("Healthcare Organization");
      return;
    }
    if (organizationTypes.includes(option.label as (typeof organizationTypes)[number])) {
      setOrganizationType(option.label as (typeof organizationTypes)[number]);
    }
  };

  const startOAuth = async (provider: OAuthProvider) => {
    setError("");
    setOauthLoading(provider);
    try {
      await assertOAuthProviderReady(provider);
      await Linking.openURL(oauthStartUrl(provider));
    } catch {
      setError("Social login is temporarily unavailable. Please use email sign in.");
    } finally {
      setOauthLoading(null);
    }
  };

  return (
    <PremiumAuthShell maxContentWidth={920} subtitle="Create your secure ECG Insight workspace account." title="Create Account">
      <AuthCard style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Your role, account type, and organization details are stored in your ECG Insight profile.</Text>
        </View>

        <View style={styles.formRows}>
          <View style={[styles.formRow, compact && styles.formRowCompact]}>
            <View style={styles.column}>
            <AuthTextField icon="user" label="Full Name *" onChangeText={setFullName} placeholder="Dr. Sarah Morgan" value={fullName} />
            </View>
            <View style={styles.column}>
            <AuthTextField autoCapitalize="none" icon="mail" keyboardType="email-address" label="Email *" onChangeText={setEmail} placeholder="name@organization.com" value={email} />
            </View>
          </View>

          <View style={[styles.formRow, compact && styles.formRowCompact]}>
            <View style={styles.column}>
              <SelectField label="Role *" onChange={setRoleLabel} options={roleOptions.map((item) => item.label)} value={roleLabel} />
            </View>
            <View style={styles.column}>
              <SelectField label="Account Type *" onChange={selectAccountType} options={accountTypeOptions.map((item) => item.label)} value={accountTypeLabel} />
            </View>
          </View>

          <View style={[styles.formRow, compact && styles.formRowCompact]}>
            <View style={styles.column}>
              <AuthTextField
                icon="lock"
                label="Password *"
                onChangeText={setPassword}
                placeholder="12+ chars, number, symbol"
                right={(
                  <Pressable accessibilityLabel={showPassword ? "Hide password" : "Show password"} accessibilityRole="button" onPress={() => setShowPassword((value) => !value)}>
                    <Feather name={showPassword ? "eye-off" : "eye"} size={17} color={premiumAuthTheme.muted} />
                  </Pressable>
                )}
                secureTextEntry={!showPassword}
                value={password}
              />
            </View>
            <View style={styles.column}>
              <AuthTextField
                icon="shield"
                label="Confirm Password *"
                onChangeText={setConfirmPassword}
                placeholder="Re-enter password"
                right={(
                  <Pressable accessibilityLabel={showConfirmPassword ? "Hide confirmed password" : "Show confirmed password"} accessibilityRole="button" onPress={() => setShowConfirmPassword((value) => !value)}>
                    <Feather name={showConfirmPassword ? "eye-off" : "eye"} size={17} color={premiumAuthTheme.muted} />
                  </Pressable>
                )}
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
              />
            </View>
          </View>

          {requiresOrganization ? (
            <>
              <View style={[styles.formRow, compact && styles.formRowCompact]}>
              <View style={styles.column}>
                <AuthTextField icon="briefcase" label="Organization Name *" onChangeText={setOrganizationName} placeholder="NorthStar Heart Institute" value={organizationName} />
              </View>
              <View style={styles.column}>
                <AuthTextField icon="layers" label="Department *" onChangeText={setDepartment} placeholder="Cardiology" value={department} />
              </View>
              </View>

              <View style={[styles.formRow, compact && styles.formRowCompact]}>
              <View style={styles.column}>
                <AuthTextField icon="hash" label="Employee ID *" onChangeText={setEmployeeId} placeholder="EMP-1042" value={employeeId} />
              </View>
              <View style={styles.column}>
                <AuthTextField icon="briefcase" label="Position / Job Title *" onChangeText={setPositionTitle} placeholder="Consultant Cardiologist" value={positionTitle} />
              </View>
              </View>

              <View style={[styles.formRow, compact && styles.formRowCompact]}>
              <View style={styles.column}>
                <AuthTextField autoCapitalize="none" icon="at-sign" keyboardType="email-address" label="Organization Email *" onChangeText={setOrganizationEmail} placeholder="admin@hospital.org" value={organizationEmail} />
              </View>
              <View style={styles.column}>
                <AuthTextField icon="globe" label="Country *" onChangeText={setCountry} placeholder="United States" value={country} />
              </View>
              </View>
            </>
          ) : null}
        </View>

        {error ? <AuthMessage message={error} tone="error" /> : null}

        <AuthPrimaryButton disabled={submitting} icon="user-plus" label={submitting ? "Creating account..." : "Create Account"} onPress={submit} />

        {configuredProviders.length ? (
          <View style={styles.oauthGrid}>
            {configuredProviders.map(({ provider }) => (
            <AuthPrimaryButton
              disabled={oauthLoading !== null}
              key={provider}
              label={oauthLoading === provider ? "Checking..." : provider === "GOOGLE" ? "Continue with Google" : provider === "APPLE" ? "Continue with Apple" : "Continue with Microsoft"}
              onPress={() => void startOAuth(provider)}
              variant="outline"
            />
            ))}
          </View>
        ) : <AuthMessage message="Social sign in will be available in production deployment." />}

        <Text style={styles.createText}>
          Already have an account? <Link href="/login" style={styles.link}>Sign In</Link>
        </Text>
      </AuthCard>
    </PremiumAuthShell>
  );
}

const styles = StyleSheet.create({
  card: { maxWidth: 920 },
  column: { flex: 1, minWidth: 0 },
  createText: { color: premiumAuthTheme.muted, fontSize: 13, fontWeight: "700", textAlign: "center" },
  emptyText: { color: premiumAuthTheme.muted, fontSize: 12, fontWeight: "800", padding: 10 },
  formRow: { flexDirection: "row", gap: 12, width: "100%" },
  formRowCompact: { flexDirection: "column" },
  formRows: { gap: 10, width: "100%" },
  header: { gap: 4 },
  link: { color: premiumAuthTheme.cyan, fontSize: 13, fontWeight: "900" },
  menuItem: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  menuList: { gap: 2, maxHeight: 250 },
  menuText: { color: premiumAuthTheme.text, fontSize: 13, fontWeight: "800" },
  oauthGrid: { gap: 8 },
  portalBackdrop: { alignItems: "center", backgroundColor: "rgba(2,6,23,0.46)", flex: 1, justifyContent: "center", padding: 20 },
  portalMenu: { backgroundColor: "rgba(8,18,35,0.99)", borderColor: premiumAuthTheme.border, borderRadius: 20, borderWidth: 1, maxWidth: 440, padding: 14, shadowColor: "#000", shadowOpacity: 0.45, shadowRadius: 30, width: "100%" },
  portalTitle: { color: premiumAuthTheme.text, fontSize: 15, fontWeight: "900", marginBottom: 10 },
  searchInput: { color: premiumAuthTheme.text, flex: 1, fontSize: 13, fontWeight: "700", paddingVertical: 0 },
  searchShell: { alignItems: "center", backgroundColor: "rgba(15,23,42,0.86)", borderColor: premiumAuthTheme.border, borderRadius: 12, borderWidth: 1, flexDirection: "row", gap: 8, marginBottom: 6, paddingHorizontal: 10, paddingVertical: 8 },
  selectLabel: { color: premiumAuthTheme.text, fontSize: 12, fontWeight: "900", letterSpacing: 0.2 },
  selectTrigger: { alignItems: "center", backgroundColor: "rgba(15, 23, 42, 0.78)", borderColor: premiumAuthTheme.border, borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 10, minHeight: 44, paddingHorizontal: 12 },
  selectValue: { color: premiumAuthTheme.text, flex: 1, fontSize: 14, fontWeight: "800" },
  selectWrap: { gap: 8, position: "relative", zIndex: 10 },
  subtitle: { color: premiumAuthTheme.muted, fontSize: 13, fontWeight: "700", lineHeight: 18 },
  title: { color: premiumAuthTheme.text, fontSize: 26, fontWeight: "900", letterSpacing: -0.7 },
});
