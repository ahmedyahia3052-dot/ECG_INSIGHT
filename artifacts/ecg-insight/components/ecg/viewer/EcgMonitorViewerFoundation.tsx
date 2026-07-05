import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";

import { medicalTheme, patientDisplayName, SectionHeader } from "@/components/enterprise/EnterpriseUI";
import { useAuth } from "@/context/AuthContext";
import { getAIExplainability, getAIResult, type AIExplainability } from "@/services/ai";
import { API_URL } from "@/services/api";
import type { ApiECGCase } from "@/services/clinical";
import { digitizeECG, getDigitalECG } from "@/services/ecgProcessing";
import { buildSegmentAlignedDigitizedWaveformLeads } from "./ecgDigitizedWaveformSync";

import { detectImageFormat } from "./ecgImageEngine";
import { formatImageResolution } from "./ecgViewerEngine";
import { EcgImageCanvas } from "./EcgImageCanvas";
import { EcgRhythmStripPanel } from "./EcgRhythmStripPanel";
import { EcgViewerLeftRail } from "./EcgViewerLeftRail";
import { EcgViewerResizableWorkspace } from "./EcgViewerResizableWorkspace";
import { EcgViewerRightRail } from "./EcgViewerRightRail";
import { EcgViewerSettingsPanel } from "./EcgViewerSettingsPanel";
import { EcgViewerStatusBar, EcgViewerTimeline } from "./EcgViewerTimeline";
import { EcgViewerToolbar } from "./EcgViewerToolbar";
import type { EcgLeadId, EcgViewerPreviousStudy } from "./types";
import { STANDARD_ECG_LEADS } from "./types";
import { useEcgAiOverlayWorkspace } from "./useEcgAiOverlayWorkspace";
import { useEcgClinicalFindings } from "./useEcgClinicalFindings";
import { useEcgEnterpriseViewerState } from "./useEcgEnterpriseViewerState";
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
  const queryClient = useQueryClient();
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
  const digitalEcgQuery = useQuery({
    enabled: !!token && !!ecgCase.id,
    queryFn: () => getDigitalECG(token!, ecgCase.id),
    queryKey: ["ecg-monitor-digital-ecg", token, ecgCase.id],
    retry: false,
  });
  const digitalEcg = digitalEcgQuery.data?.digitalEcg ?? null;

  const digitizeMutation = useMutation({
    mutationFn: () => digitizeECG(token!, { caseId: ecgCase.id }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["ecg-monitor-digital-ecg", token, ecgCase.id] });
    },
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
  const findings = useEcgClinicalFindings(ecgCase, workspace, analysis, explainability, digitalEcg);

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

  const enterprise = useEcgEnterpriseViewerState({ caseId: ecgCase.id, historyStudies: previousStudies });

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
      version: 5 as const,
    }),
  });
  scheduleSaveRef.current = scheduleSave;

  const study = {
    acquisitionDevice: ecgCase.ecgType ?? "Standard ECG",
    caseId: ecgCase.id,
    caseNumber: ecgCase.caseNumber ?? ecgCase.caseId,
    fileType: detectImageFormat(imageUrl ?? pdfUrl ?? "", ecgCase.files[0]?.mimeType).toUpperCase(),
    heartRate: digitalEcg?.measurementEngine?.heartRate ?? ecgCase.heartRate,
    hospital: ecgCase.hospitalName ?? patient.company ?? undefined,
    imageHeight: controls.viewport.imageHeight,
    imageUrl,
    imageWidth: controls.viewport.imageWidth,
    pdfUrl,
    physician: ecgCase.reviewedBy?.name ?? ecgCase.assignedDoctor?.name ?? undefined,
    studyDate: ecgCase.acquisitionDate ?? ecgCase.uploadDate,
  };

  const alignedDigitizedLeads = useMemo(
    () => buildSegmentAlignedDigitizedWaveformLeads(digitalEcg, controls.viewport.imageWidth, controls.viewport.imageHeight),
    [controls.viewport.imageHeight, controls.viewport.imageWidth, digitalEcg],
  );
  const digitizedLeads = useMemo(
    () => enterprise.filterDigitizedLeads(alignedDigitizedLeads, selectedLead),
    [alignedDigitizedLeads, enterprise, selectedLead],
  );

  const rhythmLead = useMemo(
    () => digitalEcg?.leads.find((lead) => lead.lead === selectedLead) ?? digitalEcg?.leads.find((lead) => lead.lead === "II") ?? null,
    [digitalEcg?.leads, selectedLead],
  );

  const compareCase = historyCases.find((item) => item.id === enterprise.compareStudy?.caseId);
  const compareImageUrl = absoluteUrl(
    compareCase?.imagePath ?? compareCase?.originalFileUrl ?? compareCase?.files.find((file) => file.mimeType.startsWith("image/"))?.downloadUrl,
  );

  const openStudy = (caseId: string) => router.push(`/ecg-monitor/${caseId}` as never);

  const cycleLead = useCallback(() => {
    setSelectedLead((current) => {
      const index = STANDARD_ECG_LEADS.indexOf(current);
      return STANDARD_ECG_LEADS[(index + 1) % STANDARD_ECG_LEADS.length] ?? "II";
    });
  }, []);

  useEffect(() => {
    workspace.setActiveLead(selectedLead);
  }, [selectedLead, workspace]);

  useEffect(() => {
    if (!digitalEcg?.calibration) return;
    controls.setGrid((grid) => ({
      ...grid,
      gain: digitalEcg.calibration.gainMmPerMv,
      speed: digitalEcg.calibration.paperSpeedMmPerSec,
    }));
  }, [controls.setGrid, digitalEcg?.calibration]);

  useEffect(() => {
    scheduleSave();
  }, [aiOverlay.present, controls.adjustments, controls.grid, controls.transform, scheduleSave, workspace.present]);

  return (
    <View style={[styles.root, controls.fullscreen && styles.fullscreenRoot]} testID="sprint13-ecg-monitor-ready">
      <View style={styles.header}>
        <SectionHeader
          subtitle="Hospital-grade ECG clinical workspace integrating viewer, measurements, digitization, overlay, and AI readiness."
          title="ECG Pro Clinical Workspace"
        />
        <Text style={styles.caseLabel}>{ecgCase.caseNumber ?? ecgCase.caseId}</Text>
      </View>

      <EcgViewerToolbar
        accessToken={token}
        aiOverlay={aiOverlay}
        caseId={ecgCase.id}
        compareMode={enterprise.compareMode}
        controls={controls}
        imageUrl={imageUrl}
        nextCaseId={enterprise.navigation.nextCaseId}
        onCapture={() => router.push("/upload-ecg" as never)}
        onCompareToggle={enterprise.toggleCompareMode}
        onLeadCycle={cycleLead}
        onNextStudy={() => enterprise.navigation.nextCaseId && openStudy(enterprise.navigation.nextCaseId)}
        onOpen={() => openStudy(ecgCase.id)}
        onOpenSettings={() => enterprise.setSettingsVisible(true)}
        onPreviousStudy={() => enterprise.navigation.previousCaseId && openStudy(enterprise.navigation.previousCaseId)}
        onToggleDigitized={() => enterprise.setShowDigitizedWaveform((value) => !value)}
        onUpload={() => router.push("/upload-ecg" as never)}
        pdfUrl={pdfUrl}
        selectedLead={selectedLead}
        showDigitizedWaveform={enterprise.showDigitizedWaveform}
        workspace={workspace}
      />

      <View style={styles.workspace}>
        <EcgViewerResizableWorkspace
          bottom={
            <View style={styles.bottomStack}>
              <EcgRhythmStripPanel controls={controls} leadWaveform={rhythmLead} onLeadChange={setSelectedLead} selectedLead={selectedLead} />
              <EcgViewerTimeline currentStudy={study} onSelect={openStudy} studies={previousStudies} />
              <EcgViewerStatusBar
                aiOverlayEnabled={aiOverlay.present.settings.enabled}
                annotationCount={aiOverlay.present.annotations.filter((item) => item.visible).length}
                fileType={study.fileType}
                fitMode={controls.fitMode}
                gridOpacity={controls.grid.opacity}
                gridVisible={controls.grid.visible}
                imageResolution={formatImageResolution(controls.viewport.imageWidth, controls.viewport.imageHeight)}
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
              compareImageUrl={compareImageUrl}
              compareLabel={enterprise.compareStudy?.caseNumber ?? "Comparison Study"}
              compareMode={enterprise.compareMode}
              compareThumbnailUrl={enterprise.compareStudy?.thumbnailUrl}
              controls={controls}
              currentLabel={study.caseNumber ?? "Current Study"}
              digitizedLeads={digitizedLeads}
              explainability={explainability}
              imageUrl={imageUrl}
              pdfUrl={pdfUrl}
              showDigitizedWaveform={enterprise.showDigitizedWaveform}
              workspace={workspace}
            />
          }
          left={
            <EcgViewerLeftRail
              compareCaseId={enterprise.compareCaseId}
              onSelectCompare={(caseId) => {
                enterprise.setCompareCaseId(caseId);
                enterprise.setCompareMode(true);
              }}
              onSelectLead={setSelectedLead}
              onSelectPrevious={openStudy}
              patient={{ age: patient.age, gender: patient.gender, id: patient.id, name: patientDisplayName(patient) }}
              previousStudies={previousStudies}
              selectedLead={selectedLead}
              study={study}
            />
          }
          right={
            <EcgViewerRightRail
              aiOverlay={aiOverlay}
              digitalEcg={digitalEcg}
              digitalEcgLoading={digitalEcgQuery.isLoading || digitizeMutation.isPending}
              findings={findings}
              onDigitize={() => digitizeMutation.mutate()}
              workspace={workspace}
            />
          }
        />
      </View>

      <EcgViewerSettingsPanel aiOverlay={aiOverlay} controls={controls} onClose={() => enterprise.setSettingsVisible(false)} visible={enterprise.settingsVisible} />
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
