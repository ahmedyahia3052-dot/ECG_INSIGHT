import React, { memo } from "react";
import { StyleSheet, View } from "react-native";

import { EcgDiagnosticLeadToolsBar } from "./EcgDiagnosticLeadToolsBar";
import { EcgDiagnosticPanelsRibbon } from "./EcgDiagnosticPanelsRibbon";
import { EcgDiagnosticRhythmStrip } from "./EcgDiagnosticRhythmStrip";
import type { DiagnosticWorkstationEngine } from "./useDiagnosticWorkstationEngine";
import type { DigitalEcgLead } from "@/services/ecgProcessing";
import type { EcgLeadId } from "../types";
import type { EcgViewerControls } from "../useEcgViewerControls";
import type { EcgWaveformPlaybackState } from "../useEcgWaveformPlayback";

export const EcgDiagnosticWorkstationShell = memo(function EcgDiagnosticWorkstationShell({
  children,
  controls,
  diagnostic,
  onSelectLead,
  rhythmLead,
  playback,
  selectedLead,
  showRhythmStrip = true,
}: {
  children: React.ReactNode;
  controls: EcgViewerControls;
  diagnostic: DiagnosticWorkstationEngine;
  onSelectLead: (lead: EcgLeadId) => void;
  rhythmLead: DigitalEcgLead | null;
  playback: EcgWaveformPlaybackState;
  selectedLead: EcgLeadId;
  showRhythmStrip?: boolean;
}) {
  return (
    <View style={styles.root} testID="sprint46-diagnostic-workstation-ready">
      <EcgDiagnosticPanelsRibbon activePanel={diagnostic.activePanel} onSelectPanel={diagnostic.setActivePanel} />
      <EcgDiagnosticLeadToolsBar
        compareSync={diagnostic.compareSync}
        isolatedLead={diagnostic.isolatedLead}
        leadMagnifier={diagnostic.leadMagnifier}
        onCompareSyncChange={diagnostic.patchCompareSync}
        onLeadMagnifierChange={diagnostic.setLeadMagnifier}
        onSelectLead={onSelectLead}
        onToggleIsolation={diagnostic.toggleLeadIsolation}
        onTogglePin={diagnostic.toggleLeadPin}
        pinnedLeads={diagnostic.pinnedLeads}
        selectedLead={selectedLead}
      />
      <View style={styles.center} testID="sprint46-diagnostic-center-canvas">
        {children}
      </View>
      {showRhythmStrip ? (
        <EcgDiagnosticRhythmStrip controls={controls} lead={rhythmLead} playback={playback} selectedLead={selectedLead} />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  center: {
    flex: 1,
    minHeight: 320,
  },
  root: {
    flex: 1,
    minHeight: 0,
  },
});
