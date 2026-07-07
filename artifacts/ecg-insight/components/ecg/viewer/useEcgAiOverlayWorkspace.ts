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
  const { canRedo, canUndo, commit, present, redo, replace, resetHistory, undo } = useHistoryStack<Slice>(EMPTY_AI_OVERLAY_STATE);
  const controlsRef = useRef(controls);
  controlsRef.current = controls;
  const onPersistRef = useRef(onPersist);
  onPersistRef.current = onPersist;
  const persist = useCallback(() => {
    onPersistRef.current?.();
  }, []);

  const updateSlice = useCallback(
    (updater: (slice: Slice) => Slice) => {
      commit((current) => {
        const next = updater(current);
        if (next === current) return current;
        onPersistRef.current?.();
        return next;
      });
    },
    [commit],
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
    commit((current) => {
      const merged = mergeGeneratedAnnotations(current.annotations, generated);
      if (
        merged.length === current.annotations.length &&
        merged.every((item, index) => item.id === current.annotations[index]?.id)
      ) {
        return current;
      }
      onPersistRef.current?.();
      return { ...current, annotations: merged };
    });
  }, [analysis, commit, ecgCase, explainability, operatorName]);

  useEffect(() => {
    syncGeneratedAnnotations();
  }, [syncGeneratedAnnotations]);

  const visibleAnnotations = useMemo(
    () => filterAnnotationsByLead(present.annotations.filter((item) => item.visible), activeLead),
    [activeLead, present.annotations],
  );

  const selectedAnnotations = useMemo(
    () => present.annotations.filter((item) => present.selectedAnnotationIds.includes(item.id)),
    [present.annotations, present.selectedAnnotationIds],
  );

  const primarySelected = selectedAnnotations[0] ?? null;

  const setSettings = useCallback(
    (patch: Partial<EcgAiOverlaySettings>) => {
      updateSlice((slice) => {
        const settings = { ...slice.settings, ...patch };
        const unchanged = (Object.keys(patch) as (keyof EcgAiOverlaySettings)[]).every((key) => slice.settings[key] === settings[key]);
        return unchanged ? slice : { ...slice, settings };
      });
    },
    [updateSlice],
  );

  const toggleOverlay = useCallback(() => {
    setSettings({ enabled: !present.settings.enabled });
  }, [present.settings.enabled, setSettings]);

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
      const target = present.annotations.find((item) => item.id === annotationId);
      if (!target) return;
      patchAnnotation(annotationId, { visible: !target.visible });
    },
    [patchAnnotation, present.annotations],
  );

  const toggleAnnotationLock = useCallback(
    (annotationId: string) => {
      const target = present.annotations.find((item) => item.id === annotationId);
      if (!target) return;
      patchAnnotation(annotationId, { locked: !target.locked });
    },
    [patchAnnotation, present.annotations],
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
    resetHistory({
      ...EMPTY_AI_OVERLAY_STATE,
      settings: { ...DEFAULT_AI_OVERLAY_SETTINGS, enabled: present.settings.enabled },
    });
    syncGeneratedAnnotations();
    persist();
  }, [persist, present.settings.enabled, resetHistory, syncGeneratedAnnotations]);

  const hydrate = useCallback(
    (raw: unknown) => {
      const restored = restoreOverlayState(raw);
      replace(restored);
      syncGeneratedAnnotations();
    },
    [replace, syncGeneratedAnnotations],
  );

  const exportState = useCallback(() => serializeOverlayState(present), [present]);

  const exportOverlay = useCallback(() => exportOverlayAnnotations(present), [present]);

  const highlightLeads = useCallback(
    (leads: string[]) => {
      const normalized = leads.map((lead) => (lead === "Rhythm Strip" ? "II" : lead));
      updateSlice((slice) => {
        const matchingIds = slice.annotations.filter((item) => normalized.includes(item.lead)).map((item) => item.id);
        return {
          ...slice,
          annotations: slice.annotations.map((item) => ({
            ...item,
            selected: normalized.includes(item.lead),
          })),
          selectedAnnotationIds: matchingIds,
          settings: { ...slice.settings, enabled: true },
        };
      });
    },
    [updateSlice],
  );

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      if (!present.settings.enabled) return;
      if (event.key === "Delete" || event.key === "Backspace") {
        for (const id of present.selectedAnnotationIds) removeAnnotation(id);
      }
      if (event.ctrlKey && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo();
        persist();
      }
      if (event.ctrlKey && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
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
        for (const id of present.selectedAnnotationIds) toggleAnnotationLock(id);
      }
      if (event.key.toLowerCase() === "h") {
        for (const id of present.selectedAnnotationIds) toggleAnnotationVisibility(id);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    persist,
    present.selectedAnnotationIds,
    present.settings.enabled,
    redo,
    removeAnnotation,
    toggleAnnotationLock,
    toggleAnnotationVisibility,
    undo,
    updateSlice,
  ]);

  return {
    canRedo,
    canUndo,
    clearSelection,
    confirmAnnotation,
    exportOverlay,
    exportState,
    highlightLeads,
    hydrate,
    patchAnnotation,
    present,
    primarySelected,
    redo: () => {
      redo();
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
      undo();
      persist();
    },
    updateDoctorNotes,
    visibleAnnotations,
  };
}

export type EcgAiOverlayWorkspace = ReturnType<typeof useEcgAiOverlayWorkspace>;
