import { Feather } from "@expo/vector-icons";
import React, { memo } from "react";
import { Pressable, View } from "react-native";

import { formatRelativeTime } from "@/adapters/bolt/dashboard-chart.adapter";
import { PrimaryButton } from "@/design-system/components/buttons";
import { MedicalCard } from "@/design-system/components/cards";
import { LinearProgress } from "@/design-system/components/loading";
import { useBreakpoint } from "@/design-system/hooks/useBreakpoint";
import { useDesignTokens } from "@/design-system/hooks/useDesignTokens";
import { Stack } from "@/design-system/primitives/Stack";
import { Text } from "@/design-system/primitives/Text";
import type { DashboardRecentCaseRow, DashboardScreenContract } from "@/types/screens/dashboard";

import { DashboardAreaChart } from "./charts/DashboardAreaChart";
import { DashboardPieChart } from "./charts/DashboardPieChart";
import { withAlpha } from "./charts/chart-colors";

type Props = {
  contract: DashboardScreenContract;
};

function welcomeName(name?: string) {
  if (!name) return "Doctor";
  return name.split(" ").slice(0, 2).join(" ");
}

function formatTodayLabel() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function PriorityBadge({ priority }: { priority: DashboardRecentCaseRow["priority"] }) {
  const tokens = useDesignTokens();
  const palette = {
    critical: {
      backgroundColor: withAlpha(tokens.colors.medical.critical, 0.1),
      borderColor: withAlpha(tokens.colors.medical.critical, 0.2),
      color: tokens.colors.medical.critical,
    },
    routine: {
      backgroundColor: withAlpha(tokens.colors.medical.success, 0.1),
      borderColor: withAlpha(tokens.colors.medical.success, 0.2),
      color: tokens.colors.medical.success,
    },
    urgent: {
      backgroundColor: withAlpha(tokens.colors.medical.warning, 0.1),
      borderColor: withAlpha(tokens.colors.medical.warning, 0.2),
      color: tokens.colors.medical.warning,
    },
  }[priority];

  return (
    <View
      style={{
        alignSelf: "flex-start",
        backgroundColor: palette.backgroundColor,
        borderColor: palette.borderColor,
        borderRadius: tokens.radii.xs,
        borderWidth: 1,
        paddingHorizontal: tokens.spacing.inset.sm,
        paddingVertical: 2,
      }}
    >
      <Text style={{ color: palette.color, fontSize: 10, fontWeight: "700", textTransform: "capitalize" }} variant="small">
        {priority}
      </Text>
    </View>
  );
}

function StatusIndicator({ status }: { status: DashboardRecentCaseRow["status"] }) {
  const tokens = useDesignTokens();
  const config = {
    analyzing: { color: tokens.colors.medical.primary, icon: "activity" as const },
    completed: { color: tokens.colors.medical.success, icon: "check-circle" as const },
    pending: { color: tokens.colors.text.secondary, icon: "clock" as const },
    reviewed: { color: tokens.colors.medical.success, icon: "check-circle" as const },
    reviewing: { color: tokens.colors.medical.warning, icon: "clock" as const },
  }[status];

  return (
    <View style={{ alignItems: "center", flexDirection: "row", gap: tokens.spacing.inset.xs }}>
      <Feather color={config.color} name={config.icon} size={14} />
      <Text style={{ textTransform: "capitalize" }} tone="muted" variant="caption">
        {status}
      </Text>
    </View>
  );
}

