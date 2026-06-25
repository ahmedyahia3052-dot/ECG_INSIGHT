import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";

export default function AdminLayout() {
  const colors = useColors();
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user || user.role !== "super_admin") {
      router.replace("/unauthorized" as any);
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <View style={[styles.state, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>Loading admin workspace...</Text>
      </View>
    );
  }

  if (!user || user.role !== "super_admin") {
    return (
      <View style={[styles.state, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>Redirecting to unauthorized page...</Text>
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text, fontWeight: "700" },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: "Admin Dashboard", headerBackTitle: "Back" }}
      />
      <Stack.Screen
        name="users"
        options={{ title: "User Management", headerBackTitle: "Admin" }}
      />
      <Stack.Screen
        name="subscriptions"
        options={{ title: "Subscriptions", headerBackTitle: "Admin" }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  state: { alignItems: "center", flex: 1, justifyContent: "center", padding: 24 },
  title: { fontSize: 16, fontWeight: "700" },
});
