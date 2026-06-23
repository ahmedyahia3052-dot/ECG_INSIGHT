import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";

export default function AdminLayout() {
  const colors = useColors();
  const { user, canAccess, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user || !canAccess("admin")) {
      router.replace("/(tabs)/" as any);
    }
  }, [user, isLoading, canAccess, router]);

  if (!user || !canAccess("admin")) return null;

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
