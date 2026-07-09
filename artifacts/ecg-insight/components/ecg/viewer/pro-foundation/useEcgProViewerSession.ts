import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { getCase, type ApiECGCase } from "@/services/clinical";
import { getEcgStorageFileMetadata, getEcgViewerBundle } from "@/services/ecgViewerApi";
import { API_URL } from "@/services/api";

import type { EcgProViewerSession } from "./types";

function absoluteAssetUrl(path?: string) {
  if (!path) return undefined;
  if (path.startsWith("http")) return path;
  return `${API_URL.replace(/\/api$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

function resolveImageUrl(ecgCase: ApiECGCase, bundleImageUrl?: string) {
  if (bundleImageUrl) return absoluteAssetUrl(bundleImageUrl);
  const file = ecgCase.files.find((item) => item.mimeType.startsWith("image/"));
  if (file?.downloadUrl) return absoluteAssetUrl(file.downloadUrl);
  return absoluteAssetUrl(ecgCase.imagePath ?? ecgCase.ecgImage ?? ecgCase.originalFileUrl);
}

function buildSession(ecgCase: ApiECGCase, bundle?: Awaited<ReturnType<typeof getEcgViewerBundle>>["bundle"]): EcgProViewerSession {
  const image = bundle?.image;
  return {
    acquisitionDate: ecgCase.acquisitionDate,
    caseId: ecgCase.id,
    caseNumber: ecgCase.caseNumber ?? ecgCase.caseId,
    checksum: image?.checksum ?? null,
    ecgFileId: image?.ecgFileId ?? ecgCase.files[0]?.id,
    imageUrl: resolveImageUrl(ecgCase, image?.downloadUrl ?? image?.processedImageUrl),
    mimeType: image?.mimeType ?? ecgCase.files[0]?.mimeType,
    originalName: image?.originalName ?? ecgCase.files[0]?.originalName,
    patientAge: ecgCase.patient?.age,
    patientGender: ecgCase.patient?.gender,
    patientId: ecgCase.patient?.id,
    patientName: ecgCase.patient?.fullName ?? `${ecgCase.patient?.firstName ?? ""} ${ecgCase.patient?.lastName ?? ""}`.trim(),
    sizeBytes: image?.sizeBytes ?? ecgCase.files[0]?.sizeBytes,
    studyDate: bundle?.metadata?.acquisitionDate ?? ecgCase.acquisitionDate,
  };
}

export function useEcgProViewerSession(input: { caseId?: string; token?: string }) {
  const caseQuery = useQuery({
    enabled: !!input.token && !!input.caseId,
    queryFn: () => getCase(input.token!, input.caseId!),
    queryKey: ["ecg-pro-viewer-case", input.token, input.caseId],
    staleTime: 30_000,
  });

  const bundleQuery = useQuery({
    enabled: !!input.token && !!input.caseId,
    queryFn: () => getEcgViewerBundle(input.token!, input.caseId!),
    queryKey: ["ecg-pro-viewer-bundle", input.token, input.caseId],
    staleTime: 30_000,
  });

  const ecgFileId = bundleQuery.data?.bundle.image?.ecgFileId ?? caseQuery.data?.case.files[0]?.id;

  const storageQuery = useQuery({
    enabled: !!input.token && !!ecgFileId,
    queryFn: () => getEcgStorageFileMetadata(input.token!, ecgFileId!),
    queryKey: ["ecg-pro-viewer-storage", input.token, ecgFileId],
    staleTime: 60_000,
  });

  const session = useMemo(() => {
    if (!caseQuery.data?.case) return null;
    return buildSession(caseQuery.data.case, bundleQuery.data?.bundle);
  }, [bundleQuery.data?.bundle, caseQuery.data?.case]);

  const isLoading = caseQuery.isLoading || bundleQuery.isLoading;
  const isError = caseQuery.isError || bundleQuery.isError;

  return {
    bundle: bundleQuery.data?.bundle,
    caseRecord: caseQuery.data?.case,
    ecgCase: caseQuery.data?.case,
    isError,
    isLoading,
    refetch: () => {
      void caseQuery.refetch();
      void bundleQuery.refetch();
      void storageQuery.refetch();
    },
    session,
    storage: storageQuery.data,
  };
}
