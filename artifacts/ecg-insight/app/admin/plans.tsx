import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { listSuperAdminPlans, upsertSuperAdminPlan, type SuperAdminPlan } from "@/services/superAdmin";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PlanManagementScreen() {
  const colors = useColors();
  const { authToken } = useAuth();
  const [plans, setPlans] = useState<SuperAdminPlan[]>([]);
  const [message, setMessage] = useState("");
  const [price, setPrice] = useState("4900");

  async function reload() {
    if (!authToken?.token) return;
    setPlans((await listSuperAdminPlans(authToken.token)).plans.filter((plan) => plan.plan !== "lifetime"));
  }

  useEffect(() => {
    reload().catch((error) => setMessage(error instanceof Error ? error.message : "Could not load plans."));
  }, [authToken?.token]);

  async function saveProPlan() {
    if (!authToken?.token) return;
    await upsertSuperAdminPlan(authToken.token, {
      currency: "USD",
      features: ["Monthly ECG quota", "Billing history", "Digital ECG exports"],
      isActive: true,
      monthlyQuota: 500,
      name: "Pro",
      plan: "PRO",
      price: Number(price),
    });
    setMessage("Pro plan saved.");
    await reload();
  }

  const styles = StyleSheet.create({
    card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: colors.radius.lg, borderWidth: 1, gap: 8, marginBottom: 10, padding: 16 },
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 120 },
    input: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: colors.radius.md, borderWidth: 1, color: colors.text, marginBottom: 10, padding: 12 },
    title: { color: colors.text, fontSize: 24, fontWeight: "800", marginBottom: 6 },
  });

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Plan Management</Text>
        <Text style={{ color: colors.textSecondary, marginBottom: 12 }}>Create, edit, activate, and deactivate FREE, BASIC, PRO, and ENTERPRISE plans. Lifetime access is managed privately from user details.</Text>
        {message ? <Text style={{ color: colors.primary, marginBottom: 12 }}>{message}</Text> : null}
        <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="number-pad" placeholder="Pro price cents" placeholderTextColor={colors.textSecondary} />
        <Pressable onPress={saveProPlan} style={{ backgroundColor: colors.primary, borderRadius: colors.radius.md, marginBottom: 16, padding: 14 }}>
          <Text style={{ color: "#fff", fontWeight: "800", textAlign: "center" }}>Save Pro Plan</Text>
        </Pressable>
        {plans.map((plan) => (
          <View key={plan.id} style={styles.card}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: "800" }}>{plan.name} · {plan.plan.toUpperCase()}</Text>
            <Text style={{ color: colors.textSecondary }}>${(plan.price / 100).toLocaleString()} {plan.currency} · Quota {plan.monthlyQuota ?? "Unlimited"} · {plan.isActive ? "Active" : "Inactive"}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
