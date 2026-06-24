import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { giftSuperAdminLicense, listSuperAdminLicenses, listSuperAdminUsers } from "@/services/superAdmin";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LicenseDashboardScreen() {
  const colors = useColors();
  const { authToken } = useAuth();
  const [licenses, setLicenses] = useState<unknown[]>([]);
  const [gifts, setGifts] = useState<unknown[]>([]);
  const [firstUserId, setFirstUserId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function reload() {
    if (!authToken?.token) return;
    const [licensePayload, usersPayload] = await Promise.all([
      listSuperAdminLicenses(authToken.token),
      listSuperAdminUsers(authToken.token, new URLSearchParams({ page: "1", pageSize: "1" })),
    ]);
    setLicenses(licensePayload.licenses);
    setGifts(licensePayload.gifts);
    setFirstUserId(usersPayload.users[0]?.id ?? null);
  }

  useEffect(() => {
    reload().catch(() => {});
  }, [authToken?.token]);

  async function gift(duration: "1_MONTH" | "3_MONTHS" | "6_MONTHS" | "12_MONTHS" | "LIFETIME") {
    if (!authToken?.token || !firstUserId) return;
    await giftSuperAdminLicense(authToken.token, firstUserId, duration);
    setMessage(`${duration.replace("_", " ")} gift license created.`);
    await reload();
  }

  const styles = StyleSheet.create({
    card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: colors.radius.lg, borderWidth: 1, marginBottom: 10, padding: 16 },
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 120 },
    row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
    title: { color: colors.text, fontSize: 24, fontWeight: "800", marginBottom: 6 },
  });

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>License Dashboard</Text>
        <Text style={{ color: colors.textSecondary, marginBottom: 12 }}>Grant 1, 3, 6, 12 month, or lifetime gift licenses.</Text>
        {message ? <Text style={{ color: colors.primary, marginBottom: 12 }}>{message}</Text> : null}
        <View style={styles.row}>
          {(["1_MONTH", "3_MONTHS", "6_MONTHS", "12_MONTHS", "LIFETIME"] as const).map((duration) => (
            <Pressable key={duration} onPress={() => gift(duration)} style={{ backgroundColor: colors.primary, borderRadius: colors.radius.md, padding: 10 }}>
              <Text style={{ color: "#fff", fontWeight: "800" }}>{duration.replace("_", " ")}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.card}>
          <Text style={{ color: colors.text, fontWeight: "800" }}>Lifetime Licenses</Text>
          <Text style={{ color: colors.textSecondary }}>{JSON.stringify(licenses, null, 2).slice(0, 1000)}</Text>
        </View>
        <View style={styles.card}>
          <Text style={{ color: colors.text, fontWeight: "800" }}>Gift History</Text>
          <Text style={{ color: colors.textSecondary }}>{JSON.stringify(gifts, null, 2).slice(0, 1000)}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
