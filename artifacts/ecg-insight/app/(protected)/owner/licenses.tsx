import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Badge, Card, EmptyState, Field, formatDate, medicalTheme, PageSection, PrimaryButton, SectionHeader, StatCard } from "@/components/enterprise/EnterpriseUI";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/services/api";
import { grantOwnerLicense, listLicenses, updateOwnerLicense, type LicenseRecord, type SubscriptionPlanCode } from "@/services/subscriptions";
import { safeArray } from "@/utils/collections";

type UserOption = { email: string; id: string; name: string; username?: string };
type LicenseAction = "extend" | "resume" | "revoke" | "suspend";

const plans: SubscriptionPlanCode[] = ["free", "basic", "professional", "enterprise", "lifetime"];

export default function OwnerLicensesScreen() {
  const queryClient = useQueryClient();
  const { authToken, user } = useAuth();
  const token = authToken?.token;
  const [query, setQuery] = useState("");
  const [userId, setUserId] = useState("");
  const [plan, setPlan] = useState<SubscriptionPlanCode>("lifetime");
  const [startsAt, setStartsAt] = useState(new Date().toISOString().slice(0, 10));
  const [expiresAt, setExpiresAt] = useState("");
  const [lifetime, setLifetime] = useState(true);
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");

  const isOwner = user?.email?.toLowerCase() === "ahmedyahia3052@gmail.com";

  const licensesQuery = useQuery({
    enabled: !!token && isOwner,
    queryFn: () => listLicenses(token!),
    queryKey: ["owner-licenses", token],
    retry: false,
  });
  const usersQuery = useQuery({
    enabled: !!token && isOwner,
    queryFn: () => apiRequest<{ users: UserOption[] }>("/users", { accessToken: token! }),
    queryKey: ["owner-license-users", token],
    retry: false,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["owner-licenses", token] });
  const grantMutation = useMutation({
    mutationFn: () => grantOwnerLicense(token!, { expiresAt: lifetime ? undefined : expiresAt || undefined, lifetime, notes, plan, startsAt, userId }),
    onSuccess: () => {
      setMessage("License granted successfully.");
      return invalidate();
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Unable to grant license."),
  });
  const actionMutation = useMutation({
    mutationFn: ({ action, license }: { action: LicenseAction; license: LicenseRecord }) => updateOwnerLicense(token!, license.id, { action, expiresAt: action === "extend" ? expiresAt || license.expiryDate || undefined : undefined, notes }),
    onSuccess: (_payload, variables) => {
      setMessage(`License ${variables.action} completed.`);
      return invalidate();
    },
  });

  const licenses = safeArray(licensesQuery.data?.licenses);
  const filteredLicenses = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return licenses;
    return safeArray(licenses).filter((license) => [license.userName, license.email, license.username, license.status, license.subscriptionType].filter(Boolean).join(" ").toLowerCase().includes(needle));
  }, [licenses, query]);

  if (!isOwner) {
    return <EmptyState title="Owner access required" message="This hidden enterprise licensing system is available only to ahmedyahia3052@gmail.com." />;
  }

  return (
    <PageSection>
      <Card style={styles.hero}>
        <SectionHeader title="Owner License Management" subtitle="Hidden Developer Super Admin licensing system for lifetime and enterprise subscriptions." />
        {message ? <Text style={styles.success}>{message}</Text> : null}
      </Card>

      <View style={styles.stats}>
        <StatCard icon="award" label="Total Licenses" value={String(licenses.length)} />
        <StatCard icon="check-circle" label="Active Licenses" tone="success" value={String(safeArray(licenses).filter((item) => item.status === "ACTIVE").length)} />
        <StatCard icon="refresh-cw" label="Lifetime Licenses" value={String(safeArray(licenses).filter((item) => item.subscriptionType.toLowerCase().includes("lifetime")).length)} />
        <StatCard icon="alert-circle" label="Expired Licenses" tone="warning" value={String(safeArray(licenses).filter((item) => item.status === "EXPIRED").length)} />
      </View>

      <Card style={styles.form}>
        <SectionHeader title="Grant License" subtitle="Grant lifetime access or a subscription plan with optional expiration and notes." />
        <View style={styles.grid}>
          <Field label="Search Users" onChangeText={setQuery} placeholder="Search user/email..." value={query} />
          <Field label="Selected User ID" onChangeText={setUserId} placeholder="User UUID" value={userId} />
          <Field label="Start Date" onChangeText={setStartsAt} value={startsAt} />
          <Field label="Expiration Date" onChangeText={setExpiresAt} placeholder="YYYY-MM-DD or blank for lifetime" value={expiresAt} />
          <Field label="Notes" onChangeText={setNotes} value={notes} />
        </View>
        <View style={styles.actions}>
          {plans.map((item) => <PrimaryButton key={item} label={item} onPress={() => { setPlan(item); setLifetime(item === "lifetime"); }} variant={plan === item ? "primary" : "outline"} />)}
          <PrimaryButton label={lifetime ? "Lifetime: On" : "Lifetime: Off"} onPress={() => setLifetime((value) => !value)} variant={lifetime ? "primary" : "outline"} />
          <PrimaryButton disabled={!userId || grantMutation.isPending} label={grantMutation.isPending ? "Granting..." : "Grant License"} onPress={() => grantMutation.mutate()} />
        </View>
      </Card>

      <Card style={styles.form}>
        <SectionHeader title="Users" subtitle="Select a user to grant access." />
        {safeArray(usersQuery.data?.users).filter((item) => !query || [item.name, item.email, item.username].filter(Boolean).join(" ").toLowerCase().includes(query.toLowerCase())).slice(0, 10).map((item) => (
          <View key={item.id} style={styles.row}>
            <View style={styles.rowMain}>
              <Text style={styles.rowTitle}>{item.name}</Text>
              <Text style={styles.muted}>{item.email} • {item.username ?? "No username"}</Text>
            </View>
            <PrimaryButton label="Select" onPress={() => setUserId(item.id)} variant={userId === item.id ? "primary" : "outline"} />
          </View>
        ))}
      </Card>

      <Card style={styles.form}>
        <SectionHeader title="Active Licenses" subtitle="User, plan, lifecycle status, dates, lifetime flag, and owner actions." />
        {filteredLicenses.length ? filteredLicenses.map((license) => (
          <View key={license.id} style={styles.row}>
            <View style={styles.rowMain}>
              <Text style={styles.rowTitle}>User: {license.userName}</Text>
              <Text style={styles.muted}>Plan: {license.subscriptionType} • Status: {license.status}</Text>
              <Text style={styles.muted}>Start Date: {formatDate(license.startDate)} • Expiration Date: {formatDate(license.expiryDate ?? undefined)} • Lifetime: {license.subscriptionType.toLowerCase().includes("lifetime") || !license.expiryDate ? "Yes" : "No"}</Text>
            </View>
            <Badge label={license.status} tone={license.status === "ACTIVE" ? "success" : license.status === "SUSPENDED" ? "warning" : "critical"} />
            <View style={styles.actions}>
              <PrimaryButton label="Extend" onPress={() => actionMutation.mutate({ action: "extend", license })} variant="outline" />
              <PrimaryButton label="Suspend" onPress={() => actionMutation.mutate({ action: "suspend", license })} variant="outline" />
              <PrimaryButton label="Resume" onPress={() => actionMutation.mutate({ action: "resume", license })} variant="outline" />
              <PrimaryButton label="Revoke" onPress={() => actionMutation.mutate({ action: "revoke", license })} variant="danger" />
            </View>
          </View>
        )) : <EmptyState title="No licenses found" message="Grant a license or adjust search filters." />}
      </Card>
    </PageSection>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  form: { gap: 14 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  hero: { gap: 10 },
  muted: { color: medicalTheme.muted, fontSize: 12, fontWeight: "700" },
  row: { alignItems: "center", borderBottomColor: medicalTheme.border, borderBottomWidth: 1, flexDirection: "row", flexWrap: "wrap", gap: 12, paddingVertical: 12 },
  rowMain: { flex: 1, minWidth: 260 },
  rowTitle: { color: medicalTheme.text, fontSize: 15, fontWeight: "900" },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  success: { color: medicalTheme.success, fontSize: 13, fontWeight: "900" },
});
