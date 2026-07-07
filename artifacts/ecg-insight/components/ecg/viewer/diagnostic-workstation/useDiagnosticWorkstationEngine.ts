import { useCallback, useMemo, useState } from "react";

import type { CardiologistStructuredFinding } from "../ai-cardiologist/types";
import type { EcgClinicalMeasurement } from "../measurementTypes";
import type { EcgLeadId } from "../types";
import {
  defaultLeadOrder,
  reorderLeads,
  resolveReportLinkFromFinding,
  togglePinnedLead,
} from "./ecgDiagnosticReportLinking";
import type { DiagnosticCompareSync, DiagnosticPanelId, DiagnosticReportLinkTarget } from "./types";

export function useDiagnosticWorkstationEngine(input: { selectedLead: EcgLeadId }) {
  const [activePanel, setActivePanel] = useState<DiagnosticPanelId>("intervals");
  const [compareSync, setCompareSync] = useState<DiagnosticCompareSync>({
    beatSync: true,
    differenceHighlight: false,
    leadSync: true,
  });
  const [isolatedLead, setIsolatedLead] = useState<EcgLeadId | null>(null);
  const [leadMagnifier, setLeadMagnifier] = useState(false);
  const [leadOrder, setLeadOrder] = useState<EcgLeadId[]>(defaultLeadOrder);
  const [pinnedLeads, setPinnedLeads] = useState<EcgLeadId[]>([]);
  const [reportLink, setReportLink] = useState<DiagnosticReportLinkTarget | null>(null);

  const effectiveLead = isolatedLead ?? input.selectedLead;

  const linkFromFinding = useCallback(
    (finding: CardiologistStructuredFinding, measurements: EcgClinicalMeasurement[] = []) => {
      const target = resolveReportLinkFromFinding(finding, measurements);
      setReportLink(target);
      setActivePanel("ai-findings");
      return target;
    },
    [],
  );

  const toggleLeadPin = useCallback((lead: EcgLeadId) => {
    setPinnedLeads((current) => togglePinnedLead(current, lead));
  }, []);

  const toggleLeadIsolation = useCallback((lead: EcgLeadId) => {
    setIsolatedLead((current) => (current === lead ? null : lead));
  }, []);

  const moveLead = useCallback((fromLead: EcgLeadId, toLead: EcgLeadId) => {
    setLeadOrder((current) => reorderLeads(current, fromLead, toLead));
  }, []);

  const patchCompareSync = useCallback((patch: Partial<DiagnosticCompareSync>) => {
    setCompareSync((current) => ({ ...current, ...patch }));
  }, []);

  const visibleLeadOrder = useMemo(() => {
    const pinned = leadOrder.filter((lead) => pinnedLeads.includes(lead));
    const rest = leadOrder.filter((lead) => !pinnedLeads.includes(lead));
    return [...pinned, ...rest];
  }, [leadOrder, pinnedLeads]);

  return {
    activePanel,
    compareSync,
    effectiveLead,
    isolatedLead,
    leadMagnifier,
    leadOrder: visibleLeadOrder,
    linkFromFinding,
    moveLead,
    patchCompareSync,
    pinnedLeads,
    reportLink,
    setActivePanel,
    setLeadMagnifier,
    setReportLink,
    toggleLeadIsolation,
    toggleLeadPin,
  };
}

export type DiagnosticWorkstationEngine = ReturnType<typeof useDiagnosticWorkstationEngine>;
