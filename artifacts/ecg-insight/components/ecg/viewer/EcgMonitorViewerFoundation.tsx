import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";

import { medicalTheme, patientDisplayName, SectionHeader } from "@/components/enterprise/EnterpriseUI";
import { useAuth } from "@/context/AuthContext";
import { getAIExplainability, getAIResult, type AIAnalysisResult, type AIExplainability } from "@/services/ai";
import { API_URL } from "@/services/api";
import type { ApiECGCase } from "@/services/clinical";

import { detectImageFormat } from "./ecgImageEngine";
import { formatImageResolution } from "./ecgViewerEngine";
import { EcgImageCanvas } from "./EcgImageCanvas";
import { EcgRhythmStripPanel } from "./EcgRhythmStripPanel";
import { EcgViewerLeftRail } from "./EcgViewerLeftRail";
import { EcgViewerResizableWorkspace } from "./EcgViewerResizableWorkspace";
import { EcgViewerRightRail } from "./EcgViewerRightRail";
import { EcgViewerStatusBar, EcgViewerTimeline } from "./EcgViewerTimeline";
import { EcgViewerToolbar } from "./EcgViewerToolbar";
import type { EcgLeadId, EcgViewerPreviousStudy } from "./types";
import { useEcgAiOverlayWorkspace } from "./useEcgAiOverlayWorkspace";
import { useEcgClinicalFindings } from "./useEcgClinicalFindings";
import { useEcgMeasurementWorkspace } from "./useEcgMeasurementWorkspace";
import { useEcgViewerControls } from "./useEcgViewerControls";
import { useEcgViewerPersistence } from "./useEcgViewerPersistence";

function absoluteUrl(path?: string | null) {
  if (!path) return undefined;
  return path.startsWith("http") ? path : `${API_URL.replace(/\/api$/, "")}${path}`;
}

