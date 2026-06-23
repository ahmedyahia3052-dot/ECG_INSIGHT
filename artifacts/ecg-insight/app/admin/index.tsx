import { useAuth } from "@/context/AuthContext";
import { MOCK_CASES } from "@/data/mockData";
import { useColors } from "@/hooks/useColors";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  accent: string;
}

function StatCard({ label, value, icon, accent }: StatCardProps) {
  const colors = useColors();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: colors.radius.lg,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 8,
        minWidth: "45%",
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: `${accent}20`,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 18 }}>{icon}</Text>
      </View>
      <Text style={{ fontSize: 26, fontWeight: "800", color: colors.text }}>
        {value}
      </Text>
      <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: "500" }}>
        {label}
      </Text>
    </View>
  );
}

interface MenuItemProps {
  icon: string;
  title: string;
  description: string;
  badge?: string;
  badgeColor?: string;
  onPress: () => void;
}

function MenuItem({ icon, title, description, badge, badgeColor, onPress }: MenuItemProps) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? colors.border : colors.surface,
        borderRadius: colors.radius.lg,
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 10,
      })}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: colors.primaryLight,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 22 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }}>
          {title}
        </Text>
        <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
          {description}
        </Text>
      </View>
      {badge && (
        <View
          style={{
            backgroundColor: badgeColor ?? colors.primary,
            borderRadius: 12,
            paddingHorizontal: 8,
            paddingVertical: 3,
          }}
        >
          <Text style={{ fontSize: 12, color: "#fff", fontWeight: "700" }}>
            {badge}
          </Text>
        </View>
      )}
      <Text style={{ fontSize: 18, color: colors.textSecondary }}>›</Text>
    </Pressable>
  );
}

