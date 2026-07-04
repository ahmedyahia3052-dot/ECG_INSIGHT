import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";

import {
  focusTransformForCaliper,
  presetForKind,
  syncWorkspaceMeasurements,
  type ClinicalMeasurementPreset,
} from "./ecgMeasurementEngine";
import {
  buildReadouts,
  deltaPixels,
  dragCaliperEndpoint,
  gridSpacingPx,
  primaryValueForKind,
  snapPoint,
} from "./ecgCalibrationMath";
import {
  ANNOTATION_COLORS,
  createWorkspaceState,
  migrateWorkspaceState,
  type EcgAnnotationKind,
  type EcgCaliper,
  type EcgCaliperKind,
  type EcgMeasurementKind,
  type EcgViewerAnnotation,
  type EcgViewerToolMode,
  type EcgViewerWorkspaceState,
  type ImagePoint,
} from "./measurementTypes";
import { useHistoryStack } from "./useHistoryStack";
import type { EcgViewerControls } from "./useEcgViewerControls";

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso() {
  return new Date().toISOString();
}

type WorkspaceSlice = Pick<
  EcgViewerWorkspaceState,
  | "activeLead"
  | "activeMeasurementKind"
  | "annotations"
  | "calipers"
  | "measurements"
  | "selectedAnnotationId"
  | "selectedCaliperId"
  | "selectedMeasurementId"
  | "toolMode"
>;

function workspaceSlice(state: EcgViewerWorkspaceState): WorkspaceSlice {
  return {
    activeLead: state.activeLead,
    activeMeasurementKind: state.activeMeasurementKind,
    annotations: state.annotations,
    calipers: state.calipers,
    measurements: state.measurements,
    selectedAnnotationId: state.selectedAnnotationId,
    selectedCaliperId: state.selectedCaliperId,
    selectedMeasurementId: state.selectedMeasurementId,
    toolMode: state.toolMode,
  };
}

