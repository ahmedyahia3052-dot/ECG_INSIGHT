import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";

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

  if (!user || user.role !== "super_admin") return null;

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
