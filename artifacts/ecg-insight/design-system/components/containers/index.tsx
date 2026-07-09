import React, { memo, type PropsWithChildren } from "react";
import { View, type ViewProps } from "react-native";

import { useDesignTokens } from "../../hooks/useDesignTokens";
import { mergeStyles } from "../../utilities/style";

type ShellProps = PropsWithChildren<ViewProps & { testLabel?: string }>;

function ContainerShell({ children, style, testLabel = "ds-container", ...rest }: ShellProps) {
  const tokens = useDesignTokens();
  return (
    <View
      style={mergeStyles(
        {
          backgroundColor: tokens.colors.surface.background,
          flex: 1,
          minHeight: 0,
          minWidth: 0,
        },
        style,
      )}
      testID={testLabel}
      {...rest}
    >
      {children}
    </View>
  );
}

export const WorkspaceContainer = memo(function WorkspaceContainer(props: ShellProps) {
  const tokens = useDesignTokens();
  return <ContainerShell {...props} style={mergeStyles({ backgroundColor: tokens.colors.surface.workspace }, props.style)} testLabel="ds-container-workspace" />;
});

export const PanelContainer = memo(function PanelContainer(props: ShellProps) {
  return <ContainerShell {...props} testLabel="ds-container-panel" />;
});

export const SectionContainer = memo(function SectionContainer(props: ShellProps) {
  const tokens = useDesignTokens();
  return (
    <ContainerShell
      {...props}
      style={mergeStyles({ gap: tokens.spacing.stack.default, padding: tokens.spacing.inset.md }, props.style)}
      testLabel="ds-container-section"
    />
  );
});

export const DrawerContainer = memo(function DrawerContainer(props: ShellProps) {
  const tokens = useDesignTokens();
  return (
    <ContainerShell
      {...props}
      style={mergeStyles({ backgroundColor: tokens.colors.surface.sidebar, zIndex: tokens.zIndex.drawer }, props.style)}
      testLabel="ds-container-drawer"
    />
  );
});

export const DialogContainer = memo(function DialogContainer(props: ShellProps) {
  const tokens = useDesignTokens();
  return (
    <ContainerShell
      {...props}
      style={mergeStyles(
        {
          backgroundColor: tokens.colors.surface.dialog,
          borderRadius: tokens.radii.dialog,
          ...tokens.shadows.lg,
          zIndex: tokens.zIndex.dialog,
        },
        props.style,
      )}
      testLabel="ds-container-dialog"
    />
  );
});
