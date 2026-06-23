import { useAuth } from "@/context/AuthContext";
import { type ManagedUser } from "@/data/mockData";
import { useColors } from "@/hooks/useColors";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Tier = "free" | "professional" | "enterprise";

const TIER_META: Record<Tier, { label: string; icon: string; color: string; features: string[] }> = {
  free: {
    label: "Free",
    icon: "🆓",
    color: "#6B7280",
    features: ["5 ECG analyses/month", "Basic AI interpretation", "PDF export", "Email support"],
  },
  professional: {
    label: "Professional",
    icon: "⭐",
    color: "#D97706",
    features: ["Unlimited ECG analyses", "Advanced AI + confidence scores", "Priority support", "Historical trends", "Team collaboration (up to 5)"],
  },
  enterprise: {
    label: "Enterprise",
    icon: "🏢",
    color: "#7C3AED",
    features: ["Everything in Professional", "Custom AI model training", "EHR/EMR integration", "Dedicated account manager", "SLA guarantee", "Unlimited team members"],
  },
};

function TierCard({ tier, managedUsers }: { tier: Tier; managedUsers: ManagedUser[] }) {
  const colors = useColors();
  const meta = TIER_META[tier];
  const users = managedUsers.filter((u) => u.subscriptionTier === tier);
  const active = users.filter((u) => u.isActive).length;

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: colors.radius.lg,
        padding: 18,
        marginBottom: 14,
        borderWidth: 1.5,
        borderColor: `${meta.color}40`,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: `${meta.color}20`,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 22 }}>{meta.icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>
            {meta.label}
          </Text>
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>
            {users.length} users • {active} active
          </Text>
        </View>
        <View
          style={{
            backgroundColor: `${meta.color}15`,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 6,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "800", color: meta.color }}>
            {users.length}
          </Text>
        </View>
      </View>

      <View style={{ gap: 6, marginBottom: 14 }}>
        {meta.features.map((f, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ color: meta.color, fontSize: 14 }}>✓</Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>{f}</Text>
          </View>
        ))}
      </View>

      {users.length > 0 && (
        <>
          <View
            style={{
              height: 1,
              backgroundColor: colors.border,
              marginBottom: 12,
            }}
          />
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: colors.textSecondary,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 8,
            }}
          >
            Users on this plan
          </Text>
          <View style={{ gap: 8 }}>
            {users.slice(0, 4).map((u) => (
              <View
                key={u.id}
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: u.isActive ? `${meta.color}20` : colors.border,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: u.isActive ? meta.color : colors.textSecondary,
                    }}
                  >
                    {u.avatarInitials}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: colors.text }}>
                    {u.name}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                    {u.role} • {u.isActive ? "Active" : "Inactive"}
                  </Text>
                </View>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                  {u.caseCount} cases
                </Text>
              </View>
            ))}
            {users.length > 4 && (
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                +{users.length - 4} more
              </Text>
            )}
          </View>
        </>
      )}
    </View>
  );
}

export default function SubscriptionsScreen() {
  const colors = useColors();
  const { managedUsers } = useAuth();

  const totalRevenue =
    managedUsers.filter((u) => u.subscriptionTier === "professional").length * 49 +
    managedUsers.filter((u) => u.subscriptionTier === "enterprise").length * 199;

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16 },
    summaryCard: {
      backgroundColor: colors.primary,
      borderRadius: colors.radius.lg,
      padding: 20,
      marginBottom: 20,
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
    },
    summaryIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: "rgba(255,255,255,0.2)",
      alignItems: "center",
      justifyContent: "center",
    },
    mrrLabel: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginBottom: 4 },
    mrrValue: { fontSize: 30, fontWeight: "900", color: "#fff" },
    mrrSub: { fontSize: 12, color: "rgba(255,255,255,0.7)" },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 12,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Text style={{ fontSize: 26 }}>💰</Text>
          </View>
          <View>
            <Text style={styles.mrrLabel}>Monthly Recurring Revenue</Text>
            <Text style={styles.mrrValue}>${totalRevenue.toLocaleString()}</Text>
            <Text style={styles.mrrSub}>
              {managedUsers.filter((u) => u.subscriptionTier !== "free").length} paid subscribers
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Subscription Plans</Text>
        {(["enterprise", "professional", "free"] as Tier[]).map((tier) => (
          <TierCard key={tier} tier={tier} managedUsers={managedUsers} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
