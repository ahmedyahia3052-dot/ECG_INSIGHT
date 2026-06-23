import { Stack } from "expo-router";
import React from "react";
import { useColors } from "@/hooks/useColors";

export default function CaseLayout() {
  const colors = useColors();
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
