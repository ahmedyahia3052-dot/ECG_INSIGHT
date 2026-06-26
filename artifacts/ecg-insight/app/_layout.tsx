import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { MobileSyncStatus } from "@/components/mobile/MobileSyncStatus";
import { LiveNotificationBell } from "@/components/notifications/LiveNotificationBell";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ApiError } from "@/services/api";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry(failureCount, error) {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
        return failureCount < 2;
      },
      staleTime: 30_000,
    },
  },
});

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
      <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
      <Stack.Screen name="verify-email" options={{ headerShown: false }} />
      <Stack.Screen name="privacy-policy" options={{ headerShown: false }} />
      <Stack.Screen name="terms-of-service" options={{ headerShown: false }} />
      <Stack.Screen name="contact-support" options={{ headerShown: false }} />
      <Stack.Screen name="system-status" options={{ headerShown: false }} />
      <Stack.Screen name="(protected)" options={{ headerShown: false }} />
    </Stack>
  );
}

function AuthenticatedChrome() {
  const segments = useSegments();
  const { isAuthenticated } = useAuth();
  const routeRoot = segments[0];
  const isAuthRoute =
    routeRoot === "login" ||
    routeRoot === "register" ||
    routeRoot === "forgot-password" ||
    routeRoot === "verify-email" ||
    routeRoot === "privacy-policy" ||
    routeRoot === "terms-of-service" ||
    routeRoot === "contact-support" ||
    routeRoot === "system-status";

  if (!isAuthenticated || isAuthRoute) return null;

  return (
    <>
      <LiveNotificationBell />
      <MobileSyncStatus />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return (
      <View style={styles.bootScreen}>
        <Text style={styles.bootTitle}>Preparing ECG Insight</Text>
        <Text style={styles.bootText}>Loading clinical workspace...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider style={styles.appRoot}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <AuthProvider>
              <RootLayoutNav />
              <AuthenticatedChrome />
            </AuthProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  bootScreen: {
    alignItems: "center",
    backgroundColor: "#050816",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  appRoot: { flex: 1 },
  bootText: { color: "#94A3B8", fontSize: 13, marginTop: 8 },
  bootTitle: { color: "#F8FAFC", fontSize: 18, fontWeight: "700" },
});
