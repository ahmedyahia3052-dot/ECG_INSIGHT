import React, { memo, type PropsWithChildren } from "react";
import { View, type ViewProps } from "react-native";

import { useDesignTokens } from "../../hooks/useDesignTokens";
import { Text } from "../../primitives/Text";
import { mergeStyles } from "../../utilities/style";

type CardProps = PropsWithChildren<ViewProps & { subtitle?: string; testLabel?: string; title?: string }>;

function CardShell({ children, style, subtitle, testLabel = "ds-card", title, ...rest }: CardProps) {
  const tokens = useDesignTokens();
  return (
    <View
      style={mergeStyles(
        {
          backgroundColor: tokens.colors.surface.card,
          borderColor: tokens.colors.border.default,
          borderRadius: tokens.radii.card,
          borderWidth: 1,
          gap: tokens.spacing.stack.default,
          padding: tokens.spacing.inset.lg,
          ...tokens.shadows.sm,
        },
        style,
      )}
      testID={testLabel}
      {...rest}
    >
      {title ? <Text variant="title">{title}</Text> : null}
      {subtitle ? <Text tone="muted" variant="caption">{subtitle}</Text> : null}
      {children}
    </View>
  );
}

export const MedicalCard = memo(function MedicalCard(props: CardProps) {
  return <CardShell {...props} testLabel="ds-card-medical" />;
});

export const StatisticCard = memo(function StatisticCard({ label, value, ...props }: CardProps & { label: string; value: string }) {
  return (
    <CardShell {...props} testLabel="ds-card-statistic" title={label}>
      <Text variant="numeric">{value}</Text>
    </CardShell>
  );
});

export const PatientCard = memo(function PatientCard(props: CardProps) {
  return <CardShell {...props} testLabel="ds-card-patient" />;
});

export const MonitorCard = memo(function MonitorCard(props: CardProps) {
  const tokens = useDesignTokens();
  return (
    <CardShell
      {...props}
      style={mergeStyles({ backgroundColor: tokens.colors.surface.monitor }, props.style)}
      testLabel="ds-card-monitor"
    />
  );
});

export const AlertCard = memo(function AlertCard(props: CardProps) {
  const tokens = useDesignTokens();
  return (
    <CardShell
      {...props}
      style={mergeStyles({ borderColor: tokens.colors.medical.critical }, props.style)}
      testLabel="ds-card-alert"
    />
  );
});

export const EcgCard = memo(function EcgCard(props: CardProps) {
  const tokens = useDesignTokens();
  return (
    <CardShell
      {...props}
      style={mergeStyles({ backgroundColor: tokens.colors.surface.viewer }, props.style)}
      testLabel="ds-card-ecg"
    />
  );
});

export const TrendCard = memo(function TrendCard(props: CardProps) {
  return <CardShell {...props} testLabel="ds-chart-trend" />;
});

export const AnalyticsCard = memo(function AnalyticsCard(props: CardProps) {
  return <CardShell {...props} testLabel="ds-chart-analytics" />;
});

export const MedicalKpiCard = memo(function MedicalKpiCard({ delta, label, value, ...props }: CardProps & { delta?: string; label: string; value: string }) {
  return (
    <CardShell {...props} testLabel="ds-chart-kpi" title={label}>
      <Text variant="numeric">{value}</Text>
      {delta ? <Text tone="muted" variant="caption">{delta}</Text> : null}
    </CardShell>
  );
});
