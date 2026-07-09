import React, { memo } from "react";

import { Stack } from "../../primitives/Stack";
import { Text } from "../../primitives/Text";
import { PrimaryButton } from "../buttons";

export const SuccessState = memo(function SuccessState({ actionLabel = "Continue", message, title }: { actionLabel?: string; message: string; title: string }) {
  return (
    <Stack gap={12} testID="ds-success-state">
      <Text variant="title">{title}</Text>
      <Text tone="muted" variant="body">{message}</Text>
      <PrimaryButton label={actionLabel} />
    </Stack>
  );
});

export const OperationSuccess = memo(function OperationSuccess({ message }: { message: string }) {
  return <SuccessState message={message} title="Success" />;
});
