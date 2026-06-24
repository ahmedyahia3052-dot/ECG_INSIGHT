import { useAuth } from "@/context/AuthContext";
import { type ManagedUser } from "@/data/mockData";
import { useColors } from "@/hooks/useColors";
import {
  changeSuperAdminUserPlan,
  deleteSuperAdminUser,
  grantSuperAdminLifetime,
  listSuperAdminUsers,
  superAdminUserAction,
  type SuperAdminUser,
} from "@/services/superAdmin";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type FilterTab = "all" | "active" | "inactive" | "unverified";
type CreateRole = "doctor" | "student" | "admin";
type AdminUser = ManagedUser & { isLifetime?: boolean };

function RoleBadge({ role }: { role: string }) {
  const colors = useColors();
  const map: Record<string, { bg: string; text: string }> = {
    super_admin: { bg: "#7C3AED20", text: "#7C3AED" },
    admin: { bg: "#06B6D420", text: "#0891B2" },
    doctor: { bg: `${colors.primary}20`, text: colors.primary },
    student: { bg: "#F59E0B20", text: "#D97706" },
  };
  const style = map[role] ?? { bg: colors.border, text: colors.textSecondary };
  return (
    <View style={{ backgroundColor: style.bg, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ fontSize: 11, color: style.text, fontWeight: "700", textTransform: "capitalize" }}>
        {role.replace("_", " ")}
      </Text>
    </View>
  );
}

