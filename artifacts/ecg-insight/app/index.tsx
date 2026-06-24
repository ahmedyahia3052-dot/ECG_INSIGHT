import { Redirect } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { BrandLogo, HeartbeatLine, PremiumScreenBackground, SkeletonBlock } from "@/components/ui/Premium";

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();
  const colors = useColors();
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setSplashDone(true), 1400);
    return () => clearTimeout(timeout);
  }, []);

  if (isLoading || !splashDone) {
    return (
      <PremiumScreenBackground>
        <View style={styles.center}>
          <BrandLogo />
          <View style={styles.heartbeat}>
            <HeartbeatLine />
          </View>
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Preparing clinical AI workspace
          </Text>
          <View style={styles.skeletonStack}>
            <SkeletonBlock height={10} style={{ width: 180 }} />
            <SkeletonBlock height={10} style={{ width: 128 }} />
          </View>
        </View>
      </PremiumScreenBackground>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  heartbeat: { marginTop: 36, width: "82%" },
  loadingText: { fontFamily: "Inter_600SemiBold", fontSize: 13, letterSpacing: 0.4, marginTop: 24 },
  skeletonStack: { alignItems: "center", gap: 10, marginTop: 18 },
});
