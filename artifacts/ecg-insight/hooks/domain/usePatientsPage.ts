import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { clinicalDomainService } from "@/services/domain";
import { queryKeys } from "@/store/query-keys";
import { safeArray } from "@/utils/collections";
import { toQueryAsyncView } from "@/utils/asyncState";
import type { PatientListItemView } from "@/types/screens/patients";

export type PatientsFilters = {
  gender: string;
  page: number;
  query: string;
  sortBy: string;
  status: string;
};

export function usePatientsPage(accessToken?: string, filters?: PatientsFilters) {
  const queryClient = useQueryClient();
  const params = useMemo(() => {
    const next = new URLSearchParams({ page: String(filters?.page ?? 1), pageSize: "12" });
    if (filters?.query.trim()) next.set("q", filters.query.trim());
    if (filters?.gender && filters.gender !== "all") next.set("gender", filters.gender);
    if (filters?.status && filters.status !== "all") next.set("status", filters.status);
    if (filters?.sortBy) next.set("sortBy", filters.sortBy);
    next.set("sortDir", filters?.sortBy === "createdAt" ? "desc" : "asc");
    return next;
  }, [filters?.gender, filters?.page, filters?.query, filters?.sortBy, filters?.status]);

  const patientsQuery = useQuery({
    enabled: !!accessToken,
    queryFn: () => clinicalDomainService.listPatients(accessToken!, params),
    queryKey: [...queryKeys.patients.list(accessToken), params.toString()],
    retry: false,
  });

  const archiveMutation = useMutation({
    mutationFn: (patientId: string) => clinicalDomainService.archivePatient(accessToken!, patientId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.patients.list(accessToken) }),
  });

  const patients = safeArray(patientsQuery.data?.patients);
  const patientsView: PatientListItemView[] = patients.map((item) => ({
    age: item.age,
    fullName: `${item.firstName ?? ""} ${item.lastName ?? ""}`.trim(),
    gender: item.gender,
    id: item.id,
    medicalRecordNumber: item.medicalRecordNumber,
    riskLevel: item.hypertension || item.diabetes ? "high" : "normal",
  }));

  const view = toQueryAsyncView({
    data: patients,
    emptyWhen: (data) => !data?.length,
    error: patientsQuery.error,
    isError: patientsQuery.isError,
    isLoading: patientsQuery.isLoading,
  });

  return {
    archiveMutation,
    patients,
    patientsQuery,
    patientsView,
    view,
  };
}
