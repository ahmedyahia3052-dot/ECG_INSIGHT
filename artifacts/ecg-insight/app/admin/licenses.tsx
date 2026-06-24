import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { listLicenses, revokeLicense, type LicenseRecord } from "@/services/subscriptions";
import { BoltBadge, BoltButton, BoltCard, BoltEmpty, BoltField, BoltHero, BoltScreen, BoltStat } from "@/components/bolt/BoltUI";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

type StatusFilter = "all" | "active" | "expired" | "revoked";
type TypeFilter = "all" | "lifetime" | "temporary";

function formatDate(value?: string | null) {
  if (!value) return "No expiry";
  return new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function normalized(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function statusTone(status: string) {
  const current = status.toUpperCase();
  if (current === "ACTIVE") return "success";
  if (current === "REVOKED") return "danger";
  if (current === "EXPIRED") return "warning";
  return "muted";
}

function LicenseCard({
  license,
  onRevoke,
  revoking,
}: {
  license: LicenseRecord;
  onRevoke: (license: LicenseRecord) => void;
  revoking: boolean;
}) {
  const colors = useColors();
  const active = license.status.toUpperCase() === "ACTIVE";
  const fields = [
    ["User Name", license.userName],
    ["Email", license.email],
    ["Username", license.username ?? "Not set"],
    ["Subscription Type", license.subscriptionType],
    ["Status", license.status],
    ["Start Date", formatDate(license.startDate)],
    ["Expiry Date", formatDate(license.expiryDate)],
    ["Granted By", license.grantedBy],
  ];

  return (
    <BoltCard style={styles.licenseCard}>
      <View style={styles.cardHeader}>
        <View style={styles.identity}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{license.userName}</Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>{license.email}</Text>
        </View>
        <BoltBadge label={license.status} tone={statusTone(license.status)} />
      </View>

      <View style={[styles.table, { borderColor: colors.border }]}>
        {fields.map(([label, value]) => (
          <View key={label} style={[styles.tableRow, { borderColor: colors.border }]}>
            <Text style={[styles.tableLabel, { color: colors.textSecondary }]}>{label}</Text>
            <Text style={[styles.tableValue, { color: colors.text }]}>{value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <BoltButton
          disabled={!active}
          icon="x-circle"
          label={active ? "Revoke License" : "License Revoked"}
          loading={revoking}
          onPress={() => onRevoke(license)}
          variant="danger"
        />
      </View>
    </BoltCard>
  );
}

export default function LicenseDashboardScreen() {
  const colors = useColors();
  const router = useRouter();
  const { authToken, isLoading, user } = useAuth();
  const [licenses, setLicenses] = useState<LicenseRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [revokingUserId, setRevokingUserId] = useState<string | null>(null);

  const isOwner = Boolean(user?.isOwner || user?.protectedOwner);

  async function reload() {
    if (!authToken?.token || !isOwner) return;
    setLoading(true);
    const licensePayload = await listLicenses(authToken.token);
    setLicenses(licensePayload.licenses);
    setLoading(false);
  }

  useEffect(() => {
    if (isLoading) return;
    if (!isOwner) {
      router.replace("/unauthorized" as never);
    }
  }, [isLoading, isOwner, router]);

  useEffect(() => {
    reload()
      .catch(() => {
        setMessage("Unable to load license records.");
        setLoading(false);
      });
  }, [authToken?.token, isOwner]);

  const filteredLicenses = useMemo(() => {
    const needle = normalized(query);
    return licenses.filter((license) => {
      const haystack = [
        license.userName,
        license.email,
        license.username,
        license.subscriptionType,
        license.status,
        license.grantedBy,
      ]
        .map(normalized)
        .join(" ");
      const statusMatches = statusFilter === "all" || normalized(license.status) === statusFilter;
      const typeMatches =
        typeFilter === "all" ||
        (typeFilter === "lifetime" && normalized(license.subscriptionType).includes("lifetime")) ||
        (typeFilter === "temporary" && !normalized(license.subscriptionType).includes("lifetime"));

      return (!needle || haystack.includes(needle)) && statusMatches && typeMatches;
    });
  }, [licenses, query, statusFilter, typeFilter]);

  async function handleRevoke(license: LicenseRecord) {
    if (!authToken?.token || license.status.toUpperCase() !== "ACTIVE") return;
    Alert.alert(
      "Revoke License",
      `Revoke ${license.subscriptionType} access for ${license.userName}? This immediately removes lifetime access from the account.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Revoke",
          style: "destructive",
          onPress: async () => {
            try {
              setRevokingUserId(license.userId);
              await revokeLicense(authToken.token, license.userId);
              setMessage(`License revoked for ${license.userName}.`);
              await reload();
            } catch {
              setMessage(`Unable to revoke license for ${license.userName}.`);
            } finally {
              setRevokingUserId(null);
            }
          },
        },
      ],
    );
  }

  if (!isOwner) return null;

  return (
    <BoltScreen>
      <BoltHero
        eyebrow="Owner only"
        subtitle="Review lifetime and enterprise license grants without exposing password hashes or internal database fields."
        title="License Dashboard"
      />

      <View style={styles.statsRow}>
        <BoltStat icon="award" label="Total Licenses" value={licenses.length} />
        <BoltStat icon="check-circle" label="Active" value={licenses.filter((license) => license.status.toUpperCase() === "ACTIVE").length} />
      </View>

      <BoltCard style={styles.controls}>
        <BoltField icon="search" onChangeText={setQuery} placeholder="Search by user, email, username, status, or grantor" value={query} />
        <View style={styles.filterGroup}>
          {(["all", "active", "revoked", "expired"] as const).map((filter) => (
            <Pressable
              key={filter}
              accessibilityRole="button"
              onPress={() => setStatusFilter(filter)}
              style={[
                styles.filterButton,
                {
                  backgroundColor: statusFilter === filter ? colors.primary : colors.muted,
                  borderColor: statusFilter === filter ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={[styles.filterText, { color: statusFilter === filter ? "#fff" : colors.text }]}>
                {filter === "all" ? "All Statuses" : filter}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.filterGroup}>
          {(["all", "lifetime", "temporary"] as const).map((filter) => (
            <Pressable
              key={filter}
              accessibilityRole="button"
              onPress={() => setTypeFilter(filter)}
              style={[
                styles.filterButton,
                {
                  backgroundColor: typeFilter === filter ? colors.primary : colors.muted,
                  borderColor: typeFilter === filter ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={[styles.filterText, { color: typeFilter === filter ? "#fff" : colors.text }]}>
                {filter === "all" ? "All Types" : filter}
              </Text>
            </Pressable>
          ))}
        </View>
      </BoltCard>

      {message ? <Text style={[styles.message, { color: colors.primary }]}>{message}</Text> : null}

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>License Records</Text>
        <Text style={[styles.resultCount, { color: colors.textSecondary }]}>
          {loading ? "Loading..." : `${filteredLicenses.length} shown`}
        </Text>
      </View>

      {filteredLicenses.length === 0 ? (
        <BoltEmpty title={loading ? "Loading licenses..." : "No licenses found"} message="Try adjusting search or filters." />
      ) : (
        filteredLicenses.map((license) => (
          <LicenseCard
            key={license.id}
            license={license}
            onRevoke={handleRevoke}
            revoking={revokingUserId === license.userId}
          />
        ))
      )}
    </BoltScreen>
  );
}

const styles = StyleSheet.create({
  actions: { alignItems: "flex-end" },
  cardHeader: { alignItems: "flex-start", flexDirection: "row", gap: 12, justifyContent: "space-between" },
  cardSubtitle: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 3 },
  cardTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  controls: { gap: 12 },
  filterButton: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  filterGroup: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterText: { fontFamily: "Inter_700Bold", fontSize: 12, textTransform: "capitalize" },
  identity: { flex: 1 },
  licenseCard: { gap: 14 },
  message: { fontFamily: "Inter_700Bold", fontSize: 14 },
  resultCount: { fontFamily: "Inter_500Medium", fontSize: 13 },
  sectionHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  statsRow: { flexDirection: "row", gap: 10 },
  table: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  tableLabel: { flex: 0.42, fontFamily: "Inter_700Bold", fontSize: 12, textTransform: "uppercase" },
  tableRow: { borderBottomWidth: 1, flexDirection: "row", gap: 12, paddingHorizontal: 12, paddingVertical: 10 },
  tableValue: { flex: 0.58, fontFamily: "Inter_500Medium", fontSize: 13, textAlign: "right" },
});
