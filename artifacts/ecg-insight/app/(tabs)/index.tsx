import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import { useAuth, type User } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { getAIHistory, getAIStatistics } from "@/services/ai";
import { API_ROOT_URL, API_URL } from "@/services/api";
import { apiCaseToEcgCase, listCases, listPatients, type ApiPatient } from "@/services/clinical";
import { listNotifications } from "@/services/collaboration";
import { listReports, type ClinicalReport } from "@/services/reports";
import { getMySubscription, getSubscriptionAnalytics } from "@/services/subscriptions";
import {
  BoltBadge,
  BoltButton,
  BoltCard,
  BoltEmpty,
  BoltNavCard,
  BoltScreen,
} from "@/components/bolt/BoltUI";
import { LiveEcgWave, PremiumMetricCard } from "@/components/bolt/UltraPremium";
import { useVisualExperience } from "@/context/VisualExperienceContext";
import { PremiumRefreshControl, SkeletonDashboard } from "@/components/interaction/PremiumInteraction";

export default function DashboardScreen() {
  const colors = useColors();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { authToken, canAccess, isImpersonating, managedUsers, stopImpersonation, user } = useAuth();
  const token = authToken?.token;
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [search, setSearch] = useState("");

  const casesQuery = useQuery({
    enabled: !!token,
    queryFn: async () => listCases(token!, new URLSearchParams({ page: "1", pageSize: "100" })),
    queryKey: ["ultra-dashboard-cases", token],
  });
  const aiStatsQuery = useQuery({
    enabled: !!token && canAccess("admin"),
    queryFn: async () => getAIStatistics(token!),
    queryKey: ["ultra-ai-statistics", token],
    retry: false,
  });
  const aiHistoryQuery = useQuery({
    enabled: !!token,
    queryFn: async () => getAIHistory(token!),
    queryKey: ["enterprise-ai-history", token],
    retry: false,
  });
  const reportsQuery = useQuery({
    enabled: !!token,
    queryFn: async () => listReports(token!, new URLSearchParams({ page: "1", pageSize: "100" })),
    queryKey: ["ultra-dashboard-reports", token],
    retry: false,
  });
  const patientsQuery = useQuery({
    enabled: !!token,
    queryFn: async () => listPatients(token!, new URLSearchParams({ page: "1", pageSize: "8" })),
    queryKey: ["enterprise-dashboard-patients", token],
    retry: false,
  });
  const subscriptionQuery = useQuery({
    enabled: !!token,
    queryFn: async () => getMySubscription(token!),
    queryKey: ["ultra-my-subscription", token],
    retry: false,
  });
  const subscriptionAnalyticsQuery = useQuery({
    enabled: !!token && canAccess("admin"),
    queryFn: async () => getSubscriptionAnalytics(token!),
    queryKey: ["enterprise-subscription-analytics", token],
    retry: false,
  });
  const systemStatusQuery = useQuery({
    queryFn: async () => {
      const [health, readiness] = await Promise.all([
        fetch(`${API_URL}/health`).then((response) => response.ok),
        fetch(`${API_ROOT_URL}/readiness`).then((response) => response.ok),
      ]);
      return { api: health, database: readiness };
    },
    queryKey: ["enterprise-system-status"],
    refetchInterval: 30_000,
    retry: false,
  });
  const notificationsQuery = useQuery({
    enabled: !!token,
    queryFn: async () => listNotifications(token!, new URLSearchParams({ pageSize: "20" })),
    queryKey: ["ultra-notifications", token],
    retry: false,
  });

  const casesCache = useOfflineCache("ecg-insight:mobile:cases", casesQuery.data?.cases);
  const notificationsCache = useOfflineCache("ecg-insight:mobile:notifications", notificationsQuery.data?.notifications);
  const liveCases = casesQuery.data?.cases ?? casesCache.cachedData ?? [];
  const cases = liveCases.map(apiCaseToEcgCase);
  const reports = reportsQuery.data?.reports ?? [];
  const critical = cases.filter((item) => item.status === "critical").length;
  const patientCount = patientsQuery.data?.total ?? new Set(cases.map((item) => item.patientName)).size;
  const recentPatients = patientsQuery.data?.patients ?? [];
  const reviewed = cases.filter((item) => item.confidence > 0).length;
  const aiStats = aiStatsQuery.data?.statistics;
  const aiHistory = aiHistoryQuery.data?.analyses ?? [];
  const notifications = notificationsQuery.data?.notifications ?? notificationsCache.cachedData ?? [];
  const unread = notifications.filter((item) => {
    const record = item as { read?: boolean; readAt?: string | null };
    return !record.read && !record.readAt;
  }).length;
  const planName = subscriptionQuery.data?.lifetimeAccess.granted
    ? "Lifetime"
    : subscriptionQuery.data?.plan.name ?? (user?.subscriptionTier ?? "free").toUpperCase();
  const revenueCents = subscriptionAnalyticsQuery.data?.analytics.monthlyRevenueCents ?? 0;
  const pendingReviews = Math.max(cases.length - reviewed, 0);
  const status = systemStatusQuery.data;
  const monitorRhythm = aiHistory[0]?.rhythm ?? cases[0]?.rhythm ?? "Normal Sinus Rhythm";
  const monitorHeartRate = aiHistory[0]?.heartRate ?? cases[0]?.heartRate ?? 72;
  const isMobile = width < 768;
  const greetingName = formatGreetingName(user, isMobile);
  const roleTitle = userTitle(user);
  const currentGreeting = greeting(now);
  const fullDate = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const currentTime = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  useEffect(() => {
    if (__DEV__) console.info("[route-mount] DashboardPage", { isMobile });
  }, [isMobile]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const weeklySeries = useMemo(() => {
    const base = Math.max(cases.length, 1);
    return [base, base + 1, base + 2, base + critical, base + reports.length, base + reviewed, base + cases.length];
  }, [cases.length, critical, reports.length, reviewed]);
  const criticalSeries = useMemo(() => [critical, Math.max(cases.length - critical, 0), reviewed, reports.length], [cases.length, critical, reports.length, reviewed]);
  const searchSuggestions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return [];
    return [
      ...cases.map((item) => ({
        icon: "activity" as const,
        label: item.patientName,
        meta: `${item.id} · ${item.diagnosis}`,
        route: `/case/${item.id}`,
      })),
      ...reports.slice(0, 20).map((item, index) => {
        const record = item as { id?: string; title?: string; patientName?: string; status?: string };
        return {
          icon: "file-text" as const,
          label: record.title ?? `Report ${index + 1}`,
          meta: `${record.patientName ?? "Clinical report"} · ${record.status ?? "Live"}`,
          route: "/(tabs)/reports-dashboard",
        };
      }),
      ...managedUsers.map((item) => ({
        icon: "user" as const,
        label: item.name,
        meta: `${item.role} · ${item.email}`,
        route: "/admin/users",
      })),
    ].filter((item) => `${item.label} ${item.meta}`.toLowerCase().includes(query)).slice(0, 5);
  }, [cases, managedUsers, reports, search]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      casesQuery.refetch(),
      aiStatsQuery.refetch(),
      patientsQuery.refetch(),
      reportsQuery.refetch(),
      subscriptionQuery.refetch(),
      notificationsQuery.refetch(),
    ]);
    setRefreshing(false);
  }, [aiStatsQuery, casesQuery, notificationsQuery, patientsQuery, reportsQuery, subscriptionQuery]);

  const loading = casesQuery.isLoading || patientsQuery.isLoading || reportsQuery.isLoading || subscriptionQuery.isLoading;

  return (
    <BoltScreen
      refreshControl={
        <PremiumRefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      }
    >
      {isImpersonating ? (
        <BoltCard style={styles.banner}>
          <Text style={[styles.bannerText, { color: "#92400E" }]}>Viewing as {user?.name}</Text>
          <BoltButton label="Exit" onPress={stopImpersonation} variant="outline" />
        </BoltCard>
      ) : null}

      <MobileHomeHeader
        avatar={user?.avatarInitials ?? "AY"}
        currentDate={fullDate}
        currentTime={currentTime}
        displayName={greetingName}
        greeting={currentGreeting}
        planName={String(planName)}
        roleTitle={roleTitle}
      />

      <GlobalSearchBar
        onChange={setSearch}
        search={search}
        suggestions={searchSuggestions}
      />

      <BoltCard highlight style={styles.hero}>
        <LinearGradient colors={["rgba(0,229,255,0.18)", "rgba(20,184,166,0.04)"]} style={StyleSheet.absoluteFill} />
        <View style={styles.heroWave}>
          <LiveEcgWave height={108} />
        </View>
        <View style={styles.heroTop}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{user?.avatarInitials ?? "AY"}</Text>
          </View>
          <View style={styles.heroMain}>
            <Text style={[styles.kicker, { color: colors.primary }]}>Enterprise Medical Command Center</Text>
            <Text style={[styles.heroTitle, { color: colors.text }]}>
              {currentGreeting}, {greetingName}
            </Text>
            <Text style={[styles.heroDate, { color: colors.textSecondary }]}>
              {roleTitle} · {fullDate} · {currentTime}
            </Text>
          </View>
          <BoltBadge icon="credit-card" label={String(planName)} tone={subscriptionQuery.data?.lifetimeAccess.granted ? "success" : "primary"} />
        </View>
        <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
          {cases.length} ECG analyses, {patientCount} patients, {reports.length} reports, and {unread} unread notifications in one Philips-grade medical workspace.
        </Text>
        <View style={styles.statusRow}>
          <StatusPill label="API Status" operational={status?.api ?? !systemStatusQuery.isError} />
          <StatusPill label="Database Status" operational={status?.database ?? !systemStatusQuery.isError} />
          <StatusPill label="AI Engine Status" operational={!aiStatsQuery.isError} />
        </View>
        <Text style={[styles.lastLogin, { color: colors.textSecondary }]}>
          Last login: current secure session · System summary refreshed {currentTime}
        </Text>
        <View style={styles.heroActions}>
          <BoltButton icon="upload-cloud" label="Upload ECG" onPress={() => router.push("/(tabs)/upload")} />
          <BoltButton icon="file-text" label="View Reports" onPress={() => router.push("/(tabs)/reports-dashboard")} variant="outline" />
          <BoltButton icon="user-plus" label="Add Patient" onPress={() => router.push("/(tabs)/history")} variant="outline" />
        </View>
      </BoltCard>

      {casesQuery.isError && casesCache.hasOfflineData ? (
        <BoltCard style={styles.offlineCard}>
          <BoltBadge icon="wifi-off" label="Offline cache" tone="warning" />
          <Text style={[styles.muted, { color: colors.textSecondary }]}>
            Showing locally cached ECG data from {casesCache.savedAt ? new Date(casesCache.savedAt).toLocaleString() : "a previous session"}.
            Automatic sync resumes when the API is reachable.
          </Text>
        </BoltCard>
      ) : null}

      {loading ? (
        <SkeletonDashboard />
      ) : (
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCell}>
            <PremiumMetricCard icon="activity" label="Total ECG Analyses" sparkline={weeklySeries} trend="+12%" value={cases.length} />
          </View>
          <View style={styles.kpiCell}>
            <PremiumMetricCard icon="alert-triangle" label="Critical Cases" sparkline={criticalSeries} trend={critical ? "Review" : "Clear"} trendTone={critical ? "danger" : "success"} value={critical} />
          </View>
          <View style={styles.kpiCell}>
            <PremiumMetricCard icon="clipboard" label="Pending Reports" sparkline={[pendingReviews, reports.length, critical, reviewed]} trend={pendingReviews ? "Queue" : "Clear"} trendTone={pendingReviews ? "warning" : "success"} value={pendingReviews} />
          </View>
          <View style={styles.kpiCell}>
            <PremiumMetricCard icon="cpu" label="Diagnostic Accuracy" sparkline={criticalSeries} suffix="%" trend="AI" value={aiStats?.averageConfidence ?? 95} />
          </View>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.quickActions}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        <QuickActionCard icon="upload-cloud" label="Upload ECG" onPress={() => router.push("/(tabs)/upload?method=upload" as never)} />
        <QuickActionCard icon="user-plus" label="New Patient" onPress={() => router.push("/(tabs)/history")} />
        <QuickActionCard icon="radio" label="Live Monitor" onPress={() => router.push("/(tabs)")} />
        <QuickActionCard icon="file-text" label="Reports" onPress={() => router.push("/(tabs)/reports-dashboard")} />
        <QuickActionCard icon="bar-chart-2" label="Analytics" onPress={() => router.push("/(tabs)/population-analytics" as never)} />
      </ScrollView>

      <View style={styles.commandGrid}>
        <View style={styles.commandColumn}>
          <EnterpriseMonitorPanel
            heartRate={monitorHeartRate}
            lastUpdate={currentTime}
            rhythm={monitorRhythm}
          />
          <RecentEcgActivity cases={cases.slice(0, isMobile ? 4 : 6)} />
          <RecentPatientsPanel
            error={patientsQuery.isError}
            loading={patientsQuery.isLoading}
            patients={recentPatients}
          />
          <AIInsightsPanel
            critical={critical}
            diagnosis={aiHistory[0]?.diagnosis ?? cases[0]?.diagnosis}
            pendingReports={pendingReviews}
            recommendations={aiHistory[0]?.recommendations ?? cases[0]?.recommendations ?? []}
          />
        </View>

        <View style={styles.commandColumn}>
          <CriticalAlertsCenter
            cases={cases.slice(0, 5)}
            critical={critical}
            pendingReviews={pendingReviews}
            subscriptionWarning={!!subscriptionQuery.data?.quota.warning}
            unread={unread}
          />
          <RecentReportsPanel
            error={reportsQuery.isError}
            loading={reportsQuery.isLoading}
            reports={reports.slice(0, 5)}
          />
          <RoleDashboardPanel
            audits={notifications.length}
            critical={critical}
            licenses={subscriptionAnalyticsQuery.data?.analytics.subscriptionDistribution.reduce((sum, item) => sum + item.count, 0) ?? 0}
            organizations={subscriptionAnalyticsQuery.data?.analytics.subscriptionDistribution.length ?? 0}
            pendingReviews={pendingReviews}
            revenueCents={revenueCents}
            role={user?.isOwner ? "owner" : user?.role ?? "doctor"}
            teamActivity={managedUsers.length}
            totalUsers={subscriptionAnalyticsQuery.data?.analytics.totalUsers ?? managedUsers.length}
          />
        </View>
      </View>

      {canAccess("admin") ? (
        <BoltNavCard description="Protected owner/admin revenue, users, plans, licenses, and audit tools" icon="shield" route="/admin/" title="Admin Dashboard" />
      ) : null}
    </BoltScreen>
  );
}

