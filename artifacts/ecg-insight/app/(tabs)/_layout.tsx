import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Redirect, Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TouchableOpacity, View, useColorScheme, useWindowDimensions } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useRouter } from "expo-router";
import { EnterpriseSidebar } from "@/components/bolt/EnterpriseSidebar";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="history">
        <Icon sf={{ default: "person.2", selected: "person.2.fill" }} />
        <Label>Patients</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="upload">
        <Icon sf={{ default: "square.and.arrow.up", selected: "square.and.arrow.up.fill" }} />
        <Label>Upload</Label>
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
  const [quickOpen, setQuickOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { width } = useWindowDimensions();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const desktopSidebar = isWeb && width >= 1024;

  const runQuickAction = (route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setQuickOpen(false);
    router.push(route as any);
  };

  const tabIcon = (name: keyof typeof Feather.glyphMap, color: string, focused: boolean) => (
    <View style={[styles.tabIconWrap, { transform: [{ scale: focused ? 1.14 : 1 }] }]}>
      <Feather name={name} size={focused ? 24 : 21} color={color} />
      {focused ? <View style={[styles.activeDot, { backgroundColor: colors.primary }]} /> : null}
    </View>
  );

  return (
    <>
      {desktopSidebar ? (
        <EnterpriseSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
        />
      ) : mobileSidebarOpen ? (
        <>
          <Pressable style={styles.drawerBackdrop} onPress={() => setMobileSidebarOpen(false)} />
          <EnterpriseSidebar collapsed={false} onClose={() => setMobileSidebarOpen(false)} />
        </>
      ) : null}
      {!desktopSidebar ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Open navigation"
          activeOpacity={0.8}
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            setMobileSidebarOpen(true);
          }}
          style={[styles.menuButton, { backgroundColor: colors.glass, borderColor: colors.gradientBorder }]}
        >
          <Feather name="menu" size={20} color={colors.primary} />
        </TouchableOpacity>
      ) : null}
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
            shadowOpacity: 0.26,
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
      {quickOpen ? (
        <View style={styles.quickMenu}>
          {[
            { icon: "upload-cloud" as const, label: "Upload ECG", route: "/(tabs)/upload" },
            { icon: "user-plus" as const, label: "Add Patient", route: "/(tabs)/history" },
            { icon: "file-plus" as const, label: "Generate Report", route: "/(tabs)/reports-dashboard" },
          ].map((action) => (
            <TouchableOpacity
              key={action.label}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              onPress={() => runQuickAction(action.route)}
              style={[styles.quickItem, { backgroundColor: colors.glass, borderColor: colors.gradientBorder }]}
            >
              <Feather name={action.icon} size={16} color={colors.primary} />
              <Text style={[styles.quickText, { color: colors.text }]}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Quick actions"
        activeOpacity={0.86}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          setQuickOpen((value) => !value);
        }}
        style={styles.fab}
      >
        <LinearGradient colors={colors.gradients.purple as [string, string, string]} style={styles.fabGradient}>
          <Feather name={quickOpen ? "x" : "plus"} size={20} color="#fff" />
          {isWeb ? <Text style={styles.fabText}>{quickOpen ? "Close" : "Quick Actions"}</Text> : null}
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
  activeDot: { borderRadius: 999, bottom: -6, height: 4, position: "absolute", width: 18 },
  drawerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.42)",
    zIndex: 40,
  },
  quickItem: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
    shadowColor: "#00E5FF",
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
  },
  quickMenu: {
    bottom: Platform.OS === "web" ? 184 : 158,
    gap: 10,
    position: "absolute",
    right: 22,
  },
  quickText: { fontFamily: "Inter_700Bold", fontSize: 12 },
  menuButton: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    height: 46,
    justifyContent: "center",
    left: 16,
    position: "absolute",
    top: Platform.OS === "web" ? 18 : 48,
    width: 46,
    zIndex: 35,
  },
  tabIconWrap: { alignItems: "center", justifyContent: "center", minHeight: 30, minWidth: 34 },
  tabBlur: { borderRadius: 26, overflow: "hidden" },
});
