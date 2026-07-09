import React, { memo } from "react";
import { View, type ViewProps } from "react-native";

import { useDesignTokens } from "../../hooks/useDesignTokens";
import { Text } from "../../primitives/Text";
import { resolveMedicalStatus, type MedicalStatusId } from "../../status/medical-status";
import { mergeStyles } from "../../utilities/style";

type BadgeTone = "critical" | "warning" | "success" | "primary" | "neutral";

function BadgeShell({ label, tone }: { label: string; tone: BadgeTone }) {
  const tokens = useDesignTokens();
  const palette: Record<BadgeTone, { background: string; color: string }> = {
    critical: { background: "rgba(244,63,94,0.16)", color: tokens.colors.medical.critical },
    warning: { background: "rgba(245,158,11,0.16)", color: tokens.colors.medical.warning },
    success: { background: "rgba(34,197,94,0.16)", color: tokens.colors.medical.success },
    primary: { background: "rgba(20,221,230,0.12)", color: tokens.colors.medical.primary },
    neutral: { background: "rgba(148,163,184,0.12)", color: tokens.colors.gray[400] },
  };
  const colors = palette[tone];
  return (
    <View
      style={{
        alignSelf: "flex-start",
        backgroundColor: colors.background,
        borderRadius: tokens.radii.xs,
        paddingHorizontal: tokens.spacing.inset.sm,
        paddingVertical: tokens.spacing.inset.xs,
      }}
    >
      <Text style={{ color: colors.color }} variant="statusLabel">
        {label}
      </Text>
    </View>
  );
}

export const CriticalBadge = memo(function CriticalBadge({ label = "Critical" }: { label?: string }) {
  return <BadgeShell label={label} tone="critical" />;
});

export const UrgentBadge = memo(function UrgentBadge({ label = "Urgent" }: { label?: string }) {
  return <BadgeShell label={label} tone="warning" />;
});

export const NormalBadge = memo(function NormalBadge({ label = "Normal" }: { label?: string }) {
  return <BadgeShell label={label} tone="success" />;
});

export const CompletedBadge = memo(function CompletedBadge({ label = "Completed" }: { label?: string }) {
  return <BadgeShell label={label} tone="success" />;
});

export const PendingBadge = memo(function PendingBadge({ label = "Pending" }: { label?: string }) {
  return <BadgeShell label={label} tone="warning" />;
});

export const AiConfidenceBadge = memo(function AiConfidenceBadge({ confidence }: { confidence: number }) {
  return <BadgeShell label={`AI ${Math.round(confidence * 100)}%`} tone="primary" />;
});

export const OrganizationBadge = memo(function OrganizationBadge({ label }: { label: string }) {
  return <BadgeShell label={label} tone="neutral" />;
});

export const SubscriptionBadge = memo(function SubscriptionBadge({ label }: { label: string }) {
  return <BadgeShell label={label} tone="primary" />;
});

export const MedicalStatusBadge = memo(function MedicalStatusBadge({ status }: { status: MedicalStatusId }) {
  const definition = resolveMedicalStatus(status);
  return <BadgeShell label={definition.label} tone={definition.badgeTone} />;
});

export function badgeContainer(props: ViewProps) {
  return props;
}