export function EcgMonitorViewerFoundation({
  ecgCase,
  historyCases = [],
  patient,
}: {
  ecgCase: ApiECGCase;
  historyCases?: ApiECGCase[];
  patient: { age?: number; company?: string | null; firstName: string; gender?: string; id: string; lastName: string };
}) {
  const router = useRouter();
  const { authToken, user } = useAuth();
  const token = authToken?.token;
  const [selectedLead, setSelectedLead] = useState<EcgLeadId>("II");
  const imageUrl = absoluteUrl(ecgCase.imagePath ?? ecgCase.originalFileUrl ?? ecgCase.files.find((file) => file.mimeType.startsWith("image/"))?.downloadUrl);
  const pdfUrl = absoluteUrl(ecgCase.pdfPath ?? ecgCase.files.find((file) => file.mimeType.includes("pdf"))?.downloadUrl);
  const controls = useEcgViewerControls();
  const operatorName = user?.name ?? user?.email ?? "Clinician";
  const scheduleSaveRef = useRef<() => void>(() => undefined);

  const analysisQuery = useQuery({
    enabled: !!token && !!ecgCase.id,
    queryFn: () => getAIResult(token!, ecgCase.id),
    queryKey: ["ecg-monitor-ai-result", token, ecgCase.id],
    retry: false,
  });
  const explainabilityQuery = useQuery({
    enabled: !!token && !!ecgCase.id,
    queryFn: () => getAIExplainability(token!, ecgCase.id),
    queryKey: ["ecg-monitor-ai-explainability", token, ecgCase.id],
    retry: false,
  });

  const analysis = analysisQuery.data?.analysis ?? null;
  const explainability =
    explainabilityQuery.data?.explainability ?? (ecgCase.explainabilityData as AIExplainability | null | undefined) ?? null;

  const workspace = useEcgMeasurementWorkspace({
    controls,
    onPersist: () => scheduleSaveRef.current(),
    operatorName,
  });
  const aiOverlay = useEcgAiOverlayWorkspace({
    activeLead: selectedLead,
    analysis,
    controls,
    ecgCase,
    explainability,
    onPersist: () => scheduleSaveRef.current(),
    operatorName,
  });
  const findings = useEcgClinicalFindings(ecgCase, workspace, analysis, explainability);

  const hydrateWorkspace = useCallback(
    (state: Parameters<typeof workspace.hydrate>[0]) => {
      workspace.hydrate(state);
      if (state.aiOverlay) aiOverlay.hydrate(state.aiOverlay);
    },
    [aiOverlay, workspace],
  );

  const { scheduleSave } = useEcgViewerPersistence({
    accessToken: token,
    caseId: ecgCase.id,
    enabled: true,
    onHydrate: hydrateWorkspace,
    patientId: patient.id,
    snapshot: () => ({
      ...workspace.exportState(),
      aiOverlay: aiOverlay.exportState(),
      version: 4 as const,
    }),
  });
  scheduleSaveRef.current = scheduleSave;

  const previousStudies: EcgViewerPreviousStudy[] = useMemo(
    () =>
      historyCases
        .filter((item) => item.id !== ecgCase.id)
        .map((item) => ({
          caseId: item.id,
          caseNumber: item.caseNumber ?? item.caseId,
          studyDate: item.acquisitionDate ?? item.uploadDate,
          thumbnailUrl: absoluteUrl(item.imagePath ?? item.ecgImage),
        })),
    [ecgCase.id, historyCases],
  );

  const study = {
    acquisitionDevice: ecgCase.ecgType ?? "Standard ECG",
    caseId: ecgCase.id,
    caseNumber: ecgCase.caseNumber ?? ecgCase.caseId,
    fileType: detectImageFormat(imageUrl ?? pdfUrl ?? "", ecgCase.files[0]?.mimeType).toUpperCase(),
    heartRate: ecgCase.heartRate,
    hospital: ecgCase.hospitalName ?? patient.company ?? undefined,
    imageUrl,
    pdfUrl,
    physician: ecgCase.reviewedBy?.name ?? ecgCase.assignedDoctor?.name ?? undefined,
    studyDate: ecgCase.acquisitionDate ?? ecgCase.uploadDate,
  };

  const imageResolution = formatImageResolution(controls.viewport.imageWidth, controls.viewport.imageHeight);
  const openStudy = (caseId: string) => router.push(`/ecg-monitor/${caseId}` as never);

  useEffect(() => {
    workspace.setActiveLead(selectedLead);
  }, [selectedLead, workspace]);

  useEffect(() => {
    scheduleSave();
  }, [aiOverlay.present, controls.adjustments, controls.grid, controls.transform, scheduleSave, workspace.present]);

  return (
    <View style={[styles.root, controls.fullscreen && styles.fullscreenRoot]} testID="sprint13-ecg-monitor-ready">
      <View style={styles.header}>
        <SectionHeader
          subtitle="Production ECG Pro Viewer Engine with AI clinical overlay, clinical findings, and rhythm strip architecture."
          title="ECG Pro Viewer & Monitor Workspace"
        />
        <Text style={styles.caseLabel}>{ecgCase.caseNumber ?? ecgCase.caseId}</Text>
      </View>

      <EcgViewerToolbar
        accessToken={token}
        aiOverlay={aiOverlay}
        caseId={ecgCase.id}
        controls={controls}
        imageUrl={imageUrl}
        onCapture={() => router.push("/upload-ecg" as never)}
        onOpen={() => openStudy(ecgCase.id)}
        onUpload={() => router.push("/upload-ecg" as never)}
        pdfUrl={pdfUrl}
        workspace={workspace}
      />

      <View style={styles.workspace}>
        <EcgViewerResizableWorkspace
          bottom={
            <View style={styles.bottomStack}>
              <EcgRhythmStripPanel controls={controls} onLeadChange={setSelectedLead} selectedLead={selectedLead} />
              <EcgViewerTimeline currentStudy={study} onSelect={openStudy} studies={previousStudies} />
              <EcgViewerStatusBar
                aiOverlayEnabled={aiOverlay.present.settings.enabled}
                annotationCount={aiOverlay.present.annotations.filter((item) => item.visible).length}
                fileType={study.fileType}
                fitMode={controls.fitMode}
                gridOpacity={controls.grid.opacity}
                gridVisible={controls.grid.visible}
                imageResolution={imageResolution}
                measurementCount={workspace.present.measurements.filter((item) => !item.hidden).length}
                toolMode={workspace.present.toolMode}
                zoom={controls.transform.zoom}
              />
            </View>
          }
          center={
            <EcgImageCanvas
              accessToken={token}
              activeLead={selectedLead}
              aiOverlay={aiOverlay}
              controls={controls}
              explainability={explainability}
              imageUrl={imageUrl}
              pdfUrl={pdfUrl}
              workspace={workspace}
            />
          }
          left={
            <EcgViewerLeftRail
              onSelectPrevious={openStudy}
              patient={{ age: patient.age, gender: patient.gender, id: patient.id, name: patientDisplayName(patient) }}
              previousStudies={previousStudies}
              study={study}
            />
          }
          right={<EcgViewerRightRail aiOverlay={aiOverlay} findings={findings} workspace={workspace} />}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomStack: { gap: 8 },
  caseLabel: { color: medicalTheme.primary, fontSize: 13, fontWeight: "900" },
  fullscreenRoot: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: medicalTheme.background,
    padding: 12,
    zIndex: 50,
  },
  header: { gap: 4, marginBottom: 8 },
  root: { flex: 1, gap: 8, minHeight: 720 },
  workspace: { flex: 1, minHeight: 520 },
});