function StatCard({
  caption,
  captionColor,
  icon,
  iconBackground,
  iconColor,
  label,
  progress,
  value,
}: {
  caption: string;
  captionColor?: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  iconBackground: string;
  iconColor: string;
  label: string;
  progress?: number;
  value: string;
}) {
  const tokens = useDesignTokens();

  return (
    <MedicalCard style={{ flexGrow: 1, minWidth: 140, padding: tokens.spacing.inset.lg }}>
      <View style={{ alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" }}>
        <Stack gap={4} style={{ flex: 1 }}>
          <Text tone="muted" variant="caption">
            {label}
          </Text>
          <Text style={{ fontSize: 24, fontWeight: "700", lineHeight: 28 }} variant="heading">
            {value}
          </Text>
          {progress !== undefined ? (
            <View style={{ marginTop: tokens.spacing.inset.sm, width: "100%" }}>
              <LinearProgress progress={progress / 100} />
            </View>
          ) : (
            <Text style={{ color: captionColor, marginTop: tokens.spacing.inset.xs }} tone={captionColor ? undefined : "muted"} variant="caption">
              {caption}
            </Text>
          )}
        </Stack>
        <View
          style={{
            alignItems: "center",
            backgroundColor: iconBackground,
            borderRadius: tokens.radii.md,
            height: 36,
            justifyContent: "center",
            width: 36,
          }}
        >
          <Feather color={iconColor} name={icon} size={18} />
        </View>
      </View>
    </MedicalCard>
  );
}

export const DashboardBoltPresentation = memo(function DashboardBoltPresentation({ contract }: Props) {
  const { actions, data } = contract;
  const tokens = useDesignTokens();
  const { isDesktop, isMobile } = useBreakpoint();
  const statBasis = isDesktop ? "23%" : "48%";
  const wideBasis = isDesktop ? "66%" : "100%";
  const narrowBasis = isDesktop ? "32%" : "100%";

  return (
    <Stack gap={24} testID="bolt-dashboard">
      <View style={{ alignItems: isMobile ? "flex-start" : "center", flexDirection: isMobile ? "column" : "row", gap: tokens.spacing.inset.lg, justifyContent: "space-between" }}>
        <Stack gap={4}>
          <Text style={{ fontSize: 24, fontWeight: "700", lineHeight: 30 }} variant="heading">
            Welcome back, {welcomeName(data.user.name)}
          </Text>
          <Text tone="muted" variant="caption">
            {formatTodayLabel()}
          </Text>
        </Stack>
        <PrimaryButton icon="upload" label="Upload ECG" onPress={actions.onUploadEcg} />
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: tokens.spacing.inset.lg }}>
        <View style={{ flexBasis: statBasis, flexGrow: 1 }}>
          <StatCard
            caption={`+${data.boltStats.casesThisMonth} this month`}
            captionColor={tokens.colors.medical.success}
            icon="heart"
            iconBackground={withAlpha(tokens.colors.medical.primary, 0.1)}
            iconColor={tokens.colors.medical.primary}
            label="Total Cases"
            value={String(data.boltStats.totalCases)}
          />
        </View>
        <View style={{ flexBasis: statBasis, flexGrow: 1 }}>
          <StatCard
            caption="Awaiting review"
            icon="clock"
            iconBackground={withAlpha(tokens.colors.medical.warning, 0.1)}
            iconColor={tokens.colors.medical.warning}
            label="Pending Reviews"
            value={String(data.boltStats.pendingReviews)}
          />
        </View>
        <View style={{ flexBasis: statBasis, flexGrow: 1 }}>
          <StatCard
            caption="Immediate attention"
            captionColor={tokens.colors.medical.critical}
            icon="alert-triangle"
            iconBackground={withAlpha(tokens.colors.medical.critical, 0.1)}
            iconColor={tokens.colors.medical.critical}
            label="Critical Cases"
            value={String(data.boltStats.criticalCases)}
          />
        </View>
        <View style={{ flexBasis: statBasis, flexGrow: 1 }}>
          <StatCard
            caption=""
            icon="activity"
            iconBackground={withAlpha(tokens.colors.medical.success, 0.1)}
            iconColor={tokens.colors.medical.success}
            label="AI Accuracy"
            progress={data.boltStats.avgConfidence}
            value={`${data.boltStats.avgConfidence}%`}
          />
        </View>
      </View>

      <View style={{ flexDirection: isDesktop ? "row" : "column", flexWrap: "wrap", gap: tokens.spacing.inset.lg }}>
        <View style={{ flexBasis: wideBasis, flexGrow: 1, minWidth: 280 }}>
          <MedicalCard subtitle="ECG analyses over the past 6 months" title="Monthly Cases">
            <DashboardAreaChart data={data.monthlyCases} />
          </MedicalCard>
        </View>
        <View style={{ flexBasis: narrowBasis, flexGrow: 1, minWidth: 240 }}>
          <MedicalCard subtitle="Distribution by diagnosis" title="Findings">
            <DashboardPieChart data={data.diagnosisDistribution} />
          </MedicalCard>
        </View>
      </View>

      <View style={{ flexDirection: isDesktop ? "row" : "column", flexWrap: "wrap", gap: tokens.spacing.inset.lg }}>
        <View style={{ flexBasis: wideBasis, flexGrow: 1, minWidth: 280 }}>
          <MedicalCard style={{ gap: 0, padding: 0 }}>
            <View
              style={{
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "space-between",
                paddingBottom: tokens.spacing.inset.sm,
                paddingHorizontal: tokens.spacing.inset.lg,
                paddingTop: tokens.spacing.inset.lg,
              }}
            >
              <Stack gap={4}>
                <Text variant="title">Recent Cases</Text>
                <Text tone="muted" variant="caption">
                  Latest ECG analyses
                </Text>
              </Stack>
              <Pressable
                accessibilityRole="button"
                onPress={actions.onViewAllCases}
                style={({ hovered, pressed }) => ({
                  alignItems: "center",
                  flexDirection: "row",
                  gap: tokens.spacing.inset.xs,
                  opacity: hovered || pressed ? tokens.opacity.medium : tokens.opacity.opaque,
                })}
              >
                <Text style={{ color: tokens.colors.medical.primary }} variant="caption">
                  View all
                </Text>
                <Feather color={tokens.colors.medical.primary} name="chevron-right" size={12} />
              </Pressable>
            </View>
            <Stack gap={0}>
              {data.recentCaseRows.map((item, index) => (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  onPress={() => actions.onOpenCase(item.id)}
                  style={({ hovered, pressed }) => ({
                    alignItems: "center",
                    backgroundColor: hovered || pressed ? withAlpha(tokens.colors.surface.toolbar, 0.65) : "transparent",
                    borderTopColor: tokens.colors.border.default,
                    borderTopWidth: index === 0 ? 1 : 0,
                    flexDirection: "row",
                    gap: tokens.spacing.inset.md,
                    paddingHorizontal: tokens.spacing.inset.lg,
                    paddingVertical: tokens.spacing.inset.md,
                  })}
                >
                  <View
                    style={{
                      alignItems: "center",
                      backgroundColor: withAlpha(tokens.colors.medical.primary, 0.1),
                      borderRadius: tokens.radii.md,
                      height: 32,
                      justifyContent: "center",
                      width: 32,
                    }}
                  >
                    <Feather color={tokens.colors.medical.primary} name="heart" size={16} />
                  </View>
                  <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: tokens.spacing.inset.sm }}>
                      <Text numberOfLines={1} style={{ flexShrink: 1 }} variant="subtitle">
                        {item.patientName}
                      </Text>
                      <PriorityBadge priority={item.priority} />
                    </View>
                    <View style={{ alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: tokens.spacing.inset.sm }}>
                      <Text tone="muted" variant="caption">
                        {item.caseId}
                      </Text>
                      <Text tone="muted" variant="caption">
                        ·
                      </Text>
                      <Text tone="muted" variant="caption">
                        {item.rhythm}
                      </Text>
                    </View>
                  </Stack>
                  <StatusIndicator status={item.status} />
                </Pressable>
              ))}
            </Stack>
          </MedicalCard>
        </View>

        <View style={{ flexBasis: narrowBasis, flexGrow: 1, minWidth: 240 }}>
          <MedicalCard style={{ gap: 0, padding: 0 }}>
            <View style={{ paddingBottom: tokens.spacing.inset.sm, paddingHorizontal: tokens.spacing.inset.lg, paddingTop: tokens.spacing.inset.lg }}>
              <Text variant="title">Activity</Text>
              <Text tone="muted" variant="caption">
                Recent platform activity
              </Text>
            </View>
            <Stack gap={0}>
              {data.activity.map((event, index) => (
                <View
                  key={event.id}
                  style={{
                    borderTopColor: tokens.colors.border.default,
                    borderTopWidth: index === 0 ? 1 : 0,
                    paddingHorizontal: tokens.spacing.inset.lg,
                    paddingVertical: tokens.spacing.inset.md,
                  }}
                >
                  <Text variant="caption">
                    <Text variant="caption">{event.user} </Text>
                    <Text tone="muted" variant="caption">
                      {event.action}{" "}
                    </Text>
                    <Text variant="caption">{event.target}</Text>
                  </Text>
                  <Text style={{ marginTop: 2 }} tone="muted" variant="small">
                    {formatRelativeTime(event.createdAt)}
                  </Text>
                </View>
              ))}
            </Stack>
          </MedicalCard>
        </View>
      </View>

      <MedicalCard
        style={{
          backgroundColor: withAlpha(tokens.colors.medical.primary, 0.05),
          borderColor: withAlpha(tokens.colors.medical.primary, 0.2),
        }}
      >
        <View style={{ alignItems: isMobile ? "flex-start" : "center", flexDirection: isMobile ? "column" : "row", gap: tokens.spacing.inset.lg, justifyContent: "space-between" }}>
          <View style={{ alignItems: "center", flexDirection: "row", gap: tokens.spacing.inset.lg }}>
            <View
              style={{
                alignItems: "center",
                backgroundColor: withAlpha(tokens.colors.medical.primary, 0.1),
                borderColor: withAlpha(tokens.colors.medical.primary, 0.2),
                borderRadius: tokens.radii.lg,
                borderWidth: 1,
                height: 48,
                justifyContent: "center",
                width: 48,
              }}
            >
              <Feather color={tokens.colors.medical.primary} name="upload-cloud" size={24} />
            </View>
            <Stack gap={4}>
              <Text variant="subtitle">Upload a New ECG</Text>
              <Text tone="muted" variant="caption">
                Get AI-powered analysis in under 30 seconds
              </Text>
            </Stack>
          </View>
          <PrimaryButton icon="upload" label="Upload ECG" onPress={actions.onUploadEcg} />
        </View>
      </MedicalCard>
    </Stack>
  );
});
