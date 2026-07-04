import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";

import { clampZoom, fitZoomForDimensions, zoomStep } from "./ecgImageEngine";
import {
  DEFAULT_ADJUSTMENTS,
  DEFAULT_GRID,
  DEFAULT_TRANSFORM,
  type EcgImageAdjustments,
  type EcgViewerFitMode,
  type EcgViewerGridSettings,
  type EcgViewerTransform,
} from "./types";

type Dimensions = { height: number; width: number };

export function useEcgViewerControls(options: {
  containerSize?: Dimensions;
  imageSize?: Dimensions;
}) {
  const [transform, setTransform] = useState<EcgViewerTransform>(DEFAULT_TRANSFORM);
  const [adjustments, setAdjustments] = useState<EcgImageAdjustments>(DEFAULT_ADJUSTMENTS);
  const [grid, setGrid] = useState<EcgViewerGridSettings>(DEFAULT_GRID);
  const [fullscreen, setFullscreen] = useState(false);
  const [spacePanActive, setSpacePanActive] = useState(false);
  const [fitMode, setFitMode] = useState<EcgViewerFitMode>("none");
  const transformRef = useRef(transform);
  transformRef.current = transform;

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
      if (!options.containerSize || !options.imageSize) {
        if (mode === "100") setTransform((current) => ({ ...current, panX: 0, panY: 0, zoom: 1 }));
        setFitMode(mode);
        return;
      }
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
        options.containerSize.width,
        options.containerSize.height,
        options.imageSize.width,
        options.imageSize.height,
        mode,
      );
      setTransform({ panX: 0, panY: 0, rotation: transformRef.current.rotation, zoom: clampZoom(zoom) });
      setFitMode(mode);
    },
    [options.containerSize, options.imageSize, resetView],
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
      if (event.code === "Space") setSpacePanActive(true);
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
      applyFit,
      cycleGain,
      cycleSpeed,
      fitMode,
      fullscreen,
      grid,
      handleDoubleClickZoom,
      panBy,
      resetAdjustments,
      resetView,
      rotate,
      setAdjustments,
      setFullscreen,
      setGrid,
      setTransform,
      setZoom,
      spacePanActive,
      toggleFullscreen,
      toggleGrid,
      transform,
      zoomBy,
    }),
    [
      adjustments,
      applyFit,
      cycleGain,
      cycleSpeed,
      fitMode,
      fullscreen,
      grid,
      handleDoubleClickZoom,
      panBy,
      resetAdjustments,
      resetView,
      rotate,
      spacePanActive,
      toggleFullscreen,
      toggleGrid,
      transform,
      zoomBy,
      setZoom,
    ],
  );

  return controls;
}

export type EcgViewerControls = ReturnType<typeof useEcgViewerControls>;
