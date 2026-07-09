import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { getEcgViewerWaveform } from "@/services/ecgViewerApi";

import type { EcgGridGain, EcgPaperSpeed } from "../types";
import { buildDigitalEcgFromWaveforms, type DigitalEcgClinicalSeed } from "./digitalEcgFromWaveform";

export function useEcgProViewerWaveform(input: {
  caseId?: string;
  clinicalSeed?: DigitalEcgClinicalSeed | null;
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

  const digitalEcg = useMemo(() => {
    if (!query.data) return null;
    if (!input.clinicalSeed) return query.data;
    return buildDigitalEcgFromWaveforms(
      query.data.leads.map((lead) => ({
        caseId: input.caseId ?? "",
        durationSeconds: lead.durationSeconds,
        ecgFileId: query.data!.ecgFileId ?? "",
        lead: lead.lead,
        samples: lead.samples,
        samplingRate: lead.samplingRate,
      })),
      input.paper,
      input.clinicalSeed,
    );
  }, [input.caseId, input.clinicalSeed, input.paper, query.data]);

  return {
    digitalEcg,
    isError: query.isError,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