function greeting(date: Date) {
  const hour = date.getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function formatDisplayName(name: string | undefined, mobile: boolean) {
  const clean = (name ?? "Clinician").trim();
  const withoutPrefix = clean.replace(/^(dr\.?|doctor)\s+/i, "");
  if (mobile) return withoutPrefix.split(/\s+/)[0] ?? withoutPrefix;
  return withoutPrefix;
}

function formatGreetingName(user: User | null | undefined, mobile: boolean) {
  const base = formatDisplayName(user?.name, mobile);
  const usesClinicalPrefix = !!user && (user.role === "doctor" || user.role === "admin" || user.role === "super_admin" || user.isOwner);
  return usesClinicalPrefix ? `Dr. ${base}` : base;
}

function userTitle(user: User | null | undefined) {
  if (!user) return "Clinical User";
  if (user.specialization) return user.specialization;
  if (user.isOwner || user.role === "super_admin") return "Medical Director";
  if (user.role === "admin") return "Clinical Operations Lead";
  if (user.role === "corporate_client") return "Food Safety Coordinator & Lead Auditor";
  if (user.role === "doctor") return "Cardiology Consultant";
  if (user.role === "student") return "Clinical Trainee";
  return "Clinical User";
}

function StatusPill({ label, operational }: { label: string; operational: boolean }) {
  const colors = useColors();
  return (
    <View style={[styles.statusPill, { borderColor: operational ? colors.success + "55" : colors.destructive + "55" }]}>
      <Text style={styles.statusEmoji}>{operational ? "🟢" : "🔴"}</Text>
      <View>
        <Text style={[styles.statusLabel, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.statusValue, { color: operational ? colors.success : colors.destructive }]}>
          {operational ? "Operational" : "Offline"}
        </Text>
      </View>
    </View>
  );
}

function GlobalSearchBar({
  onChange,
  search,
  suggestions,
}: {
  onChange: (value: string) => void;
  search: string;
  suggestions: Array<{ icon: keyof typeof Feather.glyphMap; label: string; meta: string; route: string }>;
}) {
  const colors = useColors();
  const router = useRouter();
  const { triggerHaptic } = useVisualExperience();
  return (
    <BoltCard style={styles.searchCard}>
      <View style={[styles.searchInputWrap, { borderColor: colors.gradientBorder }]}>
        <Feather name="search" size={17} color={colors.primary} />
        <TextInput
          accessibilityLabel="Search patients, ECG IDs, organizations, reports, companies, or physicians"
          onChangeText={onChange}
          placeholder="Search patient, ECG ID, report, physician..."
          placeholderTextColor={colors.textSecondary}
          returnKeyType="search"
          style={[styles.searchInput, { color: colors.text }]}
          value={search}
        />
      </View>
      {suggestions.length ? (
        <View style={styles.suggestionList}>
          {suggestions.map((item) => (
            <Pressable
              key={`${item.route}-${item.label}`}
              accessibilityRole="button"
              onPress={() => {
                void triggerHaptic("selection");
                router.push(item.route as never);
              }}
              style={({ pressed }) => [styles.suggestionItem, { borderColor: colors.border, opacity: pressed ? 0.78 : 1 }]}
            >
              <Feather name={item.icon} size={16} color={colors.primary} />
              <View style={styles.suggestionText}>
                <Text style={[styles.suggestionLabel, { color: colors.text }]}>{item.label}</Text>
                <Text numberOfLines={1} style={[styles.suggestionMeta, { color: colors.textSecondary }]}>{item.meta}</Text>
              </View>
              <Feather name="arrow-right" size={15} color={colors.textSecondary} />
            </Pressable>
          ))}
        </View>
      ) : search.trim() ? (
        <Text style={[styles.suggestionMeta, { color: colors.textSecondary }]}>No instant suggestions found in live cached data.</Text>
      ) : null}
    </BoltCard>
  );
}

function MobileHomeHeader({
  avatar,
  currentDate,
  currentTime,
  displayName,
  greeting,
  planName,
  roleTitle,
}: {
  avatar: string;
  currentDate: string;
  currentTime: string;
  displayName: string;
  greeting: string;
  planName: string;
  roleTitle: string;
}) {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { duration: 260, easing: Easing.out(Easing.cubic), toValue: 1, useNativeDriver: true }),
      Animated.timing(translateY, { duration: 260, easing: Easing.out(Easing.cubic), toValue: 0, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY]);

  return (
    <Animated.View style={[styles.mobileHeader, { opacity, transform: [{ translateY }] }]}>
      <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
        <Text style={styles.avatarText}>{avatar}</Text>
      </View>
      <View style={styles.mobileHeaderText}>
        <Text style={[styles.mobileGreeting, { color: colors.text }]}>{greeting}, {displayName}</Text>
        <View style={styles.headerMetaRow}>
          <BoltBadge icon="credit-card" label={planName} />
          <Text numberOfLines={1} style={[styles.headerRole, { color: colors.textSecondary }]}>{roleTitle}</Text>
        </View>
        <Text style={[styles.headerTime, { color: colors.textSecondary }]}>{currentDate} · {currentTime}</Text>
      </View>
    </Animated.View>
  );
}

