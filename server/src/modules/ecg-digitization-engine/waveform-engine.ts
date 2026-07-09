import { detectStandardLeadLayout } from "../ecg-digitization/lead-detector";
import { extractLeadWaveformCenterline } from "../ecg-digitization/waveform/centerline-extractor";
import { buildDigitalSignalObjects, digitalSignalObjectsToLeads } from "../ecg-digitization/signal-engine";
import { reconstructDigitizedLeads } from "../ecg-digitization/signal-reconstruction";
import { STANDARD_LEADS } from "../ecg-digitization/types";
import type { LeadSegmentationEngine, WaveformExtractionEngine } from "./interfaces";

export const defaultLeadSegmentationEngine: LeadSegmentationEngine = {
  segment(input) {
    const leadSegments = detectStandardLeadLayout(
      input.imageBuffer,
      input.imageWidth,
      input.imageHeight,
      input.imageMetrics,
    );
    return { leadSegments, mappedLeadCount: leadSegments.length };
  },
};

export const defaultWaveformExtractionEngine: WaveformExtractionEngine = {
  extract(input) {
    const extracted = extractLeadWaveformCenterline({
      calibration: input.calibration,
      data: input.imageBuffer,
      durationSeconds: input.durationSeconds,
      height: input.imageHeight,
      leadSegments: input.leadSegments,
      sampleCount: input.sampleCount,
      width: input.imageWidth,
    });
    const completeLeads = STANDARD_LEADS.map((lead) => {
      const found = extracted.leads.find((item) => item.lead === lead);
      return {
        lead,
        samples: found?.samples ?? Array.from({ length: input.sampleCount }, () => 0),
      };
    });
    const reconstructed = reconstructDigitizedLeads(completeLeads);
    const signalObjects = buildDigitalSignalObjects({
      calibration: input.calibration,
      durationSeconds: input.durationSeconds,
      ecgFileId: input.ecgFileId,
      leadSegments: input.leadSegments,
      leads: completeLeads.map((lead) => ({
        lead: lead.lead,
        metrics: undefined,
        samples: reconstructed.find((item) => item.lead === lead.lead)?.samples ?? lead.samples,
      })),
    });
    return {
      leads: digitalSignalObjectsToLeads(signalObjects),
      waveformMetrics: Object.fromEntries(
        extracted.leads.filter((lead) => lead.metrics).map((lead) => [lead.lead, lead.metrics]),
      ),
    };
  },
};
