import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";

import type { DigitalEcg } from "@/services/ecgProcessing";

import {
  focusTransformForCaliper,
  presetForKind,
  summarizeCaliper,
  syncWorkspaceMeasurements,
  type ClinicalMeasurementPreset,
} from "./ecgMeasurementEngine";
import {
  dragCaliperEndpoint,
  dragCaliperVertex,
  dragMultiWaypoint,
  resolveGridSpacing,
  snapPoint,
} from "./ecgCalibrationMath";
import { appendHistory, createHistoryEntry, deleteHistoryEntry, renameHistoryEntry } from "./ecgMeasurementHistory";
import { replicateHorizontalCaliper } from "./ecgMultiLeadSync";
import {
  baselineYForLead,
  buildCaliperSeedsFromEngine,
  detectWaveFiducials,
  snapToNearestFiducial,
  type WaveFiducial,
} from "./ecgWaveDetectionBridge";
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

const MEASUREMENT_NUDGE_PX = 0.5;

type WorkspaceSlice = Pick<
  EcgViewerWorkspaceState,
  | "activeLead"
  | "activeMeasurementKind"
  | "annotations"
  | "calipers"
  | "measurementHistory"
  | "measurements"
  | "selectedAnnotationId"
  | "selectedCaliperId"
  | "selectedMeasurementId"
  | "snapSettings"
  | "syncTimestampMs"
  | "toolMode"
>;