function QuickActionCard({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const colors = useColors();
  const { triggerHaptic } = useVisualExperience();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        void triggerHaptic("selection");
        onPress();
      }}
      style={({ pressed }) => [
        styles.quickActionCard,
        {
          backgroundColor: colors.glass,
          borderColor: colors.gradientBorder,
          opacity: pressed ? 0.78 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: colors.primary + "18" }]}>
        <Feather name={icon} size={22} color={colors.primary} />
      </View>
      <Text style={[styles.quickActionText, { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

function RoleDashboardPanel({
  audits,
  critical,
  licenses,
  organizations,
  pendingReviews,
  revenueCents,
  role,
  teamActivity,
  totalUsers,
}: {
  audits: number;
  critical: number;
  licenses: number;
  organizations: number;
  pendingReviews: number;
  revenueCents: number;
  role: string;
  teamActivity: number;
  totalUsers: number;
}) {
  const colors = useColors();
  const normalized = role === "super_admin" ? "owner" : role;
  const items: Array<{ icon: keyof typeof Feather.glyphMap; label: string; value: string | number }> =
    normalized === "owner"
      ? [
          { icon: "dollar-sign", label: "Revenue", value: `$${Math.round(revenueCents / 100).toLocaleString()}` },
          { icon: "briefcase", label: "Active organizations", value: organizations },
          { icon: "users", label: "Total users", value: totalUsers },
          { icon: "award", label: "Licenses", value: licenses },
          { icon: "bar-chart-2", label: "Subscription analytics", value: "Live" },
        ]
      : normalized === "admin"
        ? [
            { icon: "users", label: "Users", value: totalUsers },
            { icon: "activity", label: "Team activity", value: teamActivity },
            { icon: "briefcase", label: "Organizations", value: organizations },
            { icon: "shield", label: "Audits", value: audits },
          ]
        : normalized === "doctor"
          ? [
              { icon: "users", label: "Assigned patients", value: totalUsers || teamActivity },
              { icon: "clipboard", label: "Pending ECG reviews", value: pendingReviews },
              { icon: "alert-triangle", label: "Critical alerts", value: critical },
            ]
          : [
              { icon: "book-open", label: "Recent studies", value: totalUsers || teamActivity },
              { icon: "activity", label: "Training cases", value: pendingReviews + critical },
            ];

  return (
    <BoltCard style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Role-Based Command View</Text>
        <BoltBadge icon="shield" label={normalized.toUpperCase()} />
      </View>
      <View style={styles.roleGrid}>
        {items.map((item) => (
          <View key={item.label} style={[styles.roleCard, { borderColor: colors.border }]}>
            <Feather name={item.icon} size={17} color={colors.primary} />
            <Text style={[styles.roleValue, { color: colors.text }]}>{item.value}</Text>
            <Text style={[styles.roleLabel, { color: colors.textSecondary }]}>{item.label}</Text>
          </View>
        ))}
      </View>
    </BoltCard>
  );
}

function EnterpriseMonitorPanel({
  heartRate,
  lastUpdate,
  rhythm,
}: {
  heartRate: number;
  lastUpdate: string;
  rhythm: string;
}) {
  const colors = useColors();
  return (
    <BoltCard highlight style={styles.monitorPanel}>
      <View style={styles.panelHeader}>
        <View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Live ECG Monitor</Text>
          <Text style={[styles.muted, { color: colors.textSecondary }]}>Lead II preview · future streaming ready</Text>
        </View>
        <BoltBadge icon="radio" label="Preview" tone="success" />
      </View>
      <LiveEcgWave height={86} />
      <View style={styles.monitorStats}>
        <MonitorStat label="Lead" value="Lead II" />
        <MonitorStat label="Heart Rate" value={`${heartRate} BPM`} tone={colors.primary} />
        <MonitorStat label="Rhythm" value={rhythm} />
        <MonitorStat label="Last Update" value={lastUpdate} />
      </View>
    </BoltCard>
  );
}

function MonitorStat({ label, tone, value }: { label: string; tone?: string; value: string }) {
  const colors = useColors();
  return (
    <View style={[styles.monitorStat, { borderColor: colors.border }]}>
      <Text style={[styles.monitorStatLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text numberOfLines={1} style={[styles.monitorStatValue, { color: tone ?? colors.text }]}>{value}</Text>
    </View>
  );
}

function RecentPatientsPanel({
  error,
  loading,
  patients,
}: {
  error: boolean;
  loading: boolean;
  patients: ApiPatient[];
}) {
  const colors = useColors();
  const router = useRouter();
  return (
    <BoltCard style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Patients</Text>
        <BoltButton label="Manage" onPress={() => router.push("/(tabs)/history")} variant="ghost" />
      </View>
      <View style={[styles.tableHeader, { borderColor: colors.border }]}>
        <Text style={[styles.tableHeadPatient, { color: colors.textSecondary }]}>Patient</Text>
        <Text style={[styles.tableHeadSmall, { color: colors.textSecondary }]}>Age</Text>
        <Text style={[styles.tableHeadSmall, { color: colors.textSecondary }]}>Gender</Text>
        <Text style={[styles.tableHeadStatus, { color: colors.textSecondary }]}>Status</Text>
      </View>
      {loading ? (
        <SkeletonDashboard />
      ) : error ? (
        <BoltEmpty actionLabel="Retry" message="Unable to load patient records from the API." onAction={() => router.replace("/(tabs)/history")} title="Patients unavailable" />
      ) : patients.length ? (
        patients.slice(0, 5).map((patient) => (
          <View key={patient.id} style={[styles.tableRow, { borderColor: colors.border }]}>
            <View style={styles.tableHeadPatient}>
              <Text numberOfLines={1} style={[styles.tablePrimary, { color: colors.text }]}>{patient.firstName} {patient.lastName}</Text>
              <Text numberOfLines={1} style={[styles.tableSecondary, { color: colors.textSecondary }]}>{patient.medicalRecordNumber}</Text>
            </View>
            <Text style={[styles.tableHeadSmall, styles.tablePrimary, { color: colors.text }]}>{patient.age}</Text>
            <Text style={[styles.tableHeadSmall, styles.tablePrimary, { color: colors.text }]}>{patient.gender}</Text>
            <View style={styles.tableHeadStatus}>
              <BoltBadge label="Active" tone="success" />
            </View>
          </View>
        ))
      ) : (
        <BoltEmpty actionLabel="Add Patient" message="Create a patient record to start ECG workflows." onAction={() => router.push("/(tabs)/history")} title="No patients yet" />
      )}
    </BoltCard>
  );
}

function CriticalAlertsCenter({
  cases,
  critical,
  pendingReviews,
  subscriptionWarning,
  unread,
}: {
  cases: ReturnType<typeof apiCaseToEcgCase>[];
  critical: number;
  pendingReviews: number;
  subscriptionWarning: boolean;
  unread: number;
}) {
  const colors = useColors();
  const router = useRouter();
  const alerts = [
    ...cases.filter((item) => item.status === "critical").map((item) => ({
      id: item.id,
      label: item.diagnosis,
      severity: "critical" as const,
      timestamp: new Date(item.date).toLocaleString(),
      value: item.patientName,
    })),
    ...(pendingReviews ? [{ id: "pending", label: "Reports awaiting physician signature", severity: "warning" as const, timestamp: "Queue", value: `${pendingReviews}` }] : []),
    ...(unread ? [{ id: "unread", label: "Unread clinical notifications", severity: "warning" as const, timestamp: "Live", value: `${unread}` }] : []),
    ...(subscriptionWarning ? [{ id: "quota", label: "Subscription quota warning", severity: "warning" as const, timestamp: "Live", value: "1" }] : []),
  ];
  return (
    <BoltCard style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Critical Alerts Center</Text>
        <BoltBadge icon="bell" label={`${alerts.length} active`} tone={alerts.length ? "danger" : "success"} />
      </View>
      {alerts.length ? (
        alerts.map((alert) => (
          <View key={alert.id} style={[styles.alertRow, { borderColor: colors.border }]}>
            <BoltBadge
              label={alert.severity === "critical" ? "Critical" : "Warning"}
              tone={alert.severity === "critical" ? "danger" : "warning"}
            />
            <View style={styles.alertContent}>
              <Text numberOfLines={1} style={[styles.alertText, { color: colors.text }]}>{alert.label}</Text>
              <Text numberOfLines={1} style={[styles.tableSecondary, { color: colors.textSecondary }]}>{alert.value} · {alert.timestamp}</Text>
            </View>
            <BoltButton label="Review" onPress={() => router.push(alert.id === "pending" ? "/(tabs)/reports-dashboard" : `/case/${alert.id}` as never)} variant="outline" />
          </View>
        ))
      ) : (
        <BoltEmpty title="No critical alerts" message="All high-priority ECG findings, reviews, and subscription states are clear." />
      )}
    </BoltCard>
  );
}

function RecentReportsPanel({
  error,
  loading,
  reports,
}: {
  error: boolean;
  loading: boolean;
  reports: ClinicalReport[];
}) {
  const colors = useColors();
  const router = useRouter();
  return (
    <BoltCard style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Reports</Text>
        <BoltButton label="View all" onPress={() => router.push("/(tabs)/reports-dashboard")} variant="ghost" />
      </View>
      {loading ? (
        <SkeletonDashboard />
      ) : error ? (
        <BoltEmpty actionLabel="Retry" message="Unable to load clinical reports." onAction={() => router.replace("/(tabs)/reports-dashboard")} title="Reports unavailable" />
      ) : reports.length ? (
        reports.map((report) => (
          <View key={report.id} style={[styles.reportRow, { borderColor: colors.border }]}>
            <View style={styles.caseMain}>
              <Text numberOfLines={1} style={[styles.tablePrimary, { color: colors.text }]}>{report.reportNumber}</Text>
              <Text numberOfLines={1} style={[styles.tableSecondary, { color: colors.textSecondary }]}>{report.physicianName} · {new Date(report.reportingDate).toLocaleDateString()}</Text>
            </View>
            <BoltBadge label={report.status.replace("_", " ")} tone={report.status === "signed" || report.status === "finalized" ? "success" : "warning"} />
            <BoltButton label="Open" onPress={() => router.push("/(tabs)/reports-dashboard")} variant="outline" />
          </View>
        ))
      ) : (
        <BoltEmpty actionLabel="Create Report" message="Generate reports from analyzed ECG cases." onAction={() => router.push("/(tabs)/reports-dashboard")} title="No reports yet" />
      )}
    </BoltCard>
  );
}

function AIInsightsPanel({
  critical,
  diagnosis,
  pendingReports,
  recommendations,
}: {
  critical: number;
  diagnosis?: string;
  pendingReports: number;
  recommendations: string[];
}) {
  const colors = useColors();
  const insights = [
    critical ? `${critical} ECG case${critical === 1 ? "" : "s"} require urgent review.` : "No critical ECG cases are currently queued.",
    diagnosis ? `Latest AI finding: ${diagnosis}.` : "AI findings will appear after the next analysis.",
    pendingReports ? `${pendingReports} report${pendingReports === 1 ? "" : "s"} awaiting physician signature.` : "No reports are waiting for signature.",
    ...(recommendations.length ? recommendations.slice(0, 2) : ["Continue monitoring high-priority workflows and unread clinical notifications."]),
  ];
  return (
    <BoltCard highlight style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>AI Insights</Text>
        <BoltBadge icon="cpu" label="Clinical AI" />
      </View>
      {insights.map((insight, index) => (
        <View key={`${insight}-${index}`} style={[styles.insightRow, { borderColor: colors.border }]}>
          <Feather name={index === 0 && critical ? "alert-triangle" : "zap"} size={16} color={index === 0 && critical ? colors.destructive : colors.primary} />
          <Text style={[styles.assistantText, { color: colors.textSecondary }]}>{insight}</Text>
        </View>
      ))}
    </BoltCard>
  );
}

function RecentEcgActivity({ cases }: { cases: ReturnType<typeof apiCaseToEcgCase>[] }) {
  const colors = useColors();
  const router = useRouter();
  return (
    <BoltCard style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent ECG Activity</Text>
        <BoltBadge icon="activity" label={`${cases.length} live`} />
      </View>
      {cases.length ? (
        cases.map((item) => (
          <View key={item.id} style={[styles.activityCard, { borderColor: colors.border }]}>
            <View style={styles.activityTop}>
              <View style={styles.caseMain}>
                <Text style={[styles.caseName, { color: colors.text }]}>{item.patientName}</Text>
                <Text style={[styles.muted, { color: colors.textSecondary }]}>{new Date(item.date).toLocaleString()}</Text>
              </View>
              <BoltBadge label={item.status} tone={item.status === "critical" ? "danger" : item.status === "normal" ? "success" : "warning"} />
            </View>
            <Text numberOfLines={2} style={[styles.muted, { color: colors.textSecondary }]}>{item.diagnosis}</Text>
            <Text style={[styles.timelineConfidence, { color: colors.primary }]}>AI confidence {item.confidence}%</Text>
            <View style={styles.activityActions}>
              <BoltButton label="Open" onPress={() => router.push(`/case/${item.id}` as never)} variant="outline" />
              <BoltButton label="Review" onPress={() => router.push(`/case/${item.id}` as never)} variant="ghost" />
              <BoltButton label="Generate Report" onPress={() => router.push("/(tabs)/reports-dashboard")} variant="ghost" />
            </View>
          </View>
        ))
      ) : (
        <BoltEmpty
          actionLabel="Upload ECG"
          message="Recent ECG uploads, AI analyses, report generation, and reviews will appear here."
          onAction={() => router.push("/(tabs)/upload")}
          title="No ECG activity yet"
        />
      )}
    </BoltCard>
  );
}

function ClinicalTimeline({
  cases,
  reportsCount,
}: {
  cases: ReturnType<typeof apiCaseToEcgCase>[];
  reportsCount: number;
}) {
  const timeline = buildTimeline(cases, reportsCount);
  const colors = useColors();
  return (
    <BoltCard style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Clinical Timeline</Text>
        <BoltBadge icon="clock" label="Live workflow" />
      </View>
      {timeline.map((item, index) => (
        <AnimatedTimelineItem key={`${item.time}-${item.label}`} index={index} item={item} />
      ))}
    </BoltCard>
  );
}

function AnimatedTimelineItem({
  index,
  item,
}: {
  index: number;
  item: { label: string; time: string; tone: "primary" | "success" | "warning" | "danger" };
}) {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { duration: 260, delay: index * 70, easing: Easing.out(Easing.cubic), toValue: 1, useNativeDriver: true }),
      Animated.timing(translate, { duration: 260, delay: index * 70, easing: Easing.out(Easing.cubic), toValue: 0, useNativeDriver: true }),
    ]).start();
  }, [index, opacity, translate]);

  const dotColor = item.tone === "danger" ? colors.destructive : item.tone === "warning" ? colors.warning : item.tone === "success" ? colors.success : colors.primary;
  return (
    <Animated.View style={[styles.clinicalTimelineItem, { opacity, transform: [{ translateY: translate }] }]}>
      <View style={[styles.timelineDot, { backgroundColor: dotColor }]} />
      <View style={styles.timelineContent}>
        <Text style={[styles.timelineName, { color: colors.text }]}>{item.time}</Text>
        <Text style={[styles.muted, { color: colors.textSecondary }]}>{item.label}</Text>
      </View>
    </Animated.View>
  );
}

