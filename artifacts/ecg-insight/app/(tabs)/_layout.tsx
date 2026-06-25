import { BlurView } from "expo-blur";
import { Redirect, Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import { Platform, StyleSheet, View, useColorScheme, useWindowDimensions } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { EnterpriseSidebar } from "@/components/bolt/EnterpriseSidebar";
import { FloatingAIAssistant, FloatingEcgActionButton } from "@/components/bolt/MobileActionLayer";

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { width } = useWindowDimensions();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const isMobile = width < 768;
  const useSidebar = !isMobile;

  const tabIcon = (name: keyof typeof Feather.glyphMap, color: string, focused: boolean) => (
    <View style={[styles.tabIconWrap, { transform: [{ scale: focused ? 1.14 : 1 }] }]}>
      <Feather name={name} size={focused ? 24 : 21} color={color} />
      {focused ? <View style={[styles.activeDot, { backgroundColor: colors.primary }]} /> : null}
    </View>
  );

  return (
    <>
      {useSidebar ? (
        <EnterpriseSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
        />
      ) : null}
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.mutedForeground,
          headerShown: false,
          tabBarStyle: {
            display: isMobile ? "flex" : "none",
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
            shadowOpacity: 0.26,
            shadowRadius: 24,
          },
          tabBarBackground: () =>
            !isMobile ? null : isIOS ? (
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
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <View style={{ transform: [{ scale: focused ? 1.12 : 1 }] }}>
                <SymbolView name="house" tintColor={color} size={focused ? 24 : 22} />
              </View>
            ) : (
              tabIcon("home", color, focused)
            ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "Patients",
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <View style={{ transform: [{ scale: focused ? 1.12 : 1 }] }}>
                <SymbolView name="person.2" tintColor={color} size={focused ? 24 : 22} />
              </View>
            ) : (
              tabIcon("users", color, focused)
            ),
        }}
      />
      <Tabs.Screen
        name="upload"
        options={{
          title: "Upload",
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <View style={{ transform: [{ scale: focused ? 1.12 : 1 }] }}>
                <SymbolView name="square.and.arrow.up" tintColor={color} size={focused ? 24 : 22} />
              </View>
            ) : (
              tabIcon("upload-cloud", color, focused)
            ),
        }}
      />
      <Tabs.Screen
        name="reports-dashboard"
        options={{
          title: "Reports",
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <View style={{ transform: [{ scale: focused ? 1.12 : 1 }] }}>
                <SymbolView name="doc.richtext" tintColor={color} size={focused ? 24 : 22} />
              </View>
            ) : (
              tabIcon("file-text", color, focused)
            ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarBadge: "!",
          tabBarBadgeStyle: {
            backgroundColor: colors.destructive,
            color: "#fff",
            fontFamily: "Inter_700Bold",
            fontSize: 10,
          },
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <View style={{ transform: [{ scale: focused ? 1.12 : 1 }] }}>
                <SymbolView name="person" tintColor={color} size={focused ? 24 : 22} />
              </View>
            ) : (
              tabIcon("user", color, focused)
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
      <Tabs.Screen name="settings" options={{ href: null, title: "Settings" }} />
      <Tabs.Screen name="subscription" options={{ href: null, title: "Subscription" }} />
      <Tabs.Screen name="notification-center" options={{ href: null, title: "Notification Center" }} />
      <Tabs.Screen name="sync-dashboard" options={{ href: null, title: "Sync Dashboard" }} />
      <Tabs.Screen name="collaboration-dashboard" options={{ href: null, title: "Collaboration Dashboard" }} />
      <Tabs.Screen name="task-dashboard" options={{ href: null, title: "Task Dashboard" }} />
      <Tabs.Screen name="alert-dashboard" options={{ href: null, title: "Alert Dashboard" }} />
      </Tabs>
      {isMobile ? <FloatingEcgActionButton /> : null}
      <FloatingAIAssistant compact={isMobile} />
    </>
  );
}

export default function TabLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;

  return <ClassicTabLayout />;
}

const styles = StyleSheet.create({
  activeDot: { borderRadius: 999, bottom: -6, height: 4, position: "absolute", width: 18 },
  tabIconWrap: { alignItems: "center", justifyContent: "center", minHeight: 30, minWidth: 34 },
  tabBlur: { borderRadius: 26, overflow: "hidden" },
});
