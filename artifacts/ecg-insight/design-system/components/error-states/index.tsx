import React, { memo } from "react";

import { Stack } from "../../primitives/Stack";
import { Text } from "../../primitives/Text";
import { SecondaryButton } from "../buttons";

function ErrorShell({ description, testID, title }: { description: string; testID: string; title: string }) {
  return (
    <Stack gap={12} style={{ alignItems: "center", padding: 24 }}>
      <Text testID={testID} variant="title">{title}</Text>
      <Text tone="muted" variant="body">{description}</Text>
      <SecondaryButton label="Retry" />
    </Stack>
  );
}

export const OfflineErrorState = memo(function OfflineErrorState() {
  return <ErrorShell description="Check network connectivity and retry." testID="ds-error-offline" title="Offline" />;
});

export const ServerErrorState = memo(function ServerErrorState() {
  return <ErrorShell description="The clinical platform encountered an unexpected error." testID="ds-error-server" title="Server Error" />;
});

export const PermissionDeniedErrorState = memo(function PermissionDeniedErrorState() {
  return <ErrorShell description="You do not have permission to access this resource." testID="ds-error-permission" title="Permission Denied" />;
});

export const NotFoundErrorState = memo(function NotFoundErrorState() {
  return <ErrorShell description="The requested clinical resource could not be found." testID="ds-error-not-found" title="Not Found" />;
});
