import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";

import { clampZoom, ECG_ZOOM_PRESETS, fitZoomForDimensions, zoomAtPoint, zoomStep, type EcgZoomPreset } from "./ecgImageEngine";
import {
  DEFAULT_ADJUSTMENTS,
  DEFAULT_GRID,
  DEFAULT_TRANSFORM,
  type EcgImageAdjustments,
  type EcgViewerFitMode,
  type EcgViewerGridSettings,
  type EcgViewerPanMode,
  type EcgViewerTransform,
  type EcgViewerViewport,
} from "./types";

const DEFAULT_VIEWPORT: EcgViewerViewport = {
  containerHeight: 480,
  containerWidth: 720,
  imageHeight: 1200,
  imageWidth: 1600,
};

export function useEcgViewerControls() {
  const [transform, setTransform] = useState<EcgViewerTransform>(DEFAULT_TRANSFORM);
  const [adjustments, setAdjustments] = useState<EcgImageAdjustments>(DEFAULT_ADJUSTMENTS);
  const [grid, setGrid] = useState<EcgViewerGridSettings>(DEFAULT_GRID);
  const [fullscreen, setFullscreen] = useState(false);
  const [spacePanActive, setSpacePanActive] = useState(false);
  const [panMode, setPanMode] = useState<EcgViewerPanMode>("none");
  const [fitMode, setFitMode] = useState<EcgViewerFitMode>("none");
  const [viewport, setViewport] = useState<EcgViewerViewport>(DEFAULT_VIEWPORT);
  const transformRef = useRef(transform);
  transformRef.current = transform;
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;

  const isPanActive = spacePanActive || panMode === "active";

  const setViewportDimensions = useCallback((next: Partial<EcgViewerViewport>) => {
    setViewport((current) => ({ ...current, ...next }));
  }, []);

  const resetView = useCallback(() => {
    setTransform(DEFAULT_TRANSFORM);
    setFitMode("none");
  }, []);

  const resetAdjustments = useCallback(() => {
    setAdjustments(DEFAULT_ADJUSTMENTS);
  }, []);

  const setZoom = useCallback((zoom: number) => {
    setTransform((current) => ({ ...current, zoom: clampZoom(zoom) }));
    setFitMode("none");
  }, []);

  const zoomBy = useCallback((delta: number) => {
    setTransform((current) => ({ ...current, zoom: zoomStep(current.zoom, delta) }));
    setFitMode("none");
  }, []);

  const panBy = useCallback((dx: number, dy: number) => {
    setTransform((current) => ({ ...current, panX: current.panX + dx, panY: current.panY + dy }));
  }, []);

  const rotate = useCallback(() => {
    setTransform((current) => ({ ...current, rotation: (current.rotation + 90) % 360 }));
  }, []);

  const applyFit = useCallback(
    (mode: EcgViewerFitMode) => {
      const currentViewport = viewportRef.current;
      if (mode === "100") {
        setTransform({ panX: 0, panY: 0, rotation: transformRef.current.rotation, zoom: 1 });
        setFitMode("100");
        return;
      }
      if (mode === "none") {
        resetView();
        return;
      }
      const zoom = fitZoomForDimensions(
        currentViewport.containerWidth,
        currentViewport.containerHeight,
        currentViewport.imageWidth,
        currentViewport.imageHeight,
        mode,
      );
      setTransform({ panX: 0, panY: 0, rotation: transformRef.current.rotation, zoom: clampZoom(zoom) });
      setFitMode(mode);
    },
    [resetView],
  );

  const toggleGrid = useCallback(() => {
    setGrid((current) => ({ ...current, visible: !current.visible }));
  }, []);

  const cycleSpeed = useCallback(() => {
    setGrid((current) => ({ ...current, speed: current.speed === 25 ? 50 : 25 }));
  }, []);

  const cycleGain = useCallback(() => {
    setGrid((current) => ({ ...current, gain: current.gain === 5 ? 10 : current.gain === 10 ? 20 : 5 }));
  }, []);

  const cycleGridOpacity = useCallback(() => {
    setGrid((current) => ({
      ...current,
      opacity: current.opacity >= 1 ? 0.35 : Math.min(Number((current.opacity + 0.15).toFixed(2)), 1),
    }));
  }, []);

  const togglePanMode = useCallback(() => {
    setPanMode((current) => (current === "active" ? "none" : "active"));
  }, []);

  const cycleZoomPreset = useCallback(() => {
    setTransform((current) => {
      const currentPreset = ECG_ZOOM_PRESETS.find((preset) => Math.abs(preset - current.zoom) < 0.05) ?? ECG_ZOOM_PRESETS[0];
      const index = ECG_ZOOM_PRESETS.indexOf(currentPreset);
      const next = ECG_ZOOM_PRESETS[(index + 1) % ECG_ZOOM_PRESETS.length] ?? 1;
      return { ...current, zoom: clampZoom(next) };
    });
    setFitMode("none");
  }, []);

  const setZoomPreset = useCallback((preset: EcgZoomPreset) => {
    setTransform((current) => ({ ...current, zoom: clampZoom(preset) }));
    setFitMode("none");
  }, []);

  const zoomAtAnchor = useCallback((anchor: { x: number; y: number }, delta: number) => {
    setTransform((current) => zoomAtPoint(current, anchor, zoomStep(current.zoom, delta)));
    setFitMode("none");
  }, []);

  const adjustBrightness = useCallback((delta: number) => {
    setAdjustments((current) => ({ ...current, brightness: Math.min(200, Math.max(40, current.brightness + delta)) }));
  }, []);

  const adjustContrast = useCallback((delta: number) => {
    setAdjustments((current) => ({ ...current, contrast: Math.min(200, Math.max(40, current.contrast + delta)) }));
  }, []);

  const setGridOpacity = useCallback((opacity: number) => {
    setGrid((current) => ({ ...current, opacity: Math.min(1, Math.max(0.1, opacity)) }));
  }, []);

  const toggleCustomCalibration = useCallback(() => {
    setGrid((current) => ({
      ...current,
      customCalibration: !current.customCalibration,
      pixelsPerSmallBox: current.pixelsPerSmallBox ?? 14,
    }));
  }, []);

  const cycleCustomSpacing = useCallback(() => {
    setGrid((current) => {
      const base = current.pixelsPerSmallBox ?? 14;
      const next = base >= 28 ? 10 : Number((base + 2).toFixed(0));
      return { ...current, customCalibration: true, pixelsPerSmallBox: next };
    });
  }, []);

  const toggleFullscreen = useCallback(() => {
    setFullscreen((value) => !value);
  }, []);

  const handleDoubleClickZoom = useCallback(() => {
    if (transformRef.current.zoom >= 1.8) {
      applyFit("width");
      return;
    }
    setTransform((current) => ({ ...current, zoom: clampZoom(Math.max(current.zoom * 1.6, 2)) }));
    setFitMode("none");
  }, [applyFit]);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      if (event.code === "Space") {
        event.preventDefault();
        setSpacePanActive(true);
      }
      if (event.ctrlKey && (event.key === "+" || event.key === "=")) {
        event.preventDefault();
        zoomBy(0.15);
      }
      if (event.ctrlKey && event.key === "-") {
        event.preventDefault();
        zoomBy(-0.15);
      }
      if (event.ctrlKey && event.key === "0") {
        event.preventDefault();
        applyFit("100");
      }
      if (event.key === "F11") {
        event.preventDefault();
        toggleFullscreen();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") setSpacePanActive(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [applyFit, toggleFullscreen, zoomBy]);

  const controls = useMemo(
    () => ({
      adjustments,
      adjustBrightness,
      adjustContrast,
      applyFit,
      cycleCustomSpacing,
      cycleGain,
      cycleGridOpacity,
      cycleSpeed,
      cycleZoomPreset,
      fitMode,
      fullscreen,
      grid,
      handleDoubleClickZoom,
      isPanActive,
      panBy,
      panMode,
      resetAdjustments,
      resetView,
      rotate,
      setAdjustments,
      setFullscreen,
      setGrid,
      setGridOpacity,
      setPanMode,
      setTransform,
      setViewportDimensions,
      setZoom,
      setZoomPreset,
      spacePanActive,
      toggleCustomCalibration,
      toggleFullscreen,
      toggleGrid,
      togglePanMode,
      transform,
      viewport,
      zoomAtAnchor,
      zoomBy,
    }),
    [
      adjustments,
      adjustBrightness,
      adjustContrast,
      applyFit,
      cycleCustomSpacing,
      cycleGain,
      cycleGridOpacity,
      cycleSpeed,
      cycleZoomPreset,
      fitMode,
      fullscreen,
      grid,
      handleDoubleClickZoom,
      isPanActive,
      panBy,
      panMode,
      resetAdjustments,
      resetView,
      rotate,
      setViewportDimensions,
      spacePanActive,
      toggleCustomCalibration,
      toggleFullscreen,
      toggleGrid,
      togglePanMode,
      transform,
      viewport,
      zoomBy,
      setZoom,
      setZoomPreset,
      zoomAtAnchor,
    ],
  );

  return controls;
}

export type EcgViewerControls = ReturnType<typeof useEcgViewerControls>;
