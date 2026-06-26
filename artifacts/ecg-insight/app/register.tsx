import { Feather } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { z } from "zod";

import { AuthCard, AuthMessage, AuthPrimaryButton, AuthTextField, premiumAuthTheme, PremiumAuthShell } from "@/components/auth/PremiumAuth";
import { useAuth, type UserRole } from "@/context/AuthContext";

type RegistrationRole = {
  apiRole: Extract<UserRole, "admin" | "doctor" | "student" | "user">;
  label: string;
};

type AccountType = "INDIVIDUAL" | "ORGANIZATION";

const roleOptions: RegistrationRole[] = [
  { apiRole: "doctor", label: "Doctor" },
  { apiRole: "doctor", label: "Cardiologist" },
  { apiRole: "doctor", label: "Resident Physician" },
  { apiRole: "student", label: "Medical Student" },
  { apiRole: "user", label: "Nurse" },
  { apiRole: "user", label: "Technician" },
  { apiRole: "doctor", label: "Occupational Health Physician" },
  { apiRole: "admin", label: "Administrator" },
];

const organizationTypes = [
  "Hospital",
  "Clinic",
  "Company",
  "Occupational Health Center",
  "University",
  "Medical School",
  "Healthcare Network",
  "Government Institution",
] as const;

const registerSchema = z.object({
  accountType: z.enum(["INDIVIDUAL", "ORGANIZATION"]),
  city: z.string().trim().optional(),
  confirmPassword: z.string().min(1, "Confirm your password."),
  country: z.string().trim().optional(),
  email: z.string().trim().min(1, "Email is required.").email("Enter a valid email address."),
  fullName: z.string().trim().min(2, "Full name is required."),
  organizationName: z.string().trim().optional(),
  organizationType: z.enum(organizationTypes).optional(),
  password: z.string().min(12, "Password must be at least 12 characters.").regex(/[A-Z]/, "Password must include an uppercase letter.").regex(/[a-z]/, "Password must include a lowercase letter.").regex(/\d/, "Password must include a number.").regex(/[^A-Za-z0-9]/, "Password must include a symbol."),
  role: z.string().min(1, "Role is required."),
}).refine((value) => value.password === value.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
}).refine((value) => value.accountType === "INDIVIDUAL" || Boolean(value.organizationName && value.organizationType && value.country && value.city), {
  message: "Organization name, type, country, and city are required.",
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
  const filtered = options.filter((item) => item.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    setQuery(value);
  }, [value]);

  return (
    <View style={styles.selectWrap}>
      <AuthTextField
        icon="search"
        label={label}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onChangeText={(text) => {
          setQuery(text);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={`Search ${label.toLowerCase()}`}
        value={query}
      />
      {open ? (
        <View style={styles.menu}>
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
        </View>
      ) : null}
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
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const selectedRole = useMemo(() => roleOptions.find((item) => item.label === roleLabel) ?? roleOptions[0], [roleLabel]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) router.replace("/dashboard" as never);
  }, [isAuthenticated, isLoading, router]);

  const submit = async () => {
    setError("");
    const parsed = registerSchema.safeParse({
      accountType,
      city,
      confirmPassword,
      country,
      email,
      fullName,
      organizationName,
      organizationType: organizationType || undefined,
      password,
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
      parsed.data.accountType === "ORGANIZATION" ? parsed.data.organizationName : undefined,
      parsed.data.role,
      {
        accountType: parsed.data.accountType,
        organizationCity: parsed.data.city,
        organizationCountry: parsed.data.country,
        organizationName: parsed.data.organizationName,
        organizationType: parsed.data.organizationType,
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

  return (
    <PremiumAuthShell maxContentWidth={700} subtitle="Create your secure ECG Insight workspace account." title="Create Account">
      <AuthCard style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Your role, account type, and organization details are stored in your ECG Insight profile.</Text>
        </View>

        <View style={[styles.grid, compact && styles.gridCompact]}>
          <View style={styles.column}>
            <AuthTextField icon="user" label="Full Name *" onChangeText={setFullName} placeholder="Dr. Sarah Morgan" value={fullName} />
          </View>
          <View style={styles.column}>
            <AuthTextField autoCapitalize="none" icon="mail" keyboardType="email-address" label="Email *" onChangeText={setEmail} placeholder="name@organization.com" value={email} />
          </View>
          <View style={styles.column}>
            <SelectField label="Role *" onChange={setRoleLabel} options={roleOptions.map((item) => item.label)} value={roleLabel} />
          </View>
          <View style={styles.column}>
            <SelectField label="Account Type *" onChange={(value) => setAccountType(value === "Organization Account" ? "ORGANIZATION" : "INDIVIDUAL")} options={["Individual Account", "Organization Account"]} value={accountType === "ORGANIZATION" ? "Organization Account" : "Individual Account"} />
          </View>
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
          {accountType === "ORGANIZATION" ? (
            <>
              <View style={styles.column}>
                <AuthTextField icon="briefcase" label="Organization Name *" onChangeText={setOrganizationName} placeholder="NorthStar Heart Institute" value={organizationName} />
              </View>
              <View style={styles.column}>
                <SelectField label="Organization Type *" onChange={(value) => setOrganizationType(value as (typeof organizationTypes)[number])} options={[...organizationTypes]} value={organizationType} />
              </View>
              <View style={styles.column}>
                <AuthTextField icon="globe" label="Country *" onChangeText={setCountry} placeholder="United States" value={country} />
              </View>
              <View style={styles.column}>
                <AuthTextField icon="map-pin" label="City *" onChangeText={setCity} placeholder="Boston" value={city} />
              </View>
            </>
          ) : null}
        </View>

        {error ? <AuthMessage message={error} tone="error" /> : null}

        <AuthPrimaryButton disabled={submitting} icon="user-plus" label={submitting ? "Creating account..." : "Create Account"} onPress={submit} />

        <Text style={styles.createText}>
          Already have an account? <Link href="/login" style={styles.link}>Sign In</Link>
        </Text>
      </AuthCard>
    </PremiumAuthShell>
  );
}

const styles = StyleSheet.create({
  card: { maxWidth: 700 },
  column: { flex: 1, minWidth: 260 },
  createText: { color: premiumAuthTheme.muted, fontSize: 13, fontWeight: "700", textAlign: "center" },
  emptyText: { color: premiumAuthTheme.muted, fontSize: 12, fontWeight: "800", padding: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, overflow: "visible" },
  gridCompact: { flexDirection: "column" },
  header: { gap: 4 },
  link: { color: premiumAuthTheme.cyan, fontSize: 13, fontWeight: "900" },
  menu: { backgroundColor: "rgba(8,18,35,0.98)", borderColor: premiumAuthTheme.border, borderRadius: 14, borderWidth: 1, left: 0, maxHeight: 172, overflow: "hidden", position: "absolute", right: 0, top: 76, zIndex: 50 },
  menuItem: { paddingHorizontal: 12, paddingVertical: 9 },
  menuText: { color: premiumAuthTheme.text, fontSize: 13, fontWeight: "800" },
  selectWrap: { position: "relative", zIndex: 10 },
  subtitle: { color: premiumAuthTheme.muted, fontSize: 13, fontWeight: "700", lineHeight: 18 },
  title: { color: premiumAuthTheme.text, fontSize: 26, fontWeight: "900", letterSpacing: -0.7 },
});