function buildTimeline(cases: ReturnType<typeof apiCaseToEcgCase>[], reportsCount: number) {
  if (!cases.length) {
    return [
      { label: "Awaiting first ECG upload", time: "09:30", tone: "primary" as const },
      { label: "AI analysis will appear after upload", time: "09:35", tone: "success" as const },
      { label: "Report generation ready", time: "09:40", tone: "warning" as const },
      { label: "Physician review queue ready", time: "10:00", tone: "primary" as const },
    ];
  }
  const first = cases[0];
  const uploaded = new Date(first.date);
  const time = (offsetMinutes: number) => new Date(uploaded.getTime() + offsetMinutes * 60_000).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  return [
    { label: `${first.patientName} ECG uploaded`, time: time(0), tone: "primary" as const },
    { label: `AI analysis completed: ${first.diagnosis}`, time: time(5), tone: first.status === "critical" ? "danger" as const : "success" as const },
    { label: reportsCount ? "Report generated" : "Report generation pending", time: time(10), tone: reportsCount ? "success" as const : "warning" as const },
    { label: first.confidence ? "Physician review ready" : "Physician review pending", time: time(30), tone: first.confidence ? "primary" as const : "warning" as const },
  ];
}

function RecentTimeline({ cases }: { cases: ReturnType<typeof apiCaseToEcgCase>[] }) {
  const colors = useColors();
  return (
    <BoltCard style={styles.panel}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent ECG Timeline</Text>
      {cases.length ? (
        cases.map((item) => (
          <View key={item.id} style={[styles.timelineRow, { borderColor: colors.border }]}>
            <View style={styles.timelinePatient}>
              <Text style={[styles.timelineName, { color: colors.text }]}>{item.patientName}</Text>
              <Text style={[styles.timelineMeta, { color: colors.textSecondary }]}>{item.date.slice(0, 10)}</Text>
            </View>
            <Text numberOfLines={1} style={[styles.timelineDiagnosis, { color: colors.textSecondary }]}>{item.diagnosis}</Text>
            <Text style={[styles.timelineConfidence, { color: colors.primary }]}>{item.confidence}%</Text>
            <BoltBadge label={item.status} tone={item.status === "critical" ? "danger" : item.status === "normal" ? "success" : "warning"} />
          </View>
        ))
      ) : (
        <BoltEmpty title="No timeline entries" message="Recent live ECG analyses will appear here after upload and AI processing." />
      )}
    </BoltCard>
  );
}