function UserCard({
  onAdminAction,
  u,
  isSuperAdmin,
}: {
  onAdminAction: (userId: string, action: "delete" | "disable" | "enable" | "force-logout" | "grant-lifetime" | "plan-enterprise" | "plan-free" | "plan-pro" | "reset-password") => void;
  u: AdminUser;
  isSuperAdmin: boolean;
}) {
  const colors = useColors();
  const { impersonateUser, user: currentUser } = useAuth();
  const router = useRouter();
  const isSelf = currentUser?.id === u.id;

  async function handleImpersonate() {
    Alert.alert(
      "Impersonate User",
      `You will browse ECG Insight as ${u.name}. A banner will indicate active impersonation.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Impersonate",
          onPress: async () => {
            await impersonateUser(u.id);
            router.replace("/(tabs)/" as any);
          },
        },
      ]
    );
  }

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: colors.radius.lg,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: u.isActive ? colors.border : "#FCA5A520",
        opacity: u.isActive ? 1 : 0.75,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: u.isActive ? colors.primaryLight : colors.border,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "700", color: u.isActive ? colors.primary : colors.textSecondary }}>
            {u.avatarInitials}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }} numberOfLines={1}>
              {u.name}
            </Text>
            {isSelf && (
              <Text style={{ fontSize: 11, color: colors.primary, fontWeight: "600" }}>(you)</Text>
            )}
          </View>
          <Text style={{ fontSize: 12, color: colors.textSecondary }} numberOfLines={1}>
            {u.email}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          <RoleBadge role={u.role} />
          <View
            style={{
              backgroundColor: u.isActive ? "#DCFCE7" : "#FEE2E2",
              borderRadius: 10,
              paddingHorizontal: 8,
              paddingVertical: 2,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                color: u.isActive ? "#15803D" : "#DC2626",
                fontWeight: "600",
              }}
            >
              {u.isActive ? "Active" : "Inactive"}
            </Text>
          </View>
        </View>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        {u.institution && (
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>
            🏥 {u.institution}
          </Text>
        )}
        <Text style={{ fontSize: 12, color: colors.textSecondary }}>
          📊 {u.caseCount} cases
        </Text>
        <Text style={{ fontSize: 12, color: u.emailVerified ? "#15803D" : "#D97706" }}>
          {u.emailVerified ? "✓ Verified" : "⚠ Unverified"}
        </Text>
        <Text style={{ fontSize: 12, color: colors.textSecondary }}>
          💳 {u.isLifetime ? "lifetime" : u.subscriptionTier}
        </Text>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {!isSelf && (
          <Pressable
            onPress={() => onAdminAction(u.id, u.isActive ? "disable" : "enable")}
            style={({ pressed }) => ({
              minWidth: "30%",
              backgroundColor: pressed
                ? colors.border
                : u.isActive
                ? "#FEE2E2"
                : "#DCFCE7",
              borderRadius: colors.radius.md,
              paddingVertical: 8,
              alignItems: "center",
            })}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: u.isActive ? "#DC2626" : "#15803D",
              }}
            >
              {u.isActive ? "Deactivate" : "Activate"}
            </Text>
          </Pressable>
        )}
        {isSuperAdmin && !isSelf && (
          <>
            <Pressable
              onPress={handleImpersonate}
              style={({ pressed }) => ({ minWidth: "30%", backgroundColor: pressed ? "#7C3AED30" : "#7C3AED15", borderRadius: colors.radius.md, paddingHorizontal: 10, paddingVertical: 8, alignItems: "center" })}
            >
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#7C3AED" }}>Impersonate</Text>
            </Pressable>
            {(["reset-password", "force-logout", "plan-free", "plan-pro", "plan-enterprise", "grant-lifetime", "delete"] as const).map((action) => (
              <Pressable
                key={action}
                onPress={() => onAdminAction(u.id, action)}
                style={({ pressed }) => ({ minWidth: "30%", backgroundColor: pressed ? colors.border : colors.surface, borderRadius: colors.radius.md, borderColor: colors.border, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8, alignItems: "center" })}
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: action === "grant-lifetime" ? "#D97706" : colors.primary }}>
                  {action === "reset-password" ? "Reset" : action === "force-logout" ? "Logout" : action === "plan-free" ? "Free" : action === "plan-pro" ? "Pro" : action === "plan-enterprise" ? "Enterprise" : action === "delete" ? "Delete" : "Lifetime"}
                </Text>
              </Pressable>
            ))}
          </>
        )}
      </View>
    </View>
  );
}

export default function UsersScreen() {
  const colors = useColors();
  const { authToken, managedUsers, user, createInternalAccount } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";
  const [liveUsers, setLiveUsers] = useState<AdminUser[]>([]);
  const [actionMessage, setActionMessage] = useState("");

  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<CreateRole>("doctor");
  const [createError, setCreateError] = useState("");

  async function reloadUsers() {
    if (!authToken?.token || !isSuperAdmin) return;
    const params = new URLSearchParams({ page: "1", pageSize: "100", q: search });
    const payload = await listSuperAdminUsers(authToken.token, params);
    setLiveUsers(payload.users.map((u: SuperAdminUser) => ({
      avatarInitials: u.avatarInitials,
      caseCount: 0,
      email: u.email,
      emailVerified: u.emailVerified,
      id: u.id,
      isActive: u.isActive,
      isLifetime: u.isLifetime,
      joinedDate: "",
      lastActive: "",
      name: u.name,
      role: u.role as AdminUser["role"],
      subscriptionTier: (u.subscriptionTier === "pro" ? "professional" : u.subscriptionTier) as AdminUser["subscriptionTier"],
    })));
  }

  useEffect(() => {
    reloadUsers().catch(() => {});
  }, [authToken?.token, isSuperAdmin, search]);

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "inactive", label: "Inactive" },
    { key: "unverified", label: "Unverified" },
  ];

  const sourceUsers = liveUsers.length ? liveUsers : (managedUsers as AdminUser[]);
  const filtered = sourceUsers.filter((u) => {
    if (filter === "active" && !u.isActive) return false;
    if (filter === "inactive" && u.isActive) return false;
    if (filter === "unverified" && u.emailVerified) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.includes(q)
      );
    }
    return true;
  });

  async function handleCreate() {
    setCreateError("");
    if (!newName.trim()) { setCreateError("Name is required."); return; }
    if (!newEmail.trim() || !newEmail.includes("@")) { setCreateError("Valid email required."); return; }
    if (!isSuperAdmin) { setCreateError("Only Super Admins can create internal accounts."); return; }
    try {
      await createInternalAccount(newName.trim(), newEmail.trim(), newRole);
      await reloadUsers().catch(() => {});
      setNewName(""); setNewEmail(""); setNewRole("doctor");
      setShowCreate(false);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Could not create account.");
    }
  }

  async function handleAdminAction(userId: string, action: "delete" | "disable" | "enable" | "force-logout" | "grant-lifetime" | "plan-enterprise" | "plan-free" | "plan-pro" | "reset-password") {
    if (!authToken?.token) return;
    try {
      if (action === "delete") {
        await deleteSuperAdminUser(authToken.token, userId);
      } else if (action.startsWith("plan-")) {
        await changeSuperAdminUserPlan(authToken.token, userId, action === "plan-free" ? "FREE" : action === "plan-pro" ? "PRO" : "ENTERPRISE");
      } else if (action === "grant-lifetime") {
        await grantSuperAdminLifetime(authToken.token, userId);
      } else if (action === "disable" || action === "enable" || action === "force-logout" || action === "reset-password") {
        const result = await superAdminUserAction(authToken.token, userId, action);
        if (result.resetPassword) setActionMessage(`Temporary password: ${result.resetPassword}`);
      } else {
        setActionMessage("Unsupported admin action.");
      }
      await reloadUsers();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Admin action failed.");
    }
  }

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    searchBar: {
      backgroundColor: colors.surface,
      borderRadius: colors.radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.text,
      margin: 16,
      marginBottom: 8,
    },
    tabRow: {
      flexDirection: "row",
      paddingHorizontal: 16,
      gap: 8,
      marginBottom: 12,
    },
    tab: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
    },
    tabText: { fontSize: 13, fontWeight: "600" },
    fab: {
      position: "absolute",
      bottom: 24,
      right: 24,
      backgroundColor: colors.primary,
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 8,
    },
    modal: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0,0,0,0.4)",
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingBottom: 40,
    },
    sheetTitle: { fontSize: 20, fontWeight: "700", color: colors.text, marginBottom: 20 },
    label: { fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 6 },
    input: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: colors.radius.md,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.text,
      marginBottom: 16,
    },
    roleRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
    roleBtn: { flex: 1, paddingVertical: 10, borderRadius: colors.radius.md, alignItems: "center" },
  });

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <TextInput
        style={styles.searchBar}
        placeholder="Search users..."
        placeholderTextColor={colors.textSecondary}
        value={search}
        onChangeText={setSearch}
      />

      <View style={styles.tabRow}>
        {tabs.map((t) => (
          <Pressable
            key={t.key}
            style={[
              styles.tab,
              {
                backgroundColor:
                  filter === t.key ? colors.primary : colors.surface,
                borderWidth: 1,
                borderColor: filter === t.key ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setFilter(t.key)}
          >
            <Text
              style={[
                styles.tabText,
                { color: filter === t.key ? "#fff" : colors.textSecondary },
              ]}
            >
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}>
        <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 12 }}>
          {filtered.length} user{filtered.length !== 1 ? "s" : ""} found
        </Text>
        {actionMessage ? <Text style={{ color: colors.primary, marginBottom: 12 }}>{actionMessage}</Text> : null}
        {filtered.map((u) => (
          <UserCard key={u.id} u={u} isSuperAdmin={isSuperAdmin} onAdminAction={handleAdminAction} />
        ))}
      </ScrollView>

      {isSuperAdmin && (
        <Pressable style={styles.fab} onPress={() => setShowCreate(true)}>
          <Text style={{ fontSize: 24, color: "#fff" }}>+</Text>
        </Pressable>
      )}

      <Modal visible={showCreate} animationType="slide" transparent onRequestClose={() => setShowCreate(false)}>
        <Pressable style={styles.modal} onPress={() => setShowCreate(false)}>
          <Pressable
            style={styles.sheet}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.sheetTitle}>Create Internal Account</Text>

            {createError ? (
              <View style={{ backgroundColor: "#FEF2F2", borderRadius: colors.radius.md, padding: 10, marginBottom: 14 }}>
                <Text style={{ color: colors.destructive, fontSize: 13 }}>{createError}</Text>
              </View>
            ) : null}

            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Dr. Jane Smith"
              placeholderTextColor={colors.textSecondary}
              value={newName}
              onChangeText={setNewName}
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="internal@ecginsight.com"
              placeholderTextColor={colors.textSecondary}
              value={newEmail}
              onChangeText={setNewEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Role</Text>
            <View style={styles.roleRow}>
              {(["doctor", "student", "admin"] as CreateRole[]).map((r) => (
                <Pressable
                  key={r}
                  style={[
                    styles.roleBtn,
                    {
                      backgroundColor: newRole === r ? colors.primary : colors.background,
                      borderWidth: 1,
                      borderColor: newRole === r ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setNewRole(r)}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: newRole === r ? "#fff" : colors.textSecondary,
                      textTransform: "capitalize",
                    }}
                  >
                    {r}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={{ backgroundColor: colors.primary, borderRadius: colors.radius.md, height: 50, alignItems: "center", justifyContent: "center" }}
              onPress={handleCreate}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
                Create Account
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
