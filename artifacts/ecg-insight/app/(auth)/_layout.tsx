import { Stack } from "expo-router";
import React from "react";
import { useColors } from "@/hooks/useColors";

export default function AuthLayout() {
  const colors = useColors();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: "fade",
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen
        name="forgot-password"
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen name="reset-password" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="verify-email" options={{ animation: "slide_from_right" }} />
    </Stack>
  );
}
