import { useCallback, useEffect, useMemo, useRef } from "react";
import { Platform } from "react-native";

import type { AIAnalysisResult, AIExplainability } from "@/services/ai";
import type { ApiECGCase } from "@/services/clinical";

import type { EcgAiClinicalAnnotation, EcgAiOverlaySettings, EcgAiOverlayState } from "./aiOverlayTypes";
import { DEFAULT_AI_OVERLAY_SETTINGS, EMPTY_AI_OVERLAY_STATE } from "./aiOverlayTypes";
import {
  buildAiClinicalAnnotations,
  deleteAnnotation,
  exportOverlayAnnotations,
  filterAnnotationsByLead,
  mergeGeneratedAnnotations,
  restoreOverlayState,
  serializeOverlayState,
  updateAnnotation,
} from "./ecgAiOverlayEngine";
import { useHistoryStack } from "./useHistoryStack";
import type { EcgViewerControls } from "./useEcgViewerControls";

type Options = {
  activeLead: string;
  analysis?: AIAnalysisResult | null;
  controls: EcgViewerControls;
  ecgCase: ApiECGCase;
  explainability?: AIExplainability | null;
  onPersist?: () => void;
  operatorName?: string;
};

type Slice = EcgAiOverlayState;

export function useEcgAiOverlayWorkspace(options: Options) {
  const { activeLead, analysis, controls, ecgCase, explainability, onPersist, operatorName = "Clinician" } = options;
  const stack = useHistoryStack<Slice>(EMPTY_AI_OVERLAY_STATE);
  const controlsRef = useRef(controls);
  controlsRef.current = controls;
  const persist = onPersist ?? (() => undefined);

  const updateSlice = useCallback(
    (updater: (slice: Slice) => Slice) => {
      stack.commit((current) => updater(current));
      persist();
    },
    [persist, stack],
  );

  const syncGeneratedAnnotations = useCallback(() => {
    const viewport = controlsRef.current.viewport;
    if (!viewport.imageWidth || !viewport.imageHeight) return;
    const generated = buildAiClinicalAnnotations({
      analysis,
      ecgCase,
      explainability,
      imageHeight: viewport.imageHeight,
      imageWidth: viewport.imageWidth,
      operatorName,
    });
    updateSlice((slice) => ({
      ...slice,
      annotations: mergeGeneratedAnnotations(slice.annotations, generated),
    }));
  }, [analysis, ecgCase, explainability, operatorName, updateSlice]);

  useEffect(() => {
    syncGeneratedAnnotations();
  }, [syncGeneratedAnnotations]);

  const visibleAnnotations = useMemo(
    () => filterAnnotationsByLead(stack.present.annotations.filter((item) => item.visible), activeLead),
    [activeLead, stack.present.annotations],
  );

  const selectedAnnotations = useMemo(
    () => stack.present.annotations.filter((item) => stack.present.selectedAnnotationIds.includes(item.id)),
    [stack.present.annotations, stack.present.selectedAnnotationIds],
  );

  const primarySelected = selectedAnnotations[0] ?? null;

  const setSettings = useCallback(
    (patch: Partial<EcgAiOverlaySettings>) => {
      updateSlice((slice) => ({ ...slice, settings: { ...slice.settings, ...patch } }));
    },
    [updateSlice],
  );

  const toggleOverlay = useCallback(() => {
    setSettings({ enabled: !stack.present.settings.enabled });
  }, [setSettings, stack.present.settings.enabled]);

  const selectAnnotation = useCallback(
    (annotationId: string, multi = false) => {
      updateSlice((slice) => {
        const selected = multi
          ? slice.selectedAnnotationIds.includes(annotationId)
            ? slice.selectedAnnotationIds.filter((id) => id !== annotationId)
            : [...slice.selectedAnnotationIds, annotationId]
          : [annotationId];
        return {
          ...slice,
          annotations: slice.annotations.map((item) => ({ ...item, selected: selected.includes(item.id) })),
          selectedAnnotationIds: selected,
        };
      });
    },
    [updateSlice],
  );

  const clearSelection = useCallback(() => {
    updateSlice((slice) => ({
      ...slice,
      annotations: slice.annotations.map((item) => ({ ...item, selected: false })),
      selectedAnnotationIds: [],
    }));
  }, [updateSlice]);

  const patchAnnotation = useCallback(
    (annotationId: string, patch: Partial<EcgAiClinicalAnnotation>) => {
      updateSlice((slice) => ({
        ...slice,
        annotations: updateAnnotation(slice.annotations, annotationId, patch),
      }));
    },
    [updateSlice],
  );

  const removeAnnotation = useCallback(
    (annotationId: string) => {
      updateSlice((slice) => ({
        ...slice,
        annotations: deleteAnnotation(slice.annotations, annotationId),
        selectedAnnotationIds: slice.selectedAnnotationIds.filter((id) => id !== annotationId),
      }));
    },
    [updateSlice],
  );

  const toggleAnnotationVisibility = useCallback(
    (annotationId: string) => {
      const target = stack.present.annotations.find((item) => item.id === annotationId);
      if (!target) return;
      patchAnnotation(annotationId, { visible: !target.visible });
    },
    [patchAnnotation, stack.present.annotations],
  );

  const toggleAnnotationLock = useCallback(
    (annotationId: string) => {
      const target = stack.present.annotations.find((item) => item.id === annotationId);
      if (!target) return;
      patchAnnotation(annotationId, { locked: !target.locked });
    },
    [patchAnnotation, stack.present.annotations],
  );

  const confirmAnnotation = useCallback(
    (annotationId: string) => patchAnnotation(annotationId, { confirmed: true, rejected: false }),
    [patchAnnotation],
  );

  const rejectAnnotation = useCallback(
    (annotationId: string) => patchAnnotation(annotationId, { rejected: true, confirmed: false }),
    [patchAnnotation],
  );

  const updateDoctorNotes = useCallback(
    (annotationId: string, doctorNotes: string) => patchAnnotation(annotationId, { doctorNotes }),
    [patchAnnotation],
  );

  const resetOverlay = useCallback(() => {
    stack.resetHistory({
      ...EMPTY_AI_OVERLAY_STATE,
      settings: { ...DEFAULT_AI_OVERLAY_SETTINGS, enabled: stack.present.settings.enabled },
    });
    syncGeneratedAnnotations();
    persist();
  }, [persist, stack, syncGeneratedAnnotations]);

  const hydrate = useCallback(
    (raw: unknown) => {
      const restored = restoreOverlayState(raw);
      stack.replace(restored);
      syncGeneratedAnnotations();
    },
    [stack, syncGeneratedAnnotations],
  );

  const exportState = useCallback(() => serializeOverlayState(stack.present), [stack.present]);

  const exportOverlay = useCallback(() => exportOverlayAnnotations(stack.present), [stack.present]);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      if (!stack.present.settings.enabled) return;
      if (event.key === "Delete" || event.key === "Backspace") {
        for (const id of stack.present.selectedAnnotationIds) removeAnnotation(id);
      }
      if (event.ctrlKey && event.key.toLowerCase() === "z") {
        event.preventDefault();
        stack.undo();
        persist();
      }
      if (event.ctrlKey && event.key.toLowerCase() === "y") {
        event.preventDefault();
        stack.redo();
        persist();
      }
      if (event.key.toLowerCase() === "a" && event.ctrlKey) {
        event.preventDefault();
        updateSlice((slice) => ({
          ...slice,
          annotations: slice.annotations.map((item) => ({ ...item, selected: item.visible })),
          selectedAnnotationIds: slice.annotations.filter((item) => item.visible).map((item) => item.id),
        }));
      }
      if (event.key.toLowerCase() === "l") {
        for (const id of stack.present.selectedAnnotationIds) toggleAnnotationLock(id);
      }
      if (event.key.toLowerCase() === "h") {
        for (const id of stack.present.selectedAnnotationIds) toggleAnnotationVisibility(id);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    persist,
    removeAnnotation,
    stack,
    stack.present.selectedAnnotationIds,
    stack.present.settings.enabled,
    toggleAnnotationLock,
    toggleAnnotationVisibility,
    updateSlice,
  ]);

  return {
    canRedo: stack.canRedo,
    canUndo: stack.canUndo,
    clearSelection,
    confirmAnnotation,
    exportOverlay,
    exportState,
    hydrate,
    patchAnnotation,
    present: stack.present,
    primarySelected,
    redo: () => {
      stack.redo();
      persist();
    },
    rejectAnnotation,
    removeAnnotation,
    resetOverlay,
    selectAnnotation,
    selectedAnnotations,
    setSettings,
    syncGeneratedAnnotations,
    toggleAnnotationLock,
    toggleAnnotationVisibility,
    toggleOverlay,
    undo: () => {
      stack.undo();
      persist();
    },
    updateDoctorNotes,
    visibleAnnotations,
  };
}

export type EcgAiOverlayWorkspace = ReturnType<typeof useEcgAiOverlayWorkspace>;
