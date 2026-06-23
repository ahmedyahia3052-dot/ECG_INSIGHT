import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Redirect, Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Dashboard</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="upload">
        <Icon sf={{ default: "square.and.arrow.up", selected: "square.and.arrow.up.fill" }} />
        <Label>Upload</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="history">
        <Icon sf={{ default: "list.bullet.clipboard", selected: "list.bullet.clipboard.fill" }} />
        <Label>History</Label>
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
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]}
            />
          ) : null,
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
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
