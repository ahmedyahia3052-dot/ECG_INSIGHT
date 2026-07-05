import { useCallback, useMemo, useState } from "react";

import type { EcgCompareLayoutMode, EcgLeadId, EcgLeadLayoutMode, EcgViewerPreviousStudy, EcgWorkstationTheme, EcgWorkstationViewMode } from "./types";

export function useEcgEnterpriseViewerState(input: {
  caseId: string;
  historyStudies: EcgViewerPreviousStudy[];
}) {
  const [compareMode, setCompareMode] = useState(false);
  const [compareCaseId, setCompareCaseId] = useState<string | null>(null);
  const [showDigitizedWaveform, setShowDigitizedWaveform] = useState(true);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [leadFocusMode, setLeadFocusMode] = useState(false);
  const [viewMode, setViewMode] = useState<EcgWorkstationViewMode>("image");
  const [compareLayout, setCompareLayout] = useState<EcgCompareLayoutMode>("side-by-side");
  const [compareOpacity, setCompareOpacity] = useState(0.45);
  const [leadLayout, setLeadLayout] = useState<EcgLeadLayoutMode>("12-lead");
  const [workstationTheme, setWorkstationTheme] = useState<EcgWorkstationTheme>("dark");

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

  const setViewModeSafe = useCallback((mode: EcgWorkstationViewMode) => {
    setViewMode(mode);
    if (mode === "compare") {
      setCompareMode(true);
      if (!compareCaseId && orderedStudies[0]) setCompareCaseId(orderedStudies[0].caseId);
    }
    if (mode === "waveform") setShowDigitizedWaveform(true);
  }, [compareCaseId, orderedStudies]);

  const toggleCompareMode = useCallback(() => {
    setCompareMode((value) => {
      const next = !value;
      if (next) {
        setViewMode("compare");
        if (!compareCaseId && orderedStudies[0]) setCompareCaseId(orderedStudies[0].caseId);
      } else if (viewMode === "compare") {
        setViewMode("image");
      }
      return next;
    });
  }, [compareCaseId, orderedStudies, viewMode]);

  const filterDigitizedLeads = useCallback(
    <T extends { lead: string }>(leads: T[], selectedLead: EcgLeadId) => {
      if (!showDigitizedWaveform && viewMode !== "waveform") return [] as T[];
      if (leadFocusMode || leadLayout === "single") return leads.filter((item) => item.lead === selectedLead);
      if (leadLayout === "rhythm") return leads.filter((item) => item.lead === selectedLead || item.lead === "II");
      return leads;
    },
    [leadFocusMode, leadLayout, showDigitizedWaveform, viewMode],
  );

  const toggleWorkstationTheme = useCallback(() => {
    setWorkstationTheme((current) => (current === "dark" ? "clinical" : "dark"));
  }, []);

  return {
    compareCaseId,
    compareLayout,
    compareMode,
    compareOpacity,
    compareStudy,
    filterDigitizedLeads,
    leadFocusMode,
    leadLayout,
    navigation,
    setCompareCaseId,
    setCompareLayout,
    setCompareMode,
    setCompareOpacity,
    setLeadFocusMode,
    setLeadLayout,
    setSettingsVisible,
    setShowDigitizedWaveform,
    setViewMode: setViewModeSafe,
    settingsVisible,
    showDigitizedWaveform,
    toggleCompareMode,
    toggleWorkstationTheme,
    viewMode,
    workstationTheme,
  };
}
