import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Redirect, Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useRouter } from "expo-router";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="upload">
        <Icon sf={{ default: "square.and.arrow.up", selected: "square.and.arrow.up.fill" }} />
        <Label>Upload</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="history">
        <Icon sf={{ default: "list.bullet.clipboard", selected: "list.bullet.clipboard.fill" }} />
        <Label>History</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="reports-dashboard">
        <Icon sf={{ default: "doc.richtext", selected: "doc.richtext.fill" }} />
        <Label>Reports</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const router = useRouter();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.mutedForeground,
          headerShown: false,
          tabBarStyle: {
            position: "absolute",
            backgroundColor: isIOS ? "transparent" : colors.glass,
            borderTopWidth: 1,
            borderTopColor: colors.gradientBorder,
            borderRadius: isWeb ? 28 : 26,
            bottom: isWeb ? 18 : 10,
            elevation: 0,
            height: isWeb ? 88 : 76,
            left: 12,
            paddingBottom: isWeb ? 14 : 10,
            paddingTop: 8,
            right: 12,
            shadowColor: colors.shadow,
            shadowOffset: { height: 12, width: 0 },
            shadowOpacity: 0.18,
            shadowRadius: 24,
          },
          tabBarBackground: () =>
            isIOS ? (
              <BlurView
                intensity={100}
                tint={isDark ? "dark" : "light"}
                style={[StyleSheet.absoluteFill, styles.tabBlur]}
              />
            ) : isWeb ? (
              <View
                style={[StyleSheet.absoluteFill, styles.tabBlur, { backgroundColor: colors.glass }]}
              />
            ) : null,
          tabBarLabelStyle: {
            fontFamily: "Inter_600SemiBold",
            fontSize: 11,
          },
        }}
      >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="house" tintColor={color} size={22} />
            ) : (
              <Feather name="home" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="upload"
        options={{
          title: "Upload",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="square.and.arrow.up" tintColor={color} size={22} />
            ) : (
              <Feather name="upload-cloud" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="list.bullet" tintColor={color} size={22} />
            ) : (
              <Feather name="list" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="reports-dashboard"
        options={{
          title: "Reports",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="doc.richtext" tintColor={color} size={22} />
            ) : (
              <Feather name="file-text" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="person" tintColor={color} size={22} />
            ) : (
              <Feather name="user" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen name="document-center" options={{ href: null, title: "Document Center" }} />
      <Tabs.Screen name="workforce-dashboard" options={{ href: null, title: "Workforce Dashboard" }} />
      <Tabs.Screen name="knowledge-library" options={{ href: null, title: "Knowledge Library" }} />
      <Tabs.Screen name="advanced-search" options={{ href: null, title: "Advanced Search" }} />
      <Tabs.Screen name="clinical-extraction" options={{ href: null, title: "Clinical Extraction" }} />
      <Tabs.Screen name="ai-summary" options={{ href: null, title: "AI Summary" }} />
      <Tabs.Screen name="ecg-waveform" options={{ href: null, title: "ECG Waveform Viewer" }} />
      <Tabs.Screen name="dicom-viewer" options={{ href: null, title: "DICOM Viewer" }} />
      <Tabs.Screen name="ecg-comparison" options={{ href: null, title: "ECG Comparison" }} />
      <Tabs.Screen name="pacs-browser" options={{ href: null, title: "PACS Browser" }} />
      <Tabs.Screen name="hospital-integration" options={{ href: null, title: "Hospital Integration" }} />
      <Tabs.Screen name="ai-assistant" options={{ href: null, title: "AI Assistant" }} />
      <Tabs.Screen name="risk-dashboard" options={{ href: null, title: "Risk Dashboard" }} />
      <Tabs.Screen name="trend-dashboard" options={{ href: null, title: "Trend Dashboard" }} />
      <Tabs.Screen name="population-analytics" options={{ href: null, title: "Population Analytics" }} />
      <Tabs.Screen name="clinical-alerts" options={{ href: null, title: "Clinical Alerts" }} />
      <Tabs.Screen name="security-dashboard" options={{ href: null, title: "Security Dashboard" }} />
      <Tabs.Screen name="audit-dashboard" options={{ href: null, title: "Audit Dashboard" }} />
      <Tabs.Screen name="compliance-dashboard" options={{ href: null, title: "Compliance Dashboard" }} />
      <Tabs.Screen name="backup-dashboard" options={{ href: null, title: "Backup Dashboard" }} />
      <Tabs.Screen name="session-dashboard" options={{ href: null, title: "Session Dashboard" }} />
      <Tabs.Screen name="notification-center" options={{ href: null, title: "Notification Center" }} />
      <Tabs.Screen name="sync-dashboard" options={{ href: null, title: "Sync Dashboard" }} />
      <Tabs.Screen name="collaboration-dashboard" options={{ href: null, title: "Collaboration Dashboard" }} />
      <Tabs.Screen name="task-dashboard" options={{ href: null, title: "Task Dashboard" }} />
      <Tabs.Screen name="alert-dashboard" options={{ href: null, title: "Alert Dashboard" }} />
      </Tabs>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Analyze ECG"
        activeOpacity={0.86}
        onPress={() => router.push("/(tabs)/upload" as any)}
        style={styles.fab}
      >
        <LinearGradient colors={colors.gradients.purple as [string, string, string]} style={styles.fabGradient}>
          <Feather name="zap" size={18} color="#fff" />
          {isWeb ? <Text style={styles.fabText}>Analyze ECG</Text> : null}
        </LinearGradient>
      </TouchableOpacity>
    </>
  );
}

export default function TabLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;

  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}

const styles = StyleSheet.create({
  fab: {
    bottom: Platform.OS === "web" ? 118 : 96,
    position: "absolute",
    right: 22,
  },
  fabGradient: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 54,
    minWidth: Platform.OS === "web" ? 148 : 54,
    paddingHorizontal: 18,
    shadowColor: "#2563EB",
    shadowOffset: { height: 14, width: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
  },
  fabText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 13 },
  tabBlur: { borderRadius: 26, overflow: "hidden" },
});
