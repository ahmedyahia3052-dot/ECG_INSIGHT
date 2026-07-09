import React, { memo, type PropsWithChildren } from "react";

import { WorkspaceContainer, PanelContainer } from "../components/containers";
import { Stack } from "../primitives/Stack";

type LayoutProps = PropsWithChildren<{ testID: string }>;

function LayoutShell({ children, testID }: LayoutProps) {
  return (
    <WorkspaceContainer testLabel={testID}>
      <Stack gap={16} style={{ flex: 1, minHeight: 0, padding: 16 }}>
        {children}
      </Stack>
    </WorkspaceContainer>
  );
}

export const AppLayout = memo(function AppLayout({ children }: PropsWithChildren) {
  return <LayoutShell testID="ds-layout-app">{children}</LayoutShell>;
});

export const DashboardLayout = memo(function DashboardLayout({ children }: PropsWithChildren) {
  return <LayoutShell testID="ds-layout-dashboard">{children}</LayoutShell>;
});

export const WorkspaceLayout = memo(function WorkspaceLayout({ children }: PropsWithChildren) {
  return (
    <WorkspaceContainer testLabel="ds-layout-workspace">
      <Stack direction="row" gap={0} style={{ flex: 1, minHeight: 0 }}>
        <PanelContainer style={{ flex: 1, minWidth: 0 }} testLabel="ds-layout-workspace-main">{children}</PanelContainer>
      </Stack>
    </WorkspaceContainer>
  );
});

export const ViewerLayout = memo(function ViewerLayout({ children }: PropsWithChildren) {
  return <LayoutShell testID="ds-layout-viewer">{children}</LayoutShell>;
});

export const MonitorLayout = memo(function MonitorLayout({ children }: PropsWithChildren) {
  return <LayoutShell testID="ds-layout-monitor">{children}</LayoutShell>;
});

export const AuthenticationLayout = memo(function AuthenticationLayout({ children }: PropsWithChildren) {
  return <LayoutShell testID="ds-layout-auth">{children}</LayoutShell>;
});

export const SettingsLayout = memo(function SettingsLayout({ children }: PropsWithChildren) {
  return <LayoutShell testID="ds-layout-settings">{children}</LayoutShell>;
});

export const DeveloperLayout = memo(function DeveloperLayout({ children }: PropsWithChildren) {
  return <LayoutShell testID="ds-layout-developer">{children}</LayoutShell>;
});

export const OrganizationLayout = memo(function OrganizationLayout({ children }: PropsWithChildren) {
  return <LayoutShell testID="ds-layout-organization">{children}</LayoutShell>;
});

export const ResponsiveGrid = memo(function ResponsiveGrid({ children }: PropsWithChildren) {
  return (
    <Stack direction="row" gap={16} style={{ flexWrap: "wrap" }}>
      {children}
    </Stack>
  );
});
