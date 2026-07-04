import { useCallback, useEffect, useMemo, useRef } from "react";
import { Platform } from "react-native";

import {
  buildReadouts,
  deltaPixels,
  gridSpacingPx,
  measurementFromCaliper,
  primaryValueForKind,
  snapPoint,
} from "./ecgCalibrationMath";
import {
  ANNOTATION_COLORS,
  createWorkspaceState,
  MEASUREMENT_KIND_LABELS,
  type EcgAnnotationKind,
  type EcgCaliper,
  type EcgCaliperKind,
  type EcgClinicalMeasurement,
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
  "annotations" | "calipers" | "measurements" | "selectedAnnotationId" | "selectedCaliperId" | "selectedMeasurementId" | "toolMode"
>;

function workspaceSlice(state: EcgViewerWorkspaceState): WorkspaceSlice {
  return {
    annotations: state.annotations,
    calipers: state.calipers,
    measurements: state.measurements,
    selectedAnnotationId: state.selectedAnnotationId,
    selectedCaliperId: state.selectedCaliperId,
    selectedMeasurementId: state.selectedMeasurementId,
    toolMode: state.toolMode,
  };
}

function syncMeasurementsFromCalipers(
  calipers: EcgCaliper[],
  existing: EcgClinicalMeasurement[],
  controls: EcgViewerControls,
  operator: string,
) {
  const spacing = gridSpacingPx(controls.grid.speed, controls.grid.gain);
  const byCaliper = new Map(existing.map((item) => [item.caliperId, item]));
  return calipers
    .filter((caliper) => !caliper.hidden)
    .map((caliper) => {
      const derived = measurementFromCaliper(caliper, spacing, controls.grid.speed, controls.grid.gain, operator);
      const previous = byCaliper.get(caliper.id);
      return {
        caliperId: caliper.id,
        hidden: previous?.hidden ?? false,
        id: previous?.id ?? uid("measurement"),
        kind: derived.kind,
        lead: caliper.lead ?? previous?.lead,
        name: previous?.name ?? derived.name,
        operator: previous?.operator ?? operator,
        readouts: derived.readouts,
        timestamp: previous?.timestamp ?? nowIso(),
        type: MEASUREMENT_KIND_LABELS[derived.kind],
        unit: derived.unit,
        value: derived.value,
      } satisfies EcgClinicalMeasurement;
    });
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
  const draftAnnotation = useRef<ImagePoint[]>([]);

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

  const updateSlice = useCallback(
    (updater: (slice: WorkspaceSlice) => WorkspaceSlice) => {
      commit((current) => {
        const nextSlice = updater(workspaceSlice(current));
        const measurements =
          nextSlice.calipers === current.calipers
            ? nextSlice.measurements
            : syncMeasurementsFromCalipers(nextSlice.calipers, nextSlice.measurements, controlsRef.current, options.operatorName);
        const next = { ...current, ...nextSlice, measurements };
        persist(next);
        return next;
      });
    },
    [commit, options.operatorName, persist],
  );

  const setToolMode = useCallback(
    (toolMode: EcgViewerToolMode) => updateSlice((slice) => ({ ...slice, toolMode })),
    [updateSlice],
  );

  const addCaliper = useCallback(
    (kind: EcgCaliperKind, start: ImagePoint, end?: ImagePoint) => {
      const spacing = gridSpacingPx(controlsRef.current.grid.speed, controlsRef.current.grid.gain);
      const snappedStart = snapPoint(start, spacing);
      const snappedEnd = snapPoint(end ?? { x: start.x + spacing * 5, y: start.y }, spacing);
      const caliper: EcgCaliper = {
        createdAt: nowIso(),
        end: kind === "horizontal" ? { x: snappedEnd.x, y: snappedStart.y } : kind === "vertical" ? { x: snappedStart.x, y: snappedEnd.y } : snappedEnd,
        hidden: false,
        id: uid("caliper"),
        kind,
        locked: false,
        measurementKind: activeMeasurementKind.current,
        snapToGrid: true,
        start: snappedStart,
        updatedAt: nowIso(),
      };
      updateSlice((slice) => ({
        ...slice,
        calipers: [...slice.calipers, caliper],
        selectedCaliperId: caliper.id,
        toolMode: "caliper",
      }));
      return caliper.id;
    },
    [updateSlice],
  );

  const updateCaliper = useCallback(
    (caliperId: string, patch: Partial<EcgCaliper>) => {
      updateSlice((slice) => ({
        ...slice,
        calipers: slice.calipers.map((item) => (item.id === caliperId ? { ...item, ...patch, updatedAt: nowIso() } : item)),
      }));
    },
    [updateSlice],
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
          start: { x: source.start.x + 12, y: source.start.y + 12 },
          updatedAt: nowIso(),
        };
        return { ...slice, calipers: [...slice.calipers, copy], selectedCaliperId: copy.id };
      });
    },
    [updateSlice],
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
        measurements: slice.measurements.map((item) => (item.id === measurementId ? { ...item, name } : item)),
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
      const caliperId = sliceCalipers(present, measurementId);
      if (caliperId) duplicateCaliper(caliperId);
    },
    [duplicateCaliper, present],
  );

  function sliceCalipers(state: EcgViewerWorkspaceState, measurementId: string) {
    const measurement = state.measurements.find((item) => item.id === measurementId);
    return measurement?.caliperId ?? "";
  }

  const deleteMeasurement = useCallback(
    (measurementId: string) => {
      const caliperId = sliceCalipers(present, measurementId);
      if (caliperId) deleteCaliper(caliperId);
    },
    [deleteCaliper, present],
  );

  const jumpToMeasurement = useCallback(
    (measurementId: string) => {
      const measurement = present.measurements.find((item) => item.id === measurementId);
      if (!measurement) return;
      updateSlice((slice) => ({ ...slice, selectedMeasurementId: measurementId, selectedCaliperId: measurement.caliperId }));
    },
    [present.measurements, updateSlice],
  );

  const removeSelected = useCallback(() => {
    if (present.selectedAnnotationId) {
      deleteAnnotation(present.selectedAnnotationId);
      return;
    }
    if (present.selectedCaliperId) {
      deleteCaliper(present.selectedCaliperId);
    }
  }, [deleteAnnotation, deleteCaliper, present.selectedAnnotationId, present.selectedCaliperId]);

  const recalibrateMeasurements = useCallback(() => {
    updateSlice((slice) => ({
      ...slice,
      measurements: syncMeasurementsFromCalipers(slice.calipers, slice.measurements, controlsRef.current, options.operatorName),
    }));
  }, [options.operatorName, updateSlice]);

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
    (state: EcgViewerWorkspaceState) => {
      resetHistory(state);
      controlsRef.current.setGrid(state.grid);
      controlsRef.current.setTransform(state.transform);
      controlsRef.current.setAdjustments(state.adjustments);
    },
    [resetHistory],
  );

  return {
    activeAnnotationKind,
    activeCaliperKind,
    activeMeasurementKind,
    addAnnotation,
    addCaliper,
    canRedo,
    canUndo,
    deleteAnnotation,
    deleteCaliper,
    deleteMeasurement,
    draftAnnotation,
    duplicateCaliper,
    duplicateMeasurement,
    exportState,
    hydrate,
    jumpToMeasurement,
    present,
    recalibrateMeasurements,
    redo,
    removeSelected,
    renameMeasurement,
    setToolMode,
    toggleMeasurementHidden,
    undo,
    updateAnnotation,
    updateCaliper,
    updateSlice,
  };
}

export type EcgMeasurementWorkspace = ReturnType<typeof useEcgMeasurementWorkspace>;

export function summarizeCaliper(caliper: EcgCaliper, controls: EcgViewerControls) {
  const spacing = gridSpacingPx(controls.grid.speed, controls.grid.gain);
  const deltaPx = deltaPixels(caliper.start, caliper.end, caliper.kind);
  const readouts = buildReadouts({
    deltaPx,
    gain: controls.grid.gain,
    kind: caliper.kind,
    spacing,
    speed: controls.grid.speed,
  });
  const primary = primaryValueForKind(caliper.measurementKind ?? "custom", readouts, caliper.kind);
  return { primary, readouts };
}
