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
import { ToastProvider } from "@/components/interaction/PremiumInteraction";
import { MobileSyncStatus } from "@/components/mobile/MobileSyncStatus";
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

function captureFrontendError(error: unknown, context: string) {
  // Keep production users on a graceful UI while still surfacing diagnostics locally.
  console.error(`[ECG Insight] ${context}`, error);
}

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

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onError = (event: ErrorEvent) => captureFrontendError(event.error ?? event.message, "Unhandled frontend error");
    const onRejection = (event: PromiseRejectionEvent) => captureFrontendError(event.reason, "Unhandled promise rejection");
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

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
      <ErrorBoundary onError={(error, stackTrace) => captureFrontendError({ error, stackTrace }, "React error boundary")}>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <AuthProvider>
              <ToastProvider>
                <RootLayoutNav />
                <AuthenticatedChrome />
              </ToastProvider>
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