export function useEcgMeasurementWorkspace(options: {
  controls: EcgViewerControls;
  initialState?: Partial<EcgViewerWorkspaceState>;
  onPersist?: (state: EcgViewerWorkspaceState) => void;
  operatorName: string;
}) {
  const initial = useMemo(
    () =>
      createWorkspaceState({
        ...options.initialState,
        adjustments: options.controls.adjustments,
        grid: options.controls.grid,
        transform: options.controls.transform,
      }),
    [],
  );
  const { canRedo, canUndo, commit, present, redo, replace, resetHistory, undo } = useHistoryStack(initial);
  const controlsRef = useRef(options.controls);
  controlsRef.current = options.controls;
  const activeCaliperKind = useRef<EcgCaliperKind>("horizontal");
  const activeAnnotationKind = useRef<EcgAnnotationKind>("arrow");
  const activeMeasurementKind = useRef<EcgMeasurementKind>("rr_interval");
  const activePreset = useRef<ClinicalMeasurementPreset>(presetForKind("rr_interval"));
  const draftAnnotation = useRef<ImagePoint[]>([]);
  const [draftCaliper, setDraftCaliper] = useState<{ end: ImagePoint; start: ImagePoint } | null>(null);
  const [hoveredCaliperId, setHoveredCaliperId] = useState<string | null>(null);

  const persist = useCallback(
    (next: EcgViewerWorkspaceState) => {
      options.onPersist?.({
        ...next,
        adjustments: controlsRef.current.adjustments,
        grid: controlsRef.current.grid,
        transform: controlsRef.current.transform,
      });
    },
    [options.onPersist],
  );

  const syncMeasurements = useCallback(
    (calipers: EcgCaliper[], existing: EcgViewerWorkspaceState["measurements"]) =>
      syncWorkspaceMeasurements(calipers, existing, {
        gain: controlsRef.current.grid.gain,
        operator: options.operatorName,
        speed: controlsRef.current.grid.speed,
      }),
    [options.operatorName],
  );

  const updateSlice = useCallback(
    (updater: (slice: WorkspaceSlice) => WorkspaceSlice) => {
      commit((current) => {
        const nextSlice = updater(workspaceSlice(current));
        const measurements =
          nextSlice.calipers === current.calipers
            ? nextSlice.measurements
            : syncMeasurements(nextSlice.calipers, nextSlice.measurements);
        const next = { ...current, ...nextSlice, measurements };
        persist(next);
        return next;
      });
    },
    [commit, persist, syncMeasurements],
  );

  const setToolMode = useCallback((toolMode: EcgViewerToolMode) => updateSlice((slice) => ({ ...slice, toolMode })), [updateSlice]);

  const setActiveLead = useCallback((lead: string) => updateSlice((slice) => ({ ...slice, activeLead: lead })), [updateSlice]);

  const selectMeasurementPreset = useCallback((preset: ClinicalMeasurementPreset) => {
    activePreset.current = preset;
    activeMeasurementKind.current = preset.kind;
    activeCaliperKind.current = preset.caliperKind;
    updateSlice((slice) => ({ ...slice, activeMeasurementKind: preset.kind, toolMode: "caliper" }));
  }, [updateSlice]);

  const addCaliper = useCallback(
    (kind: EcgCaliperKind, start: ImagePoint, end?: ImagePoint, overrides?: Partial<EcgCaliper>) => {
      const spacing = gridSpacingPx(controlsRef.current.grid.speed, controlsRef.current.grid.gain);
      const snappedStart = overrides?.snapToGrid === false ? start : snapPoint(start, spacing);
      const snappedEnd = snapPoint(end ?? { x: start.x + spacing * 5, y: start.y }, spacing);
      const preset = activePreset.current;
      const caliper: EcgCaliper = {
        color: overrides?.color ?? preset.color,
        comments: overrides?.comments,
        createdAt: nowIso(),
        createdBy: options.operatorName,
        end: kind === "horizontal" ? { x: snappedEnd.x, y: snappedStart.y } : kind === "vertical" ? { x: snappedStart.x, y: snappedEnd.y } : snappedEnd,
        hidden: false,
        id: uid("caliper"),
        kind,
        label: overrides?.label ?? preset.label,
        lead: overrides?.lead,
        locked: false,
        measurementKind: overrides?.measurementKind ?? activeMeasurementKind.current,
        snapToGrid: overrides?.snapToGrid ?? true,
        start: snappedStart,
        updatedAt: nowIso(),
      };
      updateSlice((slice) => ({
        ...slice,
        calipers: [...slice.calipers, { ...caliper, lead: overrides?.lead ?? slice.activeLead }],
        selectedCaliperId: caliper.id,
        toolMode: "caliper",
      }));
      return caliper.id;
    },
    [options.operatorName, updateSlice],
  );

  const beginDraftCaliper = useCallback((start: ImagePoint) => {
    const spacing = gridSpacingPx(controlsRef.current.grid.speed, controlsRef.current.grid.gain);
    const snapped = snapPoint(start, spacing);
    setDraftCaliper({ end: snapped, start: snapped });
  }, []);

  const updateDraftCaliper = useCallback((end: ImagePoint) => {
    setDraftCaliper((current) => {
      if (!current) return current;
      const spacing = gridSpacingPx(controlsRef.current.grid.speed, controlsRef.current.grid.gain);
      const snapped = snapPoint(end, spacing);
      const kind = activeCaliperKind.current;
      return {
        end: kind === "horizontal" ? { x: snapped.x, y: current.start.y } : kind === "vertical" ? { x: current.start.x, y: snapped.y } : snapped,
        start: current.start,
      };
    });
  }, []);

  const commitDraftCaliper = useCallback(() => {
    if (!draftCaliper) return null;
    const spacing = gridSpacingPx(controlsRef.current.grid.speed, controlsRef.current.grid.gain);
    const kind = activeCaliperKind.current;
    const { start } = draftCaliper;
    let { end } = draftCaliper;
    const delta = Math.hypot(end.x - start.x, end.y - start.y);
    if (delta < spacing * 0.35) {
      end =
        kind === "horizontal"
          ? { x: start.x + spacing * 5, y: start.y }
          : kind === "vertical"
            ? { x: start.x, y: start.y + spacing * 5 }
            : { x: start.x + spacing * 5, y: start.y + spacing * 5 };
    }
    const id = addCaliper(kind, start, end);
    setDraftCaliper(null);
    return id;
  }, [addCaliper, draftCaliper]);

  const cancelDraftCaliper = useCallback(() => setDraftCaliper(null), []);

  const updateCaliper = useCallback(
    (caliperId: string, patch: Partial<EcgCaliper>) => {
      updateSlice((slice) => ({
        ...slice,
        calipers: slice.calipers.map((item) => (item.id === caliperId ? { ...item, ...patch, updatedAt: nowIso() } : item)),
      }));
    },
    [updateSlice],
  );

  const dragCaliper = useCallback(
    (caliperId: string, endpoint: "start" | "end", imagePoint: ImagePoint) => {
      const caliper = present.calipers.find((item) => item.id === caliperId);
      if (!caliper || caliper.locked) return;
      const spacing = gridSpacingPx(controlsRef.current.grid.speed, controlsRef.current.grid.gain);
      const next = dragCaliperEndpoint(caliper, endpoint, imagePoint, spacing);
      updateCaliper(caliperId, next);
    },
    [present.calipers, updateCaliper],
  );

  const deleteCaliper = useCallback(
    (caliperId: string) => {
      updateSlice((slice) => ({
        ...slice,
        calipers: slice.calipers.filter((item) => item.id !== caliperId),
        measurements: slice.measurements.filter((item) => item.caliperId !== caliperId),
        selectedCaliperId: slice.selectedCaliperId === caliperId ? null : slice.selectedCaliperId,
      }));
    },
    [updateSlice],
  );

  const duplicateCaliper = useCallback(
    (caliperId: string) => {
      updateSlice((slice) => {
        const source = slice.calipers.find((item) => item.id === caliperId);
        if (!source) return slice;
        const copy: EcgCaliper = {
          ...source,
          createdAt: nowIso(),
          end: { x: source.end.x + 12, y: source.end.y + 12 },
          id: uid("caliper"),
          locked: false,
          start: { x: source.start.x + 12, y: source.start.y + 12 },
          updatedAt: nowIso(),
        };
        return { ...slice, calipers: [...slice.calipers, copy], selectedCaliperId: copy.id };
      });
    },
    [updateSlice],
  );

  const setCaliperColor = useCallback(
    (caliperId: string, color: string) => updateCaliper(caliperId, { color }),
    [updateCaliper],
  );

  const toggleCaliperLock = useCallback(
    (caliperId: string) => {
      const caliper = present.calipers.find((item) => item.id === caliperId);
      if (!caliper) return;
      updateCaliper(caliperId, { locked: !caliper.locked });
    },
    [present.calipers, updateCaliper],
  );

  const addAnnotation = useCallback(
    (kind: EcgAnnotationKind, points: ImagePoint[], text?: string) => {
      const annotation: EcgViewerAnnotation = {
        color: ANNOTATION_COLORS[0],
        createdAt: nowIso(),
        hidden: false,
        id: uid("annotation"),
        kind,
        opacity: kind === "highlighter" ? 0.35 : 0.95,
        points,
        text,
        thickness: kind === "highlighter" ? 16 : 2,
        updatedAt: nowIso(),
      };
      updateSlice((slice) => ({
        ...slice,
        annotations: [...slice.annotations, annotation],
        selectedAnnotationId: annotation.id,
        toolMode: "annotation",
      }));
    },
    [updateSlice],
  );

  const updateAnnotation = useCallback(
    (annotationId: string, patch: Partial<EcgViewerAnnotation>) => {
      updateSlice((slice) => ({
        ...slice,
        annotations: slice.annotations.map((item) => (item.id === annotationId ? { ...item, ...patch, updatedAt: nowIso() } : item)),
      }));
    },
    [updateSlice],
  );

  const deleteAnnotation = useCallback(
    (annotationId: string) => {
      updateSlice((slice) => ({
        ...slice,
        annotations: slice.annotations.filter((item) => item.id !== annotationId),
        selectedAnnotationId: slice.selectedAnnotationId === annotationId ? null : slice.selectedAnnotationId,
      }));
    },
    [updateSlice],
  );

  const renameMeasurement = useCallback(
    (measurementId: string, name: string) => {
      updateSlice((slice) => ({
        ...slice,
        measurements: slice.measurements.map((item) => (item.id === measurementId ? { ...item, name, updatedAt: nowIso() } : item)),
      }));
    },
    [updateSlice],
  );

  const updateMeasurementComments = useCallback(
    (measurementId: string, comments: string) => {
      updateSlice((slice) => ({
        ...slice,
        measurements: slice.measurements.map((item) => (item.id === measurementId ? { ...item, comments, updatedAt: nowIso() } : item)),
      }));
    },
    [updateSlice],
  );

  const toggleMeasurementHidden = useCallback(
    (measurementId: string) => {
      updateSlice((slice) => ({
        ...slice,
        measurements: slice.measurements.map((item) => (item.id === measurementId ? { ...item, hidden: !item.hidden } : item)),
      }));
    },
    [updateSlice],
  );

  const duplicateMeasurement = useCallback(
    (measurementId: string) => {
      const caliperId = present.measurements.find((item) => item.id === measurementId)?.caliperId;
      if (caliperId) duplicateCaliper(caliperId);
    },
    [duplicateCaliper, present.measurements],
  );

  const deleteMeasurement = useCallback(
    (measurementId: string) => {
      const caliperId = present.measurements.find((item) => item.id === measurementId)?.caliperId;
      if (caliperId) deleteCaliper(caliperId);
    },
    [deleteCaliper, present.measurements],
  );

  const jumpToMeasurement = useCallback(
    (measurementId: string) => {
      const measurement = present.measurements.find((item) => item.id === measurementId);
      if (!measurement) return;
      const caliper = present.calipers.find((item) => item.id === measurement.caliperId);
      if (caliper) {
        controlsRef.current.setTransform(
          focusTransformForCaliper(caliper, controlsRef.current.viewport, controlsRef.current.transform),
        );
      }
      updateSlice((slice) => ({ ...slice, selectedMeasurementId: measurementId, selectedCaliperId: measurement.caliperId }));
    },
    [present.calipers, present.measurements, updateSlice],
  );

  const removeSelected = useCallback(() => {
    if (present.selectedAnnotationId) {
      deleteAnnotation(present.selectedAnnotationId);
      return;
    }
    if (present.selectedCaliperId) deleteCaliper(present.selectedCaliperId);
  }, [deleteAnnotation, deleteCaliper, present.selectedAnnotationId, present.selectedCaliperId]);

  const recalibrateMeasurements = useCallback(() => {
    updateSlice((slice) => ({ ...slice, measurements: syncMeasurements(slice.calipers, slice.measurements) }));
  }, [syncMeasurements, updateSlice]);

  useEffect(() => {
    recalibrateMeasurements();
  }, [options.controls.grid.gain, options.controls.grid.speed, recalibrateMeasurements]);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      if (!event.ctrlKey && (event.key === "c" || event.key === "C")) setToolMode("caliper");
      if (!event.ctrlKey && (event.key === "m" || event.key === "M")) setToolMode("measurement");
      if (!event.ctrlKey && (event.key === "a" || event.key === "A")) setToolMode("annotation");
      if (event.key === "Delete") {
        event.preventDefault();
        removeSelected();
      }
      if (event.ctrlKey && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo();
      }
      if (event.ctrlKey && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [redo, removeSelected, setToolMode, undo]);

  const exportState = useCallback((): EcgViewerWorkspaceState => {
    return {
      ...present,
      adjustments: controlsRef.current.adjustments,
      grid: controlsRef.current.grid,
      transform: controlsRef.current.transform,
    };
  }, [present]);

  const hydrate = useCallback(
    (state: EcgViewerWorkspaceState | (Partial<EcgViewerWorkspaceState> & { version?: number })) => {
      const migrated = migrateWorkspaceState(state);
      resetHistory(migrated);
      controlsRef.current.setGrid(migrated.grid);
      controlsRef.current.setTransform(migrated.transform);
      controlsRef.current.setAdjustments(migrated.adjustments);
    },
    [resetHistory],
  );

  return {
    activeAnnotationKind,
    activeCaliperKind,
    activeMeasurementKind,
    activePreset,
    addAnnotation,
    addCaliper,
    beginDraftCaliper,
    cancelDraftCaliper,
    canRedo,
    canUndo,
    commitDraftCaliper,
    deleteAnnotation,
    deleteCaliper,
    deleteMeasurement,
    draftAnnotation,
    draftCaliper,
    dragCaliper,
    duplicateCaliper,
    duplicateMeasurement,
    exportState,
    hoveredCaliperId,
    hydrate,
    jumpToMeasurement,
    present,
    recalibrateMeasurements,
    redo,
    removeSelected,
    renameMeasurement,
    selectMeasurementPreset,
    setActiveLead,
    setCaliperColor,
    setHoveredCaliperId,
    setToolMode,
    toggleCaliperLock,
    toggleMeasurementHidden,
    undo,
    updateAnnotation,
    updateCaliper,
    updateDraftCaliper,
    updateMeasurementComments,
    updateSlice,
  };
}

export type EcgMeasurementWorkspace = ReturnType<typeof useEcgMeasurementWorkspace>;

export function summarizeCaliper(caliper: EcgCaliper, controls: EcgViewerControls, rrMs?: number) {
  const spacing = gridSpacingPx(controls.grid.speed, controls.grid.gain);
  const deltaPx = deltaPixels(caliper.start, caliper.end, caliper.kind);
  const readouts = buildReadouts({
    deltaPx,
    gain: controls.grid.gain,
    kind: caliper.kind,
    measurementKind: caliper.measurementKind,
    rrMs,
    spacing,
    speed: controls.grid.speed,
  });
  const primary = primaryValueForKind(caliper.measurementKind ?? "custom", readouts, caliper.kind);
  return { primary, readouts };
}
