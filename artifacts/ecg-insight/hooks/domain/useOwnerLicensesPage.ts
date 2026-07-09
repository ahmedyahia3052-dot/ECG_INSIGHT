import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

import type { LicenseRecord, SubscriptionPlanCode } from "@/services/subscriptions";
import { ownerLicensesDomainService, usersDomainService } from "@/services/domain";
import { queryKeys } from "@/store/query-keys";
import { safeArray } from "@/utils/collections";

export type LicenseAction = "extend" | "resume" | "revoke" | "suspend";

export function useOwnerLicensesPage(accessToken?: string, enabled = false) {
  const queryClient = useQueryClient();

  const licensesQuery = useQuery({
    enabled: !!accessToken && enabled,
    queryFn: () => ownerLicensesDomainService.listLicenses(accessToken!),
    queryKey: queryKeys.owner.licenses(accessToken),
    retry: false,
  });
  const usersQuery = useQuery({
    enabled: !!accessToken && enabled,
    queryFn: () => usersDomainService.listDirectory(accessToken!),
    queryKey: queryKeys.owner.users(accessToken),
    retry: false,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.owner.licenses(accessToken) });
  const grantMutation = useMutation({
    mutationFn: (payload: Parameters<typeof ownerLicensesDomainService.grantLicense>[1]) =>
      ownerLicensesDomainService.grantLicense(accessToken!, payload),
    onSuccess: invalidate,
  });
  const actionMutation = useMutation({
    mutationFn: ({
      action,
      expiresAt,
      license,
      notes,
    }: {
      action: LicenseAction;
      expiresAt?: string;
      license: LicenseRecord;
      notes?: string;
    }) =>
      ownerLicensesDomainService.updateLicense(accessToken!, license.id, {
        action,
        expiresAt: action === "extend" ? (expiresAt || license.expiryDate) ?? undefined : undefined,
        notes,
      }),
    onSuccess: invalidate,
  });

  const licenses = safeArray(licensesQuery.data?.licenses);
  const users = safeArray(usersQuery.data?.users);

  const filterLicenses = useMemo(
    () => (query: string) => {
      const needle = query.trim().toLowerCase();
      if (!needle) return licenses;
      return licenses.filter((license) =>
        [license.userName, license.email, license.username, license.status, license.subscriptionType]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(needle),
      );
    },
    [licenses],
  );

  return {
    actionMutation,
    filterLicenses,
    grantMutation,
    licenses,
    licensesQuery,
    users,
    usersQuery,
  };
}

export const OWNER_LICENSE_PLANS: SubscriptionPlanCode[] = ["free", "basic", "professional", "enterprise", "lifetime"];