function workspaceSlice(state: EcgViewerWorkspaceState): WorkspaceSlice {
  return {
    activeLead: state.activeLead,
    activeMeasurementKind: state.activeMeasurementKind,
    annotations: state.annotations,
    calipers: state.calipers,
    measurementHistory: state.measurementHistory,
    measurements: state.measurements,
    selectedAnnotationId: state.selectedAnnotationId,
    selectedCaliperId: state.selectedCaliperId,
    selectedMeasurementId: state.selectedMeasurementId,
    snapSettings: state.snapSettings,
    syncTimestampMs: state.syncTimestampMs,
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
  const presentRef = useRef(present);
  presentRef.current = present;
  const activeCaliperKind = useRef<EcgCaliperKind>("horizontal");
  const activeAnnotationKind = useRef<EcgAnnotationKind>("arrow");
  const activeMeasurementKind = useRef<EcgMeasurementKind>("rr_interval");
  const activePreset = useRef<ClinicalMeasurementPreset>(presetForKind("rr_interval"));
  const draftAnnotation = useRef<ImagePoint[]>([]);
  const draftPointsRef = useRef<ImagePoint[]>([]);
  const waveFiducialsRef = useRef<WaveFiducial[]>([]);
  const imageDimensionsRef = useRef({ height: 0, width: 0 });
  const [draftCaliper, setDraftCaliper] = useState<{ end: ImagePoint; start: ImagePoint; vertex?: ImagePoint; waypoints?: ImagePoint[] } | null>(null);
  const [hoveredCaliperId, setHoveredCaliperId] = useState<string | null>(null);

  const onPersistRef = useRef(options.onPersist);
  onPersistRef.current = options.onPersist;

  const persist = useCallback((next: EcgViewerWorkspaceState) => {
    onPersistRef.current?.({
      ...next,
      adjustments: controlsRef.current.adjustments,
      grid: controlsRef.current.grid,
      transform: controlsRef.current.transform,
    });
  }, []);

  const syncMeasurements = useCallback(
    (calipers: EcgCaliper[], existing: EcgViewerWorkspaceState["measurements"]) =>
      syncWorkspaceMeasurements(calipers, existing, {
        gain: controlsRef.current.grid.gain,
        grid: controlsRef.current.grid,
        operator: options.operatorName,
        speed: controlsRef.current.grid.speed,
      }),
    [options.operatorName],
  );

  const updateSlice = useCallback(
    (updater: (slice: WorkspaceSlice) => WorkspaceSlice) => {
      commit((current) => {
        const currentSlice = workspaceSlice(current);
        const nextSlice = updater(currentSlice);
        if (nextSlice === currentSlice) return current;
        const measurements =
          nextSlice.calipers === currentSlice.calipers
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

  const setActiveLead = useCallback(
    (lead: string) => updateSlice((slice) => (slice.activeLead === lead ? slice : { ...slice, activeLead: lead })),
    [updateSlice],
  );

  const selectMeasurementPreset = useCallback((preset: ClinicalMeasurementPreset) => {
    activePreset.current = preset;
    activeMeasurementKind.current = preset.kind;
    activeCaliperKind.current = preset.caliperKind;
    updateSlice((slice) => ({ ...slice, activeMeasurementKind: preset.kind, toolMode: "caliper" }));
  }, [updateSlice]);

  const spacingForGrid = useCallback(
    () => resolveGridSpacing(controlsRef.current.grid),
    [],
  );

  const applySnap = useCallback(
    (point: ImagePoint, lead?: string) => {
      const slice = presentRef.current;
      const spacing = spacingForGrid();
      let next = slice.snapSettings.snapToGrid ? snapPoint(point, spacing) : point;
      const activeLead = lead ?? slice.activeLead ?? "II";
      const { height, width } = imageDimensionsRef.current;
      if (slice.snapSettings.snapToBaseline && width > 0 && height > 0) {
        next = { ...next, y: baselineYForLead(activeLead, width, height) };
      }
      if (slice.snapSettings.snapToWave && waveFiducialsRef.current.length > 0 && width > 0 && height > 0) {
        next = snapToNearestFiducial(next, waveFiducialsRef.current, controlsRef.current.grid, width, height, activeLead);
      }
      return next;
    },
    [spacingForGrid],
  );

  const addCaliper = useCallback(
    (kind: EcgCaliperKind, start: ImagePoint, end?: ImagePoint, overrides?: Partial<EcgCaliper>) => {
      const slice = presentRef.current;
      const lead = overrides?.lead ?? slice.activeLead ?? "II";
      const snappedStart = applySnap(start, lead);
      const snappedEnd = applySnap(end ?? { x: start.x + spacingForGrid() * 5, y: start.y }, lead);
      const preset = activePreset.current;
      const groupId = overrides?.groupId ?? (slice.snapSettings.multiLeadSync && kind === "horizontal" ? uid("group") : undefined);
      const caliper: EcgCaliper = {
        color: overrides?.color ?? preset.color,
        comments: overrides?.comments,
        createdAt: nowIso(),
        createdBy: options.operatorName,
        end: kind === "horizontal" ? { x: snappedEnd.x, y: snappedStart.y } : kind === "vertical" ? { x: snappedStart.x, y: snappedEnd.y } : snappedEnd,
        groupId,
        hidden: false,
        id: uid("caliper"),
        kind,
        label: overrides?.label ?? preset.label,
        lead,
        locked: false,
        measurementKind: overrides?.measurementKind ?? activeMeasurementKind.current,
        snapToGrid: overrides?.snapToGrid ?? slice.snapSettings.snapToGrid,
        start: snappedStart,
        updatedAt: nowIso(),
        vertex: overrides?.vertex,
        waypoints: overrides?.waypoints,
      };

      const { height, width } = imageDimensionsRef.current;
      const replicas =
        groupId && kind === "horizontal" && width > 0 && height > 0
          ? replicateHorizontalCaliper(caliper, width, height, controlsRef.current.grid, groupId)
          : [caliper];

      updateSlice((slice) => ({
        ...slice,
        calipers: [...slice.calipers, ...replicas],
        measurementHistory: appendHistory(
          slice.measurementHistory,
          createHistoryEntry({
            action: "create",
            caliper,
            controls: controlsRef.current,
            doctor: options.operatorName,
          }),
        ),
        selectedCaliperId: caliper.id,
        toolMode: "caliper",
      }));
      return caliper.id;
    },
    [applySnap, options.operatorName, spacingForGrid, updateSlice],
  );

  const beginDraftCaliper = useCallback((start: ImagePoint) => {
    const spacing = spacingForGrid();
    const snapped = snapPoint(start, spacing);
    draftPointsRef.current = [snapped];
    setDraftCaliper({ end: snapped, start: snapped });
  }, [spacingForGrid]);

  const appendDraftPoint = useCallback(
    (point: ImagePoint) => {
      const kind = activeCaliperKind.current;
      const spacing = spacingForGrid();
      const snapped = snapPoint(point, spacing);
      if (kind === "angle") {
        draftPointsRef.current = [...draftPointsRef.current, snapped];
        if (draftPointsRef.current.length === 1) {
          setDraftCaliper({ end: snapped, start: snapped, vertex: snapped });
          return false;
        }
        if (draftPointsRef.current.length === 2) {
          setDraftCaliper({ end: snapped, start: snapped, vertex: draftPointsRef.current[0] });
          return false;
        }
        const [vertex, armA, armB] = draftPointsRef.current;
        addCaliper("angle", armA!, armB!, { vertex, waypoints: draftPointsRef.current });
        draftPointsRef.current = [];
        setDraftCaliper(null);
        return true;
      }
      if (kind === "multi") {
        draftPointsRef.current = [...draftPointsRef.current, snapped];
        setDraftCaliper({
          end: snapped,
          start: draftPointsRef.current[0]!,
          waypoints: [...draftPointsRef.current],
        });
        return false;
      }
      return false;
    },
    [addCaliper, spacingForGrid],
  );

  const finishMultiCaliper = useCallback(() => {
    if (draftPointsRef.current.length < 2) return null;
    const points = [...draftPointsRef.current];
    const id = addCaliper("multi", points[0]!, points[points.length - 1]!, { waypoints: points });
    draftPointsRef.current = [];
    setDraftCaliper(null);
    return id;
  }, [addCaliper]);

  const updateDraftCaliper = useCallback((end: ImagePoint) => {
    setDraftCaliper((current) => {
      if (!current) return current;
      const spacing = spacingForGrid();
      const snapped = snapPoint(end, spacing);
      const kind = activeCaliperKind.current;
      if (kind === "multi" && current.waypoints?.length) {
        const waypoints = [...current.waypoints.slice(0, -1), snapped];
        return { ...current, end: snapped, waypoints };
      }
      return {
        end: kind === "horizontal" ? { x: snapped.x, y: current.start.y } : kind === "vertical" ? { x: current.start.x, y: snapped.y } : snapped,
        start: current.start,
        vertex: current.vertex,
        waypoints: current.waypoints,
      };
    });
  }, [spacingForGrid]);

  const commitDraftCaliper = useCallback(() => {
    if (!draftCaliper) return null;
    const kind = activeCaliperKind.current;
    if (kind === "multi") return finishMultiCaliper();
    const spacing = spacingForGrid();
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
    draftPointsRef.current = [];
    setDraftCaliper(null);
    return id;
  }, [addCaliper, draftCaliper, finishMultiCaliper, spacingForGrid]);

  const cancelDraftCaliper = useCallback(() => {
    draftPointsRef.current = [];
    setDraftCaliper(null);
  }, []);

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
      const caliper = presentRef.current.calipers.find((item) => item.id === caliperId);
      if (!caliper || caliper.locked) return;
      const spacing = spacingForGrid();
      const snapped = applySnap(imagePoint, caliper.lead);
      const next = dragCaliperEndpoint(caliper, endpoint, snapped, spacing);
      updateSlice((slice) => {
        const updated = slice.calipers.map((item) => (item.id === caliperId ? { ...item, ...next, updatedAt: nowIso() } : item));
        const changed = updated.find((item) => item.id === caliperId);
        return {
          ...slice,
          calipers: updated,
          measurementHistory: changed
            ? appendHistory(
                slice.measurementHistory,
                createHistoryEntry({
                  action: "update",
                  caliper: changed,
                  controls: controlsRef.current,
                  doctor: options.operatorName,
                }),
              )
            : slice.measurementHistory,
        };
      });
    },
    [applySnap, options.operatorName, spacingForGrid, updateSlice],
  );

  const dragCaliperHandle = useCallback(
    (caliperId: string, handle: "vertex" | number, imagePoint: ImagePoint) => {
      const caliper = present.calipers.find((item) => item.id === caliperId);
      if (!caliper || caliper.locked) return;
      const spacing = spacingForGrid();
      const next =
        handle === "vertex"
          ? dragCaliperVertex(caliper, imagePoint, spacing)
          : dragMultiWaypoint(caliper, handle, imagePoint, spacing);
      updateCaliper(caliperId, next);
    },
    [present.calipers, spacingForGrid, updateCaliper],
  );

  const deleteCaliper = useCallback(
    (caliperId: string) => {
      updateSlice((slice) => {
        const caliper = slice.calipers.find((item) => item.id === caliperId);
        return {
          ...slice,
          calipers: slice.calipers.filter((item) => item.id !== caliperId),
          measurementHistory: caliper
            ? appendHistory(
                slice.measurementHistory,
                createHistoryEntry({
                  action: "delete",
                  caliper,
                  controls: controlsRef.current,
                  doctor: options.operatorName,
                }),
              )
            : slice.measurementHistory,
          measurements: slice.measurements.filter((item) => item.caliperId !== caliperId),
          selectedCaliperId: slice.selectedCaliperId === caliperId ? null : slice.selectedCaliperId,
        };
      });
    },
    [options.operatorName, updateSlice],
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
      const measurement = presentRef.current.measurements.find((item) => item.id === measurementId);
      const caliper =
        presentRef.current.calipers.find((item) => item.id === measurement?.caliperId) ??
        presentRef.current.calipers.find((item) => item.id === measurementId);
      if (caliper) {
        controlsRef.current.setTransform(
          focusTransformForCaliper(caliper, controlsRef.current.viewport, controlsRef.current.transform),
        );
      }
      updateSlice((slice) => ({
        ...slice,
        selectedCaliperId: caliper?.id ?? slice.selectedCaliperId,
        selectedMeasurementId: measurement?.id ?? slice.selectedMeasurementId,
      }));
    },
    [updateSlice],
  );

  const removeSelected = useCallback(() => {
    if (presentRef.current.selectedAnnotationId) {
      deleteAnnotation(presentRef.current.selectedAnnotationId);
      return;
    }
    if (presentRef.current.selectedCaliperId) deleteCaliper(presentRef.current.selectedCaliperId);
  }, [deleteAnnotation, deleteCaliper]);

  const setImageDimensions = useCallback((width: number, height: number) => {
    imageDimensionsRef.current = { height, width };
  }, []);

  const configureWaveDetection = useCallback((digitalEcg?: DigitalEcg | null, lead = "II") => {
    if (!digitalEcg) {
      waveFiducialsRef.current = [];
      return;
    }
    waveFiducialsRef.current = detectWaveFiducials(digitalEcg, lead);
  }, []);

  const seedCalipersFromDigital = useCallback(
    (digitalEcg: DigitalEcg, imageWidth: number, imageHeight: number, lead = "II") => {
      imageDimensionsRef.current = { height: imageHeight, width: imageWidth };
      waveFiducialsRef.current = detectWaveFiducials(digitalEcg, lead);
      const seeds = buildCaliperSeedsFromEngine(digitalEcg, controlsRef.current.grid, imageWidth, imageHeight, lead);
      for (const seed of seeds) {
        addCaliper(seed.kind, seed.start, seed.end, {
          label: seed.label,
          lead,
          measurementKind: seed.measurementKind,
        });
      }
    },
    [addCaliper],
  );

  const toggleSnapSetting = useCallback(
    (key: keyof EcgViewerWorkspaceState["snapSettings"]) => {
      updateSlice((slice) => ({
        ...slice,
        snapSettings: { ...slice.snapSettings, [key]: !slice.snapSettings[key] },
      }));
    },
    [updateSlice],
  );

  const setSyncTimestamp = useCallback(
    (timestampMs: number | null) => updateSlice((slice) => ({ ...slice, syncTimestampMs: timestampMs })),
    [updateSlice],
  );

  const nudgeSelectedCaliper = useCallback(
    (dx: number, dy: number) => {
      const caliperId = presentRef.current.selectedCaliperId;
      if (!caliperId) return;
      const caliper = presentRef.current.calipers.find((item) => item.id === caliperId);
      if (!caliper || caliper.locked) return;
      const spacing = spacingForGrid();
      const step = Math.max(spacing / 4, MEASUREMENT_NUDGE_PX);
      updateCaliper(caliperId, {
        end: { x: caliper.end.x + dx * step, y: caliper.end.y + dy * step },
        start: { x: caliper.start.x + dx * step, y: caliper.start.y + dy * step },
        vertex: caliper.vertex ? { x: caliper.vertex.x + dx * step, y: caliper.vertex.y + dy * step } : undefined,
        waypoints: caliper.waypoints?.map((point) => ({ x: point.x + dx * step, y: point.y + dy * step })),
      });
    },
    [spacingForGrid, updateCaliper],
  );

  const renameHistory = useCallback(
    (entryId: string, name: string) => {
      updateSlice((slice) => ({
        ...slice,
        measurementHistory: renameHistoryEntry(slice.measurementHistory, entryId, name),
      }));
    },
    [updateSlice],
  );

  const deleteHistory = useCallback(
    (entryId: string) => {
      updateSlice((slice) => ({
        ...slice,
        measurementHistory: deleteHistoryEntry(slice.measurementHistory, entryId),
      }));
    },
    [updateSlice],
  );

  const restoreHistory = useCallback(
    (entryId: string) => {
      const entry = presentRef.current.measurementHistory.find((item) => item.id === entryId);
      if (!entry?.caliperId) return;
      const caliper = presentRef.current.calipers.find((item) => item.id === entry.caliperId);
      if (!caliper) return;
      updateSlice((slice) => ({
        ...slice,
        measurementHistory: appendHistory(
          slice.measurementHistory,
          createHistoryEntry({
            action: "restore",
            caliper,
            controls: controlsRef.current,
            doctor: options.operatorName,
            name: entry.measurementType,
            value: entry.value,
          }),
        ),
        selectedCaliperId: caliper.id,
      }));
      jumpToMeasurement(entry.measurementId ?? entry.caliperId);
    },
    [jumpToMeasurement, options.operatorName, updateSlice],
  );

  const commitDraftAnnotation = useCallback(() => {
    const points = draftAnnotation.current;
    if (points.length === 0) return;
    const kind = activeAnnotationKind.current;
    addAnnotation(kind, points);
    draftAnnotation.current = [];
  }, [addAnnotation]);

  const appendAnnotationPoint = useCallback((point: ImagePoint) => {
    draftAnnotation.current = [...draftAnnotation.current, applySnap(point)];
  }, [applySnap]);

  const beginAnnotation = useCallback((point: ImagePoint) => {
    draftAnnotation.current = [applySnap(point)];
  }, [applySnap]);

  const recalibrateMeasurements = useCallback(() => {
    updateSlice((slice) => ({ ...slice, measurements: syncMeasurements(slice.calipers, slice.measurements) }));
  }, [syncMeasurements, updateSlice]);

  useEffect(() => {
    recalibrateMeasurements();
  }, [options.controls.grid.customCalibration, options.controls.grid.gain, options.controls.grid.pixelsPerSmallBox, options.controls.grid.speed, recalibrateMeasurements]);

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
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
        const dx = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
        const dy = event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;
        if (dx || dy) {
          event.preventDefault();
          nudgeSelectedCaliper(dx, dy);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [nudgeSelectedCaliper, redo, removeSelected, setToolMode, undo]);

  const exportState = useCallback((): EcgViewerWorkspaceState => {
    return {
      ...present,
      adjustments: controlsRef.current.adjustments,
      grid: controlsRef.current.grid,
      transform: controlsRef.current.transform,
      version: 5,
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
    appendAnnotationPoint,
    appendDraftPoint,
    beginAnnotation,
    beginDraftCaliper,
    cancelDraftCaliper,
    canRedo,
    canUndo,
    commitDraftAnnotation,
    commitDraftCaliper,
    configureWaveDetection,
    deleteAnnotation,
    deleteCaliper,
    deleteHistory,
    deleteMeasurement,
    draftAnnotation,
    draftCaliper,
    dragCaliper,
    dragCaliperHandle,
    duplicateCaliper,
    duplicateMeasurement,
    exportState,
    finishMultiCaliper,
    hoveredCaliperId,
    hydrate,
    jumpToMeasurement,
    nudgeSelectedCaliper,
    present,
    recalibrateMeasurements,
    redo,
    removeSelected,
    renameHistory,
    renameMeasurement,
    restoreHistory,
    seedCalipersFromDigital,
    selectMeasurementPreset,
    setActiveLead,
    setCaliperColor,
    setHoveredCaliperId,
    setImageDimensions,
    setSyncTimestamp,
    setToolMode,
    toggleCaliperLock,
    toggleMeasurementHidden,
    toggleSnapSetting,
    undo,
    updateAnnotation,
    updateCaliper,
    updateDraftCaliper,
    updateMeasurementComments,
    updateSlice,
  };
}

export type EcgMeasurementWorkspace = ReturnType<typeof useEcgMeasurementWorkspace>;

export { summarizeCaliper } from "./ecgMeasurementEngine";
