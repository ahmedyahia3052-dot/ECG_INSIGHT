import { useCallback, useMemo, useState } from "react";

import type { EcgLeadId, EcgViewerPreviousStudy } from "./types";

export function useEcgEnterpriseViewerState(input: {
  caseId: string;
  historyStudies: EcgViewerPreviousStudy[];
}) {
  const [compareMode, setCompareMode] = useState(false);
  const [compareCaseId, setCompareCaseId] = useState<string | null>(null);
  const [showDigitizedWaveform, setShowDigitizedWaveform] = useState(true);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [leadFocusMode, setLeadFocusMode] = useState(false);

  const orderedStudies = useMemo(
    () =>
      [...input.historyStudies].sort((left, right) => {
        const leftTime = left.studyDate ? new Date(left.studyDate).getTime() : 0;
        const rightTime = right.studyDate ? new Date(right.studyDate).getTime() : 0;
        return rightTime - leftTime;
      }),
    [input.historyStudies],
  );

  const compareStudy = useMemo(
    () => orderedStudies.find((item) => item.caseId === compareCaseId) ?? orderedStudies[0] ?? null,
    [compareCaseId, orderedStudies],
  );

  const navigation = useMemo(() => {
    const timeline = [{ caseId: input.caseId }, ...orderedStudies.map((item) => ({ caseId: item.caseId }))];
    const index = timeline.findIndex((item) => item.caseId === input.caseId);
    return {
      nextCaseId: index > 0 ? timeline[index - 1]?.caseId : undefined,
      previousCaseId: index >= 0 && index < timeline.length - 1 ? timeline[index + 1]?.caseId : undefined,
    };
  }, [input.caseId, orderedStudies]);

  const toggleCompareMode = useCallback(() => {
    setCompareMode((value) => {
      const next = !value;
      if (next && !compareCaseId && orderedStudies[0]) setCompareCaseId(orderedStudies[0].caseId);
      return next;
    });
  }, [compareCaseId, orderedStudies]);

  const filterDigitizedLeads = useCallback(
    <T extends { lead: string }>(leads: T[], selectedLead: EcgLeadId) => {
      if (!showDigitizedWaveform) return [] as T[];
      if (leadFocusMode) return leads.filter((item) => item.lead === selectedLead);
      return leads;
    },
    [leadFocusMode, showDigitizedWaveform],
  );

  return {
    compareCaseId,
    compareMode,
    compareStudy,
    filterDigitizedLeads,
    leadFocusMode,
    navigation,
    setCompareCaseId,
    setCompareMode,
    setLeadFocusMode,
    setSettingsVisible,
    setShowDigitizedWaveform,
    settingsVisible,
    showDigitizedWaveform,
    toggleCompareMode,
  };
}