function AIAssistantPanel({
  diagnosis,
  recommendations,
}: {
  diagnosis: string;
  recommendations: string[];
}) {
  const colors = useColors();
  return (
    <BoltCard highlight style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>AI Assistant</Text>
        <BoltBadge icon="cpu" label="Clinical AI" />
      </View>
      <Text style={[styles.assistantText, { color: colors.textSecondary }]}>
        Explain diagnosis, differential diagnosis, and treatment recommendations using the existing AI analysis context.
      </Text>
      <Text style={[styles.assistantDiagnosis, { color: colors.text }]}>{diagnosis}</Text>
      {recommendations.slice(0, 3).map((item, index) => (
        <Text key={`${item}-${index}`} style={[styles.assistantText, { color: colors.textSecondary }]}>
          {index + 1}. {item}
        </Text>
      ))}
      <BoltButton icon="message-circle" label="Ask AI" onPress={() => {}} variant="outline" />
    </BoltCard>
  );
}

const styles = StyleSheet.create({
  activityActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  activityCard: { borderRadius: 18, borderWidth: 1, gap: 9, padding: 12 },
  activityTop: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "space-between" },
  alertCount: { fontFamily: "Inter_700Bold", fontSize: 18 },
  alertContent: { flex: 1, gap: 2 },
  alertRow: { alignItems: "center", borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 10, padding: 12 },
  alertText: { flex: 1, fontFamily: "Inter_600SemiBold", fontSize: 13, lineHeight: 18 },
  assistantDiagnosis: { fontFamily: "Inter_700Bold", fontSize: 16, lineHeight: 22 },
  assistantText: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 20 },
  avatar: { alignItems: "center", borderRadius: 24, height: 48, justifyContent: "center", width: 48 },
  avatarText: { color: "#050816", fontFamily: "Inter_700Bold", fontSize: 16 },
  banner: { alignItems: "center", flexDirection: "row", gap: 10 },
  bannerText: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 13 },
  caseCard: { alignItems: "center", flexDirection: "row", gap: 10 },
  caseMain: { flex: 1, gap: 4 },
  caseName: { fontFamily: "Inter_700Bold", fontSize: 15 },
  chartGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  clinicalTimelineItem: { alignItems: "flex-start", flexDirection: "row", gap: 10, minHeight: 50 },
  commandColumn: { flex: 1, gap: 10, minWidth: 320 },
  commandGrid: { alignItems: "flex-start", flexDirection: "row", flexWrap: "wrap", gap: 10 },
  headerMetaRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 8 },
  headerRole: { flexShrink: 1, fontFamily: "Inter_600SemiBold", fontSize: 12 },
  headerTime: { fontFamily: "Inter_500Medium", fontSize: 12 },
  hero: { gap: 10, maxHeight: 300, overflow: "hidden" },
  heroActions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  heroDate: { fontFamily: "Inter_500Medium", fontSize: 13 },
  heroMain: { flex: 1, gap: 3 },
  heroSubtitle: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 21 },
  lastLogin: { fontFamily: "Inter_500Medium", fontSize: 12 },
  heroTitle: { fontFamily: "Inter_700Bold", fontSize: 30, letterSpacing: -0.8 },
  heroTop: { alignItems: "center", flexDirection: "row", gap: 12 },
  heroWave: { left: 0, opacity: 0.35, position: "absolute", right: 0, top: 10 },
  kicker: { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1.1, textTransform: "uppercase" },
  kpiCell: { flex: 1, minWidth: 250 },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  loadingCard: { flex: 1, height: 132, minWidth: "47%" },
  loadingGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metricRow: { flexDirection: "row", gap: 10 },
  muted: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19 },
  mobileGreeting: { fontFamily: "Inter_700Bold", fontSize: 20, letterSpacing: -0.4 },
  mobileHeader: { alignItems: "center", flexDirection: "row", gap: 12, minHeight: 58 },
  mobileHeaderText: { flex: 1, gap: 5 },
  monitorPanel: { gap: 10, overflow: "hidden" },
  monitorStat: { borderRadius: 14, borderWidth: 1, flex: 1, gap: 4, minWidth: "47%", padding: 10 },
  monitorStatLabel: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  monitorStats: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  monitorStatValue: { fontFamily: "Inter_700Bold", fontSize: 13 },
  navGrid: { gap: 10 },
  offlineCard: { gap: 8 },
  panel: { gap: 12 },
  quickActionCard: { alignItems: "center", borderRadius: 22, borderWidth: 1, gap: 10, justifyContent: "center", minHeight: 92, minWidth: 132, padding: 14 },
  quickActionIcon: { alignItems: "center", borderRadius: 18, height: 48, justifyContent: "center", width: 48 },
  quickActions: { flexDirection: "row", gap: 10, paddingRight: 8 },
  quickActionText: { fontFamily: "Inter_700Bold", fontSize: 13, textAlign: "center" },
  panelHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  roleCard: { borderRadius: 16, borderWidth: 1, flex: 1, gap: 6, minHeight: 92, minWidth: "30%", padding: 12 },
  roleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  roleLabel: { fontFamily: "Inter_600SemiBold", fontSize: 11, lineHeight: 15 },
  roleValue: { fontFamily: "Inter_700Bold", fontSize: 19 },
  searchCard: { gap: 10, position: "relative", zIndex: 10 },
  searchInput: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 14, minHeight: 44 },
  searchInputWrap: { alignItems: "center", borderRadius: 18, borderWidth: 1, flexDirection: "row", gap: 10, minHeight: 52, paddingHorizontal: 12 },
  sectionHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  statusEmoji: { fontSize: 14 },
  statusLabel: { fontFamily: "Inter_700Bold", fontSize: 11 },
  statusPill: { alignItems: "center", borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 8, padding: 10 },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statusValue: { fontFamily: "Inter_700Bold", fontSize: 11 },
  suggestionItem: { alignItems: "center", borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 10, minHeight: 52, paddingHorizontal: 12 },
  suggestionLabel: { fontFamily: "Inter_700Bold", fontSize: 13 },
  suggestionList: { gap: 8 },
  suggestionMeta: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 17 },
  suggestionText: { flex: 1, gap: 2 },
  insightRow: { alignItems: "flex-start", borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 10, padding: 10 },
  reportRow: { alignItems: "center", borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 10, padding: 10 },
  tableHeadPatient: { flex: 1.35, fontFamily: "Inter_700Bold", fontSize: 11, textTransform: "uppercase" },
  tableHeadSmall: { flex: 0.52, fontFamily: "Inter_700Bold", fontSize: 11, textTransform: "uppercase" },
  tableHeadStatus: { flex: 0.9, fontFamily: "Inter_700Bold", fontSize: 11, textTransform: "uppercase" },
  tableHeader: { borderBottomWidth: 1, flexDirection: "row", gap: 8, paddingBottom: 8 },
  tablePrimary: { fontFamily: "Inter_700Bold", fontSize: 13, textTransform: "none" },
  tableRow: { alignItems: "center", borderBottomWidth: 1, flexDirection: "row", gap: 8, paddingVertical: 9 },
  tableSecondary: { fontFamily: "Inter_500Medium", fontSize: 11, lineHeight: 16, textTransform: "none" },
  timelineConfidence: { fontFamily: "Inter_700Bold", fontSize: 13, minWidth: 44 },
  timelineContent: { flex: 1, gap: 2, paddingBottom: 12 },
  timelineDot: { borderRadius: 999, height: 12, marginTop: 4, width: 12 },
  timelineDiagnosis: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 12 },
  timelineMeta: { fontFamily: "Inter_500Medium", fontSize: 11 },
  timelineName: { fontFamily: "Inter_700Bold", fontSize: 13 },
  timelinePatient: { width: 132 },
  timelineRow: { alignItems: "center", borderBottomWidth: 1, flexDirection: "row", gap: 10, paddingVertical: 10 },
});
