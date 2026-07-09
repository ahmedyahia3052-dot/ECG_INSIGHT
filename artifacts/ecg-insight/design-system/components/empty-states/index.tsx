import React, { memo } from "react";

import { Stack } from "../../primitives/Stack";
import { Text } from "../../primitives/Text";
import { GhostButton } from "../buttons";

function EmptyShell({ actionLabel, description, testID, title }: { actionLabel?: string; description: string; testID: string; title: string }) {
  return (
    <Stack gap={12} style={{ alignItems: "center", padding: 24 }}>
      <Text testID={testID} variant="title">{title}</Text>
      <Text tone="muted" variant="body">{description}</Text>
      {actionLabel ? <GhostButton label={actionLabel} /> : null}
    </Stack>
  );
}

export const NoEcgEmptyState = memo(function NoEcgEmptyState() {
  return <EmptyShell actionLabel="Upload ECG" description="Upload or assign an ECG study to begin clinical review." testID="ds-empty-no-ecg" title="No ECG Available" />;
});

export const NoPatientsEmptyState = memo(function NoPatientsEmptyState() {
  return <EmptyShell actionLabel="Add Patient" description="Create a patient record to link ECG studies and reports." testID="ds-empty-no-patients" title="No Patients" />;
});

export const NoCasesEmptyState = memo(function NoCasesEmptyState() {
  return <EmptyShell description="Cases will appear after ECG upload and processing." testID="ds-empty-no-cases" title="No Cases" />;
});

export const NoOrganizationsEmptyState = memo(function NoOrganizationsEmptyState() {
  return <EmptyShell description="Organization records will appear after enterprise onboarding." testID="ds-empty-no-organizations" title="No Organizations" />;
});

export const NoReportsEmptyState = memo(function NoReportsEmptyState() {
  return <EmptyShell description="Generate a clinical report after ECG analysis completes." testID="ds-empty-no-reports" title="No Reports" />;
});
