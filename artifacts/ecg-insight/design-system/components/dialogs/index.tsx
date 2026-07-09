import React, { memo, type PropsWithChildren } from "react";

import { DialogContainer } from "../containers";
import { Stack } from "../../primitives/Stack";
import { Text } from "../../primitives/Text";
import { DangerButton, PrimaryButton, SecondaryButton } from "../buttons";

type DialogProps = PropsWithChildren<{ message: string; title: string }>;

function DialogFrame({ children, message, testID, title }: DialogProps & { testID: string }) {
  return (
    <DialogContainer testLabel="ds-container-dialog" style={{ gap: 16, maxWidth: 480, padding: 20, width: "100%" }}>
      <Stack gap={8} testID={testID}>
        <Text variant="title">{title}</Text>
        <Text tone="muted" variant="body">{message}</Text>
        {children}
      </Stack>
    </DialogContainer>
  );
}

export const ConfirmationDialog = memo(function ConfirmationDialog({ message, title }: DialogProps) {
  return (
    <DialogFrame message={message} testID="ds-dialog-confirmation" title={title}>
      <Stack direction="row" gap={8}>
        <SecondaryButton label="Cancel" />
        <PrimaryButton label="Confirm" />
      </Stack>
    </DialogFrame>
  );
});

export const WarningDialog = memo(function WarningDialog({ message, title }: DialogProps) {
  return (
    <DialogFrame message={message} testID="ds-dialog-warning" title={title}>
      <SecondaryButton label="Acknowledge" />
    </DialogFrame>
  );
});

export const SuccessDialog = memo(function SuccessDialog({ message, title }: DialogProps) {
  return (
    <DialogFrame message={message} testID="ds-dialog-success" title={title}>
      <PrimaryButton label="Continue" />
    </DialogFrame>
  );
});

export const DeleteDialog = memo(function DeleteDialog({ message, title }: DialogProps) {
  return (
    <DialogFrame message={message} testID="ds-dialog-delete" title={title}>
      <DangerButton label="Delete" />
    </DialogFrame>
  );
});

export const CriticalAlertDialog = memo(function CriticalAlertDialog({ message, title }: DialogProps) {
  return (
    <DialogFrame message={message} testID="ds-dialog-critical" title={title}>
      <DangerButton label="Acknowledge Critical Alert" />
    </DialogFrame>
  );
});