export default function AdminDashboard() {
  const colors = useColors();
  const { user, isImpersonating, stopImpersonation, managedUsers } = useAuth();
  const router = useRouter();
  const stats = {
    active: managedUsers.filter((u) => u.isActive).length,
    doctors: managedUsers.filter((u) => u.role === "doctor").length,
    enterprise: managedUsers.filter((u) => u.subscriptionTier === "enterprise").length,
    inactive: managedUsers.filter((u) => !u.isActive).length,
    professional: managedUsers.filter((u) => u.subscriptionTier === "professional").length,
    students: managedUsers.filter((u) => u.role === "student").length,
    total: managedUsers.length,
    totalCases: MOCK_CASES.length,
    unverified: managedUsers.filter((u) => !u.emailVerified).length,
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16 },
    banner: {
      backgroundColor: "#FEF3C7",
      borderWidth: 1,
      borderColor: "#FDE68A",
      borderRadius: colors.radius.lg,
      padding: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 16,
    },
    bannerText: { flex: 1, fontSize: 13, color: "#92400E" },
    stopBtn: {
      backgroundColor: "#D97706",
      borderRadius: colors.radius.sm,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    stopBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
    roleChip: {
      backgroundColor: user?.role === "super_admin" ? "#7C3AED20" : colors.primaryLight,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
    },
    roleText: {
      fontSize: 12,
      color: user?.role === "super_admin" ? "#7C3AED" : colors.primary,
      fontWeight: "700",
      textTransform: "uppercase",
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginTop: 20,
      marginBottom: 12,
    },
    statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 4 },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 4,
    },
    greeting: { fontSize: 22, fontWeight: "800", color: colors.text },
    sub: { fontSize: 13, color: colors.textSecondary, marginBottom: 16 },
  });

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        {isImpersonating && (
          <View style={styles.banner}>
            <Text style={{ fontSize: 18 }}>👤</Text>
            <Text style={styles.bannerText}>
              You are viewing as <Text style={{ fontWeight: "700" }}>{user?.name}</Text>
            </Text>
            <Pressable style={styles.stopBtn} onPress={stopImpersonation}>
              <Text style={styles.stopBtnText}>Exit</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Admin Panel</Text>
            <Text style={styles.sub}>Platform overview & management</Text>
          </View>
          <View style={styles.roleChip}>
            <Text style={styles.roleText}>
              {user?.role === "super_admin" ? "Super Admin" : "Admin"}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Platform Stats</Text>
        <View style={styles.statsGrid}>
          <StatCard label="Total Users" value={stats.total} icon="👥" accent="#0D9488" />
          <StatCard label="Active Users" value={stats.active} icon="✅" accent="#10B981" />
          <StatCard label="Doctors" value={stats.doctors} icon="🩺" accent="#06B6D4" />
          <StatCard label="Students" value={stats.students} icon="📚" accent="#8B5CF6" />
          <StatCard label="Total ECG Cases" value={stats.totalCases} icon="📊" accent="#F59E0B" />
          <StatCard label="Inactive Users" value={stats.inactive} icon="⏸️" accent="#EF4444" />
        </View>

        <Text style={styles.sectionTitle}>Subscription Tiers</Text>
        <View style={styles.statsGrid}>
          <StatCard label="Free" value={stats.total - stats.professional - stats.enterprise} icon="🆓" accent="#6B7280" />
          <StatCard label="Professional" value={stats.professional} icon="⭐" accent="#F59E0B" />
          <StatCard label="Enterprise" value={stats.enterprise} icon="🏢" accent="#7C3AED" />
          <StatCard label="Unverified Email" value={stats.unverified} icon="✉️" accent="#EF4444" />
        </View>

        <Text style={styles.sectionTitle}>Management</Text>
        <MenuItem
          icon="👤"
          title="User Management"
          description="View, activate, deactivate, and impersonate users"
          badge={String(stats.total)}
          onPress={() => router.push("/admin/users")}
        />
        <MenuItem
          icon="💳"
          title="Subscriptions"
          description="Manage user subscription tiers and billing"
          badge={String(stats.professional + stats.enterprise) + " paid"}
          badgeColor="#7C3AED"
          onPress={() => router.push("/admin/subscriptions")}
        />
        <MenuItem
          icon="📄"
          title="Document Center"
          description="OCR, extraction, indexing, and AI clinical summaries"
          badge="AI"
          badgeColor="#0D9488"
          onPress={() => router.push("/document-center")}
        />
        <MenuItem
          icon="🔎"
          title="Advanced Search"
          description="Search patients, documents, employees, and knowledge"
          badge="Global"
          badgeColor="#2563EB"
          onPress={() => router.push("/advanced-search")}
        />
        <MenuItem
          icon="📚"
          title="Knowledge Library"
          description="Guidelines, policies, fitness standards, and references"
          badge="KB"
          badgeColor="#7C3AED"
          onPress={() => router.push("/knowledge-library")}
        />
        <MenuItem
          icon="〽️"
          title="ECG Waveform Viewer"
          description="Multi-lead ECG parsing, measurements, and annotations"
          badge="DICOM"
          badgeColor="#0D9488"
          onPress={() => router.push("/ecg-waveform")}
        />
        <MenuItem
          icon="🖼️"
          title="DICOM Viewer"
          description="Zoom, pan, overlay measurements, and multi-lead display"
          badge="Viewer"
          badgeColor="#2563EB"
          onPress={() => router.push("/dicom-viewer")}
        />
        <MenuItem
          icon="🔁"
          title="ECG Comparison"
          description="Compare serial ECGs for ST, rhythm, rate, and interval changes"
          badge="Serial"
          badgeColor="#F59E0B"
          onPress={() => router.push("/ecg-comparison")}
        />
        <MenuItem
          icon="🏥"
          title="PACS Browser"
          description="DICOM Query/Retrieve and ECG study store"
          badge="PACS"
          badgeColor="#DC2626"
          onPress={() => router.push("/pacs-browser")}
        />
        <MenuItem
          icon="🔌"
          title="Hospital Integration"
          description="HL7/FHIR export, import, and integration logs"
          badge="FHIR"
          badgeColor="#7C3AED"
          onPress={() => router.push("/hospital-integration")}
        />
        <MenuItem
          icon="🤖"
          title="AI Clinical Assistant"
          description="Patient summaries, explanations, ECG comparisons, and Q&A"
          badge="AI"
          badgeColor="#0D9488"
          onPress={() => router.push("/ai-assistant")}
        />
        <MenuItem
          icon="📈"
          title="Risk Dashboard"
          description="Predictive SCD, MACE, occupational unfitness, and arrhythmia risk"
          badge="Risk"
          badgeColor="#DC2626"
          onPress={() => router.push("/risk-dashboard")}
        />
        <MenuItem
          icon="📉"
          title="Trend Dashboard"
          description="EF, heart rate, QTc, blood pressure, and weight trends"
          badge="Trends"
          badgeColor="#2563EB"
          onPress={() => router.push("/trend-dashboard")}
        />
        <MenuItem
          icon="🏭"
          title="Population Analytics"
          description="Organization, department, and contractor cardiology KPIs"
          badge="KPIs"
          badgeColor="#7C3AED"
          onPress={() => router.push("/population-analytics")}
        />
        <MenuItem
          icon="🚨"
          title="Clinical Alerts"
          description="EF, STEMI, long QT, arrhythmia, and certificate alerts"
          badge="Alerts"
          badgeColor="#F59E0B"
          onPress={() => router.push("/clinical-alerts")}
        />
        <MenuItem
          icon="🔐"
          title="Security Dashboard"
          description="MFA, suspicious access, failed logins, and security events"
          badge="SOC"
          badgeColor="#DC2626"
          onPress={() => router.push("/security-dashboard")}
        />
        <MenuItem
          icon="🧾"
          title="Audit Dashboard"
          description="Enterprise audit trail for clinical and administrative actions"
          badge="Audit"
          badgeColor="#2563EB"
          onPress={() => router.push("/audit-dashboard")}
        />
        <MenuItem
          icon="⚖️"
          title="Compliance Dashboard"
          description="HIPAA/GDPR consent, export, erasure, and access workflows"
          badge="GDPR"
          badgeColor="#7C3AED"
          onPress={() => router.push("/compliance-dashboard")}
        />
        <MenuItem
          icon="💾"
          title="Backup Dashboard"
          description="Backup status, restore readiness, retention, and checksums"
          badge="DR"
          badgeColor="#0D9488"
          onPress={() => router.push("/backup-dashboard")}
        />
        <MenuItem
          icon="🖥️"
          title="Session Dashboard"
          description="Active sessions, MFA state, trusted devices, and timeouts"
          badge="MFA"
          badgeColor="#F59E0B"
          onPress={() => router.push("/session-dashboard")}
        />
        <MenuItem
          icon="🔔"
          title="Notification Center"
          description="Push abstraction, realtime notifications, and preferences"
          badge="Push"
          badgeColor="#0D9488"
          onPress={() => router.push("/notification-center")}
        />
        <MenuItem
          icon="🔄"
          title="Sync Dashboard"
          description="Offline queue, encrypted cache, retry, and conflict status"
          badge="Offline"
          badgeColor="#2563EB"
          onPress={() => router.push("/sync-dashboard")}
        />
        <MenuItem
          icon="👥"
          title="Collaboration Dashboard"
          description="Teams, department groups, messaging, and case collaboration"
          badge="Teams"
          badgeColor="#7C3AED"
          onPress={() => router.push("/collaboration-dashboard")}
        />
        <MenuItem
          icon="✅"
          title="Task Dashboard"
          description="Assigned ECG reviews, consultations, due dates, and comments"
          badge="Tasks"
          badgeColor="#F59E0B"
          onPress={() => router.push("/task-dashboard")}
        />
        <MenuItem
          icon="🚦"
          title="Alert Dashboard"
          description="Critical ECG, worker risk, certificate, and security alerts"
          badge="Alerts"
          badgeColor="#DC2626"
          onPress={() => router.push("/alert-dashboard")}
        />
        {user?.role === "super_admin" && (
          <MenuItem
            icon="🛡️"
            title="Super Admin Tools"
            description="Internal accounts, system config & developer tools"
            badge="Dev Only"
            badgeColor="#DC2626"
            onPress={() => router.push("/admin/users")}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
