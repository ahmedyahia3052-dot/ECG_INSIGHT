import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { getEcgViewerWaveform } from "@/services/ecgViewerApi";

import type { EcgGridGain, EcgPaperSpeed } from "../types";
import { buildDigitalEcgFromWaveforms } from "./digitalEcgFromWaveform";

export function useEcgProViewerWaveform(input: {
  caseId?: string;
  enabled?: boolean;
  paper: { gain: EcgGridGain; speed: EcgPaperSpeed };
  token?: string;
}) {
  const query = useQuery({
    enabled: !!input.enabled && !!input.token && !!input.caseId,
    queryFn: async () => {
      const response = await getEcgViewerWaveform(input.token!, input.caseId!);
      const raw = response.waveform;
      const waveforms = Array.isArray(raw) ? raw : raw ? [raw] : [];
      return buildDigitalEcgFromWaveforms(waveforms, input.paper);
    },
    queryKey: ["ecg-pro-viewer-waveform", input.token, input.caseId, input.paper.gain, input.paper.speed],
    staleTime: 30_000,
  });

  return {
    digitalEcg: query.data ?? null,
    isError: query.isError,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
