import React, { useCallback, useMemo, useState } from "react";
import { Linking, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { EmptyState, FullScreenLoader } from "@/components/enterprise/EnterpriseUI";
import { EcgProViewerEngine } from "../EcgProViewerEngine";
import { useEcgViewerControls } from "../useEcgViewerControls";
import { STANDARD_ECG_LEADS } from "../types";
import { EcgProViewerCanvas } from "./EcgProViewerCanvas";
import { EcgProViewerInfoPanel } from "./EcgProViewerInfoPanel";
import { EcgProViewerStatusBar } from "./EcgProViewerStatusBar";
import { EcgProViewerToolbar } from "./EcgProViewerToolbar";
import { EcgProViewerToolsPanel } from "./EcgProViewerToolsPanel";
import type { EcgProViewerDisplayMode, EcgProViewerLeadSelection, EcgProViewerPointer, EcgProViewerTheme } from "./types";
import { useEcgProViewerSession } from "./useEcgProViewerSession";

type Props = {
  caseId?: string;
  token?: string;
};

function openAsset(url?: string) {
  if (!url) return;
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  void Linking.openURL(url);
}

function printAsset(url?: string) {
  if (!url || Platform.OS !== "web" || typeof window === "undefined") return;
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  opened?.addEventListener("load", () => opened.print(), { once: true });
}

export function EcgProViewerFoundationScreen({ caseId, token }: Props) {
  const controls = useEcgViewerControls();
  const { height, width } = useWindowDimensions();
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1100;
  const [theme, setTheme] = useState<EcgProViewerTheme>("dark");
  const [displayMode, setDisplayMode] = useState<EcgProViewerDisplayMode>("image-grid");
  const [lead, setLead] = useState<EcgProViewerLeadSelection>("ALL");
  const [pointer, setPointer] = useState<EcgProViewerPointer>(null);
  const [infoOpen, setInfoOpen] = useState(!isMobile);

  const { isError, isLoading, session } = useEcgProViewerSession({ caseId, token });

  const enrichedSession = useMemo(() => {
    if (!session) return null;
    return {
      ...session,
      imageHeight: controls.viewport.imageHeight || session.imageHeight,
      imageWidth: controls.viewport.imageWidth || session.imageWidth,
    };
  }, [controls.viewport.imageHeight, controls.viewport.imageWidth, session]);

  const onPointerMove = useCallback((coords: { imageX: number; imageY: number; x: number; y: number }) => {
    setPointer(coords);
  }, []);

  if (!token) {
    return <EmptyState message="Sign in to open the professional ECG viewer." title="Authentication required" />;
  }

  if (!caseId) {
    return (
      <EmptyState
        message="Open ECG Pro Viewer from a case, patient history, or upload workflow using ?caseId=."
        title="Select an ECG case"
      />
    );
  }

  if (isLoading) {
    return <FullScreenLoader label="Loading professional ECG viewer…" />;
  }

  if (isError || !enrichedSession?.imageUrl) {
    return (
      <EmptyState
        message="Upload an ECG image for this case, then reopen ECG Pro Viewer."
        title="No ECG image available"
      />
    );
  }

  const canvas = Platform.OS === "web" ? (
    <EcgProViewerCanvas
      controls={controls}
      displayMode={displayMode}
      imageUrl={enrichedSession.imageUrl}
      onPointerMove={onPointerMove}
      theme={theme}
    />
  ) : (
    <EcgProViewerEngine
      assetHeight={enrichedSession.imageHeight}
      assetWidth={enrichedSession.imageWidth}
      controls={controls}
      imageUrl={displayMode === "grid" ? undefined : enrichedSession.imageUrl}
      onPointerMove={onPointerMove}
      showMiniNavigator={false}
      testID="sprint93-ecg-pro-viewer-native-engine"
    />
  );

  return (
    <View
      style={[styles.root, controls.fullscreen && styles.fullscreen, { minHeight: Math.max(height - 48, 640) }]}
      testID="sprint93-ecg-pro-viewer-root"
    >
      <EcgProViewerToolbar
        caseName={enrichedSession.caseNumber}
        controls={controls}
        displayMode={displayMode}
        imageUrl={enrichedSession.imageUrl}
        lead={lead}
        onDisplayModeChange={setDisplayMode}
        onDownload={() => openAsset(enrichedSession.imageUrl)}
        onLeadChange={setLead}
        onPrint={() => printAsset(enrichedSession.imageUrl)}
        onThemeToggle={() => setTheme((value) => (value === "dark" ? "light" : "dark"))}
        patientName={enrichedSession.patientName}
        studyDate={enrichedSession.studyDate}
        theme={theme}
      />

      <View style={styles.workspace}>
        {!isMobile ? <EcgProViewerToolsPanel controls={controls} displayMode={displayMode} onDisplayModeChange={setDisplayMode} theme={theme} /> : null}
        <View style={styles.centerColumn}>
          <View style={styles.canvasRegion}>{canvas}</View>
        </View>
        {!isMobile && !isTablet ? (
          <EcgProViewerInfoPanel controls={controls} session={enrichedSession} theme={theme} />
        ) : null}
        {(isMobile || isTablet) && infoOpen ? (
          <EcgProViewerInfoPanel controls={controls} session={enrichedSession} theme={theme} />
        ) : null}
      </View>

      {(isMobile || isTablet) ? (
        <Pressable onPress={() => setInfoOpen((value) => !value)} style={styles.infoToggle}>
          <Text style={styles.infoToggleText}>{infoOpen ? "Hide study info" : "Show study info"}</Text>
        </Pressable>
      ) : null}

      <EcgProViewerStatusBar controls={controls} pointer={pointer} theme={theme} />

      {lead !== "ALL" && STANDARD_ECG_LEADS.includes(lead) ? (
        <Text style={styles.leadBadge} testID="sprint93-selected-lead">Lead focus: {lead}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  canvasRegion: { flex: 1, minHeight: 360 },
  centerColumn: { flex: 1, minWidth: 0 },
  fullscreen: { ...StyleSheet.absoluteFillObject, zIndex: 50 },
  infoToggle: { alignItems: "center", padding: 8 },
  infoToggleText: { color: "#38BDF8", fontSize: 12, fontWeight: "700" },
  leadBadge: { color: "#94A3B8", fontSize: 11, paddingHorizontal: 12 },
  root: { flex: 1 },
  workspace: { flex: 1, flexDirection: "row", minHeight: 420 },
});
