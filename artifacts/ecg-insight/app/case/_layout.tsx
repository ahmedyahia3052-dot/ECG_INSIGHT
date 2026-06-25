import { Redirect, Stack } from "expo-router";
import React from "react";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { BoltEcgLoader, BoltScreen } from "@/components/bolt/BoltUI";

export default function CaseLayout() {
  const colors = useColors();
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <BoltScreen>
        <BoltEcgLoader label="Loading ECG case workspace" />
      </BoltScreen>
    );
  }
  if (!isAuthenticated) return <Redirect href="/login" />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.primary,
        headerTitleStyle: { fontFamily: "Inter_600SemiBold", color: colors.foreground },
        headerShadowVisible: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="[id]" options={{ title: "Case Report" }} />
    </Stack>
  );
}
