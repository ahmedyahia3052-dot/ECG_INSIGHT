import { BlurView } from "expo-blur";
import { Redirect, Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Platform, Pressable, StyleSheet, TouchableOpacity, View, useColorScheme, useWindowDimensions } from "react-native";
import { PanGestureHandler, State, type PanGestureHandlerStateChangeEvent } from "react-native-gesture-handler";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { EnterpriseSidebar } from "@/components/bolt/EnterpriseSidebar";
import { FloatingAIAssistant, FloatingEcgActionButton } from "@/components/bolt/MobileActionLayer";
import { useVisualExperience } from "@/context/VisualExperienceContext";
import { BoltEcgLoader, BoltScreen } from "@/components/bolt/BoltUI";

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const { triggerHaptic } = useVisualExperience();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const toggleScale = useRef(new Animated.Value(1)).current;
  const { width } = useWindowDimensions();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const isMobile = width < 768;
  const isTablet = width >= 768 && width <= 1024;
  const isDesktop = width > 1024;
  const usePushSidebar = !isMobile;

  useEffect(() => {
    if (isTablet) setSidebarCollapsed(true);
    if (isDesktop) setSidebarCollapsed(false);
  }, [isDesktop, isTablet]);

  useEffect(() => {
    if (Platform.OS !== "web" || !isMobile || typeof document === "undefined") return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = mobileDrawerOpen ? "hidden" : previousOverflow;
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobile, mobileDrawerOpen]);

  function animateToggleScale(toValue: number) {
    Animated.spring(toggleScale, {
      damping: 14,
      mass: 0.7,
      stiffness: 220,
      toValue,
      useNativeDriver: true,
    }).start();
  }

  const tabIcon = (name: keyof typeof Feather.glyphMap, color: string, focused: boolean) => (
    <View style={[styles.tabIconWrap, { transform: [{ scale: focused ? 1.14 : 1 }] }]}>
      <Feather name={name} size={focused ? 24 : 21} color={color} />
      {focused ? <View style={[styles.activeDot, { backgroundColor: colors.primary }]} /> : null}
    </View>
  );

  const handleDrawerSwipe = (event: PanGestureHandlerStateChangeEvent) => {
    if (event.nativeEvent.state === State.END && event.nativeEvent.translationX < -70) {
      setMobileDrawerOpen(false);
    }
  };

  return (
    <View style={styles.layoutRoot}>
      {usePushSidebar ? (
        <>
          <EnterpriseSidebar
            collapsed={sidebarCollapsed}
            placement="push"
          />
          <Animated.View
            style={[
              styles.sidebarToggleLayer,
              {
                left: (sidebarCollapsed ? 18 + 76 : 18 + 312) - 24,
                transform: [{ scale: toggleScale }],
              },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={sidebarCollapsed ? "Expand navigation sidebar" : "Collapse navigation sidebar"}
              accessibilityHint="Toggles the medical navigation sidebar width"
              focusable
              onPress={() => {
                void triggerHaptic("selection");
                setSidebarCollapsed((value) => !value);
              }}
              onPressIn={() => animateToggleScale(0.92)}
              onPressOut={() => animateToggleScale(1)}
              style={({ hovered, pressed }) => [
                styles.sidebarToggle,
                {
                  borderColor: hovered || pressed ? "rgba(103,232,249,0.78)" : "rgba(103,232,249,0.36)",
                  opacity: pressed ? 0.92 : 1,
                  shadowOpacity: hovered || pressed ? 0.42 : 0.26,
                },
              ]}
            >
              <BlurView intensity={12} tint="dark" style={StyleSheet.absoluteFill} />
              <Feather name={sidebarCollapsed ? "chevrons-right" : "chevrons-left"} size={19} color="#67E8F9" />
            </Pressable>
          </Animated.View>
        </>
      ) : mobileDrawerOpen ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close navigation drawer"
            onPress={() => setMobileDrawerOpen(false)}
            style={styles.drawerBackdrop}
          />
          <PanGestureHandler activeOffsetX={[-12, 12]} onHandlerStateChange={handleDrawerSwipe}>
            <View style={styles.mobileDrawerPanel}>
              <EnterpriseSidebar collapsed={false} onClose={() => setMobileDrawerOpen(false)} placement="overlay" />
            </View>
          </PanGestureHandler>
        </>
      ) : null}
      <View style={styles.mainContent}>
        {isMobile ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Open navigation drawer"
            activeOpacity={0.84}
            onPress={() => {
              void triggerHaptic("selection");
              setMobileDrawerOpen(true);
            }}
            style={[styles.menuButton, { backgroundColor: colors.glass, borderColor: colors.gradientBorder }]}
          >
            <Feather name="menu" size={19} color={colors.primary} />
          </TouchableOpacity>
        ) : null}
        <Tabs
          screenOptions={{
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.mutedForeground,
            headerShown: false,
            sceneStyle: {
              backgroundColor: "transparent",
              flex: 1,
            },
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
      </View>
    </View>
  );
}

export default function TabLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <BoltScreen>
        <BoltEcgLoader label="Loading secure clinical workspace" />
      </BoltScreen>
    );
  }
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;

  return <ClassicTabLayout />;
}

const styles = StyleSheet.create({
  activeDot: { borderRadius: 999, bottom: -6, height: 4, position: "absolute", width: 18 },
  drawerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.44)",
    zIndex: 40,
  },
  layoutRoot: { flex: 1, flexDirection: "row", overflow: "visible" },
  mainContent: { flex: 1, minWidth: 0, overflow: "visible", position: "relative" },
  mobileDrawerPanel: { ...StyleSheet.absoluteFillObject, zIndex: 50 },
  menuButton: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    left: 18,
    position: "absolute",
    top: Platform.OS === "web" ? 18 : 48,
    width: 48,
    zIndex: 34,
  },
  sidebarToggle: {
    alignItems: "center",
    backgroundColor: "rgba(15,23,42,0.82)",
    borderRadius: 999,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#00E5FF",
    shadowOffset: { height: 8, width: 0 },
    shadowRadius: 18,
    width: 48,
  },
  sidebarToggleLayer: {
    position: "absolute",
    top: Platform.OS === "web" ? 38 : 52,
    zIndex: 120,
  },
  tabIconWrap: { alignItems: "center", justifyContent: "center", minHeight: 30, minWidth: 34 },
  tabBlur: { borderRadius: 26, overflow: "hidden" },
});
